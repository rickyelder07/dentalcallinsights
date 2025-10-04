/**
 * Insights Generation API Route
 * POST /api/insights/generate
 * 
 * Generates AI insights for a call transcript
 * Implements caching to avoid redundant API calls
 * Security: Server-side only, validates user access via RLS
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { generateInsightsWithRetry } from '@/lib/openai-insights'
import { generateTranscriptHash, isCacheValid } from '@/lib/insights-cache'
import type { GenerateInsightsRequest } from '@/types/insights'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // Parse request
    const body: GenerateInsightsRequest = await req.json()
    const { callId, forceRegenerate = false } = body
    
    // Validate input
    if (!callId) {
      return NextResponse.json(
        { error: 'Missing required field: callId' },
        { status: 400 }
      )
    }
    
    // Get user from session
    const supabase = createAdminClient()
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      )
    }
    
    // Verify token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      )
    }
    
    // Get call and verify ownership
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('user_id', user.id)
      .single()
    
    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found or access denied' },
        { status: 404 }
      )
    }
    
    // Get transcript
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('call_id', callId)
      .single()
    
    if (transcriptError || !transcript) {
      return NextResponse.json(
        { error: 'Transcript not found for this call' },
        { status: 404 }
      )
    }
    
    // Check if transcript is completed
    if (transcript.transcription_status !== 'completed') {
      return NextResponse.json(
        { error: `Transcript not ready. Status: ${transcript.transcription_status}` },
        { status: 400 }
      )
    }
    
    // Get transcript text (prefer edited over raw)
    const transcriptText =
      transcript.edited_transcript || transcript.raw_transcript || transcript.transcript
    
    if (!transcriptText) {
      return NextResponse.json(
        { error: 'Transcript text is empty' },
        { status: 400 }
      )
    }
    
    // Generate hash for caching
    const currentHash = generateTranscriptHash(transcriptText)
    
    // Check for existing insights (cache)
    if (!forceRegenerate) {
      const { data: existingInsights } = await supabase
        .from('insights')
        .select('*')
        .eq('call_id', callId)
        .single()
      
      if (existingInsights) {
        // Check if cache is still valid
        const cacheValid = isCacheValid(
          existingInsights.generated_at,
          existingInsights.transcript_hash,
          currentHash
        )
        
        if (cacheValid) {
          // Return cached insights
          return NextResponse.json({
            success: true,
            cached: true,
            insights: {
              summary: {
                brief: existingInsights.summary_brief,
                key_points: existingInsights.summary_key_points,
                outcome: existingInsights.call_outcome,
              },
              sentiment: {
                overall: existingInsights.overall_sentiment,
                patient_satisfaction: existingInsights.patient_satisfaction,
                staff_performance: existingInsights.staff_performance,
              },
              action_items: existingInsights.action_items,
              red_flags: existingInsights.red_flags,
            },
          })
        }
      }
    }
    
    // Generate insights with GPT-4o
    const result = await generateInsightsWithRetry(
      transcriptText,
      call.call_duration_seconds
    )
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate insights' },
        { status: 500 }
      )
    }
    
    if (!result.insights) {
      return NextResponse.json(
        { error: 'No insights generated' },
        { status: 500 }
      )
    }
    
    // Save insights to database (upsert)
    const { error: upsertError } = await supabase
      .from('insights')
      .upsert(
        {
          call_id: callId,
          user_id: user.id,
          summary_brief: result.insights.summary.brief,
          summary_key_points: result.insights.summary.key_points,
          call_outcome: result.insights.summary.outcome,
          overall_sentiment: result.insights.sentiment.overall,
          patient_satisfaction: result.insights.sentiment.patient_satisfaction,
          staff_performance: result.insights.sentiment.staff_performance,
          action_items: result.insights.action_items,
          red_flags: result.insights.red_flags,
          model_used: 'gpt-4o',
          transcript_hash: currentHash,
          generated_at: new Date().toISOString(),
        },
        {
          onConflict: 'call_id',
        }
      )
    
    if (upsertError) {
      console.error('Failed to save insights:', upsertError)
      // Still return insights even if save fails
      return NextResponse.json({
        success: true,
        cached: false,
        insights: result.insights,
        warning: 'Insights generated but failed to save to database',
      })
    }
    
    // Return insights
    return NextResponse.json({
      success: true,
      cached: false,
      insights: result.insights,
      tooShort: result.tooShort || false,
    })
  } catch (error) {
    console.error('Insights generation API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


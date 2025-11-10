/**
 * Insights Generation API Route
 * POST /api/insights/generate
 * 
 * Creates a background job to generate AI insights for a call transcript
 * Uses Inngest for reliable background processing with retries
 * Security: Server-side only, validates user access via RLS
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { inngest } from '@/lib/inngest'
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
      .select('id, call_duration_seconds, user_id, filename, transcript:transcripts!inner(id, transcript, edited_transcript, transcription_status)')
      .eq('id', callId)
      .eq('user_id', user.id)
      .single()
    
    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found or access denied' },
        { status: 404 }
      )
    }

    // Check if call is "No Call Recording" - auto-complete
    if (call.filename === 'No Call Recording') {
      console.log('No Call Recording detected - auto-completing insights job')
      
      // Create completed insights record with placeholder data using correct schema
      const { error: insightsError } = await supabase
        .from('insights')
        .upsert(
          {
            call_id: callId,
            user_id: user.id,
            overall_sentiment: 'neutral',
            key_points: ['No recording available for this call.'],
            action_items: [],
            red_flags: [],
            call_outcome: 'no_recording',
            staff_performance: 'professional',
            model_used: 'N/A - No Recording',
          },
          {
            onConflict: 'call_id', // Use call_id for conflict resolution
          }
        )

      if (insightsError) {
        console.error('Failed to create No Call Recording insights:', insightsError)
      }

      // Create completed job record
      const { error: jobError } = await supabase
        .from('insights_jobs')
        .upsert({
          call_id: callId,
          user_id: user.id,
          status: 'completed',
          cached: false,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          metadata: { auto_completed: true, reason: 'No Call Recording', progress: 100 }
        })

      if (jobError) {
        console.error('Failed to create No Call Recording insights job:', jobError)
      }

      return NextResponse.json({
        success: true,
        status: 'completed',
        autoCompleted: true,
        message: 'No recording available - insights marked as complete'
      })
    }
    
    // Check if transcript is completed
    if (call.transcript.transcription_status !== 'completed') {
      return NextResponse.json(
        { error: `Transcript not ready. Status: ${call.transcript.transcription_status}` },
        { status: 400 }
      )
    }
    
    // Check for existing insights (if not forcing regeneration)
    if (!forceRegenerate) {
      const { data: existingInsights } = await supabase
        .from('insights')
        .select('*')
        .eq('call_id', callId)
        .single()
      
      if (existingInsights) {
        // Return cached insights in expected format (no job needed)
        const formattedInsights = {
          summary: {
            brief: '',
            key_points: existingInsights.key_points || [],
            outcome: existingInsights.call_outcome || '',
          },
          sentiment: {
            overall: existingInsights.overall_sentiment || 'neutral',
            patient_satisfaction: 'neutral', // Not in old schema
            staff_performance: existingInsights.staff_performance || 'professional',
          },
          action_items: existingInsights.action_items || [],
          red_flags: existingInsights.red_flags || [],
        }
        
        return NextResponse.json({
          success: true,
          cached: true,
          insights: formattedInsights,
        })
      }
    } else {
      console.log('Force regenerate enabled - will overwrite existing insights')
    }
    
    // Check if job already exists and is processing
    const { data: existingJob } = await supabase
      .from('insights_jobs')
      .select('*')
      .eq('call_id', callId)
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .single()
    
    // If forcing regeneration and job exists, cancel it and create new one
    if (existingJob && forceRegenerate) {
      console.log('Cancelling existing job for regeneration:', existingJob.id)
      // Delete the old job - a new one will be created below
      await supabase
        .from('insights_jobs')
        .delete()
        .eq('id', existingJob.id)
    } else if (existingJob) {
      // Normal case: job already in progress
      return NextResponse.json(
        {
          success: true,
          jobId: existingJob.id,
          status: existingJob.status,
          message: 'Insights generation already in progress',
        },
        { status: 200 }
      )
    }
    
    // Create insights job
    const jobData = {
      call_id: callId,
      user_id: user.id,
      status: 'processing',
      started_at: new Date().toISOString(),
      metadata: { progress: 0, stage: 'starting' },
    }
    
    const { data: newJob, error: createError } = await supabase
      .from('insights_jobs')
      .insert(jobData)
      .select('id')
      .single()
    
    if (createError || !newJob) {
      console.error('Failed to create insights job:', createError)
      return NextResponse.json(
        { error: 'Failed to create insights job' },
        { status: 500 }
      )
    }
    
    // Trigger Inngest background job
    try {
      await inngest.send({
        name: 'insights/start',
        data: {
          callId,
          userId: user.id,
          transcriptId: call.transcript.id,
          callDuration: call.call_duration_seconds,
          forceRegenerate, // Pass forceRegenerate flag to worker
        },
      })
    } catch (inngestError) {
      console.error('Failed to send Inngest event:', inngestError)
      
      // Mark job as failed
      await supabase
        .from('insights_jobs')
        .update({
          status: 'failed',
          error_message: 'Failed to queue background job',
          completed_at: new Date().toISOString(),
        })
        .eq('id', newJob.id)
      
      return NextResponse.json(
        { error: 'Failed to start background job processing' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      jobId: newJob.id,
      status: 'processing',
      message: 'Insights generation started',
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

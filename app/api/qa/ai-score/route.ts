/**
 * POST /api/qa/ai-score
 * Generate AI-powered scoring suggestions for a call
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAPIClient } from '@/lib/supabase-server'
import { generateAIScoringSuggestions, validateAISuggestions } from '@/lib/qa-ai-scoring'

export async function POST(request: NextRequest) {
  try {
    // Get authorization token from header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create Supabase client with user context
    const supabase = createAPIClient(token)

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { call_id } = body

    if (!call_id) {
      return NextResponse.json(
        { success: false, error: 'Missing call_id' },
        { status: 400 }
      )
    }

    // Fetch call with transcript
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select(`
        *,
        transcript:transcripts(*)
      `)
      .eq('id', call_id)
      .single()

    if (callError || !call) {
      return NextResponse.json(
        { success: false, error: 'Call not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (call.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check transcript exists and is completed
    const transcript = Array.isArray(call.transcript) ? call.transcript[0] : call.transcript
    
    if (!transcript || transcript.transcription_status !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Call must have a completed transcript' },
        { status: 400 }
      )
    }

    // Get transcript text
    const transcriptText = transcript.edited_transcript || transcript.raw_transcript || transcript.transcript

    if (!transcriptText || transcriptText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Transcript is empty' },
        { status: 400 }
      )
    }

    // Generate AI scoring suggestions
    const aiResult = await generateAIScoringSuggestions(
      transcriptText,
      call.call_direction,
      {
        duration: call.call_duration_seconds,
        source_number: call.source_number,
        destination_number: call.destination_number
      }
    )

    if (!aiResult.success) {
      return NextResponse.json(
        { success: false, error: aiResult.error || 'Failed to generate AI suggestions' },
        { status: 500 }
      )
    }

    // Validate suggestions
    const validation = validateAISuggestions(aiResult.suggestions)
    
    if (!validation.valid) {
      console.warn('AI suggestions validation warnings:', validation.errors)
    }

    // Calculate total score
    const totalScore = aiResult.suggestions
      .filter(s => s.applicable)
      .reduce((sum, s) => sum + s.score, 0)

    return NextResponse.json({
      success: true,
      suggestions: aiResult.suggestions,
      total_score: totalScore,
      reasoning: aiResult.reasoning,
      confidence: aiResult.confidence,
      validation: validation.valid ? undefined : validation.errors,
      message: 'AI scoring suggestions generated successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/qa/ai-score:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


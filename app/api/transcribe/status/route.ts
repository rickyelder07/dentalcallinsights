/**
 * Transcription Status API Route
 * Check the status of a transcription job
 * 
 * GET /api/transcribe/status?callId=xxx
 * - Returns transcription status and progress
 * - Includes transcript if completed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import type { TranscriptionStatusResponse } from '@/types/transcription'

/**
 * GET /api/transcribe/status
 * Get transcription status for a call
 */
export async function GET(req: NextRequest) {
  try {
    // Get callId from query params
    const { searchParams } = new URL(req.url)
    const callId = searchParams.get('callId')
    const jobId = searchParams.get('jobId')

    if (!callId && !jobId) {
      return NextResponse.json(
        { error: 'Missing required parameter: callId or jobId' },
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

    // Get transcription job
    let job
    if (jobId) {
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: 'Transcription job not found' },
          { status: 404 }
        )
      }
      job = data
    } else {
      // Get by callId
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('*')
        .eq('call_id', callId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { error: 'Transcription job not found' },
          { status: 404 }
        )
      }
      job = data
    }

    // Get transcript
    const { data: transcript } = await supabase
      .from('transcripts')
      .select('*')
      .eq('call_id', job.call_id)
      .single()

    // Calculate progress (rough estimate)
    let progress: number | undefined
    if (job.status === 'completed') {
      progress = 100
    } else if (job.status === 'processing') {
      // Estimate progress based on time elapsed
      if (job.started_at && job.metadata?.audio_duration_seconds) {
        const elapsed = (Date.now() - new Date(job.started_at).getTime()) / 1000
        const estimated = job.metadata.audio_duration_seconds * 3 // 3x processing time
        progress = Math.min(95, Math.floor((elapsed / estimated) * 100))
      } else {
        progress = 50 // Unknown, show halfway
      }
    } else if (job.status === 'pending') {
      progress = 0
    }

    // Build response
    const response: TranscriptionStatusResponse = {
      jobId: job.id,
      callId: job.call_id,
      status: job.status,
      progress,
      transcriptId: transcript?.id,
      transcript:
        transcript?.transcription_status === 'completed'
          ? transcript.edited_transcript || transcript.raw_transcript || transcript.transcript
          : undefined,
      confidenceScore: transcript?.confidence_score,
      errorMessage: job.error_message || transcript?.error_message,
      processingStartedAt: job.started_at || transcript?.processing_started_at,
      processingCompletedAt: job.completed_at || transcript?.processing_completed_at,
      processingDurationSeconds: transcript?.processing_duration_seconds,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Transcription status API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


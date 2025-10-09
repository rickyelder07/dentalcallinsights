/**
 * API Route: Apply Corrections to Existing Transcript
 * POST /api/transcripts/[id]/apply-corrections
 * 
 * Re-applies user's transcription corrections to an existing transcript
 * without re-running Whisper transcription
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient()

    // Get user session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const transcriptId = params.id

    // Fetch existing transcript
    const { data: transcript, error: fetchError } = await supabase
      .from('transcripts')
      .select('call_id, raw_transcript, edited_transcript')
      .eq('id', transcriptId)
      .single()

    if (fetchError || !transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      )
    }

    // Verify ownership via call
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('user_id')
      .eq('id', transcript.call_id)
      .single()

    if (callError || !call || call.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Apply corrections to raw transcript
    const { applyUserCorrections } = await import('@/lib/transcription-corrections')
    const textToCorrect = transcript.raw_transcript || transcript.edited_transcript || ''
    const correctedText = await applyUserCorrections(textToCorrect, session.user.id)

    // Update transcript with corrected version
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        edited_transcript: correctedText,
        transcript: correctedText, // Update legacy field too
        last_edited_at: new Date().toISOString(),
      })
      .eq('id', transcriptId)

    if (updateError) {
      console.error('Failed to update transcript:', updateError)
      return NextResponse.json(
        { error: 'Failed to apply corrections' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Corrections applied successfully',
    })
  } catch (error) {
    console.error('Error applying corrections:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


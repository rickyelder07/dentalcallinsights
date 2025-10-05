/**
 * Transcript Management API Route
 * Handle individual transcript operations
 * 
 * GET /api/transcripts/[id] - Get transcript
 * PATCH /api/transcripts/[id] - Update transcript
 * DELETE /api/transcripts/[id] - Delete transcript
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import type { TranscriptUpdateRequest } from '@/types/transcript'

/**
 * GET /api/transcripts/[id]
 * Get a specific transcript
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transcriptId = params.id

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

    // Get transcript with call information
    const { data: transcript, error } = await supabase
      .from('transcripts')
      .select(`
        *,
        calls!inner (
          id,
          user_id,
          filename,
          audio_path,
          call_time,
          call_direction,
          call_duration_seconds
        )
      `)
      .eq('id', transcriptId)
      .single()

    if (error || !transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      )
    }

    // Verify user owns the call
    if (transcript.calls.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true, data: transcript })
  } catch (error) {
    console.error('Get transcript API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/transcripts/[id]
 * Update a transcript (edited version)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transcriptId = params.id
    const body: TranscriptUpdateRequest = await req.json()

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

    // Get existing transcript to verify ownership
    const { data: existingTranscript, error: fetchError } = await supabase
      .from('transcripts')
      .select(`
        *,
        calls!inner (user_id)
      `)
      .eq('id', transcriptId)
      .single()

    if (fetchError || !existingTranscript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      )
    }

    // Verify user owns the call
    if (existingTranscript.calls.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Build update object
    const updateData: any = {}

    if (body.edited_transcript !== undefined) {
      updateData.edited_transcript = body.edited_transcript
      updateData.last_edited_at = new Date().toISOString()
      updateData.edit_count = (existingTranscript.edit_count || 0) + 1
    }

    if (body.speaker_segments !== undefined) {
      updateData.speaker_segments = body.speaker_segments
    }

    if (body.metadata !== undefined) {
      updateData.metadata = {
        ...(existingTranscript.metadata || {}),
        ...body.metadata,
      }
    }

    // Update transcript
    const { data: updatedTranscript, error: updateError } = await supabase
      .from('transcripts')
      .update(updateData)
      .eq('id', transcriptId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update transcript: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      data: updatedTranscript,
      message: 'Transcript updated successfully',
    })
  } catch (error) {
    console.error('Update transcript API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/transcripts/[id]
 * Delete a transcript
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transcriptId = params.id

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

    // Get transcript to verify ownership
    const { data: transcript, error: fetchError } = await supabase
      .from('transcripts')
      .select(`
        *,
        calls!inner (user_id)
      `)
      .eq('id', transcriptId)
      .single()

    if (fetchError || !transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      )
    }

    // Verify user owns the call
    if (transcript.calls.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete transcript
    const { error: deleteError } = await supabase
      .from('transcripts')
      .delete()
      .eq('id', transcriptId)

    if (deleteError) {
      throw new Error(`Failed to delete transcript: ${deleteError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Transcript deleted successfully',
    })
  } catch (error) {
    console.error('Delete transcript API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


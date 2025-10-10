/**
 * Single File Upload API Route
 * Handles individual audio file uploads to avoid Vercel's 4.5MB request limit
 * POST /api/upload/single
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac']
const STORAGE_BUCKET = 'call-recordings'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const filename = formData.get('filename') as string | null
    const callTime = formData.get('callTime') as string | null
    const direction = formData.get('direction') as string | null
    const sourceNumber = formData.get('sourceNumber') as string | null
    const destinationNumber = formData.get('destinationNumber') as string | null
    const durationSeconds = formData.get('durationSeconds') as string | null
    const disposition = formData.get('disposition') as string | null

    // Validate required fields
    if (!audioFile) {
      return NextResponse.json(
        { success: false, message: 'Audio file is required' },
        { status: 400 }
      )
    }

    if (!filename) {
      return NextResponse.json(
        { success: false, message: 'Filename is required' },
        { status: 400 }
      )
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        message: `File "${audioFile.name}" exceeds maximum size of 100MB`,
      }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_AUDIO_TYPES.includes(audioFile.type)) {
      return NextResponse.json({
        success: false,
        message: `File "${audioFile.name}" has unsupported type "${audioFile.type}". Allowed types: MP3, WAV, M4A, AAC`,
      }, { status: 400 })
    }

    // Upload file to Supabase Storage with retry logic
    const storagePath = `${user.id}/${filename}`
    let uploadSuccess = false
    let lastError: Error | null = null

    // Retry up to 3 times for network errors
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, audioFile, {
            cacheControl: '3600',
            upsert: true, // Allow overwriting existing files
          })

        if (uploadError) {
          lastError = uploadError
          if (attempt < 3) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000))
            continue
          }
        } else {
          uploadSuccess = true
          break
        }
      } catch (networkError) {
        lastError = networkError as Error
        if (attempt < 3) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, attempt * 1000))
          continue
        }
      }
    }

    if (!uploadSuccess) {
      const errorMessage = lastError?.message || 'Unknown upload error'
      return NextResponse.json({
        success: false,
        message: `Failed to upload "${filename}" (attempted 3 times): ${errorMessage}`,
      }, { status: 500 })
    }

    // Check if call already exists
    const { data: existingCall } = await supabase
      .from('calls')
      .select('id')
      .eq('user_id', user.id)
      .eq('filename', filename)
      .eq('call_time', callTime)
      .maybeSingle()

    let callId: string | null = null

    if (existingCall) {
      // Update existing record
      const { data: updatedCall, error: updateError } = await supabase
        .from('calls')
        .update({
          audio_path: storagePath,
          file_size: audioFile.size,
          file_type: audioFile.type,
          upload_status: 'completed',
          call_direction: direction,
          source_number: sourceNumber,
          destination_number: destinationNumber,
          call_duration_seconds: durationSeconds ? parseInt(durationSeconds) : null,
          disposition: disposition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCall.id)
        .select('id')
        .single()

      if (updateError) {
        return NextResponse.json({
          success: false,
          message: `Failed to update existing record for "${filename}": ${updateError.message}`,
        }, { status: 500 })
      }

      callId = updatedCall?.id || null
    } else {
      // Create new database record
      const { data: newCall, error: dbError } = await supabase
        .from('calls')
        .insert({
          user_id: user.id,
          filename: filename,
          audio_path: storagePath,
          file_size: audioFile.size,
          file_type: audioFile.type,
          upload_status: 'completed',
          call_time: callTime,
          call_direction: direction,
          source_number: sourceNumber,
          destination_number: destinationNumber,
          call_duration_seconds: durationSeconds ? parseInt(durationSeconds) : null,
          disposition: disposition,
          metadata: {},
        })
        .select('id')
        .single()

      if (dbError) {
        // Try to clean up uploaded file
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
        return NextResponse.json({
          success: false,
          message: `Failed to create database record for "${filename}": ${dbError.message}`,
        }, { status: 500 })
      }

      callId = newCall?.id || null
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded "${filename}"`,
      callId: callId,
      filename: filename,
    })

  } catch (error) {
    console.error('Single file upload error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error during upload',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

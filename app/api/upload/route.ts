/**
 * Upload API Route
 * Handles CSV and audio file uploads with validation
 * POST /api/upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { SimplifiedCsvParser } from '@/lib/csv-parser-simplified'
import type { UploadResult } from '@/types/upload'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac']
const STORAGE_BUCKET = 'call-recordings'

/**
 * POST handler for file uploads
 * Expects multipart/form-data with:
 * - csv: CSV file with "Call" column
 * - audio[]: Multiple audio files matching CSV filenames
 */
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
    const csvFile = formData.get('csv') as File | null
    const audioFiles = formData.getAll('audio') as File[]

    // Validate CSV file exists
    if (!csvFile) {
      return NextResponse.json(
        { success: false, message: 'CSV file is required' },
        { status: 400 }
      )
    }

    // Validate audio files exist
    if (!audioFiles || audioFiles.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one audio file is required' },
        { status: 400 }
      )
    }

    // Read and parse CSV file
    const csvContent = await csvFile.text()
    const csvResult = SimplifiedCsvParser.parseCSV(csvContent)

    if (!csvResult.valid) {
      return NextResponse.json({
        success: false,
        message: 'CSV validation failed',
        errors: csvResult.errors,
        warnings: csvResult.warnings,
      }, { status: 400 })
    }

    // Validate audio files against CSV
    const audioValidation = SimplifiedCsvParser.validateAudioFiles(
      audioFiles,
      csvResult.audioFilenames
    )

    if (!audioValidation.valid) {
      return NextResponse.json({
        success: false,
        message: 'Audio file validation failed. All uploaded files must match filenames in the CSV "Call" column.',
        errors: audioValidation.errors,
        missingFiles: audioValidation.missingFiles,
        extraFiles: audioValidation.extraFiles,
      }, { status: 400 })
    }

    // Validate individual audio files
    for (const file of audioFiles) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({
          success: false,
          message: `File "${file.name}" exceeds maximum size of 100MB`,
        }, { status: 400 })
      }

      // Check file type
      if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
        return NextResponse.json({
          success: false,
          message: `File "${file.name}" has unsupported type "${file.type}". Allowed types: MP3, WAV, M4A, AAC`,
        }, { status: 400 })
      }
    }

    // Upload files to storage and create database records
    const callIds: string[] = []
    const uploadErrors: string[] = []

    // First, process rows with "No Call Recording" (no audio file needed)
    const noRecordingRows = csvResult.rows.filter(row => row.filename === 'No Call Recording')
    for (const csvRow of noRecordingRows) {
      try {
        // Check if call already exists using more unique criteria
        // Use phone numbers and time to identify unique calls
        const uniqueKey = `${csvRow.call_time}_${csvRow.source_number || ''}_${csvRow.destination_number || ''}_${csvRow.direction}`
        
        const { data: existingCall } = await supabase
          .from('calls')
          .select('id')
          .eq('user_id', user.id)
          .eq('filename', 'No Call Recording')
          .eq('call_time', csvRow.call_time)
          .eq('source_number', csvRow.source_number || null)
          .eq('destination_number', csvRow.destination_number || null)
          .eq('call_direction', csvRow.direction)
          .maybeSingle()  // Changed from .single() to handle multiple matches gracefully

        let callId: string | null = null

        if (existingCall) {
          // Update existing record
          const { data: updatedCall, error: updateError } = await supabase
            .from('calls')
            .update({
              call_direction: csvRow.direction,
              source_number: csvRow.source_number,
              source_name: csvRow.source_name,
              source_extension: csvRow.source_extension,
              destination_number: csvRow.destination_number,
              destination_extension: csvRow.destination_extension,
              call_duration_seconds: csvRow.duration_seconds,
              disposition: csvRow.disposition,
              time_to_answer_seconds: csvRow.time_to_answer_seconds,
              call_flow: csvRow.call_flow,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingCall.id)
            .select('id')
            .single()

          if (updateError) {
            uploadErrors.push(`Failed to update call without recording: ${updateError.message}`)
            continue
          }

          callId = updatedCall?.id || null
        } else {
          // Create new database record without audio file
          const { data: callData, error: dbError } = await supabase
            .from('calls')
            .insert({
              user_id: user.id,
              filename: 'No Call Recording',
              audio_path: '', // No audio path
              file_size: null,
              file_type: null,
              upload_status: 'completed',
              call_time: csvRow.call_time,
              call_direction: csvRow.direction,
              source_number: csvRow.source_number,
              source_name: csvRow.source_name,
              source_extension: csvRow.source_extension,
              destination_number: csvRow.destination_number,
              destination_extension: csvRow.destination_extension,
              call_duration_seconds: csvRow.duration_seconds,
              disposition: csvRow.disposition,
              time_to_answer_seconds: csvRow.time_to_answer_seconds,
              call_flow: csvRow.call_flow,
              metadata: {},
            })
            .select('id')
            .single()

          if (dbError) {
            uploadErrors.push(`Failed to create record for call without recording: ${dbError.message}`)
            console.error('Insert error for no-recording call:', dbError, csvRow)
            continue
          }

          callId = callData?.id || null
        }

        if (callId) {
          callIds.push(callId)
        }
      } catch (error) {
        const errorMsg = `Error processing call without recording at ${csvRow.call_time}: ${error instanceof Error ? error.message : 'Unknown error'}`
        uploadErrors.push(errorMsg)
        console.error(errorMsg, csvRow)
      }
    }

    // Then, process audio files
    for (const file of audioFiles) {
      try {
        // Find matching CSV row
        const csvRow = csvResult.rows.find((row) => row.filename === file.name)
        if (!csvRow) {
          uploadErrors.push(`No CSV data found for file "${file.name}"`)
          continue
        }

        // Upload file to Supabase Storage with retry logic
        const storagePath = `${user.id}/${file.name}`
        let uploadSuccess = false
        let lastError = null

        // Retry up to 3 times for network errors
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const { error: uploadError } = await supabase.storage
              .from(STORAGE_BUCKET)
              .upload(storagePath, file, {
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
            lastError = networkError
            if (attempt < 3) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, attempt * 1000))
              continue
            }
          }
        }

        if (!uploadSuccess) {
          const errorMessage = lastError?.message || 'Unknown upload error'
          uploadErrors.push(`Failed to upload "${file.name}" (attempted 3 times): ${errorMessage}`)
          continue
        }

        // Check if call already exists (based on user_id, filename, and call_time)
        // Use maybeSingle() to gracefully handle cases where multiple matches exist
        const { data: existingCall } = await supabase
          .from('calls')
          .select('id')
          .eq('user_id', user.id)
          .eq('filename', file.name)
          .eq('call_time', csvRow.call_time)
          .maybeSingle()

        let callId: string | null = null

        if (existingCall) {
          // Record already exists - update it instead of creating duplicate
          const { data: updatedCall, error: updateError } = await supabase
            .from('calls')
            .update({
              audio_path: storagePath,
              file_size: file.size,
              file_type: file.type,
              upload_status: 'completed',
              call_direction: csvRow.direction,
              source_number: csvRow.source_number,
              source_name: csvRow.source_name,
              source_extension: csvRow.source_extension,
              destination_number: csvRow.destination_number,
              destination_extension: csvRow.destination_extension,
              call_duration_seconds: csvRow.duration_seconds,
              disposition: csvRow.disposition,
              time_to_answer_seconds: csvRow.time_to_answer_seconds,
              call_flow: csvRow.call_flow,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingCall.id)
            .select('id')
            .single()

          if (updateError) {
            uploadErrors.push(`Failed to update existing record for "${file.name}": ${updateError.message}`)
            continue
          }

          callId = updatedCall?.id || null
        } else {
          // Create new database record
          const { data: newCall, error: dbError } = await supabase
            .from('calls')
            .insert({
              user_id: user.id,
              filename: file.name,
              audio_path: storagePath,
              file_size: file.size,
              file_type: file.type,
              upload_status: 'completed',
              call_time: csvRow.call_time,
              call_direction: csvRow.direction,
              source_number: csvRow.source_number,
              source_name: csvRow.source_name,
              source_extension: csvRow.source_extension,
              destination_number: csvRow.destination_number,
              destination_extension: csvRow.destination_extension,
              call_duration_seconds: csvRow.duration_seconds,
              disposition: csvRow.disposition,
              time_to_answer_seconds: csvRow.time_to_answer_seconds,
              call_flow: csvRow.call_flow,
              metadata: {},
            })
            .select('id')
            .single()

          if (dbError) {
            uploadErrors.push(`Failed to create database record for "${file.name}": ${dbError.message}`)
            // Try to clean up uploaded file
            await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
            continue
          }

          callId = newCall?.id || null
        }

        if (callId) {
          callIds.push(callId)
        }
      } catch (error) {
        uploadErrors.push(
          `Error processing "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    // Prepare response
    const result: UploadResult = {
      success: uploadErrors.length === 0,
      message:
        uploadErrors.length === 0
          ? `Successfully uploaded ${callIds.length} call recordings`
          : `Uploaded ${callIds.length} of ${audioFiles.length} files with errors`,
      csvRowsProcessed: csvResult.rowCount,
      audioFilesUploaded: callIds.length,
      callsCreated: callIds,
      errors: uploadErrors.map((msg, idx) => ({
        row: idx + 1,
        column: 'file',
        message: msg,
      })),
      warnings: csvResult.warnings,
    }

    return NextResponse.json(result, {
      status: result.success ? 200 : 207, // 207 Multi-Status for partial success
    })
  } catch (error) {
    console.error('Upload error:', error)
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

/**
 * GET handler - return upload status/instructions
 */
export async function GET() {
  return NextResponse.json({
    message: 'Upload API endpoint',
    usage: 'POST multipart/form-data with csv file and audio[] files',
    requirements: {
      csv: {
        required: true,
        format: 'CSV file with "Call" column containing audio filenames',
        requiredColumns: ['Call Time', 'Direction', 'Call'],
      },
      audio: {
        required: true,
        format: 'MP3, WAV, M4A, or AAC files',
        maxSize: '100MB per file',
        note: 'Filenames must match the "Call" column in CSV',
      },
    },
  })
}

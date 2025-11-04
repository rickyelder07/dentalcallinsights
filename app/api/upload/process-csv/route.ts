/**
 * CSV Processing API Route
 * Processes CSV data and creates database records for calls without audio files
 * POST /api/upload/process-csv
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { SimplifiedCsvParser } from '@/lib/csv-parser-simplified'
import { parseNewPatientStatus } from '@/lib/call-flow-parser'

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

    // Validate CSV file exists
    if (!csvFile) {
      return NextResponse.json(
        { success: false, message: 'CSV file is required' },
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

    // Process rows with "No Call Recording" (no audio file needed)
    const noRecordingRows = csvResult.rows.filter(row => row.filename === 'No Call Recording')
    const callIds: string[] = []
    const uploadErrors: string[] = []

    for (const csvRow of noRecordingRows) {
      try {
        // Check if call already exists using more unique criteria
        const { data: existingCall } = await supabase
          .from('calls')
          .select('id')
          .eq('user_id', user.id)
          .eq('filename', 'No Call Recording')
          .eq('call_time', csvRow.call_time)
          .eq('source_number', csvRow.source_number || null)
          .eq('destination_number', csvRow.destination_number || null)
          .eq('call_direction', csvRow.direction)
          .maybeSingle()

        let callId: string | null = null

        if (existingCall) {
          // Update existing record
          const isNewPatient = parseNewPatientStatus(csvRow.call_flow, csvRow.direction)
          
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
              is_new_patient: isNewPatient,
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
          console.log('📝 Creating new call record (CSV only):', csvRow.call_time)
          const isNewPatient = parseNewPatientStatus(csvRow.call_flow, csvRow.direction)
          console.log('   is_new_patient will be set to:', isNewPatient)
          
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
              is_new_patient: isNewPatient,
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

    // Return CSV data for client-side processing
    return NextResponse.json({
      success: true,
      message: `Processed ${noRecordingRows.length} calls without recordings`,
      csvData: csvResult,
      callsCreated: callIds,
      errors: uploadErrors.map((msg, idx) => ({
        row: idx + 1,
        column: 'file',
        message: msg,
      })),
      warnings: csvResult.warnings,
    })

  } catch (error) {
    console.error('CSV processing error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error during CSV processing',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

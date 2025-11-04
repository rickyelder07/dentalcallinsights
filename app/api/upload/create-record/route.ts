/**
 * Create Database Record API Route
 * Lightweight endpoint to create database records after direct Supabase upload
 * POST /api/upload/create-record
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
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

    // Parse JSON body (lightweight, no files)
    const body = await request.json()
    const {
      filename,
      storagePath,
      fileSize,
      fileType,
      callTime,
      direction,
      sourceNumber,
      destinationNumber,
      durationSeconds,
      disposition,
      sourceName,
      sourceExtension,
      destinationExtension,
      timeToAnswerSeconds,
      callFlow,
    } = body

    // Validate required fields
    if (!filename || !storagePath || !callTime) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: filename, storagePath, callTime' },
        { status: 400 }
      )
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
      console.log('📝 Updating existing call record (create-record route):', filename)
      const isNewPatient = parseNewPatientStatus(callFlow, direction)
      console.log('   is_new_patient will be set to:', isNewPatient)
      
      const { data: updatedCall, error: updateError } = await supabase
        .from('calls')
        .update({
          audio_path: storagePath,
          file_size: fileSize,
          file_type: fileType,
          upload_status: 'completed',
          call_direction: direction,
          source_number: sourceNumber,
          source_name: sourceName,
          source_extension: sourceExtension,
          destination_number: destinationNumber,
          destination_extension: destinationExtension,
          call_duration_seconds: durationSeconds ? parseInt(durationSeconds) : null,
          disposition: disposition,
          time_to_answer_seconds: timeToAnswerSeconds,
          call_flow: callFlow,
          is_new_patient: isNewPatient,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCall.id)
        .select('id, is_new_patient')
        .single()
      
      if (updatedCall) {
        console.log('   ✅ Record updated with is_new_patient =', updatedCall.is_new_patient)
      }

      if (updateError) {
        return NextResponse.json({
          success: false,
          message: `Failed to update existing record for "${filename}": ${updateError.message}`,
        }, { status: 500 })
      }

      callId = updatedCall?.id || null
    } else {
      // Create new database record
      console.log('📝 Creating new call record (create-record route):', filename)
      const isNewPatient = parseNewPatientStatus(callFlow, direction)
      console.log('   is_new_patient will be set to:', isNewPatient)
      
      const insertPayload = {
        user_id: user.id,
        filename: filename,
        audio_path: storagePath,
        file_size: fileSize,
        file_type: fileType,
        upload_status: 'completed',
        call_time: callTime,
        call_direction: direction,
        source_number: sourceNumber,
        source_name: sourceName,
        source_extension: sourceExtension,
        destination_number: destinationNumber,
        destination_extension: destinationExtension,
        call_duration_seconds: durationSeconds ? parseInt(durationSeconds) : null,
        disposition: disposition,
        time_to_answer_seconds: timeToAnswerSeconds,
        call_flow: callFlow,
        is_new_patient: isNewPatient,
        metadata: {},
      }
      
      console.log('   📦 Insert payload is_new_patient:', insertPayload.is_new_patient, '(type:', typeof insertPayload.is_new_patient, ')')
      
      const { data: newCall, error: dbError } = await supabase
        .from('calls')
        .insert(insertPayload)
        .select('id, is_new_patient')
        .single()
      
      if (newCall) {
        console.log('   ✅ Record created with is_new_patient =', newCall.is_new_patient)
      }

      if (dbError) {
        return NextResponse.json({
          success: false,
          message: `Failed to create database record for "${filename}": ${dbError.message}`,
        }, { status: 500 })
      }

      callId = newCall?.id || null
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created record for "${filename}"`,
      callId: callId,
      filename: filename,
    })

  } catch (error) {
    console.error('Create record error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error during record creation',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

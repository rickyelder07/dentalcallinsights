/**
 * Transcription API Route
 * Handles audio transcription requests using OpenAI Whisper
 * 
 * POST /api/transcribe
 * - Starts transcription for a call
 * - Creates transcription job in database
 * - Processes transcription in background
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import {
  transcribeAudioFromUrl,
  calculateConfidenceScore,
  formatSegmentsToTimestamps,
  validateOpenAIConfig,
  isTranscriptionError,
} from '@/lib/openai'
import type { TranscriptionRequest, TranscriptionJobResponse } from '@/types/transcription'

const STORAGE_BUCKET = 'audio-files'

/**
 * POST /api/transcribe
 * Start transcription for a call
 */
export async function POST(req: NextRequest) {
  try {
    console.log('Transcription API called')
    
    // Parse request body
    const body: TranscriptionRequest = await req.json()
    const { callId, language, prompt } = body
    console.log('Request body parsed:', { callId, language, prompt })

    // Validate input
    if (!callId) {
      return NextResponse.json(
        { error: 'Missing required field: callId' },
        { status: 400 }
      )
    }

    // Validate OpenAI configuration
    console.log('Validating OpenAI configuration...')
    const configValidation = validateOpenAIConfig()
    if (!configValidation.valid) {
      console.error('OpenAI configuration invalid:', configValidation.error)
      return NextResponse.json(
        { error: configValidation.error },
        { status: 500 }
      )
    }
    console.log('OpenAI configuration valid')

    // Get user from session
    console.log('Getting user from session...')
    const supabase = createAdminClient()
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      console.error('No authentication token provided')
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
      console.error('Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      )
    }
    console.log('User authenticated:', user.id)

    // Get call record
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

    // Check if call is too short (< 6 seconds)
    const MIN_CALL_DURATION = 6
    if (call.call_duration_seconds && call.call_duration_seconds < MIN_CALL_DURATION) {
      // Create transcript record with "too short" message
      const { error: upsertError } = await supabase
        .from('transcripts')
        .upsert(
          {
            call_id: callId,
            transcript: 'Call too short to transcribe.',
            raw_transcript: 'Call too short to transcribe.',
            transcription_status: 'completed',
            confidence_score: 0,
            processing_started_at: new Date().toISOString(),
            processing_completed_at: new Date().toISOString(),
            edit_count: 0,
          },
          { onConflict: 'call_id' }
        )

      if (upsertError) {
        console.error('Failed to create short call transcript:', upsertError)
      }

      return NextResponse.json(
        {
          message: 'Call too short to transcribe (< 6 seconds)',
          callDuration: call.call_duration_seconds,
          status: 'completed',
        },
        { status: 200 }
      )
    }

    // Check if transcription already exists
    const { data: existingTranscript } = await supabase
      .from('transcripts')
      .select('id, transcription_status')
      .eq('call_id', callId)
      .single()

    if (
      existingTranscript &&
      (existingTranscript.transcription_status === 'completed' ||
        existingTranscript.transcription_status === 'processing')
    ) {
      return NextResponse.json(
        {
          error: `Transcription already ${existingTranscript.transcription_status}`,
          transcriptId: existingTranscript.id,
        },
        { status: 409 }
      )
    }

    // Check if job already exists
    const { data: existingJob } = await supabase
      .from('transcription_jobs')
      .select('*')
      .eq('call_id', callId)
      .single()

    if (existingJob && existingJob.status === 'processing') {
      return NextResponse.json(
        {
          error: 'Transcription already in progress',
          jobId: existingJob.id,
        },
        { status: 409 }
      )
    }

    // Create or update transcription job
    const jobData = {
      call_id: callId,
      user_id: user.id,
      status: 'processing',
      started_at: new Date().toISOString(),
      metadata: { language, prompt },
    }

    let jobId: string

    if (existingJob) {
      // Update existing job
      const { data: updatedJob, error: updateError } = await supabase
        .from('transcription_jobs')
        .update(jobData)
        .eq('id', existingJob.id)
        .select('id')
        .single()

      if (updateError || !updatedJob) {
        throw new Error('Failed to update transcription job')
      }
      jobId = updatedJob.id
    } else {
      // Create new job
      const { data: newJob, error: createError } = await supabase
        .from('transcription_jobs')
        .insert(jobData)
        .select('id')
        .single()

      if (createError || !newJob) {
        throw new Error('Failed to create transcription job')
      }
      jobId = newJob.id
    }

    // Create or update transcript record with processing status
    // Use upsert to handle both cases
    const { error: upsertError } = await supabase
      .from('transcripts')
      .upsert({
        call_id: callId,
        user_id: user.id,
        transcription_status: 'processing',
        processing_started_at: new Date().toISOString(),
        transcript: 'Processing...', // Temporary placeholder (non-empty)
        error_message: null,
      }, {
        onConflict: 'call_id',
        ignoreDuplicates: false,
      })

    if (upsertError) {
      console.error('Failed to create/update transcript record:', upsertError)
      throw new Error(`Failed to create transcript: ${upsertError.message}`)
    }

    // Process transcription asynchronously
    // Note: In production, this should be handled by a queue system (e.g., BullMQ, Inngest, etc.)
    setImmediate(() => {
      processTranscription(callId, call.audio_path, call.filename, user.id, jobId, {
        language,
        prompt,
      }).catch(async (error) => {
        console.error('Background transcription error:', error)
        // Update job status to failed
        try {
          await supabase
            .from('transcription_jobs')
            .update({ 
              status: 'failed', 
              error_message: error instanceof Error ? error.message : 'Unknown error',
              completed_at: new Date().toISOString()
            })
            .eq('id', jobId)
          console.log('Updated job status to failed')
        } catch (updateError) {
          console.error('Failed to update job status:', updateError)
        }
      })
    })

    // Return job response
    const response: TranscriptionJobResponse = {
      jobId,
      callId,
      status: 'processing',
      message: 'Transcription started. Check status for progress.',
      estimatedDurationSeconds: call.call_duration_seconds
        ? call.call_duration_seconds * 3
        : undefined,
    }

    return NextResponse.json(response, { status: 202 })
  } catch (error) {
    console.error('Transcription API error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    })

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error instanceof Error ? error.stack : 'No stack trace',
          name: error instanceof Error ? error.name : 'Unknown error type'
        } : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Background function to process transcription
 * In production, this should be a separate worker/queue
 */
async function processTranscription(
  callId: string,
  audioPath: string,
  filename: string,
  userId: string,
  jobId: string,
  options: { language?: string; prompt?: string }
) {
  const supabase = createAdminClient()
  const startTime = Date.now()
  const MAX_PROCESSING_TIME = 25 * 60 * 1000 // 25 minutes (under Vercel's 30min limit)

  // Set up timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Transcription timeout after ${MAX_PROCESSING_TIME / 1000 / 60} minutes`))
    }, MAX_PROCESSING_TIME)
  })

  try {
    console.log(`Starting transcription processing for call ${callId}, job ${jobId}`)
    
    // Race between transcription and timeout
    await Promise.race([
      performTranscription(),
      timeoutPromise
    ])

    async function performTranscription() {
    // Get signed URL for audio file (server-side using admin client)
    const storagePath = `${userId}/${filename}`
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 3600) // 1 hour expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Failed to create signed URL:', signedUrlError)
      throw new Error(`Failed to create signed URL for audio file: ${signedUrlError?.message || 'Unknown error'}`)
    }

    console.log(`Created signed URL for: ${storagePath}`)

    // Transcribe audio
    const whisperResponse = await transcribeAudioFromUrl(
      signedUrlData.signedUrl,
      filename,
      {
        language: options.language,
        prompt: options.prompt,
        responseFormat: 'verbose_json',
        timestampGranularities: ['segment'],
      }
    )

    // Calculate metrics
    const confidenceScore = calculateConfidenceScore(whisperResponse.segments)
    const timestamps = whisperResponse.segments
      ? formatSegmentsToTimestamps(whisperResponse.segments)
      : []
    const processingDuration = Math.floor((Date.now() - startTime) / 1000)

    // Apply user-managed corrections to raw transcript
    const { applyUserCorrections } = await import('@/lib/transcription-corrections')
    const correctedText = await applyUserCorrections(whisperResponse.text, userId)

    // Update transcript with results - use upsert to ensure it exists
    const { error: transcriptError } = await supabase
      .from('transcripts')
      .upsert({
        call_id: callId,
        user_id: userId,
        raw_transcript: whisperResponse.text,
        edited_transcript: correctedText, // Always save corrected version
        transcript: correctedText, // Legacy field shows corrected
        transcription_status: 'completed',
        confidence_score: confidenceScore,
        language: whisperResponse.language || options.language || 'en',
        timestamps: timestamps,
        processing_completed_at: new Date().toISOString(),
        processing_duration_seconds: processingDuration,
        error_message: null,
      }, {
        onConflict: 'call_id',
        ignoreDuplicates: false,
      })

    if (transcriptError) {
      console.error('Failed to save transcript:', transcriptError)
      throw new Error(`Failed to update transcript: ${transcriptError.message}`)
    }

    console.log(`Transcript saved for call ${callId}:`, {
      length: whisperResponse.text.length,
      confidence: confidenceScore,
      timestamps: timestamps.length,
    })

    // Update job as completed
    await supabase
      .from('transcription_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    console.log(`Transcription completed for call ${callId}`)
    } // End of performTranscription function

  } catch (error) {
    console.error(`Transcription failed for call ${callId}:`, error)

    // Determine if error is retryable
    const isRetryable = isTranscriptionError(error) && error.retryable

    // Get current retry count
    const { data: job } = await supabase
      .from('transcription_jobs')
      .select('retry_count, max_retries')
      .eq('id', jobId)
      .single()

    const retryCount = (job?.retry_count || 0) + 1
    const maxRetries = job?.max_retries || 3

    // Determine final status
    const shouldRetry = isRetryable && retryCount < maxRetries
    const finalStatus = shouldRetry ? 'pending' : 'failed'

    // Update transcript as failed
    await supabase
      .from('transcripts')
      .update({
        transcription_status: finalStatus,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        processing_completed_at: new Date().toISOString(),
        processing_duration_seconds: Math.floor((Date.now() - startTime) / 1000),
      })
      .eq('call_id', callId)

    // Update job
    await supabase
      .from('transcription_jobs')
      .update({
        status: finalStatus,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        retry_count: retryCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}


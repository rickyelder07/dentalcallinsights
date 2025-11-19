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
import { sendEvent } from '@/lib/inngest'
import { extractStorageFilename } from '@/lib/storage'
import {
  transcribeAudioFromUrl,
  calculateConfidenceScore,
  formatSegmentsToTimestamps,
  validateTranscriptionConfig,
  isTranscriptionError,
} from '@/lib/transcription-provider'
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
    const body: TranscriptionRequest & { forceRetranscribe?: boolean } = await req.json()
    const { callId, language, prompt, forceRetranscribe = false } = body
    console.log('Request body parsed:', { callId, language, prompt, forceRetranscribe })

    // Validate input
    if (!callId) {
      return NextResponse.json(
        { error: 'Missing required field: callId' },
        { status: 400 }
      )
    }

    // Validate transcription provider configuration
    console.log('Validating transcription provider configuration...')
    const configValidation = await validateTranscriptionConfig()
    if (!configValidation.valid) {
      console.error(`${configValidation.provider} configuration invalid:`, configValidation.error)
      return NextResponse.json(
        { error: configValidation.error },
        { status: 500 }
      )
    }
    console.log(`${configValidation.provider} configuration valid`)

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
    // First, fetch the call without user_id filter to check team access
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .single()

    if (callError || !call) {
      console.error('Call fetch error:', callError)
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this call:
    // 1. User owns the call, OR
    // 2. User is in the same team as the call owner
    const hasAccess = call.user_id === user.id

    if (!hasAccess) {
      // Check if users are in the same team
      const { data: teamMemberships, error: teamError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)

      if (teamError) {
        console.error('Team membership check error:', teamError)
        return NextResponse.json(
          { error: 'Error checking team access' },
          { status: 500 }
        )
      }

      const userTeamIds = new Set((teamMemberships || []).map((tm: any) => tm.team_id))

      // Check if call owner is in any of the user's teams
      const { data: ownerMemberships, error: ownerError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', call.user_id)
        .in('team_id', Array.from(userTeamIds))

      if (ownerError) {
        console.error('Owner team membership check error:', ownerError)
        return NextResponse.json(
          { error: 'Error checking team access' },
          { status: 500 }
        )
      }

      // If call has team_id, check if user is member of that team
      // OR if call owner and user share any team
      const hasTeamAccess = 
        (call.team_id && userTeamIds.has(call.team_id)) ||
        (ownerMemberships && ownerMemberships.length > 0)

      if (!hasTeamAccess) {
        console.log('Access denied:', {
          callUserId: call.user_id,
          currentUserId: user.id,
          callTeamId: call.team_id,
          userTeamIds: Array.from(userTeamIds),
        })
        return NextResponse.json(
          { error: 'Call not found or access denied' },
          { status: 403 }
        )
      }
    }

    // Check if call is "No Call Recording" - auto-complete
    if (call.filename === 'No Call Recording') {
      console.log('No Call Recording detected - auto-completing transcription')
      
      // Create completed transcript record
      const { error: upsertError } = await supabase
        .from('transcripts')
        .upsert(
          {
            call_id: callId,
            user_id: user.id,
            team_id: call.team_id || null, // Include team_id from call
            transcript: 'No recording available for this call.',
            raw_transcript: 'No recording available for this call.',
            transcription_status: 'completed',
            confidence_score: 0,
            processing_started_at: new Date().toISOString(),
            processing_completed_at: new Date().toISOString(),
            edit_count: 0,
          },
          { onConflict: 'call_id' }
        )

      if (upsertError) {
        console.error('Failed to create No Call Recording transcript:', upsertError)
      }

      // Create completed job record
      const { error: jobError } = await supabase
        .from('transcription_jobs')
        .upsert(
          {
            call_id: callId,
            user_id: user.id,
            team_id: call.team_id || null, // Include team_id from call
            status: 'completed',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            metadata: { auto_completed: true, reason: 'No Call Recording' },
          },
          { onConflict: 'call_id' }
        )

      if (jobError) {
        console.error('Failed to create No Call Recording job:', jobError)
      }

      return NextResponse.json(
        {
          message: 'No recording available - transcription marked as complete',
          status: 'completed',
          autoCompleted: true,
        },
        { status: 200 }
      )
    }

    // Log call duration for debugging
    console.log(`Call duration: ${call.call_duration_seconds} seconds`)
    
    // Warn about long calls
    if (call.call_duration_seconds && call.call_duration_seconds > 60) {
      console.log(`⚠️ Long call detected (${call.call_duration_seconds}s). This may take several minutes to transcribe.`)
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
            user_id: user.id,
            team_id: call.team_id || null, // Include team_id from call
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

    // Check if transcription already exists (skip if forcing re-transcription)
    if (!forceRetranscribe) {
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
    } else {
      console.log('Force re-transcribe enabled - will overwrite existing transcript')
    }

    // Check if job already exists
    const { data: existingJob } = await supabase
      .from('transcription_jobs')
      .select('*')
      .eq('call_id', callId)
      .single()

    if (existingJob && existingJob.status === 'processing' && !forceRetranscribe) {
      return NextResponse.json(
        {
          error: 'Transcription already in progress',
          jobId: existingJob.id,
        },
        { status: 409 }
      )
    }
    
    // If force retranscribe and job is processing, we'll overwrite it
    if (forceRetranscribe && existingJob && existingJob.status === 'processing') {
      console.log('Cancelling existing processing job for re-transcription')
      // The new job creation below will overwrite this
    }

    // Create or update transcription job
    const jobData = {
      call_id: callId,
      user_id: user.id,
      team_id: call.team_id || null, // Include team_id from call
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
        team_id: call.team_id || null, // Include team_id from call
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

    // Apply inbound call language logic: use standard auto-detect for inbound calls
    // Add prompt to skip first 30 seconds of answering machine
    let effectiveLanguage = language
    let effectivePrompt = prompt
    
    if (!effectiveLanguage || effectiveLanguage.trim() === '') {
      const isInbound = call.call_direction?.toLowerCase() === 'inbound'
      if (isInbound) {
        console.log(`Inbound call with auto-detect - using standard auto-detection (will skip first 30 seconds of answering machine)`)
        effectivePrompt = (prompt || '') + ' This is an inbound phone call. The first 30 seconds contain an automated English greeting. Focus on transcribing the actual conversation that follows.'
      }
    }

    // Trigger Inngest transcription event
    // This will handle long-running transcriptions without timeout limits
    try {
      // Extract storage filename from audio_path (actual file name in storage)
      const storageFilename = extractStorageFilename(call.audio_path) || call.filename
      
      await sendEvent('transcription/start', {
        callId,
        userId: user.id,
        filename: storageFilename,
        audioPath: call.audio_path,
        language: effectiveLanguage,
        prompt: effectivePrompt,
      })
      console.log(`Inngest transcription event triggered for call ${callId}`)
    } catch (error) {
      console.error('Failed to trigger Inngest transcription:', error)
      // Fallback to direct processing for short calls
      if (call.call_duration_seconds && call.call_duration_seconds < 60) {
        console.log('Falling back to direct processing for short call')
        // Extract storage filename from audio_path (actual file name in storage)
        const storageFilename = extractStorageFilename(call.audio_path) || call.filename
        
        setImmediate(() => {
          processTranscription(callId, call.audio_path, storageFilename, user.id, jobId, {
            language: effectiveLanguage,
            prompt: effectivePrompt,
          }).catch(async (error) => {
            console.error('Fallback transcription error:', error)
            await supabase
              .from('transcription_jobs')
              .update({ 
                status: 'failed', 
                error_message: error instanceof Error ? error.message : 'Unknown error',
                completed_at: new Date().toISOString()
              })
              .eq('id', jobId)
          })
        })
      } else {
        // For long calls, fail if Inngest is not available
        await supabase
          .from('transcription_jobs')
          .update({ 
            status: 'failed', 
            error_message: 'Inngest service unavailable for long transcription',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId)
        
        return NextResponse.json(
          { error: 'Transcription service unavailable' },
          { status: 503 }
        )
      }
    }

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
  const MAX_PROCESSING_TIME = 4 * 60 * 1000 // 4 minutes (under Vercel's 5min limit)

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
    // Get call details to check direction for inbound call logic
    const { data: callData } = await supabase
      .from('calls')
      .select('call_direction')
      .eq('id', callId)
      .single()

    // Apply inbound call language logic: use standard auto-detect for inbound calls
    // Add prompt to skip first 30 seconds of answering machine
    let effectiveLanguage = options.language
    let effectivePrompt = options.prompt
    
    if (!effectiveLanguage || effectiveLanguage.trim() === '') {
      const isInbound = callData?.call_direction?.toLowerCase() === 'inbound'
      if (isInbound) {
        console.log(`Inbound call with auto-detect - using standard auto-detection (will skip first 30 seconds of answering machine)`)
        effectivePrompt = (options.prompt || '') + ' This is an inbound phone call. The first 30 seconds contain an automated English greeting. Focus on transcribing the actual conversation that follows.'
      }
    }

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

    // Transcribe audio with timeout protection
    console.log(`Starting transcription for ${filename}...`)
    const transcriptionStartTime = Date.now()
    
    const whisperResponse = await transcribeAudioFromUrl(
      signedUrlData.signedUrl,
      filename,
      {
        language: effectiveLanguage,
        prompt: effectivePrompt,
        responseFormat: 'verbose_json',
        timestampGranularities: ['segment'],
      }
    )
    
    const transcriptionDuration = Date.now() - transcriptionStartTime
    console.log(`OpenAI transcription completed for ${filename} in ${transcriptionDuration}ms`)

    // Calculate metrics
    const confidenceScore = calculateConfidenceScore(whisperResponse.segments)
    const timestamps = whisperResponse.segments
      ? formatSegmentsToTimestamps(whisperResponse.segments)
      : []
    const processingDuration = Math.floor((Date.now() - startTime) / 1000)

    // Translate if Spanish
    let transcriptText = whisperResponse.text
    let wasTranslated = false
    let originalLanguage = null
    const detectedLanguage = (whisperResponse.language || options.language || 'en').toLowerCase()
    
    if (detectedLanguage === 'es' || detectedLanguage === 'spanish' || detectedLanguage === 'spa') {
      console.log(`Spanish detected for call ${callId}, translating to English...`)
      try {
        const { translateSpanishToEnglish } = await import('@/lib/openai')
        transcriptText = await translateSpanishToEnglish(whisperResponse.text)
        wasTranslated = true
        originalLanguage = detectedLanguage
        console.log(`Translation completed for call ${callId}`)
      } catch (error) {
        console.error(`Translation failed for call ${callId}, using original Spanish text:`, error)
      }
    }

    // Apply user-managed corrections to transcript
    const { applyUserCorrections } = await import('@/lib/transcription-corrections')
    const correctedText = await applyUserCorrections(transcriptText, userId)

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
        language: wasTranslated ? 'en' : (whisperResponse.language || options.language || 'en'),
        timestamps: timestamps,
        processing_completed_at: new Date().toISOString(),
        processing_duration_seconds: processingDuration,
        error_message: null,
        was_translated: wasTranslated,
        original_language: originalLanguage,
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

    // Generate embeddings automatically
    try {
      console.log(`Generating embeddings for call ${callId}`)
      console.log(`Corrected text length: ${correctedText?.length || 0}`)
      console.log(`Corrected text preview: ${correctedText?.substring(0, 100) || 'null'}`)
      
      const { generateAutomaticEmbedding } = await import('@/lib/auto-embeddings')
      
      // Use correctedText if available, otherwise fall back to raw transcript
      const textToEmbed = correctedText || whisperResponse.text
      
      console.log(`Text to embed for call ${callId}:`, {
        correctedText: correctedText ? correctedText.substring(0, 100) + '...' : 'null',
        correctedTextLength: correctedText?.length || 0,
        whisperResponseText: whisperResponse.text ? whisperResponse.text.substring(0, 100) + '...' : 'null',
        whisperResponseTextLength: whisperResponse.text?.length || 0,
        finalTextToEmbed: textToEmbed ? textToEmbed.substring(0, 100) + '...' : 'null',
        finalTextToEmbedLength: textToEmbed?.length || 0
      })
      
      const result = await generateAutomaticEmbedding(
        callId,
        userId,
        textToEmbed,
        'transcript'
      )
      
      if (result.success) {
        console.log(`Embedding ${result.cached ? 'cached' : 'generated'} for ${callId}`)
      } else {
        console.error(`Failed to generate embedding for ${callId}:`, result.error)
      }
    } catch (embeddingError) {
      console.error(`Error generating embedding for ${callId}:`, embeddingError)
      // Don't fail the transcription if embedding generation fails
    }

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
    const isRetryable = isTranscriptionError(error as Error) && (error as any).retryable

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


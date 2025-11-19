/**
 * Inngest Transcription Functions
 * Handles long-running transcription jobs without timeout limits
 */

import { inngest } from './inngest'
import { createAdminClient } from './supabase-server'
import {
  transcribeAudioFromUrl,
  calculateConfidenceScore,
  formatSegmentsToTimestamps,
  validateTranscriptionConfig,
} from './transcription-provider'
import { applyUserCorrections } from './transcription-corrections'
import { updateTranscriptionProgress, markTranscriptionComplete, markTranscriptionFailed } from './inngest'
import { extractStorageFilename } from './storage'

const STORAGE_BUCKET = 'audio-files'

/**
 * Main transcription function
 * Handles the complete transcription pipeline with progress tracking
 */
export const transcribeCall = inngest.createFunction(
  {
    id: 'transcribe-call',
    name: 'Transcribe Audio Call',
    retries: 3, // Retry up to 3 times on failure
    cancelOn: [
      { event: 'transcription/cancel', match: 'data.callId' }
    ],
  },
  { event: 'transcription/start' },
  async ({ event, step }) => {
    const { callId, userId, filename, audioPath, language, prompt } = event.data
    
    console.log(`Starting Inngest transcription for call ${callId}`)
    
    // Step 1: Validate configuration and get call details
    const callDetails = await step.run('validate-and-fetch', async () => {
      console.log(`Fetching call details for ${callId}`)
      
      // Validate transcription provider configuration
      const configValidation = await validateTranscriptionConfig()
      if (!configValidation.valid) {
        throw new Error(`${configValidation.provider} configuration invalid: ${configValidation.error}`)
      }
      
      // Get call details from database
      // First fetch without user_id filter to check team access
      const supabase = createAdminClient()
      const { data: call, error } = await supabase
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single()
      
      if (error || !call) {
        throw new Error(`Call not found: ${error?.message || 'Unknown error'}`)
      }

      // Check if user has access to this call:
      // 1. User owns the call, OR
      // 2. User is in the same team as the call owner
      const hasAccess = call.user_id === userId

      if (!hasAccess) {
        // Check if users are in the same team
        const { data: teamMemberships, error: teamError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', userId)

        if (teamError) {
          throw new Error(`Error checking team access: ${teamError.message}`)
        }

        const userTeamIds = new Set((teamMemberships || []).map((tm: any) => tm.team_id))

        // Check if call owner is in any of the user's teams
        const { data: ownerMemberships, error: ownerError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', call.user_id)
          .in('team_id', Array.from(userTeamIds))

        if (ownerError) {
          throw new Error(`Error checking owner team access: ${ownerError.message}`)
        }

        // If call has team_id, check if user is member of that team
        // OR if call owner and user share any team
        const hasTeamAccess = 
          (call.team_id && userTeamIds.has(call.team_id)) ||
          (ownerMemberships && ownerMemberships.length > 0)

        if (!hasTeamAccess) {
          throw new Error(`Call not found or access denied: User ${userId} does not have access to call ${callId}`)
        }
      }
      
      console.log(`Call details fetched: ${call.filename}, duration: ${call.call_duration_seconds}s, direction: ${call.call_direction}`)
      return call
    })
    
    // Step 2: Detect language for inbound calls (skip first 15 seconds)
    // For inbound calls without language specified, detect language from segment 15-30 seconds
    const detectedLanguage = await step.run('detect-language', async () => {
      // If language is manually specified, use it
      if (language) {
        console.log(`Using manually specified language: ${language}`)
        return language
      }

      // For inbound calls, detect language from segment after answering machine
      const isInbound = callDetails.call_direction?.toLowerCase() === 'inbound'
      
      if (isInbound) {
        console.log(`Inbound call detected - will detect language from segment 15-30 seconds`)
        // We'll detect language during transcription by using a prompt
        // that emphasizes detecting the actual conversation language
        // Return null to trigger auto-detection with Spanish bias
        return null
      }

      // For outbound calls, use standard auto-detection
      console.log(`Outbound call - using standard auto-detection`)
      return null
    })
    
    // Step 3: Create signed URL for audio file
    const signedUrl = await step.run('create-signed-url', async () => {
      // Extract storage filename from audio_path (actual file name in storage)
      // Use audioPath from event if available, otherwise fall back to call.audio_path
      const actualAudioPath = audioPath || callDetails.audio_path
      const storageFilename = extractStorageFilename(actualAudioPath) || filename || callDetails.filename
      
      // Use call owner's user_id for storage path (files are stored in their folder)
      const callOwnerId = callDetails.user_id
      
      console.log(`Creating signed URL for ${storageFilename}`)
      console.log(`Using call owner ID: ${callOwnerId}, audio_path: ${actualAudioPath}`)
      
      const supabase = createAdminClient()
      const storagePath = `${callOwnerId}/${storageFilename}`
      
      const { data: signedUrlData, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 3600) // 1 hour expiry
      
      if (error || !signedUrlData?.signedUrl) {
        console.error(`Failed to create signed URL for path: ${storagePath}`)
        console.error(`Error details:`, error)
        throw new Error(`Failed to create signed URL: ${error?.message || 'Unknown error'}`)
      }
      
      console.log(`Signed URL created for: ${storagePath}`)
      return signedUrlData.signedUrl
    })
    
    // Step 4: Download and transcribe audio with language detection
    const transcriptionResult = await step.run('transcribe-audio', async () => {
      const provider = process.env.TRANSCRIPTION_PROVIDER || 'deepgram'
      const isInbound = callDetails.call_direction?.toLowerCase() === 'inbound'
      
      console.log(`Starting ${provider} transcription for ${filename}`)
      console.log(`Call direction: ${callDetails.call_direction}, Language: ${language || 'auto-detect'}`)
      
      try {
        // Update progress
        await updateTranscriptionProgress(callId, '', 25, 'downloading', 'Downloading audio file...')
        
        // For inbound calls without language, use a prompt to help detect Spanish
        // The prompt guides the model to focus on the actual conversation (after answering machine)
        let transcriptionPrompt = prompt
        let transcriptionLanguage = language || detectedLanguage
        
        if (isInbound && !transcriptionLanguage) {
          // For inbound calls, add prompt to help detect Spanish
          // Emphasize that the first 15 seconds contain an English answering machine
          // and the actual conversation language should be detected from the rest
          transcriptionPrompt = (prompt || '') + ' This is an inbound phone call. Ignore the first 15 seconds which contain an automated English greeting. Detect the primary language spoken in the actual conversation that follows. The conversation is likely in Spanish.'
          console.log(`Inbound call - using enhanced language detection prompt to skip answering machine`)
        }
        
        // Transcribe audio with enhanced logging
        // Deepgram Nova-2 is already the default model (set in deepgram.ts)
        const whisperResponse = await transcribeAudioFromUrl(
          signedUrl,
          filename,
          {
            language: transcriptionLanguage || undefined, // Let provider auto-detect if not specified
            prompt: transcriptionPrompt,
            responseFormat: 'verbose_json',
            timestampGranularities: ['segment'],
          }
        )
        
        console.log(`${provider} transcription completed for ${filename}`)
        console.log(`Detected language: ${whisperResponse.language}`)
        
        // For inbound calls, if English was detected but we suspect Spanish,
        // check the transcript content for Spanish indicators
        if (isInbound && !transcriptionLanguage && whisperResponse.language?.toLowerCase() === 'en') {
          const transcriptText = whisperResponse.text?.toLowerCase() || ''
          // Check for common Spanish words/phrases
          const spanishIndicators = ['hola', 'gracias', 'por favor', 'buenos días', 'buenas tardes', 'señor', 'señora', 'llamada', 'llamar']
          const hasSpanishContent = spanishIndicators.some(word => transcriptText.includes(word))
          
          if (hasSpanishContent) {
            console.log(`Spanish content detected in transcript - re-transcribing with Spanish language`)
            // Re-transcribe with Spanish forced
            // Deepgram Nova-2 is already the default model
            const spanishResponse = await transcribeAudioFromUrl(
              signedUrl,
              filename,
              {
                language: 'es',
                prompt: transcriptionPrompt,
                responseFormat: 'verbose_json',
                timestampGranularities: ['segment'],
              }
            )
            
            console.log(`Re-transcription with Spanish completed`)
            const confidenceScore = calculateConfidenceScore(spanishResponse.segments)
            const timestamps = spanishResponse.segments
              ? formatSegmentsToTimestamps(spanishResponse.segments)
              : []
            
            return {
              text: spanishResponse.text,
              segments: spanishResponse.segments,
              confidenceScore,
              timestamps,
              language: 'es',
            }
          }
        }
        
        // Update progress
        await updateTranscriptionProgress(callId, '', 75, 'transcribing', 'Processing transcription...')
        
        // Calculate metrics
        const confidenceScore = calculateConfidenceScore(whisperResponse.segments)
        const timestamps = whisperResponse.segments
          ? formatSegmentsToTimestamps(whisperResponse.segments)
          : []
        
        return {
          text: whisperResponse.text,
          segments: whisperResponse.segments,
          confidenceScore,
          timestamps,
          language: whisperResponse.language || transcriptionLanguage || 'en',
        }
      } catch (error) {
        console.error(`Transcription failed for ${filename}:`, error)
        throw error
      }
    })
    
    // Step 4: Translate if Spanish
    const translationResult = await step.run('translate-spanish', async () => {
      const detectedLanguage = transcriptionResult.language?.toLowerCase()
      
      // Check if language is Spanish
      if (detectedLanguage === 'es' || detectedLanguage === 'spanish' || detectedLanguage === 'spa') {
        console.log(`Spanish detected for ${filename}, translating to English...`)
        
        try {
          const { translateSpanishToEnglish } = await import('@/lib/openai')
          const translatedText = await translateSpanishToEnglish(transcriptionResult.text)
          console.log(`Translation completed for ${filename}`)
          
          return {
            text: translatedText,
            wasTranslated: true,
            originalLanguage: detectedLanguage,
          }
        } catch (error) {
          console.error(`Translation failed for ${filename}, using original Spanish text:`, error)
          return {
            text: transcriptionResult.text,
            wasTranslated: false,
            originalLanguage: detectedLanguage,
          }
        }
      }
      
      // Not Spanish, return original
      return {
        text: transcriptionResult.text,
        wasTranslated: false,
        originalLanguage: null,
      }
    })
    
    // Step 5: Apply user corrections
    const correctedText = await step.run('apply-corrections', async () => {
      console.log(`Applying user corrections for ${filename}`)
      
      try {
        const corrected = await applyUserCorrections(translationResult.text, userId)
        console.log(`User corrections applied for ${filename}`)
        return corrected
      } catch (error) {
        console.warn(`Failed to apply corrections for ${filename}, using original text:`, error)
        return translationResult.text
      }
    })
    
    // Step 6: Save results to database
    const saveResult = await step.run('save-results', async () => {
      console.log(`Saving transcription results for ${callId}`)
      
      const supabase = createAdminClient()
      const processingDuration = Math.floor((Date.now() - Date.now()) / 1000) // This will be calculated properly
      
      // Update transcript with results
      const { data: transcript, error: transcriptError } = await supabase
        .from('transcripts')
        .upsert({
          call_id: callId,
          user_id: userId,
          team_id: callDetails.team_id || null, // Include team_id from call
          raw_transcript: transcriptionResult.text,
          edited_transcript: correctedText,
          transcript: correctedText, // Legacy field
          transcription_status: 'completed',
          confidence_score: transcriptionResult.confidenceScore,
          language: translationResult.wasTranslated ? 'en' : transcriptionResult.language,
          timestamps: transcriptionResult.timestamps,
          processing_completed_at: new Date().toISOString(),
          processing_duration_seconds: processingDuration,
          error_message: null,
          was_translated: translationResult.wasTranslated,
          original_language: translationResult.originalLanguage,
        }, {
          onConflict: 'call_id',
          ignoreDuplicates: false,
        })
        .select('id')
        .single()
      
      if (transcriptError) {
        throw new Error(`Failed to save transcript: ${transcriptError.message}`)
      }
      
      // Update transcription job status
      const { error: jobError } = await supabase
        .from('transcription_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('call_id', callId)
      
      if (jobError) {
        console.warn(`Failed to update job status: ${jobError.message}`)
      }
      
      console.log(`Transcription results saved for ${callId}`)
      return transcript
    })
    
    // Step 7: Generate embeddings automatically
    await step.run('generate-embeddings', async () => {
      console.log(`Generating embeddings for ${callId}`)
      console.log(`Corrected text length: ${correctedText?.length || 0}`)
      console.log(`Corrected text preview: ${correctedText?.substring(0, 100) || 'null'}`)
      
      try {
        const { generateAutomaticEmbedding } = await import('@/lib/auto-embeddings')
        
        // Use correctedText if available, otherwise fall back to raw transcript
        const textToEmbed = correctedText || transcriptionResult.text
        
        console.log(`Text to embed for call ${callId}:`, {
          correctedText: correctedText ? correctedText.substring(0, 100) + '...' : 'null',
          correctedTextLength: correctedText?.length || 0,
          transcriptionResultText: transcriptionResult.text ? transcriptionResult.text.substring(0, 100) + '...' : 'null',
          transcriptionResultTextLength: transcriptionResult.text?.length || 0,
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
        
        return result
      } catch (error) {
        console.error(`Error generating embedding for ${callId}:`, error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })
    
    // Step 7: Send completion event
    await step.run('send-completion-event', async () => {
      await markTranscriptionComplete(
        callId,
        '', // jobId will be updated by the API
        correctedText,
        transcriptionResult.text,
        transcriptionResult.confidenceScore,
        saveResult.processing_duration_seconds || 0,
        transcriptionResult.language,
        transcriptionResult.timestamps
      )
    })
    
    console.log(`Inngest transcription completed successfully for ${callId}`)
    return {
      success: true,
      callId,
      transcriptId: saveResult.id,
      confidenceScore: transcriptionResult.confidenceScore,
      processingDuration: saveResult.processing_duration_seconds,
    }
  }
)

/**
 * Error handling function
 * Handles transcription failures and updates database
 */
export const handleTranscriptionError = inngest.createFunction(
  {
    id: 'handle-transcription-error',
    name: 'Handle Transcription Error',
  },
  { event: 'transcription/failed' },
  async ({ event, step }) => {
    const { callId, jobId, error, stage } = event.data
    
    console.log(`Handling transcription error for ${callId}: ${error}`)
    
    await step.run('update-failed-status', async () => {
      const supabase = createAdminClient()
      
      // Update transcript as failed
      await supabase
        .from('transcripts')
        .update({
          transcription_status: 'failed',
          error_message: error,
          processing_completed_at: new Date().toISOString(),
        })
        .eq('call_id', callId)
      
      // Update job status
      await supabase
        .from('transcription_jobs')
        .update({
          status: 'failed',
          error_message: error,
          completed_at: new Date().toISOString(),
        })
        .eq('call_id', callId)
      
      console.log(`Failed status updated for ${callId}`)
    })
  }
)

/**
 * Progress tracking function
 * Updates database with progress information
 */
export const trackTranscriptionProgress = inngest.createFunction(
  {
    id: 'track-transcription-progress',
    name: 'Track Transcription Progress',
  },
  { event: 'transcription/progress' },
  async ({ event, step }) => {
    const { callId, jobId, progress, stage, message } = event.data
    
    await step.run('update-progress', async () => {
      const supabase = createAdminClient()
      
      // Update job metadata with progress
      await supabase
        .from('transcription_jobs')
        .update({
          metadata: {
            progress,
            stage,
            message,
            last_updated: new Date().toISOString(),
          },
        })
        .eq('call_id', callId)
      
      console.log(`Progress updated for ${callId}: ${progress}% (${stage})`)
    })
  }
)

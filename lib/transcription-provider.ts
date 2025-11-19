/**
 * Transcription Provider Abstraction Layer
 * Allows switching between OpenAI Whisper and Deepgram with automatic fallback
 * 
 * Configuration:
 * - Set TRANSCRIPTION_PROVIDER=deepgram or TRANSCRIPTION_PROVIDER=openai
 * - Defaults to 'openai' if not specified
 * - Falls back to OpenAI if Deepgram fails and FALLBACK_TO_OPENAI=true
 */

import type {
  WhisperResponse,
  WhisperSegment,
  TranscriptionError,
} from '@/types/transcription'
import { TranscriptionErrorCode } from '@/types/transcription'
import { createTranscriptionError, isTranscriptionError } from './openai'

// ============================================
// CONFIGURATION
// ============================================

// Default to Deepgram Nova-2 as primary provider (Whisper as fallback)
const PROVIDER = (process.env.TRANSCRIPTION_PROVIDER || 'deepgram').toLowerCase()
const FALLBACK_ENABLED = process.env.FALLBACK_TO_OPENAI !== 'false' // Default true
const PRIMARY_PROVIDER = PROVIDER === 'deepgram' ? 'deepgram' : 'openai'

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface TranscribeOptions {
  language?: string
  prompt?: string
  temperature?: number
  responseFormat?: 'json' | 'text' | 'srt' | 'vtt' | 'verbose_json'
  timestampGranularities?: ('word' | 'segment')[]
}

// ============================================
// PROVIDER FUNCTIONS
// ============================================

/**
 * Transcribe audio file using the configured provider with automatic fallback
 * 
 * @param audioFile - Audio file as Blob, File, or Buffer
 * @param filename - Original filename
 * @param options - Transcription options
 * @returns WhisperResponse format (compatible with existing code)
 */
export async function transcribeAudio(
  audioFile: Blob | File | Buffer,
  filename: string,
  options: TranscribeOptions = {}
): Promise<WhisperResponse> {
  // Try primary provider first
  try {
    if (PRIMARY_PROVIDER === 'deepgram') {
      console.log(`[Transcription] Using Deepgram provider for ${filename}`)
      const { transcribeAudio: deepgramTranscribe } = await import('./deepgram')
      return await deepgramTranscribe(audioFile, filename, {
        language: options.language,
        prompt: options.prompt,
        model: process.env.DEEPGRAM_MODEL || 'nova-2', // Default to Nova-2
      })
    } else {
      console.log(`[Transcription] Using OpenAI Whisper provider for ${filename}`)
      const { transcribeAudio: openaiTranscribe } = await import('./openai')
      return await openaiTranscribe(audioFile, filename, options)
    }
  } catch (primaryError) {
    // Check if fallback is enabled and error is retryable
    if (FALLBACK_ENABLED && PRIMARY_PROVIDER === 'deepgram') {
      const isRetryable = isTranscriptionError(primaryError) 
        ? primaryError.retryable 
        : true

      if (isRetryable) {
        console.warn(`[Transcription] Deepgram failed for ${filename}, falling back to OpenAI Whisper`)
        console.warn(`[Transcription] Error:`, primaryError instanceof Error ? primaryError.message : primaryError)
        
        try {
          const { transcribeAudio: openaiTranscribe } = await import('./openai')
          return await openaiTranscribe(audioFile, filename, options)
        } catch (fallbackError) {
          // If fallback also fails, throw the original error
          console.error(`[Transcription] Fallback to OpenAI also failed:`, fallbackError)
          throw primaryError
        }
      }
    }
    
    // No fallback or non-retryable error - throw original error
    throw primaryError
  }
}

/**
 * Transcribe audio from URL using the configured provider with automatic fallback
 * 
 * @param audioUrl - URL to audio file
 * @param filename - Original filename
 * @param options - Transcription options
 * @returns WhisperResponse format (compatible with existing code)
 */
export async function transcribeAudioFromUrl(
  audioUrl: string,
  filename: string,
  options: TranscribeOptions = {}
): Promise<WhisperResponse> {
  // Try primary provider first
  try {
    if (PRIMARY_PROVIDER === 'deepgram') {
      console.log(`[Transcription] Using Deepgram provider for ${filename}`)
      const { transcribeAudioFromUrl: deepgramTranscribe } = await import('./deepgram')
      return await deepgramTranscribe(audioUrl, filename, {
        language: options.language,
        prompt: options.prompt,
        model: process.env.DEEPGRAM_MODEL || 'nova-2', // Default to Nova-2
      })
    } else {
      console.log(`[Transcription] Using OpenAI Whisper provider for ${filename}`)
      const { transcribeAudioFromUrl: openaiTranscribe } = await import('./openai')
      return await openaiTranscribe(audioUrl, filename, options)
    }
  } catch (primaryError) {
    // Check if fallback is enabled and error is retryable
    if (FALLBACK_ENABLED && PRIMARY_PROVIDER === 'deepgram') {
      const isRetryable = isTranscriptionError(primaryError) 
        ? primaryError.retryable 
        : true

      if (isRetryable) {
        console.warn(`[Transcription] Deepgram failed for ${filename}, falling back to OpenAI Whisper`)
        console.warn(`[Transcription] Error:`, primaryError instanceof Error ? primaryError.message : primaryError)
        
        try {
          const { transcribeAudioFromUrl: openaiTranscribe } = await import('./openai')
          return await openaiTranscribe(audioUrl, filename, options)
        } catch (fallbackError) {
          // If fallback also fails, throw the original error
          console.error(`[Transcription] Fallback to OpenAI also failed:`, fallbackError)
          throw primaryError
        }
      }
    }
    
    // No fallback or non-retryable error - throw original error
    throw primaryError
  }
}

/**
 * Validate transcription provider configuration
 * Returns validation for the primary provider
 */
export async function validateTranscriptionConfig(): Promise<{ valid: boolean; error?: string; provider: string }> {
  if (PRIMARY_PROVIDER === 'deepgram') {
    const { validateDeepgramConfig } = await import('./deepgram')
    const validation = validateDeepgramConfig()
    return {
      ...validation,
      provider: 'deepgram',
    }
  } else {
    const { validateOpenAIConfig } = await import('./openai')
    const validation = validateOpenAIConfig()
    return {
      ...validation,
      provider: 'openai',
    }
  }
}

// Re-export helper functions from OpenAI (these work with WhisperResponse format)
export {
  calculateConfidenceScore,
  formatSegmentsToTimestamps,
  estimateTranscriptionCost,
  estimateProcessingTime,
  createTranscriptionError,
  isTranscriptionError,
} from './openai'

// Re-export translation function (still uses OpenAI)
export { translateSpanishToEnglish } from './openai'


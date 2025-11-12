/**
 * Deepgram Transcription Provider
 * Alternative to OpenAI Whisper with higher rate limits and better pricing
 * 
 * Rate Limits: 10,000+ RPM (vs OpenAI's 500 RPM)
 * Pricing: ~$0.0043/min (vs OpenAI's $0.006/min)
 */

import { createClient } from '@deepgram/sdk'
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

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY
const DEEPGRAM_MODEL = process.env.DEEPGRAM_MODEL || 'nova-2' // Options: nova-2, whisper-large, base
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2GB (Deepgram's limit, much higher than Whisper)

/**
 * Supported audio formats by Deepgram API
 */
export const DEEPGRAM_SUPPORTED_FORMATS = [
  'mp3',
  'mp4',
  'm4a',
  'wav',
  'webm',
  'mpga',
  'mpeg',
  'flac',
  'aac',
  'ogg',
  'opus',
  'mov',
] as const

// ============================================
// TRANSCRIPTION OPTIONS
// ============================================

export interface DeepgramTranscribeOptions {
  language?: string // ISO-639-1 language code (e.g., 'en', 'es', 'fr')
  prompt?: string // Optional text to guide the model (Deepgram uses 'keywords' parameter)
  model?: string // Deepgram model: nova-2 (default), whisper-large, base
  punctuate?: boolean // Add punctuation (default: true)
  paragraphs?: boolean // Return paragraphs (default: true)
  diarize?: boolean // Speaker diarization (default: false)
  smart_format?: boolean // Smart formatting (default: true)
  utterances?: boolean // Split into utterances (default: false)
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate Deepgram API key is configured
 */
export function validateDeepgramConfig(): { valid: boolean; error?: string } {
  if (!DEEPGRAM_API_KEY) {
    return {
      valid: false,
      error: 'Deepgram API key not configured. Set DEEPGRAM_API_KEY in environment variables.',
    }
  }

  // Deepgram API keys typically start with specific patterns
  // They're usually long alphanumeric strings
  if (DEEPGRAM_API_KEY.length < 20) {
    return {
      valid: false,
      error: 'Invalid Deepgram API key format. Key appears too short.',
    }
  }

  return { valid: true }
}

// ============================================
// TRANSCRIPTION FUNCTIONS
// ============================================

/**
 * Transcribe audio file using Deepgram API
 * 
 * @param audioFile - Audio file as Blob, File, or Buffer
 * @param filename - Original filename (needed for format detection)
 * @param options - Transcription options
 * @returns WhisperResponse format (compatible with existing code)
 * 
 * @throws {TranscriptionError} If transcription fails
 */
export async function transcribeAudio(
  audioFile: Blob | File | Buffer,
  filename: string,
  options: DeepgramTranscribeOptions = {}
): Promise<WhisperResponse> {
  // Validate API key
  const configValidation = validateDeepgramConfig()
  if (!configValidation.valid) {
    throw createTranscriptionError(
      TranscriptionErrorCode.API_ERROR,
      configValidation.error || 'Deepgram API key not configured',
      false
    )
  }

  try {
    // Validate file size
    let fileSize: number
    if (Buffer.isBuffer(audioFile)) {
      fileSize = audioFile.length
    } else {
      fileSize = audioFile.size
    }

    if (fileSize > MAX_FILE_SIZE) {
      throw createTranscriptionError(
        TranscriptionErrorCode.FILE_TOO_LARGE,
        `File size ${(fileSize / (1024 * 1024)).toFixed(1)}MB exceeds maximum of ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB`,
        false
      )
    }

    // Validate file format
    const fileExtension = filename.split('.').pop()?.toLowerCase()
    if (!fileExtension || !DEEPGRAM_SUPPORTED_FORMATS.includes(fileExtension as any)) {
      throw createTranscriptionError(
        TranscriptionErrorCode.UNSUPPORTED_FORMAT,
        `Unsupported audio format: ${fileExtension}. Supported formats: ${DEEPGRAM_SUPPORTED_FORMATS.join(', ')}`,
        false
      )
    }

    // Initialize Deepgram client
    const deepgram = createClient(DEEPGRAM_API_KEY!)

    // Convert Buffer to Blob if needed
    let fileBlob: Blob
    if (Buffer.isBuffer(audioFile)) {
      const uint8Array = new Uint8Array(audioFile)
      fileBlob = new Blob([uint8Array])
    } else {
      fileBlob = audioFile
    }

    // Prepare Deepgram options
    const deepgramOptions: any = {
      model: options.model || DEEPGRAM_MODEL,
      language: options.language,
      punctuate: options.punctuate !== false, // Default true
      paragraphs: options.paragraphs !== false, // Default true
      diarize: options.diarize || false,
      smart_format: options.smart_format !== false, // Default true
      utterances: options.utterances || false,
    }

    // Add keywords if prompt is provided (Deepgram's equivalent to Whisper's prompt)
    if (options.prompt) {
      // Extract keywords from prompt (simple approach)
      const keywords = options.prompt
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 10) // Limit to 10 keywords
      if (keywords.length > 0) {
        deepgramOptions.keywords = keywords
      }
    }

    // Convert Blob to Buffer for Deepgram SDK
    const arrayBuffer = await fileBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Call Deepgram API
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      buffer,
      deepgramOptions
    )

    if (error) {
      // Handle rate limit errors
      if (error.message?.toLowerCase().includes('rate limit') || 
          error.message?.toLowerCase().includes('429')) {
        throw createTranscriptionError(
          TranscriptionErrorCode.RATE_LIMIT,
          'Deepgram API rate limit exceeded. Please try again later.',
          true
        )
      }

      throw createTranscriptionError(
        TranscriptionErrorCode.API_ERROR,
        error.message || 'Deepgram API error',
        true // Most Deepgram errors are retryable
      )
    }

    // Transform Deepgram response to WhisperResponse format
    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]
    
    if (!transcript) {
      throw createTranscriptionError(
        TranscriptionErrorCode.API_ERROR,
        'No transcript returned from Deepgram',
        false
      )
    }

    // Extract full text
    const text = transcript.transcript || ''

    // Convert Deepgram words to WhisperSegment format
    const segments: WhisperSegment[] = []
    const words = transcript.words || []
    
    // Group words into segments (similar to Whisper's segment structure)
    let currentSegment: {
      words: typeof words
      start: number
      end: number
    } | null = null
    
    const segmentDuration = 30 // Group words into ~30 second segments
    
    for (const word of words) {
      const wordStart = word.start || 0
      const wordEnd = word.end || wordStart
      
      if (!currentSegment || wordStart - currentSegment.start >= segmentDuration) {
        // Save previous segment if exists
        if (currentSegment) {
          const segmentText = currentSegment.words.map((w: any) => w.word || '').join(' ')
          const avgConfidence = currentSegment.words.reduce((sum: number, w: any) => sum + (w.confidence || 0), 0) / currentSegment.words.length
          segments.push({
            id: segments.length,
            seek: currentSegment.start,
            start: currentSegment.start,
            end: currentSegment.end,
            text: segmentText,
            tokens: [],
            temperature: 0,
            avg_logprob: avgConfidence,
            compression_ratio: 0,
            no_speech_prob: 1 - avgConfidence,
          })
        }
        
        // Start new segment
        currentSegment = {
          words: [word],
          start: wordStart,
          end: wordEnd,
        }
      } else {
        // Add word to current segment
        currentSegment.words.push(word)
        currentSegment.end = Math.max(currentSegment.end, wordEnd)
      }
    }
    
    // Add final segment
    if (currentSegment && currentSegment.words.length > 0) {
      const segmentText = currentSegment.words.map((w: any) => w.word || '').join(' ')
      const avgConfidence = currentSegment.words.reduce((sum: number, w: any) => sum + (w.confidence || 0), 0) / currentSegment.words.length
      segments.push({
        id: segments.length,
        seek: currentSegment.start,
        start: currentSegment.start,
        end: currentSegment.end,
        text: segmentText,
        tokens: [],
        temperature: 0,
        avg_logprob: avgConfidence,
        compression_ratio: 0,
        no_speech_prob: 1 - avgConfidence,
      })
    }

    return {
      text,
      language: (result.metadata as any)?.language || options.language || 'en',
      duration: result.metadata?.duration || undefined,
      segments: segments.length > 0 ? segments : undefined,
    }
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw createTranscriptionError(
        TranscriptionErrorCode.NETWORK_ERROR,
        'Network error: Unable to connect to Deepgram API',
        true
      )
    }

    // Re-throw TranscriptionError as-is
    if (isTranscriptionError(error)) {
      throw error
    }

    // Unknown errors
    throw createTranscriptionError(
      TranscriptionErrorCode.UNKNOWN_ERROR,
      error instanceof Error ? error.message : 'Unknown error occurred',
      false
    )
  }
}

/**
 * Transcribe audio from a URL using Deepgram API
 * Downloads the file first, then transcribes
 * 
 * @param audioUrl - URL to audio file
 * @param filename - Original filename
 * @param options - Transcription options
 * @returns WhisperResponse format (compatible with existing code)
 */
export async function transcribeAudioFromUrl(
  audioUrl: string,
  filename: string,
  options: DeepgramTranscribeOptions = {}
): Promise<WhisperResponse> {
  const TRANSCRIPTION_TIMEOUT = 5 * 60 * 1000 // 5 minutes timeout (Deepgram can handle longer files)
  
  try {
    console.log(`[Deepgram] Downloading audio file from URL: ${audioUrl}`)
    console.log(`[Deepgram] File: ${filename}`)
    
    // Validate API key
    const configValidation = validateDeepgramConfig()
    if (!configValidation.valid) {
      throw createTranscriptionError(
        TranscriptionErrorCode.API_ERROR,
        configValidation.error || 'Deepgram API key not configured',
        false
      )
    }

    // Initialize Deepgram client
    const deepgram = createClient(DEEPGRAM_API_KEY!)

    // Prepare Deepgram options
    const deepgramOptions: any = {
      model: options.model || DEEPGRAM_MODEL,
      language: options.language,
      punctuate: options.punctuate !== false,
      paragraphs: options.paragraphs !== false,
      diarize: options.diarize || false,
      smart_format: options.smart_format !== false,
      utterances: options.utterances || false,
    }

    // Add keywords if prompt is provided
    if (options.prompt) {
      const keywords = options.prompt
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 10)
      if (keywords.length > 0) {
        deepgramOptions.keywords = keywords
      }
    }

    // Deepgram supports URL transcription directly
    console.log(`[Deepgram] Starting transcription for ${filename}...`)
    const transcriptionPromise = deepgram.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      deepgramOptions
    )
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Transcription timeout')), TRANSCRIPTION_TIMEOUT)
    })
    
    const { result, error } = await Promise.race([
      transcriptionPromise,
      timeoutPromise,
    ]) as any

    if (error) {
      // Handle rate limit errors
      if (error.message?.toLowerCase().includes('rate limit') || 
          error.message?.toLowerCase().includes('429')) {
        throw createTranscriptionError(
          TranscriptionErrorCode.RATE_LIMIT,
          'Deepgram API rate limit exceeded. Please try again later.',
          true
        )
      }

      throw createTranscriptionError(
        TranscriptionErrorCode.API_ERROR,
        error.message || 'Deepgram API error',
        true
      )
    }

    console.log(`[Deepgram] Transcription completed for ${filename}`)

    // Transform Deepgram response to WhisperResponse format
    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]
    
    if (!transcript) {
      throw createTranscriptionError(
        TranscriptionErrorCode.API_ERROR,
        'No transcript returned from Deepgram',
        false
      )
    }

    const text = transcript.transcript || ''

    // Convert Deepgram words to WhisperSegment format
    const segments: WhisperSegment[] = []
    const words = transcript.words || []
    
    let currentSegment: {
      words: typeof words
      start: number
      end: number
    } | null = null
    
    const segmentDuration = 30 // Group words into ~30 second segments
    
    for (const word of words) {
      const wordStart = word.start || 0
      const wordEnd = word.end || wordStart
      
      if (!currentSegment || wordStart - currentSegment.start >= segmentDuration) {
        if (currentSegment) {
          const segmentText = currentSegment.words.map((w: any) => w.word || '').join(' ')
          const avgConfidence = currentSegment.words.reduce((sum: number, w: any) => sum + (w.confidence || 0), 0) / currentSegment.words.length
          segments.push({
            id: segments.length,
            seek: currentSegment.start,
            start: currentSegment.start,
            end: currentSegment.end,
            text: segmentText,
            tokens: [],
            temperature: 0,
            avg_logprob: avgConfidence,
            compression_ratio: 0,
            no_speech_prob: 1 - avgConfidence,
          })
        }
        
        currentSegment = {
          words: [word],
          start: wordStart,
          end: wordEnd,
        }
      } else {
        currentSegment.words.push(word)
        currentSegment.end = Math.max(currentSegment.end, wordEnd)
      }
    }
    
    if (currentSegment && currentSegment.words.length > 0) {
      const segmentText = currentSegment.words.map((w: any) => w.word || '').join(' ')
      const avgConfidence = currentSegment.words.reduce((sum: number, w: any) => sum + (w.confidence || 0), 0) / currentSegment.words.length
      segments.push({
        id: segments.length,
        seek: currentSegment.start,
        start: currentSegment.start,
        end: currentSegment.end,
        text: segmentText,
        tokens: [],
        temperature: 0,
        avg_logprob: avgConfidence,
        compression_ratio: 0,
        no_speech_prob: 1 - avgConfidence,
      })
    }

    return {
      text,
      language: (result.metadata as any)?.language || options.language || 'en',
      duration: result.metadata?.duration || undefined,
      segments: segments.length > 0 ? segments : undefined,
    }
  } catch (error) {
    console.error(`[Deepgram] Transcription failed for ${filename}:`, error)
    
    if (isTranscriptionError(error)) {
      throw error
    }

    throw createTranscriptionError(
      TranscriptionErrorCode.NETWORK_ERROR,
      `Failed to transcribe audio from URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    )
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  transcribeAudio,
  transcribeAudioFromUrl,
  validateDeepgramConfig,
}


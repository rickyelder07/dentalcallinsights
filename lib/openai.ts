/**
 * OpenAI Client Library
 * Handles Whisper API integration for audio transcription
 * 
 * Security: API key is only used server-side, never exposed to client
 */

import type {
  WhisperResponse,
  WhisperSegment,
  TranscriptionError,
} from '@/types/transcription'

// Import TranscriptionErrorCode as a value (it's an enum)
import { TranscriptionErrorCode } from '@/types/transcription'

// ============================================
// CONFIGURATION
// ============================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_API_BASE = 'https://api.openai.com/v1'
const WHISPER_MODEL = 'whisper-1'
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB (Whisper limit)

/**
 * Supported audio formats by Whisper API
 */
export const SUPPORTED_AUDIO_FORMATS = [
  'mp3',
  'mp4',
  'm4a',
  'wav',
  'webm',
  'mpga',
  'mpeg',
  'flac',
  'aac',
] as const

/**
 * Validate OpenAI API key is configured
 */
export function validateOpenAIConfig(): { valid: boolean; error?: string } {
  if (!OPENAI_API_KEY) {
    return {
      valid: false,
      error: 'OpenAI API key not configured. Set OPENAI_API_KEY in environment variables.',
    }
  }

  if (!OPENAI_API_KEY.startsWith('sk-')) {
    return {
      valid: false,
      error: 'Invalid OpenAI API key format. Key should start with "sk-".',
    }
  }

  return { valid: true }
}

// ============================================
// TRANSCRIPTION OPTIONS
// ============================================

export interface TranscribeOptions {
  language?: string // ISO-639-1 language code (e.g., 'en', 'es', 'fr')
  prompt?: string // Optional text to guide the model's style
  temperature?: number // 0-1, sampling temperature (default: 0)
  responseFormat?: 'json' | 'text' | 'srt' | 'vtt' | 'verbose_json'
  timestampGranularities?: ('word' | 'segment')[]
}

// ============================================
// MAIN TRANSCRIPTION FUNCTION
// ============================================

/**
 * Transcribe audio file using OpenAI Whisper API
 * 
 * @param audioFile - Audio file as Blob, File, or Buffer
 * @param filename - Original filename (needed for format detection)
 * @param options - Transcription options
 * @returns Whisper API response with transcript
 * 
 * @throws {TranscriptionError} If transcription fails
 */
export async function transcribeAudio(
  audioFile: Blob | File | Buffer,
  filename: string,
  options: TranscribeOptions = {}
): Promise<WhisperResponse> {
  // Validate API key
  const configValidation = validateOpenAIConfig()
  if (!configValidation.valid) {
    throw createTranscriptionError(
      TranscriptionErrorCode.API_ERROR,
      configValidation.error || 'OpenAI API key not configured',
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
        `File size ${(fileSize / (1024 * 1024)).toFixed(1)}MB exceeds maximum of 25MB`,
        false
      )
    }

    // Validate file format
    const fileExtension = filename.split('.').pop()?.toLowerCase()
    if (!fileExtension || !SUPPORTED_AUDIO_FORMATS.includes(fileExtension as any)) {
      throw createTranscriptionError(
        TranscriptionErrorCode.UNSUPPORTED_FORMAT,
        `Unsupported audio format: ${fileExtension}. Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(', ')}`,
        false
      )
    }

    // Prepare form data
    const formData = new FormData()
    
    // Convert Buffer to Blob if needed
    let fileBlob: Blob
    if (Buffer.isBuffer(audioFile)) {
      // Convert Buffer to Uint8Array for Blob compatibility
      const uint8Array = new Uint8Array(audioFile)
      fileBlob = new Blob([uint8Array])
    } else {
      fileBlob = audioFile
    }
    
    formData.append('file', fileBlob, filename)
    formData.append('model', WHISPER_MODEL)

    // Add optional parameters
    if (options.language) {
      formData.append('language', options.language)
    }
    if (options.prompt) {
      formData.append('prompt', options.prompt)
    }
    if (options.temperature !== undefined) {
      formData.append('temperature', options.temperature.toString())
    }

    // Response format (default to verbose_json for detailed information)
    const responseFormat = options.responseFormat || 'verbose_json'
    formData.append('response_format', responseFormat)

    // Timestamp granularities (for detailed timing)
    if (options.timestampGranularities && options.timestampGranularities.length > 0) {
      formData.append('timestamp_granularities[]', options.timestampGranularities.join(','))
    }

    // Call OpenAI Whisper API
    const response = await fetch(`${OPENAI_API_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    })

    // Handle errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // Check for specific error types
      if (response.status === 429) {
        throw createTranscriptionError(
          TranscriptionErrorCode.RATE_LIMIT,
          'OpenAI API rate limit exceeded. Please try again later.',
          true
        )
      }

      if (response.status === 401) {
        throw createTranscriptionError(
          TranscriptionErrorCode.API_ERROR,
          'OpenAI API authentication failed. Check your API key.',
          false
        )
      }

      if (response.status === 413) {
        throw createTranscriptionError(
          TranscriptionErrorCode.FILE_TOO_LARGE,
          'File size too large for OpenAI API.',
          false
        )
      }

      throw createTranscriptionError(
        TranscriptionErrorCode.API_ERROR,
        errorData.error?.message || `OpenAI API error: ${response.status} ${response.statusText}`,
        response.status >= 500 // Server errors are retryable
      )
    }

    // Parse response based on format
    if (responseFormat === 'text') {
      const text = await response.text()
      return { text }
    } else if (responseFormat === 'srt' || responseFormat === 'vtt') {
      const text = await response.text()
      return { text }
    } else {
      // JSON or verbose_json
      const data = await response.json()
      return data
    }
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw createTranscriptionError(
        TranscriptionErrorCode.NETWORK_ERROR,
        'Network error: Unable to connect to OpenAI API',
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

// ============================================
// TRANSCRIPTION FROM URL
// ============================================

/**
 * Transcribe audio from a URL
 * Downloads the file first, then transcribes
 * 
 * @param audioUrl - URL to audio file
 * @param filename - Original filename
 * @param options - Transcription options
 * @returns Whisper API response
 */
export async function transcribeAudioFromUrl(
  audioUrl: string,
  filename: string,
  options: TranscribeOptions = {}
): Promise<WhisperResponse> {
  const TRANSCRIPTION_TIMEOUT = 20 * 60 * 1000 // 20 minutes timeout
  
  try {
    console.log(`Downloading audio file from URL: ${audioUrl}`)
    console.log(`File: ${filename}`)
    
    let audioBlob: Blob
    
    try {
      // Try direct download first
      const downloadStartTime = Date.now()
      const downloadPromise = fetch(audioUrl, {
        method: 'GET',
        headers: {
          'Accept': 'audio/*',
        },
      })
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const elapsed = Date.now() - downloadStartTime
          reject(new Error(`Download timeout after ${elapsed}ms (15 seconds)`))
        }, 15000) // Reduced to 15 seconds
      })
      
      console.log(`Starting download with 15-second timeout...`)
      const response = await Promise.race([downloadPromise, timeoutPromise])
      const downloadDuration = Date.now() - downloadStartTime
      
      console.log(`Download completed in ${downloadDuration}ms, status: ${response.status}`)
      
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`)
      }

      // Check content length
      const contentLength = response.headers.get('content-length')
      if (contentLength) {
        const sizeMB = Math.round(parseInt(contentLength) / 1024 / 1024 * 100) / 100
        console.log(`Expected file size: ${sizeMB}MB`)
      }

      console.log(`Audio file downloaded, creating blob...`)
      const blobStartTime = Date.now()
      
      // Create blob with timeout
      const blobPromise = response.blob()
      const blobTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Blob creation timeout')), 10000) // 10 seconds for blob creation
      })
      
      audioBlob = await Promise.race([blobPromise, blobTimeoutPromise])
      const blobDuration = Date.now() - blobStartTime
      
      console.log(`Audio blob created in ${blobDuration}ms, size: ${audioBlob.size} bytes`)
      
    } catch (downloadError) {
      console.error(`Direct download failed: ${downloadError}`)
      console.log(`Attempting fallback download method...`)
      
      // Fallback: Try to extract storage path and use Supabase client
      const urlMatch = audioUrl.match(/audio-files\/([^\/]+)\/(.+)\?/)
      if (urlMatch) {
        const [, userId, filePath] = urlMatch
        console.log(`Extracted storage path: ${userId}/${filePath}`)
        
        // Import Supabase client for fallback
        const { createAdminClient } = await import('@/lib/supabase-server')
        const supabase = createAdminClient()
        
        const { data, error } = await supabase.storage
          .from('audio-files')
          .download(`${userId}/${filePath}`)
        
        if (error) {
          throw new Error(`Fallback download failed: ${error.message}`)
        }
        
        audioBlob = data
        console.log(`Fallback download successful, size: ${audioBlob.size} bytes`)
      } else {
        throw new Error(`Could not extract storage path from URL: ${audioUrl}`)
      }
    }
    
    // Validate blob size
    if (audioBlob.size === 0) {
      throw new Error('Downloaded audio file is empty')
    }
    
    const blobSizeMB = Math.round(audioBlob.size / 1024 / 1024 * 100) / 100
    console.log(`Final blob size: ${blobSizeMB}MB`)

    // Transcribe with timeout
    console.log(`Starting transcription for ${filename}...`)
    const transcriptionPromise = transcribeAudio(audioBlob, filename, options)
    const transcriptionTimeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Transcription timeout')), TRANSCRIPTION_TIMEOUT)
    })
    
    const result = await Promise.race([transcriptionPromise, transcriptionTimeoutPromise])
    console.log(`Transcription completed for ${filename}`)
    
    return result
  } catch (error) {
    console.error(`Transcription failed for ${filename}:`, error)
    
    if (isTranscriptionError(error)) {
      throw error
    }

    throw createTranscriptionError(
      TranscriptionErrorCode.NETWORK_ERROR,
      `Failed to download or transcribe audio from URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true
    )
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a structured transcription error
 */
export function createTranscriptionError(
  code: TranscriptionErrorCode,
  message: string,
  retryable: boolean,
  details?: Record<string, any>
): TranscriptionError {
  return {
    code,
    message,
    retryable,
    details,
  }
}

/**
 * Type guard for TranscriptionError
 */
export function isTranscriptionError(error: any): error is TranscriptionError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'retryable' in error
  )
}

/**
 * Calculate confidence score from Whisper segments
 * Returns average of segment confidence scores
 */
export function calculateConfidenceScore(segments?: WhisperSegment[]): number | undefined {
  if (!segments || segments.length === 0) {
    return undefined
  }

  // Whisper provides no_speech_prob and avg_logprob
  // We can estimate confidence from these metrics
  const scores = segments.map((segment) => {
    // Confidence = 1 - no_speech_prob
    // Adjusted by avg_logprob (higher is better, typically negative)
    const speechConfidence = 1 - segment.no_speech_prob
    const logprobFactor = Math.exp(segment.avg_logprob / 2) // Normalize logprob
    return speechConfidence * logprobFactor
  })

  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
  
  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, avgScore))
}

/**
 * Format Whisper segments into timestamped transcript
 */
export function formatSegmentsToTimestamps(segments: WhisperSegment[]) {
  return segments.map((segment, index) => ({
    id: `segment-${index}`,
    start: segment.start,
    end: segment.end,
    text: segment.text.trim(),
    confidence: 1 - segment.no_speech_prob,
    index,
  }))
}

/**
 * Estimate transcription cost
 * OpenAI charges $0.006 per minute of audio
 */
export function estimateTranscriptionCost(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60
  const costPerMinute = 0.006
  return durationMinutes * costPerMinute
}

/**
 * Get estimated processing time
 * Whisper typically processes at 2-4x audio duration
 */
export function estimateProcessingTime(durationSeconds: number): number {
  // Conservative estimate: 3x audio duration
  return durationSeconds * 3
}

// ============================================
// EXPORTS
// ============================================

export default {
  transcribeAudio,
  transcribeAudioFromUrl,
  validateOpenAIConfig,
  calculateConfidenceScore,
  formatSegmentsToTimestamps,
  estimateTranscriptionCost,
  estimateProcessingTime,
  createTranscriptionError,
  isTranscriptionError,
}


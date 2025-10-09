/**
 * Audio Utility Functions
 * Helper functions for audio file processing and metadata extraction
 */

import type { AudioFileInfo, AudioValidationResult } from '@/types/transcription'

// ============================================
// CONSTANTS
// ============================================

/**
 * Supported audio formats for transcription
 */
export const SUPPORTED_FORMATS = {
  'audio/mpeg': ['.mp3', '.mpeg', '.mpga'],
  'audio/mp4': ['.mp4', '.m4a'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.webm'],
  'audio/flac': ['.flac'],
  'audio/aac': ['.aac'],
} as const

/**
 * Maximum file size for transcription (25MB for OpenAI Whisper)
 */
export const MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024 // 25MB

/**
 * Minimum file size to be considered valid audio
 */
export const MIN_AUDIO_FILE_SIZE = 1024 // 1KB

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate audio file for transcription
 */
export function validateAudioFile(file: File): AudioValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: 'No file provided',
    }
  }

  // Check file size
  if (file.size < MIN_AUDIO_FILE_SIZE) {
    errors.push(`File is too small (${formatFileSize(file.size)}). Minimum size is 1KB.`)
  }

  if (file.size > MAX_AUDIO_FILE_SIZE) {
    errors.push(
      `File is too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(MAX_AUDIO_FILE_SIZE)}.`
    )
  }

  // Check file type
  const fileExtension = getFileExtension(file.name)
  const mimeType = file.type

  const isValidMimeType = Object.keys(SUPPORTED_FORMATS).includes(mimeType)
  const isValidExtension = Object.values(SUPPORTED_FORMATS)
    .flat()
    .includes(fileExtension as any)

  if (!isValidMimeType && !isValidExtension) {
    errors.push(
      `Unsupported audio format: ${fileExtension} (${mimeType}). Supported formats: MP3, WAV, M4A, AAC, FLAC, WEBM.`
    )
  }

  // Warnings for large files
  if (file.size > 10 * 1024 * 1024) {
    warnings.push('Large file may take longer to process.')
  }

  // Check filename
  if (!file.name || file.name.length === 0) {
    errors.push('File has no name.')
  }

  if (file.name.length > 255) {
    warnings.push('Filename is very long and may be truncated.')
  }

  return {
    valid: errors.length === 0,
    error: errors.length > 0 ? errors.join(' ') : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    fileInfo: {
      path: '',
      filename: file.name,
      size: file.size,
      format: mimeType,
    },
  }
}

/**
 * Validate audio file from Blob
 */
export function validateAudioBlob(
  blob: Blob,
  filename: string
): AudioValidationResult {
  // Create a pseudo-File object for validation
  const file = new File([blob], filename, { type: blob.type })
  return validateAudioFile(file)
}

// ============================================
// FILE INFORMATION
// ============================================

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : ''
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(filename: string): string {
  const ext = getFileExtension(filename)

  for (const [mimeType, extensions] of Object.entries(SUPPORTED_FORMATS)) {
    if ((extensions as readonly string[]).includes(ext)) {
      return mimeType
    }
  }

  return 'application/octet-stream'
}

/**
 * Check if file is audio
 */
export function isAudioFile(filename: string, mimeType?: string): boolean {
  const ext = getFileExtension(filename)
  const supportedExtensions = Object.values(SUPPORTED_FORMATS).flat()

  if (supportedExtensions.includes(ext as any)) {
    return true
  }

  if (mimeType && Object.keys(SUPPORTED_FORMATS).includes(mimeType)) {
    return true
  }

  return false
}

// ============================================
// FILE SIZE FORMATTING
// ============================================

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`
}

/**
 * Parse file size string to bytes
 */
export function parseFileSize(sizeStr: string): number {
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  }

  const match = sizeStr.match(/^([\d.]+)\s*([A-Z]+)$/i)
  if (!match) return 0

  const [, value, unit] = match
  const multiplier = units[unit.toUpperCase()] || 1

  return parseFloat(value) * multiplier
}

// ============================================
// DURATION UTILITIES
// ============================================

/**
 * Format duration in seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }

  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)

  if (minutes < 60) {
    return `${minutes}m ${secs}s`
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  return `${hours}h ${mins}m ${secs}s`
}

/**
 * Format duration as HH:MM:SS
 */
export function formatDurationHMS(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Parse duration string to seconds
 */
export function parseDuration(durationStr: string): number {
  // Handle formats like "4 mins. 5 secs" or "1h 30m" or "01:30:45"
  
  // Try HH:MM:SS format first
  if (durationStr.includes(':')) {
    const parts = durationStr.split(':').map((p) => parseInt(p, 10))
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    }
  }

  // Try text format
  let seconds = 0

  const hoursMatch = durationStr.match(/(\d+)\s*h(?:ours?)?/i)
  if (hoursMatch) {
    seconds += parseInt(hoursMatch[1], 10) * 3600
  }

  const minutesMatch = durationStr.match(/(\d+)\s*m(?:ins?)?/i)
  if (minutesMatch) {
    seconds += parseInt(minutesMatch[1], 10) * 60
  }

  const secondsMatch = durationStr.match(/(\d+)\s*s(?:ecs?)?/i)
  if (secondsMatch) {
    seconds += parseInt(secondsMatch[1], 10)
  }

  return seconds
}

/**
 * Extract audio duration from File (requires Web Audio API)
 * Note: This is browser-only and requires decoding the audio
 */
export async function extractAudioDuration(file: File): Promise<number | null> {
  if (typeof window === 'undefined' || !window.AudioContext) {
    return null
  }

  try {
    const audioContext = new AudioContext()
    const arrayBuffer = await file.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    await audioContext.close()
    
    return audioBuffer.duration
  } catch (error) {
    console.error('Failed to extract audio duration:', error)
    return null
  }
}

// ============================================
// AUDIO QUALITY ESTIMATION
// ============================================

/**
 * Estimate audio quality based on file size and duration
 */
export function estimateAudioQuality(
  fileSize: number,
  duration: number
): {
  bitrate: number
  quality: 'low' | 'medium' | 'high'
  description: string
} {
  // Calculate approximate bitrate (in kbps)
  const bitrate = Math.round((fileSize * 8) / duration / 1000)

  let quality: 'low' | 'medium' | 'high'
  let description: string

  if (bitrate < 96) {
    quality = 'low'
    description = 'Low quality audio'
  } else if (bitrate < 192) {
    quality = 'medium'
    description = 'Medium quality audio'
  } else {
    quality = 'high'
    description = 'High quality audio'
  }

  return { bitrate, quality, description }
}

// ============================================
// AUDIO PROCESSING
// ============================================

/**
 * Convert audio file to supported format (if needed)
 * Note: This is a placeholder - actual conversion would require server-side processing
 */
export function needsConversion(filename: string, mimeType: string): boolean {
  const ext = getFileExtension(filename)
  const supportedExtensions = Object.values(SUPPORTED_FORMATS).flat()
  const supportedMimeTypes = Object.keys(SUPPORTED_FORMATS)

  const hasValidExtension = supportedExtensions.includes(ext as any)
  const hasValidMimeType = supportedMimeTypes.includes(mimeType)

  return !hasValidExtension && !hasValidMimeType
}

/**
 * Suggest optimal audio format for transcription
 */
export function suggestOptimalFormat(currentFormat: string): string {
  // MP3 is widely supported and has good compression
  if (currentFormat !== 'audio/mpeg' && currentFormat !== '.mp3') {
    return 'MP3 format is recommended for best compatibility and file size.'
  }

  return 'Current format is optimal for transcription.'
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Get user-friendly error message for audio validation errors
 */
export function getAudioErrorMessage(error: string): string {
  const errorMap: Record<string, string> = {
    'File is too large': 'Please compress or trim your audio file to under 25MB.',
    'File is too small': 'Audio file appears to be empty or corrupted.',
    'Unsupported audio format': 'Please convert your audio to MP3, WAV, M4A, or AAC format.',
    'No file provided': 'Please select an audio file to transcribe.',
  }

  for (const [key, message] of Object.entries(errorMap)) {
    if (error.includes(key)) {
      return message
    }
  }

  return error
}

// ============================================
// EXPORTS
// ============================================

export default {
  validateAudioFile,
  validateAudioBlob,
  getFileExtension,
  getMimeTypeFromExtension,
  isAudioFile,
  formatFileSize,
  parseFileSize,
  formatDuration,
  formatDurationHMS,
  parseDuration,
  extractAudioDuration,
  estimateAudioQuality,
  needsConversion,
  suggestOptimalFormat,
  getAudioErrorMessage,
}


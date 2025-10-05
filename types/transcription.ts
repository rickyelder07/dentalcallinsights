/**
 * Transcription Type Definitions
 * Types for OpenAI Whisper integration and transcription processing
 */

// ============================================
// TRANSCRIPTION STATUS TYPES
// ============================================

/**
 * Transcription status lifecycle
 */
export type TranscriptionStatus = 
  | 'pending'      // Waiting to be processed
  | 'processing'   // Currently transcribing
  | 'completed'    // Successfully transcribed
  | 'failed'       // Transcription failed
  | 'cancelled'    // User cancelled

/**
 * Job status for background processing
 */
export type JobStatus = 
  | 'pending'      // Job queued
  | 'processing'   // Job running
  | 'completed'    // Job finished successfully
  | 'failed'       // Job failed
  | 'cancelled'    // Job cancelled by user

// ============================================
// TRANSCRIPTION REQUEST/RESPONSE TYPES
// ============================================

/**
 * Request to start transcription
 */
export interface TranscriptionRequest {
  callId: string
  language?: string
  prompt?: string // Optional prompt to guide transcription
}

/**
 * Transcription job response
 */
export interface TranscriptionJobResponse {
  jobId: string
  callId: string
  status: TranscriptionStatus
  message?: string
  estimatedDurationSeconds?: number
}

/**
 * Transcription status response
 */
export interface TranscriptionStatusResponse {
  jobId: string
  callId: string
  status: TranscriptionStatus
  progress?: number // 0-100
  transcriptId?: string
  transcript?: string
  confidenceScore?: number
  errorMessage?: string
  processingStartedAt?: string
  processingCompletedAt?: string
  processingDurationSeconds?: number
}

/**
 * Whisper API response structure
 */
export interface WhisperResponse {
  text: string
  language?: string
  duration?: number
  segments?: WhisperSegment[]
}

/**
 * Whisper segment with timestamps
 */
export interface WhisperSegment {
  id: number
  seek: number
  start: number
  end: number
  text: string
  tokens: number[]
  temperature: number
  avg_logprob: number
  compression_ratio: number
  no_speech_prob: number
}

// ============================================
// TRANSCRIPTION JOB TYPES
// ============================================

/**
 * Transcription job database record
 */
export interface TranscriptionJob {
  id: string
  call_id: string
  user_id: string
  status: JobStatus
  priority: number
  
  // Timing
  created_at: string
  started_at?: string
  completed_at?: string
  
  // Error handling
  error_message?: string
  retry_count: number
  max_retries: number
  
  // Metadata
  metadata: Record<string, any>
  audio_duration_seconds?: number
  processing_cost_usd?: number
}

/**
 * Job creation parameters
 */
export interface CreateJobParams {
  callId: string
  userId: string
  priority?: number
  metadata?: Record<string, any>
}

/**
 * Job update parameters
 */
export interface UpdateJobParams {
  status?: JobStatus
  error_message?: string
  retry_count?: number
  started_at?: string
  completed_at?: string
  processing_cost_usd?: number
}

// ============================================
// TRANSCRIPT TYPES
// ============================================

/**
 * Transcript with timestamps
 */
export interface TimestampedTranscript {
  text: string
  start: number
  end: number
  confidence?: number
  speaker?: string
}

/**
 * Speaker segment for diarization
 */
export interface SpeakerSegment {
  speaker: string
  start: number
  end: number
  text: string
  confidence?: number
}

/**
 * Transcript metadata
 */
export interface TranscriptMetadata {
  language: string
  duration: number
  wordCount: number
  speakerCount?: number
  processingTime: number
  model: string
  apiVersion?: string
}

// ============================================
// AUDIO PROCESSING TYPES
// ============================================

/**
 * Audio file information for transcription
 */
export interface AudioFileInfo {
  path: string
  filename: string
  size: number
  duration?: number
  format: string
  sampleRate?: number
}

/**
 * Audio validation result
 */
export interface AudioValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
  fileInfo?: AudioFileInfo
}

// ============================================
// CONFIDENCE AND QUALITY TYPES
// ============================================

/**
 * Confidence score breakdown
 */
export interface ConfidenceScore {
  overall: number // 0-1
  bySegment?: number[] // Per-segment scores
  low_confidence_segments?: number[] // Segment IDs with low confidence
}

/**
 * Quality assessment
 */
export interface QualityAssessment {
  confidence: ConfidenceScore
  clarity: 'high' | 'medium' | 'low'
  noiseLevel: 'low' | 'medium' | 'high'
  recommendsManualReview: boolean
  issues?: string[]
}

// ============================================
// ERROR TYPES
// ============================================

/**
 * Transcription error
 */
export interface TranscriptionError {
  code: string
  message: string
  details?: Record<string, any>
  retryable: boolean
}

/**
 * Common error codes
 */
export enum TranscriptionErrorCode {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ============================================
// STATISTICS AND ANALYTICS TYPES
// ============================================

/**
 * Transcription statistics
 */
export interface TranscriptionStats {
  total_transcripts: number
  completed_transcripts: number
  pending_transcripts: number
  failed_transcripts: number
  total_duration_seconds: number
  avg_confidence_score: number
}

/**
 * Processing metrics
 */
export interface ProcessingMetrics {
  totalJobs: number
  successRate: number
  avgProcessingTime: number
  totalCost: number
  errorRate: number
}

// ============================================
// EXPORT OPTIONS TYPES
// ============================================

/**
 * Export format options
 */
export type ExportFormat = 
  | 'txt'   // Plain text
  | 'json'  // JSON with metadata
  | 'srt'   // SubRip subtitles
  | 'vtt'   // WebVTT subtitles
  | 'pdf'   // PDF document

/**
 * Export request
 */
export interface ExportRequest {
  transcriptId: string
  format: ExportFormat
  includeTimestamps?: boolean
  includeSpeakers?: boolean
  includeMetadata?: boolean
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean
  format: ExportFormat
  content?: string
  downloadUrl?: string
  error?: string
}


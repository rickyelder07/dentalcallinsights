/**
 * Upload Type Definitions
 * Simplified types for CSV and audio file uploads with direct filename matching
 */

// ============================================
// CSV DATA TYPES
// ============================================

/**
 * Standardized CSV column headers
 * Based on the exact format: Call Time, Direction, Source Number, etc.
 */
export const CSV_COLUMN_HEADERS = {
  CALL_TIME: 'Call Time',
  DIRECTION: 'Direction',
  SOURCE_NUMBER: 'Source Number',
  SOURCE_NAME: 'Source Name',
  SOURCE_EXT: 'Source Ext',
  DESTINATION_NUMBER: 'Destination Number',
  DESTINATION_EXT: 'Destination Ext',
  DURATION: 'Duration',
  DISPOSITION: 'Disposition',
  CALL_FLOW: 'Call Flow',
  TIME_TO_ANSWER: 'Time to Answer',
  CALL: 'Call', // Audio filename
} as const

export const REQUIRED_CSV_COLUMNS = ['Call Time', 'Direction', 'Call'] as const

/**
 * Parsed CSV row data
 * Maps directly to database columns in calls table
 */
export interface CsvCallRow {
  call_time: string // ISO 8601 format
  direction: 'Inbound' | 'Outbound'
  source_number?: string
  source_name?: string
  source_extension?: string
  destination_number?: string
  destination_extension?: string
  duration_seconds?: number // Parsed from "4 mins. 5 secs" format
  disposition?: string
  call_flow?: string
  time_to_answer_seconds?: number
  filename: string // From "Call" column - must match audio file
}

/**
 * CSV validation error
 */
export interface CsvValidationError {
  row: number
  column: string
  message: string
  value?: string
}

/**
 * CSV validation warning (non-critical issues)
 */
export interface CsvValidationWarning {
  row: number
  column: string
  message: string
  value?: string
}

/**
 * CSV validation result
 */
export interface CsvValidationResult {
  valid: boolean
  rows: CsvCallRow[]
  errors: CsvValidationError[]
  warnings: CsvValidationWarning[]
  rowCount: number
  audioFilenames: string[] // List of filenames from "Call" column
}

// ============================================
// AUDIO FILE TYPES
// ============================================

/**
 * Supported audio file formats
 */
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/m4a',
  'audio/aac',
] as const

export const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac'] as const

// File size limits
export const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
export const MIN_FILE_SIZE = 1024 // 1KB

// File extensions for validation
export const SUPPORTED_FILE_EXTENSIONS = SUPPORTED_AUDIO_EXTENSIONS

/**
 * Audio file validation result
 */
export interface AudioFileValidation {
  valid: boolean
  filename: string
  size: number
  type: string
  error?: string
}

/**
 * Audio files validation result
 * Checks that all uploaded audio files match CSV "Call" column
 */
export interface AudioFilesValidationResult {
  valid: boolean
  validFiles: string[] // Files that match CSV
  missingFiles: string[] // Files in CSV but not uploaded
  extraFiles: string[] // Files uploaded but not in CSV
  invalidFiles: AudioFileValidation[] // Files with validation errors
  totalExpected: number
  totalUploaded: number
}

// ============================================
// UPLOAD TYPES
// ============================================

/**
 * Upload progress state
 */
export interface UploadProgress {
  filename: string
  progress: number // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'validating' | 'processing'
  error?: string
  uploadId?: string
  percentage?: number
  fileSize?: number
  uploadSpeed?: number
  estimatedTimeRemaining?: number
  bytesUploaded?: number
  startTime?: number
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Call metadata interface
 */
export interface CallMetadata {
  patientId?: string
  tags?: string[]
  notes?: string
  priority?: 'low' | 'medium' | 'high'
  [key: string]: any
}

/**
 * Call with transcript data
 */
export interface CallWithTranscript {
  id: string
  user_id: string
  filename: string
  call_time?: string
  call_direction?: string
  source_number?: string
  destination_number?: string
  call_duration_seconds?: number
  disposition?: string
  metadata?: CallMetadata
  created_at: string
  updated_at: string
  transcript?: {
    id: string
    content: string
    transcription_status: string
    confidence_score?: number
  }
  insights?: {
    id: string
    overall_sentiment?: string
    key_points?: string[]
    action_items?: string[]
    red_flags?: string[]
  }
  qaScore?: any
}

/**
 * Upload status enum
 */
export type UploadStatus = 'idle' | 'pending' | 'uploading' | 'completed' | 'error' | 'validating' | 'processing'

/**
 * Audio upload request
 */
export interface AudioUploadRequest {
  file: File
  userId: string
  metadata?: CallMetadata
}

/**
 * Audio upload response
 */
export interface AudioUploadResponse {
  success: boolean
  callId?: string
  storagePath?: string
  error?: string
}

/**
 * Combined upload result (CSV + Audio files)
 */
export interface UploadResult {
  success: boolean
  message: string
  csvRowsProcessed?: number
  audioFilesUploaded?: number
  callsCreated?: string[] // Array of call IDs (optional)
  errors?: CsvValidationError[]
  warnings?: CsvValidationWarning[]
}

/**
 * Upload request payload
 */
export interface UploadRequest {
  csvData: CsvCallRow[]
  audioFiles: File[]
  userId: string
}

// ============================================
// DATABASE TYPES
// ============================================

/**
 * Call record in database
 * Matches the enhanced calls table schema
 */
export interface Call {
  id: string
  user_id: string
  filename: string
  audio_path: string
  file_size?: number
  file_type?: string
  upload_status: 'pending' | 'uploading' | 'completed' | 'error'
  
  // CSV data fields
  call_time?: string
  call_direction?: 'Inbound' | 'Outbound'
  source_number?: string
  source_name?: string
  source_extension?: string
  destination_number?: string
  destination_extension?: string
  call_duration_seconds?: number
  disposition?: string
  time_to_answer_seconds?: number
  call_flow?: string
  
  // Metadata
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// ============================================
// STORAGE TYPES
// ============================================

/**
 * Storage path structure
 * Format: call-recordings/{user_id}/{filename}
 */
export interface StoragePath {
  bucket: 'call-recordings'
  userId: string
  filename: string
  fullPath: string // {userId}/{filename}
}

/**
 * File upload options
 */
export interface FileUploadOptions {
  maxSize: number // bytes
  allowedTypes: string[]
  onProgress?: (progress: UploadProgress) => void
}

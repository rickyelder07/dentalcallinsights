/**
 * Upload Type Definitions
 * Types for file uploads, progress tracking, and metadata
 */

// ============================================
// FILE UPLOAD TYPES
// ============================================

/**
 * Supported audio file types
 */
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg', // MP3
  'audio/wav',
  'audio/x-m4a',
  'audio/mp4', // M4A
  'audio/aac',
] as const;

export const SUPPORTED_FILE_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac'] as const;

/**
 * File size limits
 */
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MIN_FILE_SIZE = 1024; // 1KB

/**
 * Upload status
 */
export type UploadStatus =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error';

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Upload progress information
 */
export interface UploadProgress {
  uploadId: string;
  fileName: string;
  fileSize: number;
  bytesUploaded: number;
  percentage: number;
  status: UploadStatus;
  error?: string;
  startTime: number;
  estimatedTimeRemaining?: number;
  uploadSpeed?: number; // bytes per second
}

/**
 * Call metadata form data
 */
export interface CallMetadata {
  patient_id?: string;
  call_type?: string;
  call_date?: string;
  call_time?: string;
  phone_number?: string;
  duration?: number;
  tags?: string[];
  notes?: string;
}

/**
 * Audio file upload request
 */
export interface AudioUploadRequest {
  file: File;
  metadata: CallMetadata;
  userId: string;
}

/**
 * Audio upload response
 */
export interface AudioUploadResponse {
  success: boolean;
  callId?: string;
  storagePath?: string;
  error?: string;
  potentialMatches?: any[];
}

// ============================================
// STORAGE TYPES
// ============================================

/**
 * Storage file info
 */
export interface StorageFileInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

/**
 * Storage upload options
 */
export interface StorageUploadOptions {
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
}

/**
 * Storage operation result
 */
export interface StorageOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}


/**
 * Storage Type Definitions
 * Types specific to Supabase Storage integration
 */

// ============================================
// SUPABASE STORAGE TYPES
// ============================================

/**
 * Storage bucket configuration
 */
export interface StorageBucketConfig {
  name: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

/**
 * File upload result from Supabase Storage
 */
export interface SupabaseFileUploadResult {
  path: string;
  id?: string;
  fullPath?: string;
}

/**
 * File download options
 */
export interface FileDownloadOptions {
  download?: boolean | string;
  transform?: {
    width?: number;
    height?: number;
    resize?: 'cover' | 'contain' | 'fill';
  };
}

/**
 * Storage policy configuration
 */
export interface StoragePolicy {
  name: string;
  definition: string;
  check?: string;
}

/**
 * File metadata stored in database
 */
export interface CallFileMetadata {
  id: string;
  call_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  duration?: number;
  upload_status: 'uploading' | 'completed' | 'failed' | 'processing';
  uploaded_at: string;
  metadata: Record<string, any>;
}

/**
 * Storage operation error
 */
export interface StorageError {
  message: string;
  statusCode?: number;
  error?: string;
}


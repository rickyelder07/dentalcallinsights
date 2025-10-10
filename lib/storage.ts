/**
 * Supabase Storage Utilities
 * Handles file uploads to Supabase Storage with proper error handling
 */

import { createBrowserClient } from '@/lib/supabase'
import type { StoragePath, FileUploadOptions, UploadProgress } from '@/types/upload'

/**
 * Storage bucket name for call recordings
 */
export const STORAGE_BUCKET = 'audio-files'

/**
 * Maximum file size: 100MB
 */
export const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB in bytes

/**
 * Allowed audio file types
 */
export const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/m4a',
  'audio/aac',
]

/**
 * Build storage path for a file
 * Format: {userId}/{filename}
 */
export function buildStoragePath(userId: string, filename: string): StoragePath {
  return {
    bucket: STORAGE_BUCKET,
    userId,
    filename,
    fullPath: `${userId}/${filename}`,
  }
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options: Partial<FileUploadOptions> = {}
): { valid: boolean; error?: string } {
  const maxSize = options.maxSize || MAX_FILE_SIZE
  const allowedTypes = options.allowedTypes || ALLOWED_MIME_TYPES

  // Check file size
  if (file.size > maxSize) {
    const sizeMB = Math.round(maxSize / (1024 * 1024))
    return {
      valid: false,
      error: `File "${file.name}" exceeds maximum size of ${sizeMB}MB`,
    }
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File "${file.name}" has unsupported type "${file.type}". Allowed types: ${allowedTypes.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Upload a file to Supabase Storage
 * Returns the storage path on success
 */
export async function uploadFile(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Build storage path
    const storagePath = buildStoragePath(userId, file.name)

    // Get Supabase client
    const supabase = createBrowserClient()

    // Report progress: uploading
    if (onProgress) {
      onProgress({
        filename: file.name,
        progress: 0,
        status: 'uploading',
      })
    }

    // Upload file to storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath.fullPath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      })

    if (error) {
      // Report progress: error
      if (onProgress) {
        onProgress({
          filename: file.name,
          progress: 0,
          status: 'error',
          error: error.message,
        })
      }

      return {
        success: false,
        error: `Failed to upload "${file.name}": ${error.message}`,
      }
    }

    // Report progress: completed
    if (onProgress) {
      onProgress({
        filename: file.name,
        progress: 100,
        status: 'completed',
      })
    }

    return {
      success: true,
      path: data.path,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'

    if (onProgress) {
      onProgress({
        filename: file.name,
        progress: 0,
        status: 'error',
        error: errorMessage,
      })
    }

    return {
      success: false,
      error: `Failed to upload "${file.name}": ${errorMessage}`,
    }
  }
}

/**
 * Upload multiple files
 * Returns results for all files
 */
export async function uploadMultipleFiles(
  files: File[],
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{
  success: boolean
  results: Array<{
    filename: string
    success: boolean
    path?: string
    error?: string
  }>
}> {
  const results: Array<{
    filename: string
    success: boolean
    path?: string
    error?: string
  }> = []

  let successCount = 0

  for (const file of files) {
    const result = await uploadFile(file, userId, onProgress)

    results.push({
      filename: file.name,
      success: result.success,
      path: result.path,
      error: result.error,
    })

    if (result.success) {
      successCount++
    }
  }

  return {
    success: successCount === files.length,
    results,
  }
}

/**
 * Get public URL for a file
 * Note: This only works if the bucket is public
 * For private buckets, use createSignedUrl instead
 */
export function getPublicUrl(userId: string, filename: string): string {
  const supabase = createBrowserClient()
  const storagePath = buildStoragePath(userId, filename)

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath.fullPath)

  return data.publicUrl
}

/**
 * Create a signed URL for a private file
 * URL expires after specified time (default: 1 hour)
 */
export async function createSignedUrl(
  userId: string,
  filename: string,
  expiresIn: number = 3600 // 1 hour in seconds
): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = createBrowserClient()
    const storagePath = buildStoragePath(userId, filename)

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath.fullPath, expiresIn)

    if (error) {
      return { error: error.message }
    }

    return { url: data.signedUrl }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create signed URL',
    }
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  userId: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createBrowserClient()
    const storagePath = buildStoragePath(userId, filename)

    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath.fullPath])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file',
    }
  }
}

/**
 * Check if a file exists in storage
 */
export async function fileExists(
  userId: string,
  filename: string
): Promise<{ exists: boolean; error?: string }> {
  try {
    const supabase = createBrowserClient()
    const storagePath = buildStoragePath(userId, filename)

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(userId, {
        search: filename,
      })

    if (error) {
      return { exists: false, error: error.message }
    }

    const exists = data.some((file) => file.name === filename)
    return { exists }
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Failed to check file existence',
    }
  }
}

/**
 * Upload file with progress tracking
 */
export async function uploadFileWithProgress(
  file: File,
  storagePath: string,
  onProgress?: (percentage: number) => void
): Promise<{ data: any; error: any }> {
  const supabase = createBrowserClient()
  
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      return { data: null, error }
    }

    // Simulate progress for now (Supabase doesn't provide real progress)
    if (onProgress) {
      onProgress(100)
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

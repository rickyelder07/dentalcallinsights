/**
 * Supabase Storage Utilities
 * Helper functions for file upload, download, and management
 * SECURITY: Never expose service role keys - all operations use anon key with RLS
 */

import { createBrowserClient } from '@/lib/supabase';
import type {
  StorageOperationResult,
  StorageUploadOptions,
  StorageFileInfo,
} from '@/types/upload';
import type { SupabaseFileUploadResult } from '@/types/storage';

const STORAGE_BUCKET = 'call-recordings';

/**
 * Upload file to Supabase Storage
 * Uses RLS policies to ensure user can only upload to their own folder
 */
export async function uploadFile(
  file: File,
  storagePath: string,
  options?: StorageUploadOptions
): Promise<StorageOperationResult<SupabaseFileUploadResult>> {
  try {
    const supabase = createBrowserClient();

    // Upload file to storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: options?.cacheControl || '3600',
        contentType: options?.contentType || file.type,
        upsert: options?.upsert || false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file',
      };
    }

    return {
      success: true,
      data: {
        path: data.path,
        fullPath: data.fullPath,
      },
    };
  } catch (error) {
    console.error('Upload file error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during upload',
    };
  }
}

/**
 * Upload file with progress tracking
 */
export async function uploadFileWithProgress(
  file: File,
  storagePath: string,
  onProgress?: (progress: number) => void
): Promise<StorageOperationResult<SupabaseFileUploadResult>> {
  try {
    // Supabase doesn't natively support progress tracking
    // Simulate progress updates for better UX
    const simulateProgress = () => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (progress <= 90) {
          onProgress?.(progress);
        }
      }, 200);
      return interval;
    };

    const progressInterval = onProgress ? simulateProgress() : null;

    const result = await uploadFile(file, storagePath);

    if (progressInterval) {
      clearInterval(progressInterval);
      onProgress?.(100);
    }

    return result;
  } catch (error) {
    console.error('Upload with progress error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during upload',
    };
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(storagePath: string): string {
  const supabase = createBrowserClient();
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Get signed URL for private file access
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<StorageOperationResult<string>> {
  try {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to generate signed URL',
      };
    }

    return {
      success: true,
      data: data.signedUrl,
    };
  } catch (error) {
    console.error('Get signed URL error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(
  storagePath: string
): Promise<StorageOperationResult<void>> {
  try {
    const supabase = createBrowserClient();
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to delete file',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete file error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List files in a user's folder
 */
export async function listUserFiles(
  userId: string
): Promise<StorageOperationResult<StorageFileInfo[]>> {
  try {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(userId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to list files',
      };
    }

    const files: StorageFileInfo[] =
      data?.map((file) => ({
        id: file.id,
        name: file.name,
        path: `${userId}/${file.name}`,
        size: file.metadata?.size || 0,
        mimeType: file.metadata?.mimetype || '',
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        metadata: file.metadata,
      })) || [];

    return {
      success: true,
      data: files,
    };
  } catch (error) {
    console.error('List files error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if file exists
 */
export async function fileExists(storagePath: string): Promise<boolean> {
  try {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(storagePath.split('/')[0], {
        search: storagePath.split('/')[1],
      });

    return !error && data && data.length > 0;
  } catch (error) {
    console.error('File exists check error:', error);
    return false;
  }
}

/**
 * Download file from storage
 */
export async function downloadFile(
  storagePath: string
): Promise<StorageOperationResult<Blob>> {
  try {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to download file',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Download file error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(
  storagePath: string
): Promise<StorageOperationResult<StorageFileInfo>> {
  try {
    const supabase = createBrowserClient();
    const pathParts = storagePath.split('/');
    const folder = pathParts[0];
    const fileName = pathParts.slice(1).join('/');

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folder, {
        search: fileName,
      });

    if (error || !data || data.length === 0) {
      return {
        success: false,
        error: 'File not found',
      };
    }

    const file = data[0];
    return {
      success: true,
      data: {
        id: file.id,
        name: file.name,
        path: storagePath,
        size: file.metadata?.size || 0,
        mimeType: file.metadata?.mimetype || '',
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        metadata: file.metadata,
      },
    };
  } catch (error) {
    console.error('Get file metadata error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


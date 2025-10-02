/**
 * Upload Utilities
 * High-level functions for handling file uploads with validation and progress tracking
 */

import { validateAudioFile, generateStoragePath } from '@/lib/file-validation';
import { uploadFileWithProgress } from '@/lib/storage';
import type {
  AudioUploadRequest,
  AudioUploadResponse,
  UploadProgress,
  CallMetadata,
} from '@/types/upload';

/**
 * Upload audio file with metadata
 * Handles validation, storage upload, and database record creation
 */
export async function uploadAudioFile(
  request: AudioUploadRequest,
  onProgress?: (progress: UploadProgress) => void
): Promise<AudioUploadResponse> {
  const { file, userId } = request;

  // Generate unique upload ID
  const uploadId = crypto.randomUUID();

  try {
    // Validate file
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    // Update progress: validating
    onProgress?.({
      uploadId,
      fileName: file.name,
      fileSize: file.size,
      bytesUploaded: 0,
      percentage: 0,
      status: 'validating',
      startTime: Date.now(),
    });

    // Generate storage path
    const storagePath = generateStoragePath(userId, file.name);

    // Update progress: uploading
    onProgress?.({
      uploadId,
      fileName: file.name,
      fileSize: file.size,
      bytesUploaded: 0,
      percentage: 0,
      status: 'uploading',
      startTime: Date.now(),
    });

    // Upload to storage with progress tracking
    const uploadResult = await uploadFileWithProgress(file, storagePath, (percentage) => {
      const bytesUploaded = Math.floor((file.size * percentage) / 100);
      onProgress?.({
        uploadId,
        fileName: file.name,
        fileSize: file.size,
        bytesUploaded,
        percentage,
        status: 'uploading',
        startTime: Date.now(),
      });
    });

    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload file',
      };
    }

    // Update progress: processing
    onProgress?.({
      uploadId,
      fileName: file.name,
      fileSize: file.size,
      bytesUploaded: file.size,
      percentage: 100,
      status: 'processing',
      startTime: Date.now(),
    });

    // Create database record (this would be done via API route)
    // For now, return success with storage path
    return {
      success: true,
      storagePath: uploadResult.data?.path,
    };
  } catch (error) {
    console.error('Upload audio file error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during upload',
    };
  }
}

/**
 * Calculate upload speed and estimated time remaining
 */
export function calculateUploadMetrics(
  bytesUploaded: number,
  totalBytes: number,
  startTime: number
): {
  uploadSpeed: number;
  estimatedTimeRemaining: number;
  percentage: number;
} {
  const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
  const uploadSpeed = bytesUploaded / elapsedTime; // bytes per second
  const remainingBytes = totalBytes - bytesUploaded;
  const estimatedTimeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;
  const percentage = Math.min(100, (bytesUploaded / totalBytes) * 100);

  return {
    uploadSpeed,
    estimatedTimeRemaining,
    percentage,
  };
}

/**
 * Format upload speed to human-readable string
 */
export function formatUploadSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${Math.round(bytesPerSecond)} B/s`;
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${Math.round(bytesPerSecond / 1024)} KB/s`;
  } else {
    return `${Math.round((bytesPerSecond / (1024 * 1024)) * 10) / 10} MB/s`;
  }
}

/**
 * Format time remaining to human-readable string
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Validate call metadata
 */
export function validateCallMetadata(metadata: CallMetadata): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate phone number if provided
  if (metadata.phone_number) {
    const cleaned = metadata.phone_number.replace(/[\s\-\(\)\.]/g, '');
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (!phoneRegex.test(cleaned)) {
      errors.push('Invalid phone number format');
    }
  }

  // Validate duration if provided
  if (metadata.duration !== undefined) {
    if (typeof metadata.duration !== 'number' || metadata.duration < 0) {
      errors.push('Duration must be a positive number');
    }
  }

  // Validate call date if provided
  if (metadata.call_date) {
    const date = new Date(metadata.call_date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid call date format');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Retry upload with exponential backoff
 */
export async function retryUpload<T>(
  uploadFn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await uploadFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry on last attempt
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Upload failed after retries');
}


/**
 * Direct Supabase Upload Utilities
 * Handles direct client-side uploads to Supabase Storage
 */

import { createBrowserClient } from '@/lib/supabase'

export interface DirectUploadResult {
  success: boolean
  storagePath?: string
  error?: string
  callId?: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

/**
 * Upload file directly to Supabase Storage
 */
export async function uploadFileDirectly(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  const supabase = createBrowserClient()
  
  try {
    const storagePath = `${userId}/${file.name}`
    
    // Upload with progress tracking
    const { data, error } = await supabase.storage
      .from('audio-files')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true,
        // Note: Supabase doesn't provide built-in progress tracking
        // We'll simulate progress for better UX
      })

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    // Simulate progress completion
    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 })
    }

    return {
      success: true,
      storagePath: data.path
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Create database record after successful file upload
 */
export async function createDatabaseRecord(
  filename: string,
  storagePath: string,
  fileSize: number,
  fileType: string,
  csvRow: any
): Promise<{ success: boolean; callId?: string; error?: string }> {
  try {
    const response = await fetch('/api/upload/create-record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        storagePath,
        fileSize,
        fileType,
        callTime: csvRow.call_time,
        direction: csvRow.direction,
        sourceNumber: csvRow.source_number,
        destinationNumber: csvRow.destination_number,
        durationSeconds: csvRow.duration_seconds,
        disposition: csvRow.disposition,
        sourceName: csvRow.source_name,
        sourceExtension: csvRow.source_extension,
        destinationExtension: csvRow.destination_extension,
        timeToAnswerSeconds: csvRow.time_to_answer_seconds,
        callFlow: csvRow.call_flow,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to create database record'
      }
    }

    return {
      success: true,
      callId: result.callId
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * Upload file and create database record in one operation
 */
export async function uploadFileAndCreateRecord(
  file: File,
  userId: string,
  csvRow: any,
  onProgress?: (progress: UploadProgress) => void
): Promise<DirectUploadResult> {
  try {
    // Step 1: Upload file directly to Supabase
    const uploadResult = await uploadFileDirectly(file, userId, onProgress)
    
    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error
      }
    }

    // Step 2: Create database record
    const recordResult = await createDatabaseRecord(
      file.name,
      uploadResult.storagePath!,
      file.size,
      file.type,
      csvRow
    )

    if (!recordResult.success) {
      // Note: File is already uploaded, but record creation failed
      // In a production app, you might want to clean up the uploaded file
      return {
        success: false,
        error: `File uploaded but record creation failed: ${recordResult.error}`
      }
    }

    return {
      success: true,
      storagePath: uploadResult.storagePath,
      callId: recordResult.callId
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Simulate upload progress for better UX
 * Since Supabase doesn't provide real progress, we'll simulate it
 */
export function simulateUploadProgress(
  file: File,
  onProgress: (progress: UploadProgress) => void,
  duration: number = 2000
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const percentage = Math.min((elapsed / duration) * 100, 100)
      const loaded = Math.floor((file.size * percentage) / 100)
      
      onProgress({
        loaded,
        total: file.size,
        percentage: Math.floor(percentage)
      })
      
      if (percentage >= 100) {
        clearInterval(interval)
        resolve()
      }
    }, 50) // Update every 50ms for smooth progress
  })
}

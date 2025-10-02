/**
 * File Validation Utilities
 * Validates file types, sizes, and content for secure uploads
 */

import {
  SUPPORTED_AUDIO_FORMATS,
  SUPPORTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE,
  MIN_FILE_SIZE,
  FileValidationResult,
} from '@/types/upload';

/**
 * Validate audio file before upload
 */
export function validateAudioFile(file: File): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if file exists
  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors, warnings };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(
      `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(MAX_FILE_SIZE)})`
    );
  }

  if (file.size < MIN_FILE_SIZE) {
    errors.push(`File size is too small (minimum ${formatFileSize(MIN_FILE_SIZE)})`);
  }

  // Validate file type by MIME type
  const isValidMimeType = SUPPORTED_AUDIO_FORMATS.includes(file.type as any);
  if (!isValidMimeType) {
    errors.push(
      `Unsupported file type: ${file.type}. Supported formats: MP3, WAV, M4A, AAC`
    );
  }

  // Validate file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = SUPPORTED_FILE_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  );

  if (!hasValidExtension) {
    errors.push(
      `Unsupported file extension. Supported: ${SUPPORTED_FILE_EXTENSIONS.join(', ')}`
    );
  }

  // Check for suspicious file names
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    errors.push('Invalid file name: contains illegal characters');
  }

  // Warning for very large files
  if (file.size > 50 * 1024 * 1024) {
    // 50MB
    warnings.push('Large file detected. Upload may take longer.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate CSV file
 */
export function validateCsvFile(file: File): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors, warnings };
  }

  // Check file extension
  if (!file.name.toLowerCase().endsWith('.csv')) {
    errors.push('File must be a CSV file (.csv extension)');
  }

  // Check MIME type (can be text/csv or application/csv)
  const validCsvMimeTypes = ['text/csv', 'application/csv', 'text/plain'];
  if (!validCsvMimeTypes.includes(file.type) && file.type !== '') {
    warnings.push('File MIME type may not be correct for CSV');
  }

  // Check file size (CSV shouldn't be too large)
  const maxCsvSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxCsvSize) {
    errors.push(
      `CSV file too large (${formatFileSize(file.size)}). Maximum: ${formatFileSize(maxCsvSize)}`
    );
  }

  if (file.size < 10) {
    errors.push('CSV file appears to be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Sanitize file name for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove any directory traversal attempts
  let sanitized = fileName.replace(/\.\./g, '').replace(/[\/\\]/g, '_');

  // Remove special characters except dots, dashes, and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Ensure file name is not too long (max 255 chars)
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 250 - ext.length) + ext;
  }

  // Add timestamp to prevent collisions
  const timestamp = Date.now();
  const dotIndex = sanitized.lastIndexOf('.');
  if (dotIndex > 0) {
    const name = sanitized.substring(0, dotIndex);
    const ext = sanitized.substring(dotIndex);
    return `${name}_${timestamp}${ext}`;
  }

  return `${sanitized}_${timestamp}`;
}

/**
 * Generate storage path for user file
 */
export function generateStoragePath(userId: string, fileName: string): string {
  const sanitized = sanitizeFileName(fileName);
  return `${userId}/${sanitized}`;
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Extract file extension
 */
export function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.substring(dotIndex) : '';
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  if (!phone) return { valid: true }; // Optional field

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Basic validation: should be mostly digits, optionally starting with +
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;

  if (!phoneRegex.test(cleaned)) {
    return {
      valid: false,
      error: 'Invalid phone number format. Use international format (e.g., +1234567890)',
    };
  }

  return { valid: true };
}

/**
 * Validate date string
 */
export function validateDate(dateString: string): { valid: boolean; error?: string } {
  if (!dateString) return { valid: true }; // Optional field

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  // Check if date is not too far in the future
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);

  if (date > maxFutureDate) {
    return { valid: false, error: 'Date cannot be more than 1 year in the future' };
  }

  return { valid: true };
}

/**
 * Validate duration (in seconds)
 */
export function validateDuration(duration: number): { valid: boolean; error?: string } {
  if (duration === undefined || duration === null) return { valid: true }; // Optional

  if (typeof duration !== 'number' || isNaN(duration)) {
    return { valid: false, error: 'Duration must be a number' };
  }

  if (duration < 0) {
    return { valid: false, error: 'Duration cannot be negative' };
  }

  // Max duration: 2 hours (reasonable for a phone call)
  const maxDuration = 2 * 60 * 60; // 2 hours in seconds
  if (duration > maxDuration) {
    return { valid: false, error: 'Duration exceeds maximum allowed (2 hours)' };
  }

  return { valid: true };
}


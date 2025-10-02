/**
 * CSV Data Type Definitions
 * Types for CSV call data parsing, validation, and matching
 */

// ============================================
// CSV COLUMN DEFINITIONS
// ============================================

export const CSV_HEADERS = {
  CALL_TIME: 'CALL TIME',
  CALL_DIRECTION: 'CALL DIRECTION',
  SOURCE_NUMBER: 'SOURCE NUMBER',
  SOURCE_NAME: 'SOURCE NAME',
  SOURCE_EXTENSION: 'SOURCE EXTENSION',
  DESTINATION_NUMBER: 'DESTINATION NUMBER',
  DESTINATION_EXTENSION: 'DESTINATION EXTENSION',
  CALL_DURATION_SECONDS: 'CALL DURATION SECONDS',
  DISPOSITION: 'DISPOSITION',
  TIME_TO_ANSWER_SECONDS: 'TIME TO ANSWER SECONDS',
  CALL_FLOW: 'CALL FLOW',
} as const;

export const EXPECTED_CSV_COLUMNS = Object.values(CSV_HEADERS);

export const VALID_CALL_DIRECTIONS = ['Inbound', 'Outbound'] as const;

export const COMMON_DISPOSITIONS = [
  'answered',
  'no-answer',
  'busy',
  'failed',
  'voicemail',
  'abandoned',
  'forwarded',
] as const;

// ============================================
// CSV DATA TYPES
// ============================================

/**
 * Parsed CSV call data row
 */
export interface CsvCallData {
  id?: string;
  user_id: string;
  call_time: string; // ISO 8601 format
  call_direction: 'Inbound' | 'Outbound';
  source_number?: string;
  source_name?: string;
  source_extension?: string;
  destination_number?: string;
  destination_extension?: string;
  call_duration_seconds?: number;
  disposition?: string;
  time_to_answer_seconds?: number;
  call_flow?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * CSV validation error
 */
export interface CsvValidationError {
  row: number;
  column: string;
  message: string;
  value?: string;
}

/**
 * CSV validation warning
 */
export interface CsvValidationWarning {
  row: number;
  column: string;
  message: string;
  value?: string;
}

/**
 * CSV validation result
 */
export interface CsvValidationResult {
  valid: boolean;
  errors: CsvValidationError[];
  warnings: CsvValidationWarning[];
  rowCount?: number;
}

// ============================================
// CALL MATCHING TYPES
// ============================================

/**
 * Call matching options
 */
export interface CallMatchingOptions {
  time_tolerance_minutes: number;
  phone_number_match: boolean;
  duration_tolerance_seconds: number;
  require_disposition_match?: boolean;
}

/**
 * Call match result
 */
export interface CallMatch {
  csv_id: string;
  call_time: string;
  call_direction: 'Inbound' | 'Outbound';
  source_number?: string;
  source_name?: string;
  destination_number?: string;
  call_duration_seconds?: number;
  disposition?: string;
  time_to_answer_seconds?: number;
  match_score: number; // 0-1, higher is better
  time_diff_minutes: number;
  reasons?: string[];
}

/**
 * Match quality assessment
 */
export interface MatchQuality {
  isHighQuality: boolean;
  isMediumQuality: boolean;
  isLowQuality: boolean;
  reasons: string[];
}

/**
 * CSV upload result
 */
export interface CsvUploadResult {
  success: boolean;
  rowsProcessed: number;
  rowsInserted: number;
  errors: CsvValidationError[];
  warnings: CsvValidationWarning[];
}


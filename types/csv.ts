/**
 * CSV Types
 * Types for CSV parsing and validation
 */

/**
 * CSV validation result
 */
export interface CsvValidationResult {
  valid: boolean
  rows: CsvCallRow[]
  errors: CsvValidationError[]
  warnings: CsvValidationWarning[]
  rowCount: number
  audioFilenames: string[]
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
 * CSV validation warning
 */
export interface CsvValidationWarning {
  row: number
  column: string
  message: string
  value?: string
}

/**
 * Parsed CSV row data
 */
export interface CsvCallRow {
  call_time: string
  direction: 'Inbound' | 'Outbound'
  source_number?: string
  source_name?: string
  source_extension?: string
  destination_number?: string
  destination_extension?: string
  duration_seconds?: number
  disposition?: string
  call_flow?: string
  time_to_answer_seconds?: number
  filename: string
}

/**
 * Call match result
 */
export interface CallMatch {
  csv_id: string
  call_time: string
  call_direction: 'Inbound' | 'Outbound'
  source_number?: string
  source_name?: string
  destination_number?: string
  call_duration_seconds?: number
  disposition?: string
  time_to_answer_seconds?: number
  match_score: number
  time_diff_minutes: number
  duration_diff_seconds?: number
  match_reasons: string[]
  reasons: string[] // Alias for match_reasons for backward compatibility
}

/**
 * Export Type Definitions
 * Types for data export functionality with multiple format support
 */

import type { FilterConfig } from './filters'

// ============================================
// EXPORT FORMAT TYPES
// ============================================

/**
 * Supported export formats
 */
export type ExportFormat = 'csv' | 'json' | 'pdf' | 'excel'

/**
 * Export data fields selection
 */
export interface ExportFields {
  // Basic info
  filename: boolean
  callTime: boolean
  direction: boolean
  duration: boolean
  
  // Call details
  sourceNumber: boolean
  destinationNumber: boolean
  disposition: boolean
  
  // Transcript
  transcript: boolean
  language: boolean
  
  // AI Insights
  summary: boolean
  sentiment: boolean
  outcome: boolean
  actionItems: boolean
  redFlags: boolean
  
  // Metadata
  createdAt: boolean
  updatedAt: boolean
}

/**
 * Default export fields (all selected)
 */
export const DEFAULT_EXPORT_FIELDS: ExportFields = {
  filename: true,
  callTime: true,
  direction: true,
  duration: true,
  sourceNumber: true,
  destinationNumber: true,
  disposition: true,
  transcript: true,
  language: true,
  summary: true,
  sentiment: true,
  outcome: true,
  actionItems: true,
  redFlags: true,
  createdAt: true,
  updatedAt: true,
}

// ============================================
// EXPORT REQUEST TYPES
// ============================================

/**
 * Export request
 */
export interface ExportRequest {
  format: ExportFormat
  callIds?: string[] // Specific calls to export (optional)
  filters?: FilterConfig // Export based on filters
  fields: ExportFields
  includeTranscripts: boolean
  includeInsights: boolean
}

/**
 * Bulk export request for all selected calls
 */
export interface BulkExportRequest extends ExportRequest {
  callIds: string[] // Required for bulk export
}

// ============================================
// EXPORT RESPONSE TYPES
// ============================================

/**
 * Export response
 */
export interface ExportResponse {
  success: boolean
  exportId?: string
  filename?: string
  downloadUrl?: string
  fileSize?: number
  recordCount?: number
  error?: string
  message?: string
}

/**
 * Export status response
 */
export interface ExportStatusResponse {
  success: boolean
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
  progress?: number // 0-100
  filename?: string
  downloadUrl?: string
  fileSize?: number
  expiresAt?: string
  error?: string
  message?: string
}

// ============================================
// EXPORT HISTORY TYPES
// ============================================

/**
 * Export history record
 */
export interface ExportHistory {
  id: string
  userId: string
  exportType: ExportFormat
  exportFormat?: string
  callIds: string[]
  filterPresetId?: string
  filters?: FilterConfig
  filename: string
  fileSize?: number
  storagePath?: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
  errorMessage?: string
  downloadCount: number
  expiresAt?: string
  createdAt: string
  completedAt?: string
  lastDownloadedAt?: string
}

/**
 * Export history list response
 */
export interface ExportHistoryResponse {
  success: boolean
  exports?: ExportHistory[]
  total?: number
  error?: string
  message?: string
}

// ============================================
// CSV EXPORT TYPES
// ============================================

/**
 * CSV column configuration
 */
export interface CsvColumn {
  key: string
  header: string
  width?: number
  formatter?: (value: any) => string
}

/**
 * CSV export row data
 */
export interface CsvExportRow {
  [key: string]: string | number | boolean | null
}

/**
 * CSV export options
 */
export interface CsvExportOptions {
  delimiter: ',' | ';' | '\t'
  includeHeaders: boolean
  dateFormat: string
  encoding: 'utf-8' | 'utf-16' | 'ascii'
}

// ============================================
// PDF EXPORT TYPES
// ============================================

/**
 * PDF export options
 */
export interface PdfExportOptions {
  pageSize: 'A4' | 'Letter' | 'Legal'
  orientation: 'portrait' | 'landscape'
  includeHeaders: boolean
  includeFooters: boolean
  fontSize: number
  includeTableOfContents: boolean
  includeCharts: boolean
}

/**
 * PDF section
 */
export interface PdfSection {
  title: string
  content: string | PdfTable | PdfChart
  pageBreak?: boolean
}

/**
 * PDF table
 */
export interface PdfTable {
  headers: string[]
  rows: string[][]
  styles?: {
    headerBackgroundColor?: string
    headerTextColor?: string
    alternatingRows?: boolean
  }
}

/**
 * PDF chart data
 */
export interface PdfChart {
  type: 'bar' | 'line' | 'pie'
  title: string
  data: any // Chart-specific data structure
}

// ============================================
// EXCEL EXPORT TYPES
// ============================================

/**
 * Excel export options
 */
export interface ExcelExportOptions {
  sheetName: string
  includeFormatting: boolean
  freezeHeaders: boolean
  autoFilterEnabled: boolean
  includeCharts: boolean
}

/**
 * Excel sheet
 */
export interface ExcelSheet {
  name: string
  data: any[][]
  headers?: string[]
  styles?: ExcelCellStyle[]
}

/**
 * Excel cell style
 */
export interface ExcelCellStyle {
  cell: string // e.g., "A1"
  font?: {
    bold?: boolean
    italic?: boolean
    color?: string
    size?: number
  }
  fill?: {
    type: 'solid'
    color: string
  }
  alignment?: {
    horizontal?: 'left' | 'center' | 'right'
    vertical?: 'top' | 'middle' | 'bottom'
  }
}

// ============================================
// JSON EXPORT TYPES
// ============================================

/**
 * JSON export options
 */
export interface JsonExportOptions {
  pretty: boolean
  includeMetadata: boolean
}

/**
 * JSON export structure
 */
export interface JsonExport {
  metadata: {
    exportedAt: string
    recordCount: number
    filters?: FilterConfig
    version: string
  }
  calls: any[] // Array of call records with selected fields
}

// ============================================
// EXPORT PROGRESS TYPES
// ============================================

/**
 * Export progress tracker
 */
export interface ExportProgress {
  exportId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  currentStep: string
  totalSteps: number
  estimatedTimeRemaining?: number // Seconds
  error?: string
}

/**
 * Export step
 */
export interface ExportStep {
  name: string
  description: string
  progress: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  error?: string
}

// ============================================
// EXPORT VALIDATION TYPES
// ============================================

/**
 * Export validation result
 */
export interface ExportValidationResult {
  valid: boolean
  errors: ExportValidationError[]
  warnings: ExportValidationWarning[]
  estimatedFileSize?: number
  estimatedRecordCount?: number
}

/**
 * Export validation error
 */
export interface ExportValidationError {
  field: string
  message: string
  code: string
}

/**
 * Export validation warning
 */
export interface ExportValidationWarning {
  field: string
  message: string
  suggestion?: string
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get file extension for export format
 */
export function getFileExtension(format: ExportFormat): string {
  const extensions: Record<ExportFormat, string> = {
    csv: '.csv',
    json: '.json',
    pdf: '.pdf',
    excel: '.xlsx',
  }
  return extensions[format]
}

/**
 * Get MIME type for export format
 */
export function getMimeType(format: ExportFormat): string {
  const mimeTypes: Record<ExportFormat, string> = {
    csv: 'text/csv',
    json: 'application/json',
    pdf: 'application/pdf',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
  return mimeTypes[format]
}

/**
 * Generate export filename
 */
export function generateExportFilename(
  format: ExportFormat,
  prefix: string = 'dental-calls-export'
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
  const extension = getFileExtension(format)
  return `${prefix}-${timestamp}${extension}`
}

/**
 * Estimate file size (rough approximation)
 */
export function estimateFileSize(
  recordCount: number,
  format: ExportFormat,
  includeTranscripts: boolean
): number {
  // Very rough estimates in bytes per record
  const baseSizes: Record<ExportFormat, number> = {
    csv: 500,
    json: 1000,
    pdf: 2000,
    excel: 800,
  }
  
  let sizePerRecord = baseSizes[format]
  
  // Transcripts add significant size
  if (includeTranscripts) {
    sizePerRecord += 3000 // ~3KB per transcript on average
  }
  
  return recordCount * sizePerRecord
}


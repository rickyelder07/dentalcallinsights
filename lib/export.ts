/**
 * Export Library
 * Functions for exporting call data in various formats
 */

import type { ExportFormat, ExportFields, CsvExportRow } from '@/types/export'

// ============================================
// CSV EXPORT
// ============================================

/**
 * Convert calls data to CSV format
 */
export function convertToCSV(
  calls: any[],
  fields: ExportFields
): string {
  const headers: string[] = []
  const keys: string[] = []
  
  // Build headers and keys based on selected fields
  if (fields.filename) {
    headers.push('Filename')
    keys.push('filename')
  }
  if (fields.callTime) {
    headers.push('Call Time')
    keys.push('call_time')
  }
  if (fields.direction) {
    headers.push('Direction')
    keys.push('call_direction')
  }
  if (fields.duration) {
    headers.push('Duration (seconds)')
    keys.push('call_duration_seconds')
  }
  if (fields.sourceNumber) {
    headers.push('Source Number')
    keys.push('source_number')
  }
  if (fields.destinationNumber) {
    headers.push('Destination Number')
    keys.push('destination_number')
  }
  if (fields.disposition) {
    headers.push('Disposition')
    keys.push('disposition')
  }
  if (fields.language) {
    headers.push('Language')
    keys.push('language')
  }
  if (fields.sentiment) {
    headers.push('Sentiment')
    keys.push('sentiment')
  }
  if (fields.outcome) {
    headers.push('Outcome')
    keys.push('outcome')
  }
  if (fields.summary) {
    headers.push('Summary')
    keys.push('summary')
  }
  if (fields.actionItems) {
    headers.push('Action Items Count')
    keys.push('action_items_count')
  }
  if (fields.redFlags) {
    headers.push('Red Flags Count')
    keys.push('red_flags_count')
  }
  if (fields.transcript) {
    headers.push('Transcript')
    keys.push('transcript_text')
  }
  
  // Build CSV rows
  const rows: string[][] = [headers]
  
  calls.forEach((call) => {
    const row: string[] = []
    
    keys.forEach((key) => {
      let value = ''
      
      switch (key) {
        case 'filename':
          value = call.filename || ''
          break
        case 'call_time':
          value = call.call_time ? formatDate(call.call_time) : ''
          break
        case 'call_direction':
          value = call.call_direction || ''
          break
        case 'call_duration_seconds':
          value = call.call_duration_seconds?.toString() || '0'
          break
        case 'source_number':
          value = call.source_number || ''
          break
        case 'destination_number':
          value = call.destination_number || ''
          break
        case 'disposition':
          value = call.disposition || ''
          break
        case 'language':
          value = call.transcript?.language || ''
          break
        case 'sentiment':
          value = call.insights?.overall_sentiment || ''
          break
        case 'outcome':
          value = call.insights?.call_outcome || ''
          break
        case 'summary':
          value = call.insights?.summary_brief || ''
          break
        case 'action_items_count':
          value = call.insights?.action_items?.length?.toString() || '0'
          break
        case 'red_flags_count':
          value = call.insights?.red_flags?.length?.toString() || '0'
          break
        case 'transcript_text':
          value = call.transcript?.edited_transcript || 
                  call.transcript?.raw_transcript || 
                  call.transcript?.transcript || ''
          break
      }
      
      // Escape CSV special characters
      value = escapeCsvValue(value)
      row.push(value)
    })
    
    rows.push(row)
  })
  
  // Convert to CSV string
  return rows.map((row) => row.join(',')).join('\n')
}

/**
 * Escape CSV value
 */
function escapeCsvValue(value: string): string {
  if (!value) return ''
  
  // Convert to string and remove any existing quotes
  let escaped = String(value).replace(/"/g, '""')
  
  // Quote if contains comma, newline, or quote
  if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
    escaped = `"${escaped}"`
  }
  
  return escaped
}

// ============================================
// JSON EXPORT
// ============================================

/**
 * Convert calls data to JSON format
 */
export function convertToJSON(
  calls: any[],
  fields: ExportFields,
  pretty: boolean = true
): string {
  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      recordCount: calls.length,
      version: '1.0',
    },
    calls: calls.map((call) => formatCallForExport(call, fields)),
  }
  
  return JSON.stringify(exportData, null, pretty ? 2 : 0)
}

/**
 * Format call for export based on selected fields
 */
function formatCallForExport(call: any, fields: ExportFields): any {
  const exported: any = {}
  
  if (fields.filename) exported.filename = call.filename
  if (fields.callTime) exported.callTime = call.call_time
  if (fields.direction) exported.direction = call.call_direction
  if (fields.duration) exported.durationSeconds = call.call_duration_seconds
  if (fields.sourceNumber) exported.sourceNumber = call.source_number
  if (fields.destinationNumber) exported.destinationNumber = call.destination_number
  if (fields.disposition) exported.disposition = call.disposition
  
  if (fields.transcript && call.transcript) {
    exported.transcript = {
      text: call.transcript.edited_transcript || 
            call.transcript.raw_transcript || 
            call.transcript.transcript,
      language: call.transcript.language,
      status: call.transcript.transcription_status,
    }
  }
  
  if (fields.summary && call.insights) {
    exported.insights = {
      summary: call.insights.summary_brief,
      keyPoints: call.insights.summary_key_points,
    }
  }
  
  if (fields.sentiment && call.insights) {
    exported.sentiment = {
      overall: call.insights.overall_sentiment,
      patientSatisfaction: call.insights.patient_satisfaction,
      staffPerformance: call.insights.staff_performance,
    }
  }
  
  if (fields.outcome && call.insights) {
    exported.outcome = call.insights.call_outcome
  }
  
  if (fields.actionItems && call.insights) {
    exported.actionItems = call.insights.action_items || []
  }
  
  if (fields.redFlags && call.insights) {
    exported.redFlags = call.insights.red_flags || []
  }
  
  if (fields.createdAt) exported.createdAt = call.created_at
  if (fields.updatedAt) exported.updatedAt = call.updated_at
  
  return exported
}

// ============================================
// DOWNLOAD UTILITIES
// ============================================

/**
 * Trigger browser download of content
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string = 'export.csv'): void {
  downloadFile(content, filename, 'text/csv;charset=utf-8;')
}

/**
 * Download JSON file
 */
export function downloadJSON(content: string, filename: string = 'export.json'): void {
  downloadFile(content, filename, 'application/json')
}

// ============================================
// FILENAME GENERATION
// ============================================

/**
 * Generate export filename
 */
export function generateExportFilename(
  format: ExportFormat,
  prefix: string = 'dental-calls'
): string {
  const timestamp = new Date().toISOString().split('T')[0]
  
  const extensions: Record<ExportFormat, string> = {
    csv: 'csv',
    json: 'json',
    pdf: 'pdf',
    excel: 'xlsx',
  }
  
  const extension = extensions[format]
  return `${prefix}-${timestamp}.${extension}`
}

// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format date for export
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toISOString()
  } catch {
    return dateString
  }
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Calculate file size estimate
 */
export function estimateFileSize(
  recordCount: number,
  format: ExportFormat,
  includeTranscripts: boolean
): number {
  // Base size per record in bytes
  const baseSizes: Record<ExportFormat, number> = {
    csv: 300,
    json: 500,
    pdf: 1500,
    excel: 400,
  }
  
  let sizePerRecord = baseSizes[format]
  
  // Add transcript size if included
  if (includeTranscripts) {
    sizePerRecord += 2000 // ~2KB average transcript
  }
  
  return recordCount * sizePerRecord
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}


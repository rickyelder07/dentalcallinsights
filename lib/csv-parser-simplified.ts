/**
 * Simplified CSV Parser
 * Parses CSV files with direct filename matching to audio files
 * Expected format: Call Time, Direction, Source Number, ..., Call (filename)
 */

import type {
  CsvCallRow,
  CsvValidationResult,
  CsvValidationError,
  CsvValidationWarning,
  CSV_COLUMN_HEADERS,
} from '@/types/upload'

export class SimplifiedCsvParser {
  /**
   * Parse date/time string to ISO format
   * Handles format: "September 6th 2025 5:45 pm"
   */
  private static parseDateTime(dateTimeStr: string): Date | null {
    try {
      if (!dateTimeStr || dateTimeStr.trim() === '') {
        return null
      }

      // Remove ordinal suffixes (st, nd, rd, th)
      const cleanedStr = dateTimeStr
        .toLowerCase()
        .replace(/(\d+)(st|nd|rd|th)/g, '$1')

      // Month mapping
      const months: Record<string, number> = {
        january: 0,
        february: 1,
        march: 2,
        april: 3,
        may: 4,
        june: 5,
        july: 6,
        august: 7,
        september: 8,
        october: 9,
        november: 10,
        december: 11,
      }

      // Parse: "september 6 2025 5:45 pm"
      const parts = cleanedStr.split(/\s+/)
      if (parts.length < 4) {
        // Try standard Date parsing as fallback
        const parsed = new Date(dateTimeStr)
        return isNaN(parsed.getTime()) ? null : parsed
      }

      const monthName = parts[0]
      const day = parseInt(parts[1])
      const year = parseInt(parts[2])
      const timeStr = parts.slice(3).join(' ')

      const month = months[monthName]
      if (month === undefined || isNaN(day) || isNaN(year)) {
        // Try standard Date parsing as fallback
        const parsed = new Date(dateTimeStr)
        return isNaN(parsed.getTime()) ? null : parsed
      }

      // Parse time (e.g., "5:45 pm")
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/)
      if (!timeMatch) {
        return null
      }

      let hours = parseInt(timeMatch[1])
      const minutes = parseInt(timeMatch[2])
      const ampm = timeMatch[3]

      // Convert to 24-hour format
      if (ampm === 'pm' && hours !== 12) {
        hours += 12
      }
      if (ampm === 'am' && hours === 12) {
        hours = 0
      }

      const date = new Date(year, month, day, hours, minutes, 0)
      return isNaN(date.getTime()) ? null : date
    } catch (error) {
      return null
    }
  }

  /**
   * Parse duration string to seconds
   * Handles formats: "4 mins. 5 secs", "2 min 30 sec", "45 seconds"
   */
  private static parseDuration(durationStr: string): number | null {
    try {
      if (!durationStr || durationStr.trim() === '') {
        return null
      }

      let totalSeconds = 0

      // Extract minutes
      const minutesMatch = durationStr.match(/(\d+)\s*mins?\.?/i)
      if (minutesMatch) {
        totalSeconds += parseInt(minutesMatch[1]) * 60
      }

      // Extract seconds
      const secondsMatch = durationStr.match(/(\d+)\s*secs?\.?/i)
      if (secondsMatch) {
        totalSeconds += parseInt(secondsMatch[1])
      }

      return totalSeconds > 0 ? totalSeconds : null
    } catch (error) {
      return null
    }
  }

  /**
   * Parse a single CSV row
   * Handles quoted values and commas within quotes
   */
  private static parseCsvRow(row: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < row.length; i++) {
      const char = row[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    // Add the last value
    values.push(current.trim())
    return values
  }

  /**
   * Validate CSV headers
   * Must include: Call Time and Direction
   * Optional: Call (filename) - if missing, all rows will be marked "No Call Recording"
   */
  private static validateHeaders(headers: string[]): {
    valid: boolean
    errors: CsvValidationError[]
    warnings: CsvValidationWarning[]
  } {
    const errors: CsvValidationError[] = []
    const warnings: CsvValidationWarning[] = []

    // Check for optional "Call" column
    const hasCallColumn = headers.some(
      (h) => h.toLowerCase() === 'call' || h.toLowerCase().trim() === 'call'
    )

    if (!hasCallColumn) {
      warnings.push({
        row: 1,
        column: 'Call',
        message:
          'No "Call" column found. All rows will be marked as "No Call Recording".',
      })
    }

    // Check for Call Time
    const hasCallTime = headers.some(
      (h) =>
        h.toLowerCase() === 'call time' ||
        h.toLowerCase().includes('call') && h.toLowerCase().includes('time')
    )

    if (!hasCallTime) {
      errors.push({
        row: 1,
        column: 'Call Time',
        message: 'Missing required "Call Time" column.',
      })
    }

    // Check for Direction
    const hasDirection = headers.some(
      (h) => h.toLowerCase() === 'direction' || h.toLowerCase().includes('direction')
    )

    if (!hasDirection) {
      errors.push({
        row: 1,
        column: 'Direction',
        message: 'Missing required "Direction" column.',
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Get column index by name (case-insensitive)
   */
  private static getColumnIndex(headers: string[], columnName: string): number {
    return headers.findIndex(
      (h) => h.toLowerCase().trim() === columnName.toLowerCase().trim()
    )
  }

  /**
   * Parse entire CSV file
   * Returns validation result with parsed rows and any errors
   */
  public static parseCSV(csvContent: string): CsvValidationResult {
    const errors: CsvValidationError[] = []
    const warnings: CsvValidationWarning[] = []
    const rows: CsvCallRow[] = []
    const audioFilenames: string[] = []

    try {
      // Split into lines and filter empty ones
      const lines = csvContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      if (lines.length < 2) {
        errors.push({
          row: 0,
          column: 'file',
          message: 'CSV file must contain at least a header row and one data row.',
        })
        return {
          valid: false,
          rows: [],
          errors,
          warnings,
          rowCount: 0,
          audioFilenames: [],
        }
      }

      // Parse and validate headers
      const headers = this.parseCsvRow(lines[0])
      const headerValidation = this.validateHeaders(headers)

      // Add header warnings to the warnings array
      if (headerValidation.warnings.length > 0) {
        warnings.push(...headerValidation.warnings)
      }

      if (!headerValidation.valid) {
        return {
          valid: false,
          rows: [],
          errors: headerValidation.errors,
          warnings,
          rowCount: 0,
          audioFilenames: [],
        }
      }

      // Get column indexes
      const callTimeIdx = this.getColumnIndex(headers, 'Call Time')
      const directionIdx = this.getColumnIndex(headers, 'Direction')
      const sourceNumberIdx = this.getColumnIndex(headers, 'Source Number')
      const sourceNameIdx = this.getColumnIndex(headers, 'Source Name')
      const sourceExtIdx = this.getColumnIndex(headers, 'Source Ext')
      const destNumberIdx = this.getColumnIndex(headers, 'Destination Number')
      const destExtIdx = this.getColumnIndex(headers, 'Destination Ext')
      const durationIdx = this.getColumnIndex(headers, 'Duration')
      const dispositionIdx = this.getColumnIndex(headers, 'Disposition')
      const callFlowIdx = this.getColumnIndex(headers, 'Call Flow')
      const timeToAnswerIdx = this.getColumnIndex(headers, 'Time to Answer')
      const callIdx = this.getColumnIndex(headers, 'Call')

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const rowNum = i + 1
        const values = this.parseCsvRow(lines[i])

        // Validate required fields
        const callTimeStr = values[callTimeIdx]?.trim() || ''
        const direction = values[directionIdx]?.trim() || ''
        // If Call column doesn't exist (callIdx === -1), filename will be empty
        const filename = callIdx !== -1 ? (values[callIdx]?.trim() || '') : ''

        // Check for required fields
        if (!callTimeStr) {
          errors.push({
            row: rowNum,
            column: 'Call Time',
            message: 'Call Time is required',
            value: callTimeStr,
          })
          continue
        }

        if (!direction) {
          errors.push({
            row: rowNum,
            column: 'Direction',
            message: 'Direction is required',
            value: direction,
          })
          continue
        }

        // If no filename, mark as "No Call Recording"
        const finalFilename = filename || 'No Call Recording'
        
        // Add warning if no recording
        if (!filename) {
          warnings.push({
            row: rowNum,
            column: 'Call',
            message: 'No recording available - will be marked as "No Call Recording"',
            value: filename,
          })
        }

        // Note: Direction validation removed - any value is now accepted
        // The database will still convert to lowercase for consistency

        // Parse call time
        const callTime = this.parseDateTime(callTimeStr)
        if (!callTime) {
          errors.push({
            row: rowNum,
            column: 'Call Time',
            message: 'Invalid date/time format',
            value: callTimeStr,
          })
          continue
        }

        // Parse duration
        const durationStr = values[durationIdx]?.trim() || ''
        const durationSeconds = durationStr ? this.parseDuration(durationStr) : undefined

        // Parse time to answer
        const timeToAnswerStr = values[timeToAnswerIdx]?.trim() || ''
        const timeToAnswerSeconds = timeToAnswerStr
          ? this.parseDuration(timeToAnswerStr)
          : undefined

        // Create row object
        const row: CsvCallRow = {
          call_time: callTime.toISOString(),
          direction: direction as 'Inbound' | 'Outbound',
          source_number: values[sourceNumberIdx]?.trim() || undefined,
          source_name: values[sourceNameIdx]?.trim() || undefined,
          source_extension: values[sourceExtIdx]?.trim() || undefined,
          destination_number: values[destNumberIdx]?.trim() || undefined,
          destination_extension: values[destExtIdx]?.trim() || undefined,
          duration_seconds: durationSeconds || undefined,
          disposition: values[dispositionIdx]?.trim() || undefined,
          call_flow: values[callFlowIdx]?.trim() || undefined,
          time_to_answer_seconds: timeToAnswerSeconds || undefined,
          filename: finalFilename,
        }

        rows.push(row)
        
        // Only add to audioFilenames if it's an actual file (not "No Call Recording")
        if (filename) {
          audioFilenames.push(filename)
        }
      }

      return {
        valid: errors.length === 0,
        rows,
        errors,
        warnings,
        rowCount: rows.length,
        audioFilenames,
      }
    } catch (error) {
      errors.push({
        row: 0,
        column: 'file',
        message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
      return {
        valid: false,
        rows: [],
        errors,
        warnings,
        rowCount: 0,
        audioFilenames: [],
      }
    }
  }

  /**
   * Validate audio files against CSV filenames
   * Ensures all uploaded files have corresponding CSV rows
   */
  public static validateAudioFiles(
    audioFiles: File[],
    csvFilenames: string[]
  ): {
    valid: boolean
    validFiles: string[]
    missingFiles: string[]
    extraFiles: string[]
    errors: CsvValidationError[]
  } {
    const errors: CsvValidationError[] = []
    const validFiles: string[] = []
    const uploadedFilenames = audioFiles.map((f) => f.name)

    // Find files in CSV but not uploaded
    const missingFiles = csvFilenames.filter((f) => !uploadedFilenames.includes(f))

    // Find files uploaded but not in CSV
    const extraFiles = uploadedFilenames.filter((f) => !csvFilenames.includes(f))

    // Find valid files (in both CSV and uploaded)
    csvFilenames.forEach((filename) => {
      if (uploadedFilenames.includes(filename)) {
        validFiles.push(filename)
      }
    })

    // Add errors for extra files
    if (extraFiles.length > 0) {
      extraFiles.forEach((filename) => {
        errors.push({
          row: 0,
          column: 'Call',
          message: `Audio file "${filename}" was uploaded but does not match any filename in the CSV "Call" column.`,
          value: filename,
        })
      })
    }

    return {
      valid: errors.length === 0 && missingFiles.length === 0,
      validFiles,
      missingFiles,
      extraFiles,
      errors,
    }
  }
}


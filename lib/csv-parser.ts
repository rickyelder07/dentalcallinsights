/**
 * CSV Parser Utilities
 * 
 * Handles parsing and validation of CSV call data files
 * Supports the standard call data format with headers:
 * CALL TIME, CALL DIRECTION, SOURCE NUMBER, etc.
 */

import { 
  CsvCallData, 
  CsvValidationResult, 
  CsvValidationError, 
  CsvValidationWarning,
  EXPECTED_CSV_COLUMNS,
  VALID_CALL_DIRECTIONS,
  COMMON_DISPOSITIONS
} from '@/types/csv';

export class CsvParser {
  private static parseDateTime(dateTimeStr: string): Date | null {
    try {
      // Handle various date formats
      const formats = [
        'MMMM Do YYYY h:mm a', // "September 23rd 2025 4:49 pm"
        'YYYY-MM-DD HH:mm:ss',
        'MM/DD/YYYY HH:mm:ss',
        'DD/MM/YYYY HH:mm:ss',
        'YYYY-MM-DDTHH:mm:ss',
        'MM/DD/YYYY h:mm a',
        'DD/MM/YYYY h:mm a'
      ];

      for (const format of formats) {
        try {
          // Try moment.js style parsing for the first format
          if (format === 'MMMM Do YYYY h:mm a') {
            const parsed = this.parseCustomDateTime(dateTimeStr);
            if (parsed) return parsed;
          }
          
          // Try standard Date parsing for other formats
          const parsed = new Date(dateTimeStr);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        } catch (e) {
          continue;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private static parseCustomDateTime(dateTimeStr: string): Date | null {
    try {
      // Parse "September 23rd 2025 4:49 pm" format
      const months = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
        'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
      };

      const parts = dateTimeStr.toLowerCase().split(' ');
      if (parts.length < 4) return null;

      const monthName = parts[0];
      const dayStr = parts[1].replace(/\D/g, ''); // Remove ordinal suffixes (st, nd, rd, th)
      const year = parseInt(parts[2]);
      const timeStr = parts.slice(3).join(' ');

      const month = months[monthName as keyof typeof months];
      if (month === undefined) return null;

      const day = parseInt(dayStr);
      if (isNaN(day) || isNaN(year)) return null;

      // Parse time
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
      if (!timeMatch) return null;

      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const ampm = timeMatch[3];

      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      return new Date(year, month, day, hours, minutes);
    } catch (error) {
      return null;
    }
  }

  private static validatePhoneNumber(phone: string): boolean {
    if (!phone) return true; // Optional field
    // Basic phone number validation - can be enhanced
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  private static validateCallDirection(direction: string): boolean {
    return VALID_CALL_DIRECTIONS.includes(direction as any);
  }

  private static validateDuration(duration: string): boolean {
    const num = parseInt(duration);
    return !isNaN(num) && num >= 0;
  }

  private static validateDisposition(disposition: string): boolean {
    if (!disposition) return true; // Optional field
    return COMMON_DISPOSITIONS.includes(disposition.toLowerCase() as any);
  }

  public static parseCsvFile(csvContent: string): CsvValidationResult {
    const errors: CsvValidationError[] = [];
    const warnings: CsvValidationWarning[] = [];
    
    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        errors.push({
          row: 0,
          column: 'file',
          message: 'CSV file must contain at least a header row and one data row'
        });
        return { valid: false, errors, warnings };
      }

      // Parse header row
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Validate headers
      const missingHeaders = EXPECTED_CSV_COLUMNS.filter(expected => 
        !headers.some(header => header.toLowerCase() === expected.toLowerCase())
      );

      if (missingHeaders.length > 0) {
        warnings.push({
          row: 1,
          column: 'headers',
          message: `Missing expected headers: ${missingHeaders.join(', ')}`
        });
      }

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const values = this.parseCsvRow(row);
        const rowNum = i + 1;

        // Validate required fields
        if (!values[0]) { // CALL TIME
          errors.push({
            row: rowNum,
            column: 'CALL TIME',
            message: 'Call time is required',
            value: values[0]
          });
        } else {
          const callTime = this.parseDateTime(values[0]);
          if (!callTime) {
            errors.push({
              row: rowNum,
              column: 'CALL TIME',
              message: 'Invalid date/time format',
              value: values[0]
            });
          }
        }

        // Validate call direction
        if (!values[1]) {
          errors.push({
            row: rowNum,
            column: 'CALL DIRECTION',
            message: 'Call direction is required',
            value: values[1]
          });
        } else if (!this.validateCallDirection(values[1])) {
          errors.push({
            row: rowNum,
            column: 'CALL DIRECTION',
            message: 'Invalid call direction. Must be "Inbound" or "Outbound"',
            value: values[1]
          });
        }

        // Validate phone numbers
        if (values[2] && !this.validatePhoneNumber(values[2])) {
          warnings.push({
            row: rowNum,
            column: 'SOURCE NUMBER',
            message: 'Phone number format may be invalid',
            value: values[2]
          });
        }

        if (values[5] && !this.validatePhoneNumber(values[5])) {
          warnings.push({
            row: rowNum,
            column: 'DESTINATION NUMBER',
            message: 'Phone number format may be invalid',
            value: values[5]
          });
        }

        // Validate duration
        if (values[7] && !this.validateDuration(values[7])) {
          errors.push({
            row: rowNum,
            column: 'CALL DURATION SECONDS',
            message: 'Call duration must be a positive number',
            value: values[7]
          });
        }

        // Validate time to answer
        if (values[9] && !this.validateDuration(values[9])) {
          errors.push({
            row: rowNum,
            column: 'TIME TO ANSWER SECONDS',
            message: 'Time to answer must be a positive number',
            value: values[9]
          });
        }

        // Validate disposition
        if (values[8] && !this.validateDisposition(values[8])) {
          warnings.push({
            row: rowNum,
            column: 'DISPOSITION',
            message: 'Uncommon disposition value',
            value: values[8]
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push({
        row: 0,
        column: 'file',
        message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return { valid: false, errors, warnings };
    }
  }

  private static parseCsvRow(row: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  public static parseCsvToCallData(csvContent: string, userId: string): CsvCallData[] {
    const lines = csvContent.split('\n').filter(line => line.trim());
    // Skip header row
    const callData: CsvCallData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvRow(lines[i]);
      
      const callTime = this.parseDateTime(values[0]);
      if (!callTime) continue; // Skip invalid rows

      const callDataItem: CsvCallData = {
        user_id: userId,
        call_time: callTime.toISOString(),
        call_direction: values[1] as 'Inbound' | 'Outbound',
        source_number: values[2] || undefined,
        source_name: values[3] || undefined,
        source_extension: values[4] || undefined,
        destination_number: values[5] || undefined,
        destination_extension: values[6] || undefined,
        call_duration_seconds: values[7] ? parseInt(values[7]) : undefined,
        disposition: values[8] || undefined,
        time_to_answer_seconds: values[9] ? parseInt(values[9]) : undefined,
        call_flow: values[10] || undefined
      };

      callData.push(callDataItem);
    }

    return callData;
  }
}

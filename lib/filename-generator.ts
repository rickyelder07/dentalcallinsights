/**
 * Filename Generator Utility
 * Generates standardized call filenames based on call metadata
 * Format: A_B_C_D_E
 * A: extension name or number (prioritize name if available)
 * B: call direction (inbound/outbound)
 * C: call time (MM-DD-YY_HH:MM AM/PM)
 * D: call flow (###-###-#### to ###-###-####)
 * E: call duration (Xsecs)
 */

import { getExtensionDisplayName } from './extension-names'

/**
 * Generate call filename in standardized format
 */
export function generateCallFilename(params: {
  extension: string | null | undefined
  direction: string | null | undefined
  callTime: string | Date
  callFlow: string | null | undefined
  durationSeconds: number | null | undefined
  fileExtension?: string
}): string {
  const {
    extension,
    direction,
    callTime,
    callFlow,
    durationSeconds,
    fileExtension = 'mp3',
  } = params

  // A: Extension name or number (prioritize name)
  const extensionPart = extension
    ? getExtensionDisplayName(extension).replace(/\s+/g, '_')
    : 'Unknown'

  // B: Call direction (normalize to lowercase)
  const directionPart = direction
    ? direction.toLowerCase().replace(/\s+/g, '_')
    : 'unknown'

  // C: Call time (MM-DD-YY_HH:MM AM/PM)
  const callTimePart = formatCallTimeForFilename(callTime)

  // D: Call flow (###-###-#### to ###-###-####)
  const callFlowPart = formatCallFlowForFilename(callFlow)

  // E: Call duration (Xsecs)
  const durationPart = durationSeconds
    ? `${durationSeconds}secs`
    : '0secs'

  // Combine all parts
  const filename = `${extensionPart}_${directionPart}_${callTimePart}_${callFlowPart}_${durationPart}.${fileExtension}`

  // Sanitize filename (remove invalid characters)
  return sanitizeFilename(filename)
}

/**
 * Format call time as MM-DD-YY_HH:MM AM/PM
 */
function formatCallTimeForFilename(callTime: string | Date): string {
  try {
    const date = typeof callTime === 'string' ? new Date(callTime) : callTime
    
    if (isNaN(date.getTime())) {
      return '00-00-00_00:00-AM'
    }

    // Extract components (using UTC to avoid timezone issues)
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const year = String(date.getUTCFullYear()).slice(-2)
    
    // Convert to 12-hour format with AM/PM
    let hours = date.getUTCHours()
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12 // 0 should be 12
    const hours12 = String(hours).padStart(2, '0')

    return `${month}-${day}-${year}_${hours12}:${minutes}-${ampm}`
  } catch (error) {
    console.error('Error formatting call time:', error)
    return '00-00-00_00:00-AM'
  }
}

/**
 * Format call flow for filename
 * Format: ###-###-#### to ###-###-####
 */
function formatCallFlowForFilename(callFlow: string | null | undefined): string {
  if (!callFlow) {
    return 'unknown-to-unknown'
  }

  // Try to extract phone numbers from call flow
  // Common formats: "123-456-7890 to 098-765-4321" or "1234567890 to 0987654321"
  const phoneRegex = /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g
  const matches = callFlow.match(phoneRegex)

  if (matches && matches.length >= 2) {
    // Format both numbers consistently
    const formatPhone = (phone: string) => {
      const digits = phone.replace(/\D/g, '')
      if (digits.length === 10) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
      }
      return phone.replace(/\D/g, '')
    }
    return `${formatPhone(matches[0])}-to-${formatPhone(matches[1])}`
  }

  // If we can't parse it, sanitize the call flow string
  return sanitizeCallFlow(callFlow)
}

/**
 * Sanitize call flow string for filename
 */
function sanitizeCallFlow(callFlow: string): string {
  return callFlow
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .toLowerCase()
    .substring(0, 50) // Limit length
    || 'unknown-to-unknown'
}

/**
 * Sanitize filename to remove invalid characters
 */
function sanitizeFilename(filename: string): string {
  // Remove or replace invalid filename characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid Windows/Linux chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 255) // Limit to reasonable filename length
}


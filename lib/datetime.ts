/**
 * Date/Time helpers for formatting call-related timestamps.
 * Ensures we display Pacific Time exactly as recorded without shifting.
 */

const PACIFIC_TIMEZONE = 'America/Los_Angeles'

/**
 * Parse a call timestamp string without applying any timezone conversions.
 *
 * The database stores call times as the "wall clock" value in Pacific Time.
 * We strip any trailing timezone/offset information and construct a Date using
 * the individual date parts so that the value represents the exact local time.
 */
export function parseCallTime(callTime?: string | null): Date | null {
  if (!callTime) return null

  const isoMatch = callTime.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/
  )

  if (!isoMatch) {
    const parsed = new Date(callTime)
    return isNaN(parsed.getTime()) ? null : parsed
  }

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr] = isoMatch

  const year = Number(yearStr)
  const month = Number(monthStr) - 1
  const day = Number(dayStr)
  const hours = Number(hourStr)
  const minutes = Number(minuteStr)
  const seconds = secondStr ? Number(secondStr) : 0

  return new Date(year, month, day, hours, minutes, seconds)
}

/**
 * Format a call timestamp for display in Pacific Time without timezone drift.
 */
export function formatCallTime(
  callTime?: string | null,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }
): string {
  const parsed = parseCallTime(callTime)
  if (!parsed) return ''

  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: PACIFIC_TIMEZONE,
  }).format(parsed)
}

/**
 * Format only the time portion in Pacific Time.
 */
export function formatCallTimeOnly(
  callTime?: string | null,
  options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  }
): string {
  const parsed = parseCallTime(callTime)
  if (!parsed) return ''

  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: PACIFIC_TIMEZONE,
  }).format(parsed)
}


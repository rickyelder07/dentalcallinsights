/**
 * Filters Library
 * Functions for applying filters to calls data
 */

import type { FilterConfig, SortConfig } from '@/types/filters'
import type { Call } from '@/types/upload'

// ============================================
// FILTER APPLICATION
// ============================================

/**
 * Apply filters to calls array
 */
export function applyFilters(calls: any[], filters: FilterConfig): any[] {
  let filtered = calls
  
  // Date range filter
  if (filters.dateRange) {
    filtered = filterByDateRange(filtered, filters.dateRange)
  }
  
  // Direction filter
  if (filters.direction && filters.direction !== 'all') {
    filtered = filtered.filter((call) => call.call_direction === filters.direction)
  }
  
  // Duration filter
  if (filters.duration) {
    filtered = filterByDuration(filtered, filters.duration)
  }
  
  // Sentiment filter
  if (filters.sentiment && filters.sentiment.length > 0 && !filters.sentiment.includes('all')) {
    filtered = filtered.filter((call) => {
      if (!call.insights) return false
      return filters.sentiment!.includes(call.insights.overall_sentiment)
    })
  }
  
  // Outcome filter
  if (filters.outcome && filters.outcome.length > 0 && !filters.outcome.includes('all')) {
    filtered = filtered.filter((call) => {
      if (!call.insights) return false
      return filters.outcome!.includes(call.insights.call_outcome)
    })
  }
  
  // Has insights filter
  if (filters.hasInsights !== undefined) {
    filtered = filtered.filter((call) => {
      const hasInsights = !!call.insights
      return filters.hasInsights ? hasInsights : !hasInsights
    })
  }
  
  // Has embeddings filter
  if (filters.hasEmbeddings !== undefined) {
    filtered = filtered.filter((call) => {
      const hasEmbeddings = !!call.hasEmbeddings
      return filters.hasEmbeddings ? hasEmbeddings : !hasEmbeddings
    })
  }
  
  // Transcription status filter
  if (filters.transcriptionStatus && filters.transcriptionStatus !== 'all') {
    filtered = filtered.filter((call) => {
      if (!call.transcript) return filters.transcriptionStatus === 'pending'
      return call.transcript.transcription_status === filters.transcriptionStatus
    })
  }
  
  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter((call) => {
      if (!call.tags || !Array.isArray(call.tags)) return false
      return filters.tags!.some((tag) => call.tags.includes(tag))
    })
  }
  
  // Has action items filter
  if (filters.hasActionItems !== undefined) {
    filtered = filtered.filter((call) => {
      if (!call.insights || !call.insights.action_items) return false
      const hasItems = Array.isArray(call.insights.action_items) && 
                      call.insights.action_items.length > 0
      return filters.hasActionItems ? hasItems : !hasItems
    })
  }
  
  // Has red flags filter
  if (filters.hasRedFlags !== undefined) {
    filtered = filtered.filter((call) => {
      if (!call.insights || !call.insights.red_flags) return false
      const hasFlags = Array.isArray(call.insights.red_flags) && 
                      call.insights.red_flags.length > 0
      return filters.hasRedFlags ? hasFlags : !hasFlags
    })
  }
  
  // Search query filter (searches filename, numbers, transcript)
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase().trim()
    filtered = filtered.filter((call) => {
      return (
        call.filename?.toLowerCase().includes(query) ||
        call.source_number?.toLowerCase().includes(query) ||
        call.destination_number?.toLowerCase().includes(query) ||
        call.transcript?.transcript?.toLowerCase().includes(query) ||
        call.transcript?.edited_transcript?.toLowerCase().includes(query)
      )
    })
  }
  
  return filtered
}

/**
 * Filter calls by date range
 */
function filterByDateRange(calls: any[], dateRange: { start: string | null; end: string | null }): any[] {
  return calls.filter((call) => {
    if (!call.call_time) return false
    
    const callDate = new Date(call.call_time)
    
    if (dateRange.start && callDate < new Date(dateRange.start)) {
      return false
    }
    
    if (dateRange.end) {
      const endDate = new Date(dateRange.end)
      endDate.setHours(23, 59, 59, 999) // Include entire end date
      if (callDate > endDate) {
        return false
      }
    }
    
    return true
  })
}

/**
 * Filter calls by duration
 */
function filterByDuration(
  calls: any[],
  duration: { min: number | null; max: number | null }
): any[] {
  return calls.filter((call) => {
    const callDuration = call.call_duration_seconds
    if (callDuration == null) return false
    
    if (duration.min != null && callDuration < duration.min) {
      return false
    }
    
    if (duration.max != null && callDuration > duration.max) {
      return false
    }
    
    return true
  })
}

// ============================================
// SORTING
// ============================================

/**
 * Apply sorting to calls array
 */
export function applySorting(calls: any[], sort: SortConfig): any[] {
  const sorted = [...calls]
  
  sorted.sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sort.field) {
      case 'call_time':
        aValue = a.call_time ? new Date(a.call_time).getTime() : 0
        bValue = b.call_time ? new Date(b.call_time).getTime() : 0
        break
      
      case 'call_duration_seconds':
        aValue = a.call_duration_seconds || 0
        bValue = b.call_duration_seconds || 0
        break
      
      case 'filename':
        aValue = a.filename || ''
        bValue = b.filename || ''
        break
      
      case 'overall_sentiment':
        aValue = a.insights?.overall_sentiment || 'zzz'
        bValue = b.insights?.overall_sentiment || 'zzz'
        break
      
      case 'created_at':
        aValue = a.created_at ? new Date(a.created_at).getTime() : 0
        bValue = b.created_at ? new Date(b.created_at).getTime() : 0
        break
      
      default:
        return 0
    }
    
    if (aValue < bValue) {
      return sort.direction === 'asc' ? -1 : 1
    }
    if (aValue > bValue) {
      return sort.direction === 'asc' ? 1 : -1
    }
    return 0
  })
  
  return sorted
}

// ============================================
// FILTER VALIDATION
// ============================================

/**
 * Validate filter configuration
 */
export function validateFilters(filters: FilterConfig): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Validate date range
  if (filters.dateRange) {
    if (filters.dateRange.start && filters.dateRange.end) {
      const start = new Date(filters.dateRange.start)
      const end = new Date(filters.dateRange.end)
      
      if (start > end) {
        errors.push('Start date must be before end date')
      }
    }
  }
  
  // Validate duration
  if (filters.duration) {
    if (filters.duration.min != null && filters.duration.min < 0) {
      errors.push('Minimum duration cannot be negative')
    }
    
    if (filters.duration.max != null && filters.duration.max < 0) {
      errors.push('Maximum duration cannot be negative')
    }
    
    if (
      filters.duration.min != null &&
      filters.duration.max != null &&
      filters.duration.min > filters.duration.max
    ) {
      errors.push('Minimum duration must be less than maximum duration')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================
// FILTER PRESETS
// ============================================

/**
 * Get predefined filter presets
 */
export function getPredefinedFilterPresets(): Array<{
  name: string
  description: string
  filters: FilterConfig
}> {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  return [
    {
      name: 'All Calls',
      description: 'Show all calls without filters',
      filters: {},
    },
    {
      name: 'Recent (Last 7 Days)',
      description: 'Calls from the last 7 days',
      filters: {
        dateRange: {
          start: last7Days.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
        },
      },
    },
    {
      name: 'Last 30 Days',
      description: 'Calls from the last 30 days',
      filters: {
        dateRange: {
          start: last30Days.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0],
        },
      },
    },
    {
      name: 'Transcribed Only',
      description: 'Calls with completed transcriptions',
      filters: {
        transcriptionStatus: 'completed',
      },
    },
    {
      name: 'With AI Insights',
      description: 'Calls that have AI insights generated',
      filters: {
        hasInsights: true,
      },
    },
    {
      name: 'Positive Sentiment',
      description: 'Calls with positive overall sentiment',
      filters: {
        sentiment: ['positive'],
        hasInsights: true,
      },
    },
    {
      name: 'Negative Sentiment',
      description: 'Calls with negative overall sentiment',
      filters: {
        sentiment: ['negative'],
        hasInsights: true,
      },
    },
    {
      name: 'Needs Attention',
      description: 'Calls with red flags or issues',
      filters: {
        hasRedFlags: true,
      },
    },
    {
      name: 'Has Action Items',
      description: 'Calls with actionable follow-ups',
      filters: {
        hasActionItems: true,
      },
    },
    {
      name: 'Long Calls (> 5 min)',
      description: 'Calls longer than 5 minutes',
      filters: {
        duration: {
          min: 300,
          max: null,
        },
      },
    },
    {
      name: 'Short Calls (< 2 min)',
      description: 'Calls shorter than 2 minutes',
      filters: {
        duration: {
          min: null,
          max: 120,
        },
      },
    },
    {
      name: 'Inbound Only',
      description: 'Only inbound calls',
      filters: {
        direction: 'Inbound',
      },
    },
    {
      name: 'Outbound Only',
      description: 'Only outbound calls',
      filters: {
        direction: 'Outbound',
      },
    },
  ]
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Count active filters
 */
export function countActiveFilters(filters: FilterConfig): number {
  let count = 0
  
  if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) count++
  if (filters.direction && filters.direction !== 'all') count++
  if (filters.duration && (filters.duration.min != null || filters.duration.max != null)) count++
  if (filters.sentiment && filters.sentiment.length > 0 && !filters.sentiment.includes('all')) count++
  if (filters.outcome && filters.outcome.length > 0 && !filters.outcome.includes('all')) count++
  if (filters.hasInsights !== undefined) count++
  if (filters.hasEmbeddings !== undefined) count++
  if (filters.transcriptionStatus && filters.transcriptionStatus !== 'all') count++
  if (filters.tags && filters.tags.length > 0) count++
  if (filters.hasActionItems !== undefined) count++
  if (filters.hasRedFlags !== undefined) count++
  if (filters.searchQuery) count++
  
  return count
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: FilterConfig): boolean {
  return countActiveFilters(filters) > 0
}

/**
 * Clear all filters
 */
export function clearFilters(): FilterConfig {
  return {}
}

/**
 * Get filter summary text
 */
export function getFilterSummary(filters: FilterConfig): string {
  const parts: string[] = []
  
  if (filters.dateRange) {
    if (filters.dateRange.start && filters.dateRange.end) {
      parts.push(`Date: ${filters.dateRange.start} to ${filters.dateRange.end}`)
    } else if (filters.dateRange.start) {
      parts.push(`After: ${filters.dateRange.start}`)
    } else if (filters.dateRange.end) {
      parts.push(`Before: ${filters.dateRange.end}`)
    }
  }
  
  if (filters.sentiment && filters.sentiment.length > 0 && !filters.sentiment.includes('all')) {
    parts.push(`Sentiment: ${filters.sentiment.join(', ')}`)
  }
  
  if (filters.outcome && filters.outcome.length > 0 && !filters.outcome.includes('all')) {
    parts.push(`Outcome: ${filters.outcome.join(', ')}`)
  }
  
  if (filters.hasInsights) parts.push('Has insights')
  if (filters.hasRedFlags) parts.push('Has red flags')
  if (filters.hasActionItems) parts.push('Has action items')
  
  if (filters.direction && filters.direction !== 'all') {
    parts.push(`Direction: ${filters.direction}`)
  }
  
  if (filters.duration) {
    if (filters.duration.min != null && filters.duration.max != null) {
      parts.push(`Duration: ${filters.duration.min}-${filters.duration.max}s`)
    } else if (filters.duration.min != null) {
      parts.push(`Duration > ${filters.duration.min}s`)
    } else if (filters.duration.max != null) {
      parts.push(`Duration < ${filters.duration.max}s`)
    }
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'No filters active'
}


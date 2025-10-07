/**
 * Filters Type Definitions
 * Types for advanced filtering, saved presets, and search configuration
 */

import type { CallOutcome, OverallSentiment } from './insights'

// ============================================
// FILTER TYPES
// ============================================

/**
 * Date range filter
 */
export interface DateRangeFilter {
  start: string | null // ISO date
  end: string | null // ISO date
}

/**
 * Duration filter (in seconds)
 */
export interface DurationFilter {
  min: number | null
  max: number | null
}

/**
 * Sentiment filter options
 */
export type SentimentFilterOption = OverallSentiment | 'all'

/**
 * Outcome filter options
 */
export type OutcomeFilterOption = CallOutcome | 'all'

/**
 * Call direction filter
 */
export type DirectionFilter = 'Inbound' | 'Outbound' | 'all'

/**
 * Transcription status filter
 */
export type TranscriptionStatusFilter = 
  | 'completed' 
  | 'processing' 
  | 'pending' 
  | 'failed' 
  | 'all'

/**
 * Complete filter configuration
 */
export interface FilterConfig {
  // Date and time
  dateRange?: DateRangeFilter
  
  // Call properties
  direction?: DirectionFilter
  duration?: DurationFilter
  
  // AI-based filters
  sentiment?: SentimentFilterOption[]
  outcome?: OutcomeFilterOption[]
  hasInsights?: boolean
  hasEmbeddings?: boolean
  
  // Transcription
  transcriptionStatus?: TranscriptionStatusFilter
  
  // Tags
  tags?: string[]
  
  // Action items and red flags
  hasActionItems?: boolean
  hasRedFlags?: boolean
  
  // Text search
  searchQuery?: string
}

// ============================================
// FILTER PRESET TYPES
// ============================================

/**
 * Filter preset database record
 */
export interface FilterPreset {
  id: string
  userId: string
  name: string
  description?: string
  isDefault: boolean
  filters: FilterConfig
  usageCount: number
  lastUsedAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * Create filter preset request
 */
export interface CreateFilterPresetRequest {
  name: string
  description?: string
  isDefault?: boolean
  filters: FilterConfig
}

/**
 * Update filter preset request
 */
export interface UpdateFilterPresetRequest {
  id: string
  name?: string
  description?: string
  isDefault?: boolean
  filters?: FilterConfig
}

/**
 * Filter preset API response
 */
export interface FilterPresetResponse {
  success: boolean
  preset?: FilterPreset
  presets?: FilterPreset[]
  error?: string
  message?: string
}

// ============================================
// SORTING TYPES
// ============================================

/**
 * Sort field options
 */
export type SortField = 
  | 'call_time'
  | 'call_duration_seconds'
  | 'filename'
  | 'overall_sentiment'
  | 'created_at'

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc'

/**
 * Sort configuration
 */
export interface SortConfig {
  field: SortField
  direction: SortDirection
}

// ============================================
// PAGINATION TYPES
// ============================================

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  page: number
  pageSize: number
  totalPages?: number
  totalItems?: number
}

/**
 * Cursor-based pagination for infinite scroll
 */
export interface CursorPagination {
  cursor?: string // Last item ID
  limit: number
  hasMore: boolean
}

// ============================================
// COMBINED QUERY TYPES
// ============================================

/**
 * Complete query configuration
 */
export interface QueryConfig {
  filters: FilterConfig
  sort: SortConfig
  pagination: PaginationConfig
}

/**
 * Query result with metadata
 */
export interface QueryResult<T> {
  items: T[]
  pagination: PaginationConfig
  filters: FilterConfig
  sort: SortConfig
  totalFiltered: number
}

// ============================================
// FILTER UI STATE TYPES
// ============================================

/**
 * Filter panel state
 */
export interface FilterPanelState {
  isOpen: boolean
  activeSection?: 'date' | 'sentiment' | 'outcome' | 'duration' | 'tags'
  hasActiveFilters: boolean
  filterCount: number
}

/**
 * Date picker state
 */
export interface DatePickerState {
  isOpen: boolean
  selectedRange: DateRangeFilter
  presetRanges: {
    label: string
    range: DateRangeFilter
  }[]
}

/**
 * Duration slider state
 */
export interface DurationSliderState {
  min: number
  max: number
  currentMin: number
  currentMax: number
}

// ============================================
// FILTER VALIDATION TYPES
// ============================================

/**
 * Filter validation result
 */
export interface FilterValidationResult {
  valid: boolean
  errors: FilterValidationError[]
  warnings: FilterValidationWarning[]
}

/**
 * Filter validation error
 */
export interface FilterValidationError {
  field: string
  message: string
  code: string
}

/**
 * Filter validation warning
 */
export interface FilterValidationWarning {
  field: string
  message: string
  suggestion?: string
}

// ============================================
// PREDEFINED FILTER PRESETS
// ============================================

/**
 * Predefined filter preset configurations
 */
export const PREDEFINED_FILTERS = {
  ALL_CALLS: {
    name: 'All Calls',
    filters: {},
  },
  TRANSCRIBED: {
    name: 'Transcribed Calls',
    filters: {
      transcriptionStatus: 'completed' as TranscriptionStatusFilter,
    },
  },
  WITH_INSIGHTS: {
    name: 'Calls with AI Insights',
    filters: {
      hasInsights: true,
    },
  },
  POSITIVE_SENTIMENT: {
    name: 'Positive Sentiment',
    filters: {
      sentiment: ['positive' as OverallSentiment],
      hasInsights: true,
    },
  },
  NEGATIVE_SENTIMENT: {
    name: 'Negative Sentiment',
    filters: {
      sentiment: ['negative' as OverallSentiment],
      hasInsights: true,
    },
  },
  NEEDS_ATTENTION: {
    name: 'Needs Attention',
    filters: {
      hasRedFlags: true,
    },
  },
  ACTION_ITEMS: {
    name: 'Has Action Items',
    filters: {
      hasActionItems: true,
    },
  },
  RECENT: {
    name: 'Recent (Last 7 Days)',
    filters: {
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
    },
  },
  LONG_CALLS: {
    name: 'Long Calls (> 5 min)',
    filters: {
      duration: {
        min: 300, // 5 minutes in seconds
        max: null,
      },
    },
  },
  SHORT_CALLS: {
    name: 'Short Calls (< 2 min)',
    filters: {
      duration: {
        min: null,
        max: 120, // 2 minutes in seconds
      },
    },
  },
} as const

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Check if filters are active
 */
export function hasActiveFilters(filters: FilterConfig): boolean {
  return !!(
    filters.dateRange ||
    filters.direction !== 'all' ||
    filters.duration ||
    (filters.sentiment && filters.sentiment.length > 0 && !filters.sentiment.includes('all')) ||
    (filters.outcome && filters.outcome.length > 0 && !filters.outcome.includes('all')) ||
    filters.hasInsights !== undefined ||
    filters.hasEmbeddings !== undefined ||
    filters.transcriptionStatus !== 'all' ||
    (filters.tags && filters.tags.length > 0) ||
    filters.hasActionItems !== undefined ||
    filters.hasRedFlags !== undefined ||
    filters.searchQuery
  )
}

/**
 * Count active filters
 */
export function countActiveFilters(filters: FilterConfig): number {
  let count = 0
  
  if (filters.dateRange) count++
  if (filters.direction && filters.direction !== 'all') count++
  if (filters.duration) count++
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
 * Get filter summary text
 */
export function getFilterSummary(filters: FilterConfig): string {
  const parts: string[] = []
  
  if (filters.dateRange) parts.push('Date range')
  if (filters.sentiment && filters.sentiment.length > 0 && !filters.sentiment.includes('all')) {
    parts.push(`Sentiment: ${filters.sentiment.join(', ')}`)
  }
  if (filters.outcome && filters.outcome.length > 0 && !filters.outcome.includes('all')) {
    parts.push(`Outcome: ${filters.outcome.join(', ')}`)
  }
  if (filters.hasInsights) parts.push('Has insights')
  if (filters.hasRedFlags) parts.push('Has red flags')
  if (filters.hasActionItems) parts.push('Has action items')
  
  return parts.length > 0 ? parts.join(' • ') : 'No filters active'
}


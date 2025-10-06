/**
 * Search Type Definitions
 * Types for search queries, results, analytics, and user behavior
 */

import type { SearchFilters, SearchResult } from './embeddings'

// ============================================
// SEARCH QUERY TYPES
// ============================================

/**
 * Search query record in database
 */
export interface SearchQuery {
  id: string
  user_id: string
  
  // Query details
  query_text: string
  query_type: 'semantic' | 'keyword' | 'filter'
  
  // Filters applied
  filters?: SearchFilters
  
  // Results
  result_count: number
  has_results: boolean
  
  // Performance
  search_time_ms: number
  
  // User interaction
  clicked_result_ids: string[]
  
  // Timestamps
  created_at: string
}

/**
 * Search query input
 */
export interface SearchQueryInput {
  query: string
  filters?: SearchFilters
  limit?: number
  offset?: number
}

/**
 * Search query response
 */
export interface SearchQueryResponse {
  success: boolean
  query: string
  results: SearchResult[]
  totalResults: number
  page: number
  totalPages: number
  searchTime: number
  error?: string
}

// ============================================
// SEARCH ANALYTICS TYPES
// ============================================

/**
 * Popular search query
 */
export interface PopularQuery {
  query: string
  searchCount: number
  avgResultCount: number
  avgSearchTime: number
  lastSearched: string
}

/**
 * Search analytics summary
 */
export interface SearchAnalytics {
  totalSearches: number
  uniqueQueries: number
  avgResultCount: number
  avgSearchTime: number
  
  // Popular queries
  popularQueries: PopularQuery[]
  
  // Time-based stats
  searchesByDay: { date: string; count: number }[]
  
  // Success metrics
  successRate: number // % of searches with results
  clickThroughRate: number // % of searches with clicked results
}

/**
 * Search analytics request
 */
export interface SearchAnalyticsRequest {
  dateFrom?: string
  dateTo?: string
  limit?: number
}

/**
 * Search analytics response
 */
export interface SearchAnalyticsResponse {
  success: boolean
  analytics: SearchAnalytics
  error?: string
}

// ============================================
// SEARCH HISTORY TYPES
// ============================================

/**
 * User search history item
 */
export interface SearchHistoryItem {
  id: string
  query: string
  resultCount: number
  searchTime: number
  createdAt: string
}

/**
 * Search history response
 */
export interface SearchHistoryResponse {
  success: boolean
  history: SearchHistoryItem[]
  totalCount: number
  error?: string
}

// ============================================
// SEARCH SUGGESTIONS TYPES
// ============================================

/**
 * Search suggestion
 */
export interface SearchSuggestion {
  text: string
  type: 'query' | 'filter' | 'concept'
  count?: number
}

/**
 * Search suggestions request
 */
export interface SearchSuggestionsRequest {
  query: string
  limit?: number
}

/**
 * Search suggestions response
 */
export interface SearchSuggestionsResponse {
  success: boolean
  suggestions: SearchSuggestion[]
  error?: string
}

// ============================================
// SEARCH RESULT INTERACTION TYPES
// ============================================

/**
 * Search result click event
 */
export interface SearchResultClick {
  searchQueryId: string
  resultCallId: string
  position: number // Position in search results
  timestamp: string
}

/**
 * Track result click request
 */
export interface TrackResultClickRequest {
  searchQueryId: string
  resultCallId: string
  position: number
}

// ============================================
// SEARCH EXPORT TYPES
// ============================================

/**
 * Export search results request
 */
export interface ExportSearchResultsRequest {
  query: string
  filters?: SearchFilters
  format: 'csv' | 'json' | 'excel'
}

/**
 * Export search results response
 */
export interface ExportSearchResultsResponse {
  success: boolean
  downloadUrl?: string
  filename?: string
  error?: string
}

// ============================================
// SEARCH FACETS TYPES
// ============================================

/**
 * Search facet (for filter counts)
 */
export interface SearchFacet {
  name: string
  values: {
    value: string
    count: number
    selected: boolean
  }[]
}

/**
 * Search facets response
 */
export interface SearchFacetsResponse {
  success: boolean
  facets: SearchFacet[]
  error?: string
}

// ============================================
// SEARCH PERFORMANCE TYPES
// ============================================

/**
 * Search performance metrics
 */
export interface SearchPerformance {
  avgSearchTime: number
  p50SearchTime: number
  p95SearchTime: number
  p99SearchTime: number
  totalSearches: number
  slowSearches: number // > 1 second
}

/**
 * Search performance response
 */
export interface SearchPerformanceResponse {
  success: boolean
  performance: SearchPerformance
  error?: string
}

// ============================================
// SEARCH CONFIGURATION TYPES
// ============================================

/**
 * User search preferences
 */
export interface SearchPreferences {
  userId: string
  
  // Display preferences
  resultsPerPage: number
  showPreviews: boolean
  highlightMatches: boolean
  
  // Filter defaults
  defaultFilters?: SearchFilters
  
  // Personalization
  enablePersonalization: boolean
  saveSearchHistory: boolean
}

/**
 * Search configuration
 */
export interface SearchConfig {
  // Performance
  maxResults: number
  searchTimeout: number
  cacheTimeout: number
  
  // Similarity
  similarityThreshold: number
  minSimilarityScore: number
  
  // Features
  enableSuggestions: boolean
  enableAnalytics: boolean
  enablePersonalization: boolean
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Search result with metadata
 */
export interface EnhancedSearchResult extends SearchResult {
  // User interaction
  clickCount?: number
  lastClicked?: string
  
  // Personalization
  relevanceBoost?: number
  
  // Additional metadata
  tags?: string[]
  category?: string
}

/**
 * Search session
 */
export interface SearchSession {
  sessionId: string
  userId: string
  queries: SearchQuery[]
  startTime: string
  endTime?: string
  totalClicks: number
}


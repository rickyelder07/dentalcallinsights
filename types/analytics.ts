/**
 * Analytics Type Definitions
 * Types for dashboard analytics, trends, and performance metrics
 */

import type { CallOutcome, OverallSentiment } from './insights'

// ============================================
// ANALYTICS OVERVIEW TYPES
// ============================================

/**
 * Overview analytics for dashboard
 */
export interface AnalyticsOverview {
  // Call statistics
  totalCalls: number
  transcribedCalls: number
  callsWithInsights: number
  callsWithEmbeddings: number
  
  // Duration statistics
  avgCallDuration: number
  totalCallDuration: number
  
  // Sentiment distribution
  positiveCalls: number
  negativeCalls: number
  neutralCalls: number
  mixedCalls: number
  
  // Action items and red flags
  callsWithActionItems: number
  callsWithRedFlags: number
  
  // Date range
  earliestCall?: string
  latestCall?: string
  
  // Metadata
  computedAt: string
}

/**
 * Trend data point for time-series charts
 */
export interface TrendDataPoint {
  date: string // ISO date
  callCount: number
  avgDuration: number
  positiveCount: number
  negativeCount: number
  neutralCount: number
  inboundCount: number
  outboundCount: number
}

/**
 * Trends over time
 */
export interface AnalyticsTrends {
  period: 'day' | 'week' | 'month'
  dataPoints: TrendDataPoint[]
  summary: {
    totalCalls: number
    avgCallsPerDay: number
    trendDirection: 'up' | 'down' | 'stable'
    percentChange: number
  }
}

// ============================================
// SENTIMENT ANALYTICS TYPES
// ============================================

/**
 * Sentiment distribution
 */
export interface SentimentDistribution {
  sentiment: OverallSentiment
  count: number
  percentage: number
}

/**
 * Patient satisfaction breakdown
 */
export interface PatientSatisfactionBreakdown {
  happy: number
  satisfied: number
  neutral: number
  frustrated: number
  angry: number
  tooShort: number
}

/**
 * Sentiment analytics data
 */
export interface SentimentAnalytics {
  distribution: SentimentDistribution[]
  patientSatisfaction: PatientSatisfactionBreakdown
  sentimentTrend: {
    period: string
    positivePercentage: number
    negativePercentage: number
    change: number // Percentage change from previous period
  }
  avgSatisfactionScore: number // 0-100 scale
}

// ============================================
// TOPICS ANALYTICS TYPES
// ============================================

/**
 * Topic with frequency
 */
export interface TopicFrequency {
  topic: string
  count: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
}

/**
 * Keyword with context
 */
export interface KeywordAnalysis {
  keyword: string
  frequency: number
  sentiment: 'positive' | 'negative' | 'neutral'
  callIds: string[]
}

/**
 * Topics analytics data
 */
export interface TopicsAnalytics {
  commonTopics: TopicFrequency[]
  keywords: KeywordAnalysis[]
  categories: {
    category: string
    count: number
    avgSentiment: OverallSentiment
  }[]
}

// ============================================
// PERFORMANCE METRICS TYPES
// ============================================

/**
 * Call outcome distribution
 */
export interface OutcomeDistribution {
  outcome: CallOutcome
  count: number
  percentage: number
}

/**
 * Staff performance metrics
 */
export interface StaffPerformance {
  totalCalls: number
  professionalCalls: number
  needsImprovementCalls: number
  avgCallDuration: number
  avgPatientSatisfaction: number
  resolutionRate: number // Percentage of resolved calls
}

/**
 * Revenue impact analysis
 */
export interface RevenueImpact {
  appointmentsScheduled: number
  appointmentsCancelled: number
  missedOpportunities: number
  estimatedRevenue: number // Estimated based on appointments
}

/**
 * Performance metrics data
 */
export interface PerformanceMetrics {
  outcomes: OutcomeDistribution[]
  staffPerformance: StaffPerformance
  revenueImpact: RevenueImpact
  callVolumePatterns: {
    peakHours: { hour: number; count: number }[]
    peakDays: { day: string; count: number }[]
  }
}

// ============================================
// ANALYTICS CACHE TYPES
// ============================================

/**
 * Analytics cache record
 */
export interface AnalyticsCache {
  id: string
  userId: string
  cacheKey: string
  cacheType: 'overview' | 'trends' | 'sentiment' | 'topics' | 'performance'
  data: any // JSONB data
  dateRangeStart?: string
  dateRangeEnd?: string
  computedAt: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * Date range for analytics queries
 */
export interface DateRange {
  start: string // ISO date
  end: string // ISO date
}

/**
 * Analytics request parameters
 */
export interface AnalyticsRequest {
  dateRange?: DateRange
  forceRefresh?: boolean
}

/**
 * Analytics API response
 */
export interface AnalyticsResponse<T = any> {
  success: boolean
  data?: T
  cached?: boolean
  computedAt?: string
  error?: string
  message?: string
}

/**
 * Overview analytics response
 */
export type AnalyticsOverviewResponse = AnalyticsResponse<AnalyticsOverview>

/**
 * Trends analytics response
 */
export type AnalyticsTrendsResponse = AnalyticsResponse<AnalyticsTrends>

/**
 * Sentiment analytics response
 */
export type SentimentAnalyticsResponse = AnalyticsResponse<SentimentAnalytics>

/**
 * Topics analytics response
 */
export type TopicsAnalyticsResponse = AnalyticsResponse<TopicsAnalytics>

/**
 * Performance metrics response
 */
export type PerformanceMetricsResponse = AnalyticsResponse<PerformanceMetrics>

// ============================================
// CHART DATA TYPES
// ============================================

/**
 * Chart data point
 */
export interface ChartDataPoint {
  label: string
  value: number
  color?: string
  metadata?: Record<string, any>
}

/**
 * Time series chart data
 */
export interface TimeSeriesData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color: string
    borderColor?: string
    backgroundColor?: string
  }[]
}

/**
 * Pie chart data
 */
export interface PieChartData {
  labels: string[]
  data: number[]
  colors: string[]
}

/**
 * Bar chart data
 */
export interface BarChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor: string[]
  }[]
}

// ============================================
// DASHBOARD STATE TYPES
// ============================================

/**
 * Dashboard loading state
 */
export interface DashboardLoadingState {
  overview: boolean
  trends: boolean
  sentiment: boolean
  topics: boolean
  performance: boolean
}

/**
 * Dashboard error state
 */
export interface DashboardErrorState {
  overview?: string
  trends?: string
  sentiment?: string
  topics?: string
  performance?: string
}

/**
 * Complete dashboard state
 */
export interface DashboardState {
  loading: DashboardLoadingState
  errors: DashboardErrorState
  data: {
    overview?: AnalyticsOverview
    trends?: AnalyticsTrends
    sentiment?: SentimentAnalytics
    topics?: TopicsAnalytics
    performance?: PerformanceMetrics
  }
  dateRange: DateRange
  lastRefreshed?: string
}

// ============================================
// CALLER ANALYTICS TYPES
// ============================================

/**
 * Topic count for caller analytics
 */
export interface TopicCount {
  topic: string
  count: number
}

/**
 * Red flag category count
 */
export interface RedFlagCategoryCount {
  category: string
  count: number
}

/**
 * Action priority count
 */
export interface ActionPriorityCount {
  priority: string
  count: number
}

/**
 * Overview data for a single caller/extension
 */
export interface CallerOverview {
  extension: string
  totalCalls: number
  sentimentDistribution: {
    positive: number
    negative: number
    neutral: number
    mixed: number
  }
  satisfactionScore: number
}

/**
 * Comprehensive performance metrics for a caller
 */
export interface CallerPerformanceMetrics {
  extension: string
  callVolume: {
    totalCalls: number
    avgCallsPerDay: number
    inboundCount: number
    outboundCount: number
  }
  sentimentAnalysis: {
    distribution: SentimentDistribution[]
    avgSatisfactionScore: number
    positivePercentage: number
    patientSatisfactionBreakdown: PatientSatisfactionBreakdown
  }
  qualityMetrics: {
    professionalCalls: number
    needsImprovementCalls: number
    resolutionRate: number
    avgCallDuration: number
    overallAvgDuration: number
    outcomes: OutcomeDistribution[]
  }
  performanceIndicators: {
    callsWithRedFlags: number
    redFlagsPercentage: number
    redFlagCategories: RedFlagCategoryCount[]
    callsWithActionItems: number
    actionItemsPercentage: number
    actionPriorities: ActionPriorityCount[]
  }
  patientImpact: {
    newPatientCalls: number
    appointmentsScheduled: number
    appointmentsCancelled: number
    estimatedRevenue: number
  }
  topTopics: TopicCount[]
  callTrends: TrendDataPoint[]
}

/**
 * Caller analytics API response for overview (all extensions)
 */
export type CallerOverviewResponse = AnalyticsResponse<CallerOverview[]>

/**
 * Caller analytics API response for performance (single extension)
 */
export type CallerPerformanceResponse = AnalyticsResponse<CallerPerformanceMetrics>

// ============================================
// CALL HIGHLIGHTS TYPES
// ============================================

/**
 * Individual call highlight with performance data
 */
export interface CallHighlight {
  call: any // Full call object with all fields
  insights: any // Call insights data
  score?: number // Weighted performance score (0-100)
  duration: number // Call duration in seconds
  sentiment: string // Overall sentiment
  satisfactionScore: number // Satisfaction score (0-100)
}

/**
 * Extension performer statistics
 */
export interface PerformerStats {
  extension: string
  totalCalls: number
  performanceScore: number // Weighted performance score (0-100)
  sentimentDistribution: {
    positive: number
    negative: number
    neutral: number
    mixed: number
  }
  avgSatisfactionScore: number
  positivePercent: number
  negativePercent: number
}

/**
 * Complete call highlights data for a date range
 */
export interface CallHighlightsData {
  longestCalls: CallHighlight[]
  positiveCallsRanked: CallHighlight[]
  negativeCalls: CallHighlight[]
  highestPerformer: PerformerStats | null
  lowestPerformer: PerformerStats | null
  newPatientGood: CallHighlight[]
  newPatientPoor: CallHighlight[]
  dateRange: { start: string; end: string }
}

/**
 * Call highlights API response
 */
export type CallHighlightsResponse = AnalyticsResponse<CallHighlightsData>

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Percentage change calculation result
 */
export interface PercentageChange {
  current: number
  previous: number
  change: number
  percentage: number
  direction: 'up' | 'down' | 'stable'
}

/**
 * Statistical summary
 */
export interface StatisticalSummary {
  count: number
  sum: number
  avg: number
  min: number
  max: number
  median?: number
  stdDev?: number
}


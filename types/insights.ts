/**
 * AI Insights Type Definitions
 * Types for GPT-4o generated insights: Summary, Sentiment, Actions, Red Flags
 */

// ============================================
// CORE INSIGHT TYPES
// ============================================

/**
 * Call outcome status
 */
export type CallOutcome = 
  | 'resolved' 
  | 'pending' 
  | 'escalated' 
  | 'no_resolution'
  | 'too_short'

/**
 * Overall sentiment
 */
export type OverallSentiment = 
  | 'positive' 
  | 'neutral' 
  | 'negative' 
  | 'mixed'
  | 'too_short'

/**
 * Patient satisfaction level
 */
export type PatientSatisfaction = 
  | 'happy' 
  | 'satisfied' 
  | 'neutral' 
  | 'frustrated' 
  | 'angry'
  | 'too_short'

/**
 * Staff performance assessment
 */
export type StaffPerformance = 
  | 'professional' 
  | 'needs_improvement'
  | 'too_short'

/**
 * Action item priority
 */
export type ActionPriority = 
  | 'urgent' 
  | 'high' 
  | 'normal' 
  | 'low'

/**
 * Action item assignee
 */
export type ActionAssignee = 
  | 'staff' 
  | 'patient' 
  | 'dentist' 
  | 'billing' 
  | 'front_desk'

/**
 * Red flag severity
 */
export type RedFlagSeverity = 
  | 'high' 
  | 'medium' 
  | 'low'

/**
 * Red flag category
 */
export type RedFlagCategory = 
  | 'compliance' 
  | 'dissatisfaction' 
  | 'missed_opportunity' 
  | 'billing' 
  | 'emergency'

// ============================================
// INSIGHT STRUCTURES
// ============================================

/**
 * Call summary insight
 */
export interface CallSummary {
  brief: string // 2-3 sentence summary
  key_points: string[] // 3-5 bullet points
  outcome: CallOutcome
}

/**
 * Sentiment analysis insight
 */
export interface SentimentAnalysis {
  overall: OverallSentiment
  patient_satisfaction: PatientSatisfaction
  staff_performance: StaffPerformance
}

/**
 * Action item
 */
export interface ActionItem {
  action: string
  priority: ActionPriority
  assignee: ActionAssignee
}

/**
 * Red flag/concern
 */
export interface RedFlag {
  concern: string
  severity: RedFlagSeverity
  category: RedFlagCategory
}

// ============================================
// COMPLETE INSIGHTS
// ============================================

/**
 * Complete insights for a call
 */
export interface CallInsights {
  summary: CallSummary
  sentiment: SentimentAnalysis
  action_items: ActionItem[]
  red_flags: RedFlag[]
}

/**
 * Insights database record
 */
export interface InsightsRecord {
  id: string
  call_id: string
  user_id: string
  
  // Summary
  summary_brief: string
  summary_key_points: string[]
  call_outcome: string
  
  // Sentiment
  overall_sentiment: string
  patient_satisfaction: string
  staff_performance: string
  
  // Action Items (JSONB)
  action_items: ActionItem[]
  
  // Red Flags (JSONB)
  red_flags: RedFlag[]
  
  // Metadata
  model_used: string
  transcript_hash: string | null
  generated_at: string
  
  // Timestamps
  created_at: string
  updated_at: string
}

// ============================================
// API TYPES
// ============================================

/**
 * Generate insights request
 */
export interface GenerateInsightsRequest {
  callId: string
  forceRegenerate?: boolean
}

/**
 * Generate insights response
 */
export interface GenerateInsightsResponse {
  success: boolean
  insights?: CallInsights
  cached?: boolean
  error?: string
  message?: string
}

/**
 * Regenerate insights request
 */
export interface RegenerateInsightsRequest {
  callId: string
}

/**
 * Export insights request
 */
export interface ExportInsightsRequest {
  callId: string
  format: 'json' | 'text'
}

/**
 * Export insights response
 */
export interface ExportInsightsResponse {
  success: boolean
  filename?: string
  content?: string
  error?: string
}

// ============================================
// GPT-4o TYPES
// ============================================

/**
 * GPT-4o insights response structure
 */
export interface GPTInsightsResponse {
  summary: {
    brief: string
    key_points: string[]
    outcome: string
  }
  sentiment: {
    overall: string
    patient_satisfaction: string
    staff_performance: string
  }
  action_items: Array<{
    action: string
    priority: string
    assignee: string
  }>
  red_flags: Array<{
    concern: string
    severity: string
    category: string
  }>
}

// ============================================
// UI COMPONENT TYPES
// ============================================

/**
 * Insights panel state
 */
export interface InsightsPanelState {
  isLoading: boolean
  isRegenerating: boolean
  error: string | null
  insights: CallInsights | null
  cached: boolean
}

/**
 * Insights panel props
 */
export interface InsightsPanelProps {
  callId: string
  callDuration?: number
  onInsightsGenerated?: (insights: CallInsights) => void
  onError?: (error: string) => void
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Check if insights are too short
 */
export function isTooShort(insights: CallInsights | null): boolean {
  if (!insights) return false
  return insights.summary.outcome === 'too_short'
}

/**
 * Get sentiment emoji
 */
export function getSentimentEmoji(sentiment: OverallSentiment): string {
  switch (sentiment) {
    case 'positive':
      return '😊'
    case 'neutral':
      return '😐'
    case 'negative':
      return '😟'
    case 'mixed':
      return '🤔'
    case 'too_short':
      return '⏱️'
    default:
      return '😐'
  }
}

/**
 * Get sentiment color
 */
export function getSentimentColor(sentiment: OverallSentiment): string {
  switch (sentiment) {
    case 'positive':
      return 'text-green-600 bg-green-50'
    case 'neutral':
      return 'text-gray-600 bg-gray-50'
    case 'negative':
      return 'text-red-600 bg-red-50'
    case 'mixed':
      return 'text-orange-600 bg-orange-50'
    case 'too_short':
      return 'text-gray-500 bg-gray-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: ActionPriority): string {
  switch (priority) {
    case 'urgent':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'normal':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'low':
      return 'text-gray-600 bg-gray-50 border-gray-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: RedFlagSeverity): string {
  switch (severity) {
    case 'high':
      return 'text-red-700 bg-red-50 border-red-300'
    case 'medium':
      return 'text-orange-700 bg-orange-50 border-orange-300'
    case 'low':
      return 'text-yellow-700 bg-yellow-50 border-yellow-300'
    default:
      return 'text-gray-700 bg-gray-50 border-gray-300'
  }
}

/**
 * Get outcome badge color
 */
export function getOutcomeColor(outcome: CallOutcome): string {
  switch (outcome) {
    case 'resolved':
      return 'text-green-700 bg-green-100 border-green-300'
    case 'pending':
      return 'text-yellow-700 bg-yellow-100 border-yellow-300'
    case 'escalated':
      return 'text-red-700 bg-red-100 border-red-300'
    case 'no_resolution':
      return 'text-gray-700 bg-gray-100 border-gray-300'
    case 'too_short':
      return 'text-gray-600 bg-gray-50 border-gray-200'
    default:
      return 'text-gray-700 bg-gray-100 border-gray-300'
  }
}


/**
 * QA & Call Scoring Type Definitions
 * Types for quality assurance, call scoring, and QA workflows (Milestone 8)
 */

// ============================================
// SCORING TYPES
// ============================================

/**
 * Scoring category
 */
export type ScoringCategory = 
  | 'starting_call'
  | 'upselling'
  | 'rebuttals'
  | 'qualitative'

/**
 * Review status
 */
export type ReviewStatus = 
  | 'draft'
  | 'completed'
  | 'reviewed'
  | 'approved'

/**
 * Call score record
 */
export interface CallScore {
  id: string
  call_id: string
  user_id: string
  
  // Scoring information
  total_score: number // 0-100
  scored_at: string
  
  // Category scores
  starting_call_score?: number // 0-30
  upselling_score?: number // 0-25
  rebuttals_score?: number // 0-10
  qualitative_score?: number // 0-35
  
  // Metadata
  scorer_notes?: string
  review_status: ReviewStatus
  agent_name?: string
  
  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * Individual scoring criterion
 */
export interface ScoreCriterion {
  id: string
  score_id: string
  
  // Criterion identification
  criterion_name: string
  criterion_category: ScoringCategory
  criterion_weight: number
  
  // Scoring
  score: number
  applicable: boolean
  
  // Notes and evidence
  notes?: string
  transcript_excerpt?: string
  
  // Timestamp
  created_at: string
}

/**
 * Call score with criteria details
 */
export interface CallScoreWithCriteria extends CallScore {
  criteria: ScoreCriterion[]
}

// ============================================
// SCORING CRITERIA DEFINITIONS
// ============================================

/**
 * Criterion definition from Scoring Guide.csv
 */
export interface CriterionDefinition {
  name: string
  category: ScoringCategory
  weight: number
  definition: string
  applicability: 'all' | 'conditional'
  applicabilityConditions?: string
  examples?: string[]
}

/**
 * Complete scoring criteria configuration
 */
export interface ScoringCriteriaConfig {
  categories: {
    starting_call: CriterionDefinition[]
    upselling: CriterionDefinition[]
    rebuttals: CriterionDefinition[]
    qualitative: CriterionDefinition[]
  }
  totalPoints: number
}

// ============================================
// SCORING FORM TYPES
// ============================================

/**
 * Criterion form value
 */
export interface CriterionFormValue {
  criterion_name: string
  criterion_category: ScoringCategory
  criterion_weight: number
  score: number
  applicable: boolean
  notes?: string
  transcript_excerpt?: string
}

/**
 * Score submission request
 */
export interface ScoreSubmissionRequest {
  call_id: string
  criteria: CriterionFormValue[]
  scorer_notes?: string
  agent_name?: string
  review_status?: ReviewStatus
}

/**
 * Score submission response
 */
export interface ScoreSubmissionResponse {
  success: boolean
  score_id?: string
  total_score?: number
  message?: string
  error?: string
}

/**
 * Score update request
 */
export interface ScoreUpdateRequest extends ScoreSubmissionRequest {
  score_id: string
}

// ============================================
// QA ASSIGNMENTS TYPES
// ============================================

/**
 * Assignment priority
 */
export type AssignmentPriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'

/**
 * Assignment status
 */
export type AssignmentStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'

/**
 * QA assignment record
 */
export interface QAAssignment {
  id: string
  call_id: string
  
  // Assignment details
  assigned_to: string
  assigned_by: string
  
  // Priority and scheduling
  priority: AssignmentPriority
  due_date?: string
  
  // Status tracking
  status: AssignmentStatus
  completed_at?: string
  
  // Notes
  assignment_notes?: string
  completion_notes?: string
  
  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * QA assignment with call details
 */
export interface QAAssignmentWithCall extends QAAssignment {
  call?: {
    id: string
    filename: string
    call_time?: string
    call_direction?: string
    call_duration_seconds?: number
    agent_name?: string
  }
  score?: CallScore
}

/**
 * Assignment creation request
 */
export interface AssignmentCreateRequest {
  call_ids: string[]
  assigned_to: string
  priority?: AssignmentPriority
  due_date?: string
  assignment_notes?: string
}

/**
 * Assignment update request
 */
export interface AssignmentUpdateRequest {
  assignment_id: string
  status?: AssignmentStatus
  completion_notes?: string
  priority?: AssignmentPriority
  due_date?: string
}

// ============================================
// QA TEMPLATES TYPES
// ============================================

/**
 * Template criterion configuration
 */
export interface TemplateCriterionConfig {
  criterion_name: string
  criterion_category: ScoringCategory
  criterion_weight: number
  default_applicable: boolean
  guidance_notes?: string
}

/**
 * QA template record
 */
export interface QATemplate {
  id: string
  user_id: string
  
  // Template details
  template_name: string
  description?: string
  
  // Configuration
  criteria_config: TemplateCriterionConfig[]
  
  // Usage tracking
  is_active: boolean
  usage_count: number
  
  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * Template creation request
 */
export interface TemplateCreateRequest {
  template_name: string
  description?: string
  criteria_config: TemplateCriterionConfig[]
}

// ============================================
// DASHBOARD & ANALYTICS TYPES
// ============================================

/**
 * QA dashboard statistics
 */
export interface QADashboardStats {
  user_id: string
  total_scores: number
  avg_score: number
  min_score: number
  max_score: number
  avg_starting_call: number
  avg_upselling: number
  avg_rebuttals: number
  avg_qualitative: number
  unique_agents: number
  scoring_days: number
}

/**
 * Agent performance statistics
 */
export interface AgentPerformanceStats {
  user_id: string
  agent_name: string
  total_evaluations: number
  avg_score: number
  min_score: number
  max_score: number
  avg_starting_call: number
  avg_upselling: number
  avg_rebuttals: number
  avg_qualitative: number
  last_scored: string
}

/**
 * Failed criteria analysis
 */
export interface FailedCriteriaAnalysis {
  user_id: string
  criterion_name: string
  criterion_category: ScoringCategory
  criterion_weight: number
  failure_count: number
  avg_score: number
  zero_score_count: number
  not_applicable_count: number
}

/**
 * Score distribution
 */
export interface ScoreDistribution {
  range: string // e.g., "0-20", "21-40", etc.
  count: number
  percentage: number
}

/**
 * Score trend data point
 */
export interface ScoreTrendDataPoint {
  date: string
  avg_score: number
  count: number
}

/**
 * Category performance
 */
export interface CategoryPerformance {
  category: ScoringCategory
  category_label: string
  avg_score: number
  max_possible: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
}

/**
 * Complete dashboard data
 */
export interface QADashboardData {
  overview: QADashboardStats
  agentPerformance: AgentPerformanceStats[]
  failedCriteria: FailedCriteriaAnalysis[]
  scoreDistribution: ScoreDistribution[]
  scoreTrends: ScoreTrendDataPoint[]
  categoryPerformance: CategoryPerformance[]
  recentScores: CallScoreWithCriteria[]
  pendingAssignments: QAAssignmentWithCall[]
}

// ============================================
// SCORING GUIDANCE TYPES
// ============================================

/**
 * Scoring guidance for a criterion
 */
export interface ScoringGuidance {
  criterion_name: string
  definition: string
  scoring_tips: string[]
  common_mistakes: string[]
  examples: {
    good: string[]
    poor: string[]
  }
}

/**
 * AI scoring suggestion
 */
export interface AISuggestion {
  criterion_name: string
  suggested_score: number
  confidence: number
  reasoning: string
  evidence: string[]
}

/**
 * AI scoring suggestions response
 */
export interface AISuggestionsResponse {
  call_id: string
  suggestions: AISuggestion[]
  overall_confidence: number
  notes: string[]
}

// ============================================
// EXPORT TYPES
// ============================================

/**
 * QA export format
 */
export type QAExportFormat = 
  | 'csv'
  | 'excel'
  | 'pdf'
  | 'json'

/**
 * QA export options
 */
export interface QAExportOptions {
  format: QAExportFormat
  includeScores: boolean
  includeCriteria: boolean
  includeNotes: boolean
  includeAgentStats: boolean
  dateRange?: {
    start: string
    end: string
  }
  agents?: string[]
  minScore?: number
  maxScore?: number
}

/**
 * QA export request
 */
export interface QAExportRequest {
  options: QAExportOptions
  score_ids?: string[]
}

/**
 * QA export response
 */
export interface QAExportResponse {
  success: boolean
  filename?: string
  url?: string
  error?: string
}

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Score validation result
 */
export interface ScoreValidationResult {
  valid: boolean
  errors: ScoreValidationError[]
  warnings: ScoreValidationWarning[]
}

/**
 * Score validation error
 */
export interface ScoreValidationError {
  field: string
  criterion?: string
  message: string
  code: string
}

/**
 * Score validation warning
 */
export interface ScoreValidationWarning {
  field: string
  criterion?: string
  message: string
  suggestion?: string
}

// ============================================
// UI STATE TYPES
// ============================================

/**
 * Scoring panel state
 */
export interface ScoringPanelState {
  isOpen: boolean
  callId?: string
  existingScore?: CallScoreWithCriteria
  isSubmitting: boolean
  isDirty: boolean
  errors: Record<string, string>
}

/**
 * QA dashboard filters
 */
export interface QADashboardFilters {
  dateRange?: {
    start: string
    end: string
  }
  agents?: string[]
  minScore?: number
  maxScore?: number
  categories?: ScoringCategory[]
  reviewStatus?: ReviewStatus[]
}

/**
 * QA dashboard view mode
 */
export type QADashboardViewMode = 
  | 'overview'
  | 'agents'
  | 'criteria'
  | 'trends'
  | 'assignments'

/**
 * Criterion scoring state
 */
export interface CriterionScoringState {
  criterion_name: string
  score: number
  applicable: boolean
  notes: string
  isHighlighted: boolean
  hasError: boolean
  errorMessage?: string
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * Generic QA API response
 */
export interface QAApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Score list response
 */
export interface ScoreListResponse {
  scores: CallScoreWithCriteria[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Assignment list response
 */
export interface AssignmentListResponse {
  assignments: QAAssignmentWithCall[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Criteria definitions response
 */
export interface CriteriaDefinitionsResponse {
  criteria: CriterionDefinition[]
  config: ScoringCriteriaConfig
}

// ============================================
// SCORING CALCULATION TYPES
// ============================================

/**
 * Score breakdown by category
 */
export interface ScoreBreakdown {
  starting_call: {
    score: number
    max: number
    percentage: number
    criteria: ScoreCriterion[]
  }
  upselling: {
    score: number
    max: number
    percentage: number
    criteria: ScoreCriterion[]
  }
  rebuttals: {
    score: number
    max: number
    percentage: number
    criteria: ScoreCriterion[]
  }
  qualitative: {
    score: number
    max: number
    percentage: number
    criteria: ScoreCriterion[]
  }
  total: {
    score: number
    max: number
    percentage: number
  }
}

/**
 * Score comparison
 */
export interface ScoreComparison {
  call_id: string
  current_score: number
  previous_score?: number
  change: number
  change_percentage: number
  improved_criteria: string[]
  declined_criteria: string[]
}

/**
 * Benchmark comparison
 */
export interface BenchmarkComparison {
  score: number
  benchmark_avg: number
  percentile: number
  rank: number
  total_scores: number
  above_benchmark: boolean
}


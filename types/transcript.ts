/**
 * Transcript Type Definitions
 * Types for transcript management, editing, and display
 */

import type { TranscriptionStatus } from './transcription'

// ============================================
// TRANSCRIPT DATABASE TYPES
// ============================================

/**
 * Transcript database record
 */
export interface Transcript {
  id: string
  call_id: string
  
  // Content
  transcript: string // Legacy field for backward compatibility
  raw_transcript?: string // Original transcription from Whisper
  edited_transcript?: string // User-edited version
  
  // Status and quality
  transcription_status: TranscriptionStatus
  confidence_score?: number
  language?: string
  
  // Timing
  processing_started_at?: string
  processing_completed_at?: string
  processing_duration_seconds?: number
  created_at: string
  
  // Edit tracking
  last_edited_at?: string
  edit_count: number
  
  // Advanced features
  speaker_segments?: SpeakerSegment[]
  timestamps?: TranscriptTimestamp[]
  metadata?: TranscriptMetadata
  
  // Legacy fields
  summary?: string
  sentiment?: string
  duration?: number
  
  // Error handling
  error_message?: string
}

/**
 * Display transcript (combines raw and edited)
 */
export interface DisplayTranscript extends Omit<Transcript, 'transcript'> {
  display_transcript: string // Edited version if available, otherwise raw
}

// ============================================
// TIMESTAMP TYPES
// ============================================

/**
 * Transcript timestamp for a word or phrase
 */
export interface TranscriptTimestamp {
  id: string
  start: number // Seconds
  end: number // Seconds
  text: string
  confidence?: number
  index: number // Position in transcript
}

/**
 * Timestamp range
 */
export interface TimestampRange {
  start: number
  end: number
}

// ============================================
// SPEAKER TYPES
// ============================================

/**
 * Speaker segment for diarization
 */
export interface SpeakerSegment {
  id: string
  speaker: string // Speaker identifier (e.g., "Speaker 1", "Speaker 2")
  start: number
  end: number
  text: string
  confidence?: number
}

/**
 * Speaker information
 */
export interface Speaker {
  id: string
  name: string // User-assigned name
  label: string // Auto-generated label (e.g., "Speaker 1")
  color?: string // UI color for this speaker
  segments: number // Number of segments
  totalDuration: number // Total speaking time in seconds
}

// ============================================
// METADATA TYPES
// ============================================

/**
 * Transcript metadata
 */
export interface TranscriptMetadata {
  language: string
  duration: number
  wordCount: number
  characterCount: number
  speakerCount?: number
  processingTime: number
  model: string
  modelVersion?: string
  apiVersion?: string
  customFields?: Record<string, any>
}

// ============================================
// EDITING TYPES
// ============================================

/**
 * Text selection in transcript
 */
export interface TextSelection {
  start: number
  end: number
  text: string
}

/**
 * Edit operation
 */
export interface EditOperation {
  type: 'insert' | 'delete' | 'replace'
  position: number
  length?: number
  text: string
  timestamp: Date
}

/**
 * Edit history entry
 */
export interface EditHistoryEntry {
  id: string
  operation: EditOperation
  user_id: string
  timestamp: Date
  previousText: string
  newText: string
}

/**
 * Transcript edit state
 */
export interface TranscriptEditState {
  isEditing: boolean
  isDirty: boolean
  isSaving: boolean
  lastSaved?: Date
  error?: string
}

// ============================================
// SEARCH TYPES
// ============================================

/**
 * Search result
 */
export interface SearchResult {
  id: string
  transcriptId: string
  text: string
  context: string // Surrounding text
  position: number
  timestamp?: TimestampRange
  speaker?: string
  highlights: SearchHighlight[]
}

/**
 * Search highlight
 */
export interface SearchHighlight {
  start: number
  end: number
  text: string
}

/**
 * Search query
 */
export interface SearchQuery {
  query: string
  caseSensitive?: boolean
  wholeWord?: boolean
  regex?: boolean
}

/**
 * Search options
 */
export interface SearchOptions extends SearchQuery {
  highlightAll: boolean
  scrollToFirst: boolean
  maxResults?: number
}

// ============================================
// DISPLAY AND FORMATTING TYPES
// ============================================

/**
 * Transcript display mode
 */
export type TranscriptDisplayMode = 
  | 'plain'        // Plain text
  | 'formatted'    // Formatted with paragraphs
  | 'timestamped'  // With timestamps
  | 'speakers'     // With speaker labels

/**
 * Text formatting options
 */
export interface FormattingOptions {
  paragraphs: boolean
  timestamps: boolean
  speakers: boolean
  confidence: boolean
  lineNumbers: boolean
}

/**
 * Paragraph in formatted transcript
 */
export interface TranscriptParagraph {
  id: string
  text: string
  speaker?: string
  startTime: number
  endTime: number
  confidence?: number
}

// ============================================
// EXPORT TYPES
// ============================================

/**
 * Export format
 */
export type ExportFormat = 
  | 'txt'   // Plain text
  | 'json'  // JSON with full metadata
  | 'srt'   // SubRip subtitles
  | 'vtt'   // WebVTT subtitles
  | 'pdf'   // PDF document
  | 'docx'  // Microsoft Word document

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat
  includeTimestamps: boolean
  includeSpeakers: boolean
  includeMetadata: boolean
  includeConfidence: boolean
  formatting?: FormattingOptions
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean
  format: ExportFormat
  filename: string
  content?: string
  blob?: Blob
  url?: string
  error?: string
}

// ============================================
// SHARING TYPES
// ============================================

/**
 * Share link
 */
export interface ShareLink {
  id: string
  transcript_id: string
  token: string
  created_at: Date
  expires_at?: Date
  view_count: number
  max_views?: number
  password?: string
  settings: ShareSettings
}

/**
 * Share settings
 */
export interface ShareSettings {
  allowDownload: boolean
  showTimestamps: boolean
  showSpeakers: boolean
  showMetadata: boolean
  requirePassword: boolean
}

/**
 * Share link creation request
 */
export interface CreateShareLinkRequest {
  transcriptId: string
  expiresIn?: number // Seconds until expiration
  maxViews?: number
  password?: string
  settings: ShareSettings
}

// ============================================
// COLLABORATION TYPES
// ============================================

/**
 * Collaborative edit event
 */
export interface CollaborativeEdit {
  id: string
  user_id: string
  transcript_id: string
  operation: EditOperation
  timestamp: Date
}

/**
 * Active collaborator
 */
export interface Collaborator {
  user_id: string
  name: string
  avatar?: string
  cursorPosition?: number
  selection?: TextSelection
  lastActivity: Date
}

/**
 * Collaboration state
 */
export interface CollaborationState {
  enabled: boolean
  collaborators: Collaborator[]
  activeEdits: CollaborativeEdit[]
  conflictResolution: 'last-write-wins' | 'operational-transform'
}

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * Transcript validation result
 */
export interface TranscriptValidation {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string
  message: string
  code: string
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  field: string
  message: string
  code: string
  suggestion?: string
}

// ============================================
// STATISTICS TYPES
// ============================================

/**
 * Transcript statistics
 */
export interface TranscriptStatistics {
  wordCount: number
  characterCount: number
  sentenceCount: number
  paragraphCount: number
  averageWordsPerSentence: number
  speakingRate?: number // Words per minute
  uniqueWords: number
  longestWord: string
  readingTime: number // Estimated reading time in seconds
}

/**
 * Speaker statistics
 */
export interface SpeakerStatistics {
  speaker: string
  wordCount: number
  talkTime: number // Seconds
  percentage: number // Percentage of total talk time
  averageSegmentDuration: number
  segmentCount: number
}

// ============================================
// UI STATE TYPES
// ============================================

/**
 * Transcript viewer state
 */
export interface TranscriptViewerState {
  displayMode: TranscriptDisplayMode
  searchQuery?: string
  searchResults: SearchResult[]
  activeSearchResultIndex: number
  selectedText?: TextSelection
  highlightedTimestamp?: TimestampRange
  showConfidence: boolean
  fontSize: number
  theme: 'light' | 'dark'
}

/**
 * Transcript editor state
 */
export interface TranscriptEditorState extends TranscriptViewerState {
  isEditing: boolean
  isDirty: boolean
  isSaving: boolean
  autoSave: boolean
  autoSaveInterval: number
  lastSaved?: Date
  undoStack: EditOperation[]
  redoStack: EditOperation[]
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * API response for transcript operations
 */
export interface TranscriptApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Transcript list response
 */
export interface TranscriptListResponse {
  transcripts: Transcript[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Transcript update request
 */
export interface TranscriptUpdateRequest {
  transcriptId: string
  edited_transcript?: string
  speaker_segments?: SpeakerSegment[]
  metadata?: Partial<TranscriptMetadata>
}


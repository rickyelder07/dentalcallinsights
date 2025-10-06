/**
 * Transcription Utility Functions
 * Helper functions for transcript processing and management
 */

import type {
  Transcript,
  TranscriptTimestamp,
  SpeakerSegment,
  SearchResult,
  SearchQuery,
  ExportFormat,
  TranscriptStatistics,
} from '@/types/transcript'

// ============================================
// TRANSCRIPT TEXT PROCESSING
// ============================================

/**
 * Get display transcript (edited version if available, otherwise raw)
 */
export function getDisplayTranscript(transcript: Transcript): string {
  return transcript.edited_transcript || transcript.raw_transcript || transcript.transcript || ''
}

/**
 * Calculate word count
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Calculate character count (excluding whitespace)
 */
export function countCharacters(text: string): number {
  return text.replace(/\s/g, '').length
}

/**
 * Calculate sentence count
 */
export function countSentences(text: string): number {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length
}

/**
 * Estimate reading time in seconds
 * Average reading speed: 200-250 words per minute
 */
export function estimateReadingTime(text: string): number {
  const words = countWords(text)
  const wordsPerMinute = 225 // Average reading speed
  return Math.ceil((words / wordsPerMinute) * 60)
}

/**
 * Calculate transcript statistics
 */
export function calculateStatistics(text: string): TranscriptStatistics {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()))
  const longestWord = words.reduce((a, b) => (a.length > b.length ? a : b), '')

  return {
    wordCount: words.length,
    characterCount: countCharacters(text),
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    averageWordsPerSentence: words.length / Math.max(sentences.length, 1),
    uniqueWords: uniqueWords.size,
    longestWord,
    readingTime: estimateReadingTime(text),
  }
}

// ============================================
// SEARCH AND HIGHLIGHTING
// ============================================

/**
 * Search for text in transcript
 */
export function searchTranscript(
  transcript: string,
  query: SearchQuery,
  timestamps?: TranscriptTimestamp[]
): SearchResult[] {
  if (!query.query || !transcript) {
    return []
  }

  const results: SearchResult[] = []
  let searchText = transcript
  let searchQuery = query.query

  // Apply search options
  if (!query.caseSensitive) {
    searchText = transcript.toLowerCase()
    searchQuery = query.query.toLowerCase()
  }

  // Create regex pattern
  let pattern: RegExp
  if (query.regex) {
    try {
      pattern = new RegExp(searchQuery, query.caseSensitive ? 'g' : 'gi')
    } catch (error) {
      // Invalid regex, return empty results
      return []
    }
  } else if (query.wholeWord) {
    pattern = new RegExp(`\\b${escapeRegex(searchQuery)}\\b`, query.caseSensitive ? 'g' : 'gi')
  } else {
    pattern = new RegExp(escapeRegex(searchQuery), query.caseSensitive ? 'g' : 'gi')
  }

  // Find all matches
  let match
  while ((match = pattern.exec(searchText)) !== null) {
    const position = match.index
    const matchedText = transcript.substring(position, position + match[0].length)

    // Get surrounding context (50 chars before and after)
    const contextStart = Math.max(0, position - 50)
    const contextEnd = Math.min(transcript.length, position + match[0].length + 50)
    const context = transcript.substring(contextStart, contextEnd)

    // Find corresponding timestamp
    const timestamp = timestamps?.find((t) => 
      position >= transcript.indexOf(t.text) &&
      position < transcript.indexOf(t.text) + t.text.length
    )

    results.push({
      id: `result-${results.length}`,
      transcriptId: '', // Will be filled by caller
      text: matchedText,
      context,
      position,
      timestamp: timestamp ? { start: timestamp.start, end: timestamp.end } : undefined,
      highlights: [
        {
          start: position - contextStart,
          end: position - contextStart + match[0].length,
          text: matchedText,
        },
      ],
    })
  }

  return results
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Highlight search results in text
 */
export function highlightText(
  text: string,
  query: string,
  caseSensitive = false
): string {
  if (!query) return text

  const pattern = new RegExp(escapeRegex(query), caseSensitive ? 'g' : 'gi')
  return text.replace(pattern, (match) => `<mark>${match}</mark>`)
}

// ============================================
// FORMATTING AND DISPLAY
// ============================================

/**
 * Format transcript with timestamps
 */
export function formatWithTimestamps(
  text: string,
  timestamps: TranscriptTimestamp[]
): string {
  if (!timestamps || timestamps.length === 0) {
    return text
  }

  return timestamps
    .map((t) => `[${formatTimestamp(t.start)}] ${t.text}`)
    .join('\n')
}

/**
 * Format timestamp as HH:MM:SS or MM:SS
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format transcript with speaker labels
 */
export function formatWithSpeakers(
  text: string,
  speakers: SpeakerSegment[]
): string {
  if (!speakers || speakers.length === 0) {
    return text
  }

  return speakers
    .map((s) => `${s.speaker}: ${s.text}`)
    .join('\n\n')
}

/**
 * Format transcript as paragraphs
 * Splits on sentence boundaries and groups into paragraphs
 */
export function formatAsParagraphs(text: string): string {
  // Split on sentence boundaries
  const sentences = text.split(/([.!?]+)/).filter(Boolean)
  
  // Group into paragraphs (every 3-5 sentences)
  const paragraphs: string[] = []
  let currentParagraph = ''
  let sentenceCount = 0

  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] + (sentences[i + 1] || '')
    currentParagraph += sentence + ' '
    sentenceCount++

    if (sentenceCount >= 4 || i >= sentences.length - 2) {
      paragraphs.push(currentParagraph.trim())
      currentParagraph = ''
      sentenceCount = 0
    }
  }

  return paragraphs.join('\n\n')
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export transcript as plain text
 */
export function exportAsText(
  transcript: string,
  includeTimestamps = false,
  timestamps?: TranscriptTimestamp[]
): string {
  if (includeTimestamps && timestamps) {
    return formatWithTimestamps(transcript, timestamps)
  }
  return transcript
}

/**
 * Export transcript as SRT subtitles
 */
export function exportAsSRT(
  text: string,
  timestamps: TranscriptTimestamp[]
): string {
  if (!timestamps || timestamps.length === 0) {
    return text
  }

  return timestamps
    .map((t, index) => {
      const startTime = formatSRTTimestamp(t.start)
      const endTime = formatSRTTimestamp(t.end)
      return `${index + 1}\n${startTime} --> ${endTime}\n${t.text}\n`
    })
    .join('\n')
}

/**
 * Format timestamp for SRT format (HH:MM:SS,mmm)
 */
function formatSRTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
}

/**
 * Export transcript as VTT subtitles
 */
export function exportAsVTT(
  text: string,
  timestamps: TranscriptTimestamp[]
): string {
  if (!timestamps || timestamps.length === 0) {
    return text
  }

  const vttHeader = 'WEBVTT\n\n'
  const vttContent = timestamps
    .map((t) => {
      const startTime = formatVTTTimestamp(t.start)
      const endTime = formatVTTTimestamp(t.end)
      return `${startTime} --> ${endTime}\n${t.text}\n`
    })
    .join('\n')

  return vttHeader + vttContent
}

/**
 * Format timestamp for VTT format (HH:MM:SS.mmm)
 */
function formatVTTTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds % 1) * 1000)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
}

/**
 * Export transcript as JSON
 */
export function exportAsJSON(
  transcript: Transcript,
  includeMetadata = true
): string {
  const data: any = {
    transcript: getDisplayTranscript(transcript),
    timestamps: transcript.timestamps || [],
  }

  if (includeMetadata) {
    data.metadata = {
      language: transcript.language,
      confidence_score: transcript.confidence_score,
      transcription_status: transcript.transcription_status,
      processing_completed_at: transcript.processing_completed_at,
      edit_count: transcript.edit_count,
      speaker_segments: transcript.speaker_segments,
    }
  }

  return JSON.stringify(data, null, 2)
}

/**
 * Generate export filename
 */
export function generateExportFilename(
  baseFilename: string,
  format: ExportFormat
): string {
  const basename = baseFilename.replace(/\.[^/.]+$/, '')
  const timestamp = new Date().toISOString().split('T')[0]
  return `${basename}_transcript_${timestamp}.${format}`
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate transcript text
 */
export function validateTranscript(text: string): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if empty
  if (!text || text.trim().length === 0) {
    errors.push('Transcript is empty')
  }

  // Check minimum length
  if (text.length < 10) {
    warnings.push('Transcript is very short')
  }

  // Check for suspicious patterns
  if (text.includes('[inaudible]') || text.includes('[unclear]')) {
    warnings.push('Transcript contains inaudible or unclear sections')
  }

  // Check for excessive special characters
  const specialCharRatio = (text.match(/[^a-zA-Z0-9\s.,!?]/g) || []).length / text.length
  if (specialCharRatio > 0.1) {
    warnings.push('Transcript contains many special characters')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================
// DIFF AND VERSIONING
// ============================================

/**
 * Calculate edit distance between two texts
 * Simple Levenshtein distance implementation
 */
export function calculateEditDistance(text1: string, text2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= text1.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= text2.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= text1.length; i++) {
    for (let j = 1; j <= text2.length; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[text1.length][text2.length]
}

/**
 * Calculate similarity percentage between two texts
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const distance = calculateEditDistance(text1, text2)
  const maxLength = Math.max(text1.length, text2.length)
  return maxLength === 0 ? 100 : ((1 - distance / maxLength) * 100)
}

// ============================================
// USER CORRECTIONS (POST-PROCESSING)
// ============================================
// Note: User corrections are applied server-side only in lib/transcription-corrections.ts

// ============================================
// EXPORTS
// ============================================

export default {
  getDisplayTranscript,
  countWords,
  countCharacters,
  countSentences,
  estimateReadingTime,
  calculateStatistics,
  searchTranscript,
  highlightText,
  formatWithTimestamps,
  formatTimestamp,
  formatWithSpeakers,
  formatAsParagraphs,
  exportAsText,
  exportAsSRT,
  exportAsVTT,
  exportAsJSON,
  generateExportFilename,
  validateTranscript,
  calculateEditDistance,
  calculateSimilarity,
}


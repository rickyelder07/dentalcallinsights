'use client'

/**
 * Transcript Viewer Component
 * Display transcript with search, highlighting, and synchronized playback
 */

import { useState, useEffect, useRef } from 'react'
import type { Transcript, SearchResult } from '@/types/transcript'
import { getDisplayTranscript, searchTranscript, formatTimestamp } from '@/lib/transcription-utils'

interface TranscriptViewerProps {
  transcript: Transcript
  currentTime?: number
  onSeek?: (time: number) => void
  className?: string
}

export default function TranscriptViewer({
  transcript,
  currentTime = 0,
  onSeek,
  className = '',
}: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const activeSegmentRef = useRef<HTMLDivElement>(null)

  const displayText = getDisplayTranscript(transcript)
  const timestamps = transcript.timestamps || []

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      const results = searchTranscript(
        displayText,
        { query: query.trim(), caseSensitive: false },
        timestamps
      )
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }

  // Update active segment based on current time
  useEffect(() => {
    if (timestamps.length > 0 && currentTime > 0) {
      const activeIndex = timestamps.findIndex(
        (t) => currentTime >= t.start && currentTime <= t.end
      )
      setActiveSegmentIndex(activeIndex)
    }
  }, [currentTime, timestamps])

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentRef.current && containerRef.current) {
      const container = containerRef.current
      const segment = activeSegmentRef.current
      const containerRect = container.getBoundingClientRect()
      const segmentRect = segment.getBoundingClientRect()

      if (
        segmentRect.top < containerRect.top ||
        segmentRect.bottom > containerRect.bottom
      ) {
        segment.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [activeSegmentIndex])

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header with search */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Transcript</h3>
          {transcript.confidence_score && (
            <div className="text-sm text-gray-600">
              Confidence: {(transcript.confidence_score * 100).toFixed(0)}%
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search transcript..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Search results count */}
        {searchResults.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Transcript content */}
      <div
        ref={containerRef}
        className="p-4 max-h-96 overflow-y-auto space-y-2"
        style={{ lineHeight: '1.8' }}
      >
        {timestamps.length > 0 ? (
          // Display with timestamps
          timestamps.map((segment, index) => (
            <div
              key={segment.id}
              ref={index === activeSegmentIndex ? activeSegmentRef : null}
              className={`p-3 rounded-lg transition-colors cursor-pointer ${
                index === activeSegmentIndex
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onSeek?.(segment.start)}
            >
              <div className="flex items-start space-x-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSeek?.(segment.start)
                  }}
                  className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 font-mono mt-1"
                  title="Jump to this timestamp"
                >
                  {formatTimestamp(segment.start)}
                </button>
                <div className="flex-1">
                  <p className="text-gray-900">{highlightSearchText(segment.text, searchQuery)}</p>
                  {segment.confidence !== undefined && segment.confidence < 0.8 && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                      Low confidence
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          // Display as plain text
          <div className="text-gray-900 whitespace-pre-wrap">
            {highlightSearchText(displayText, searchQuery)}
          </div>
        )}

        {/* Empty state */}
        {displayText.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No transcript available yet.</p>
            {transcript.transcription_status === 'pending' && (
              <p className="text-sm mt-2">Transcription is pending...</p>
            )}
          </div>
        )}
      </div>

      {/* Footer with metadata */}
      {displayText.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              {transcript.language && (
                <span className="mr-4">Language: {transcript.language.toUpperCase()}</span>
              )}
              {transcript.edit_count > 0 && (
                <span>Edited {transcript.edit_count} time{transcript.edit_count !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div>
              {displayText.split(/\s+/).length} words
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Highlight search text in content
 */
function highlightSearchText(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text
  }

  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'))
  
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-yellow-200 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    )
  )
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}


/**
 * Search Results Component
 * Displays semantic search results with similarity scores and metadata
 */

'use client'

import { useRouter } from 'next/navigation'
import type { SearchResult } from '@/types/embeddings'

interface SearchResultsProps {
  results: SearchResult[]
  isLoading: boolean
  query: string
  searchTime?: number
}

export default function SearchResults({
  results,
  isLoading,
  query,
  searchTime,
}: SearchResultsProps) {
  const router = useRouter()
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="border border-gray-200 rounded-lg p-6 animate-pulse"
          >
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }
  
  // Empty state
  if (results.length === 0 && query) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 mb-4"
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
        <p className="text-gray-600 mb-4">
          No calls match your search for "{query}"
        </p>
        <p className="text-sm text-gray-500">
          Try different keywords or remove some filters
        </p>
      </div>
    )
  }
  
  // Initial state (no search yet)
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 mb-4"
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Search your call library
        </h3>
        <p className="text-gray-600">
          Use natural language to find calls by meaning, not just keywords
        </p>
      </div>
    )
  }
  
  // Get sentiment badge color
  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800'
      case 'negative':
        return 'bg-red-100 text-red-800'
      case 'neutral':
        return 'bg-gray-100 text-gray-800'
      case 'mixed':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  // Get outcome badge color
  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'escalated':
        return 'bg-red-100 text-red-800'
      case 'no_resolution':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  // Format similarity score
  const formatSimilarity = (score: number) => {
    return `${(score * 100).toFixed(0)}%`
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div>
      {/* Results header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Found <span className="font-semibold">{results.length}</span> relevant calls
          {searchTime && (
            <span className="ml-2">
              ({(searchTime / 1000).toFixed(2)}s)
            </span>
          )}
        </div>
      </div>
      
      {/* Results list */}
      <div className="space-y-4">
        {results.map((result) => (
          <div
            key={result.callId}
            onClick={() => router.push(`/calls/${result.callId}`)}
            className="border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {result.filename}
                </h3>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>{formatDate(result.callTime)}</span>
                  <span>•</span>
                  <span>{formatDuration(result.duration)}</span>
                  {result.language && (
                    <>
                      <span>•</span>
                      <span className="uppercase">{result.language}</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Similarity score */}
              <div className="flex-shrink-0 ml-4">
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                  {formatSimilarity(result.similarity)} match
                </div>
              </div>
            </div>
            
            {/* Transcript preview */}
            <p className="text-gray-700 mb-3 line-clamp-3">
              {result.transcriptPreview}
            </p>
            
            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2">
              {result.sentiment && (
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getSentimentColor(
                    result.sentiment
                  )}`}
                >
                  {result.sentiment}
                </span>
              )}
              
              {result.outcome && (
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getOutcomeColor(
                    result.outcome
                  )}`}
                >
                  {result.outcome.replace('_', ' ')}
                </span>
              )}
              
              {result.hasRedFlags && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Red Flags
                </span>
              )}
              
              {result.hasActionItems && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Action Items
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


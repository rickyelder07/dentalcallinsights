'use client'

/**
 * CallList Component
 * Paginated call list with infinite scroll support
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import CallCard from './CallCard'
import type { Call } from '@/types/upload'
import type { Transcript } from '@/types/transcript'
import type { InsightsRecord } from '@/types/insights'
import type { PaginationConfig } from '@/types/filters'

interface CallListProps {
  calls: (Call & {
    transcript?: Transcript | null
    insights?: InsightsRecord | null
    hasEmbeddings?: boolean
  })[]
  selectedCalls?: Set<string>
  onSelectCall?: (callId: string) => void
  onSelectAll?: () => void
  showCheckboxes?: boolean
  loading?: boolean
  emptyMessage?: string
  pageSize?: number
  infiniteScroll?: boolean
}

export default function CallList({
  calls,
  selectedCalls = new Set(),
  onSelectCall,
  onSelectAll,
  showCheckboxes = true,
  loading = false,
  emptyMessage = 'No calls found',
  pageSize = 20,
  infiniteScroll = false,
}: CallListProps) {
  const [displayedCalls, setDisplayedCalls] = useState<typeof calls>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Initialize displayed calls
  useEffect(() => {
    const initialCalls = calls.slice(0, pageSize)
    setDisplayedCalls(initialCalls)
    setPage(1)
    setHasMore(calls.length > pageSize)
  }, [calls, pageSize])

  // Load more calls
  const loadMore = useCallback(() => {
    if (!hasMore || loading) return

    const nextPage = page + 1
    const startIndex = (nextPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const moreCalls = calls.slice(startIndex, endIndex)

    if (moreCalls.length > 0) {
      setDisplayedCalls((prev) => [...prev, ...moreCalls])
      setPage(nextPage)
      setHasMore(endIndex < calls.length)
    } else {
      setHasMore(false)
    }
  }, [calls, page, pageSize, hasMore, loading])

  // Infinite scroll observer
  useEffect(() => {
    if (!infiniteScroll || !loadMoreRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    observerRef.current.observe(loadMoreRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [infiniteScroll, hasMore, loading, loadMore])

  // Loading state
  if (loading && displayedCalls.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-600">Loading calls...</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (!loading && displayedCalls.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <p className="text-gray-600 text-lg">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Select all header */}
      {showCheckboxes && onSelectAll && displayedCalls.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            checked={
              displayedCalls.length > 0 &&
              displayedCalls.every((call) => selectedCalls.has(call.id))
            }
            onChange={onSelectAll}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-sm text-gray-700">
            Select all ({displayedCalls.length} calls)
          </span>
        </div>
      )}

      {/* Call cards */}
      <div className="space-y-3">
        {displayedCalls.map((call) => (
          <CallCard
            key={call.id}
            call={call}
            selected={selectedCalls.has(call.id)}
            onSelect={onSelectCall}
            showCheckbox={showCheckboxes}
          />
        ))}
      </div>

      {/* Load more trigger for infinite scroll */}
      {infiniteScroll && hasMore && (
        <div ref={loadMoreRef} className="py-4 text-center">
          <p className="text-sm text-gray-500">Loading more...</p>
        </div>
      )}

      {/* Manual load more button */}
      {!infiniteScroll && hasMore && (
        <div className="text-center py-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Pagination info */}
      <div className="text-center text-sm text-gray-600 py-2">
        Showing {displayedCalls.length} of {calls.length} calls
      </div>
    </div>
  )
}


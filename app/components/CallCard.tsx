'use client'

/**
 * CallCard Component
 * Individual call display with status, actions, and quick insights
 */

import { useRouter } from 'next/navigation'
import type { Call } from '@/types/upload'
import type { Transcript } from '@/types/transcript'
import type { InsightsRecord } from '@/types/insights'
import { formatCallTime, formatCallTimeOnly } from '@/lib/datetime'
import { formatExtension } from '@/lib/extension-names'

interface CallCardProps {
  call: Call & {
    transcript?: Transcript | null
    insights?: InsightsRecord | null
    hasEmbeddings?: boolean
  }
  selected?: boolean
  onSelect?: (callId: string) => void
  showCheckbox?: boolean
}

export default function CallCard({
  call,
  selected = false,
  onSelect,
  showCheckbox = true,
}: CallCardProps) {
  const router = useRouter()

  // Format date
  const formatDate = (dateString?: string) =>
    formatCallTime(dateString, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) || 'No date'

  // Format time
  const formatTime = (dateString?: string) => formatCallTimeOnly(dateString)

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get status badge
  const getStatusBadge = () => {
    if (!call.transcript) {
      return (
        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
          No Transcript
        </span>
      )
    }

    const status = call.transcript.transcription_status
    const badgeClasses: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      processing: 'bg-blue-100 text-blue-700',
      failed: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
    }

    const labels: Record<string, string> = {
      completed: '✓ Transcribed',
      processing: '⏳ Processing',
      failed: '✗ Failed',
      pending: '⋯ Pending',
    }

    return (
      <span className={`px-2 py-1 text-xs rounded ${badgeClasses[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || 'Unknown'}
      </span>
    )
  }

  // Get sentiment badge
  const getSentimentBadge = () => {
    if (!call.insights) return null

    const sentiment = call.insights.overall_sentiment
    const colors: Record<string, string> = {
      positive: 'bg-green-50 text-green-700 border-green-200',
      negative: 'bg-red-50 text-red-700 border-red-200',
      neutral: 'bg-gray-50 text-gray-700 border-gray-200',
      mixed: 'bg-orange-50 text-orange-700 border-orange-200',
    }

    const emojis: Record<string, string> = {
      positive: '😊',
      negative: '😟',
      neutral: '😐',
      mixed: '🤔',
    }

    return (
      <span className={`px-2 py-1 text-xs rounded border ${colors[sentiment] || colors.neutral}`}>
        {emojis[sentiment]} {sentiment}
      </span>
    )
  }

  return (
    <div
      className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {showCheckbox && onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(call.id)}
            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <button
                onClick={() => router.push(`/calls/${call.id}`)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
              >
                {call.filename}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(call.call_time)} • {formatTime(call.call_time)}
              </p>
            </div>

            {/* Direction badge */}
            {call.call_direction && (
              <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded whitespace-nowrap">
                {call.call_direction}
              </span>
            )}
          </div>

          {/* Call details */}
          <div className="flex flex-wrap gap-2 mb-2 text-xs text-gray-600">
            {call.source_number && (
              <span>From: {call.source_number}{call.source_extension && ` (${formatExtension(call.source_extension)})`}</span>
            )}
            {call.destination_number && (
              <span>To: {call.destination_number}</span>
            )}
            {call.call_duration_seconds !== undefined && (
              <span>Duration: {formatDuration(call.call_duration_seconds)}</span>
            )}
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {getStatusBadge()}
            {getSentimentBadge()}
            {call.insights && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                🤖 AI Insights
              </span>
            )}
            {call.hasEmbeddings && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                📊 Embedded
              </span>
            )}
          </div>

          {/* Quick insights */}
          {call.insights && (
            <div className="text-xs text-gray-700 space-y-1">
              {call.insights.summary_brief && (
                <p className="line-clamp-2">{call.insights.summary_brief}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {call.insights.action_items && Array.isArray(call.insights.action_items) && call.insights.action_items.length > 0 && (
                  <span className="text-blue-600">
                    📋 {call.insights.action_items.length} action{call.insights.action_items.length !== 1 ? 's' : ''}
                  </span>
                )}
                {call.insights.red_flags && Array.isArray(call.insights.red_flags) && call.insights.red_flags.length > 0 && (
                  <span className="text-red-600">
                    🚩 {call.insights.red_flags.length} red flag{call.insights.red_flags.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => router.push(`/calls/${call.id}`)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Details →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


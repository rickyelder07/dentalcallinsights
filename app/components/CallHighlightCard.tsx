'use client'

/**
 * Call Highlight Card Component
 * Displays individual call information in a compact card format
 */

import type { CallHighlight } from '@/types/analytics'
import { formatCallTime } from '@/lib/datetime'
import { formatExtension } from '@/lib/extension-names'

interface CallHighlightCardProps {
  callHighlight: CallHighlight
  showScore?: boolean
  showNewPatientBadge?: boolean
}

export default function CallHighlightCard({
  callHighlight,
  showScore = false,
  showNewPatientBadge = false,
}: CallHighlightCardProps) {
  const { call, insights, score, duration, sentiment } = callHighlight

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSentimentColor = (sentiment: string): string => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-700'
      case 'negative':
        return 'bg-red-100 text-red-700'
      case 'neutral':
        return 'bg-gray-100 text-gray-700'
      case 'mixed':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const redFlagsCount = insights?.red_flags && Array.isArray(insights.red_flags) 
    ? insights.red_flags.length 
    : 0

  return (
    <div
      onClick={() => window.open(`/calls/${call.id}`, '_blank', 'noopener,noreferrer')}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {call.filename}
            </h4>
            {showNewPatientBadge && call.is_new_patient && (
              <span className="flex-shrink-0 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-semibold">
                New Patient
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
            {/* Duration */}
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatDuration(duration)}</span>
            </div>

            {/* Extension */}
            {call.source_extension && (
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{formatExtension(call.source_extension)}</span>
              </div>
            )}

            {/* Date */}
            {call.call_time && (
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatCallTime(call.call_time, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Badges and Score */}
        <div className="flex flex-col items-end gap-2">
          {/* Sentiment Badge */}
          <span className={`px-2 py-1 text-xs rounded capitalize ${getSentimentColor(sentiment)}`}>
            {sentiment}
          </span>

          {/* Red Flags */}
          {redFlagsCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded text-xs text-red-700">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{redFlagsCount} flag{redFlagsCount > 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Performance Score */}
          {showScore && score !== undefined && (
            <div className="px-2 py-1 bg-blue-50 rounded">
              <div className="text-xs text-blue-600 font-semibold">
                Score: {score}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


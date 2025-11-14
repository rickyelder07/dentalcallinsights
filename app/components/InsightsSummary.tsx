/**
 * Insights Summary Component
 * Displays call summary with key points and outcome
 */

'use client'

import type { CallSummary } from '@/types/insights'
import { getOutcomeColor } from '@/types/insights'

interface InsightsSummaryProps {
  summary: CallSummary
}

export default function InsightsSummary({ summary }: InsightsSummaryProps) {
  // Check if too short
  const isTooShort = summary.outcome === 'too_short'
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-2">📝</span>
        <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
      </div>
      
      {isTooShort ? (
        <div className="text-center py-8">
          <span className="text-4xl mb-2 block">⏱️</span>
          <p className="text-gray-600 font-medium">Too short for insights</p>
          <p className="text-sm text-gray-500 mt-2">
            Call duration is less than 8 seconds
          </p>
        </div>
      ) : (
        <>
          {/* Brief summary */}
          <div className="mb-4">
            <p className="text-gray-700 leading-relaxed">{summary.brief}</p>
          </div>
          
          {/* Key points */}
          {summary.key_points && summary.key_points.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Key Points:</h4>
              <ul className="space-y-1">
                {summary.key_points.map((point, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-0.5">•</span>
                    <span className="text-gray-700 text-sm">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Outcome badge */}
          {summary.outcome && (
            <div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getOutcomeColor(
                  summary.outcome
                )}`}
              >
                {summary.outcome === 'resolved' && '✅ Resolved'}
                {summary.outcome === 'pending' && '⏳ Pending Follow-up'}
                {summary.outcome === 'escalated' && '⬆️ Escalated'}
                {summary.outcome === 'no_resolution' && '❌ No Resolution'}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}


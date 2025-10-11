/**
 * Sentiment Indicator Component
 * Displays overall sentiment, patient satisfaction, and staff performance
 */

'use client'

import type { SentimentAnalysis } from '@/types/insights'
import { getSentimentEmoji, getSentimentColor } from '@/types/insights'

interface SentimentIndicatorProps {
  sentiment: SentimentAnalysis
}

export default function SentimentIndicator({ sentiment }: SentimentIndicatorProps) {
  // Check if too short
  const isTooShort = sentiment.overall === 'too_short'
  
  // Capitalize first letter
  const capitalize = (str: string | null | undefined) => {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
  }
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-2">💭</span>
        <h3 className="text-lg font-semibold text-gray-900">Sentiment</h3>
      </div>
      
      {isTooShort ? (
        <div className="text-center py-8">
          <span className="text-4xl mb-2 block">⏱️</span>
          <p className="text-gray-600 font-medium">Too short for insights</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overall sentiment */}
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-2">
              Overall Sentiment:
            </label>
            <div className="flex items-center">
              <span className="text-3xl mr-3">
                {getSentimentEmoji(sentiment.overall)}
              </span>
              <span
                className={`px-4 py-2 rounded-lg text-base font-medium ${getSentimentColor(
                  sentiment.overall
                )}`}
              >
                {capitalize(sentiment.overall)}
              </span>
            </div>
          </div>
          
          {/* Patient satisfaction */}
          {sentiment.patient_satisfaction && sentiment.patient_satisfaction !== 'too_short' && (
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">
                Patient Satisfaction:
              </label>
              <div className="flex items-center">
                <span className="text-xl mr-2">
                  {sentiment.patient_satisfaction === 'happy' && '😊'}
                  {sentiment.patient_satisfaction === 'satisfied' && '🙂'}
                  {sentiment.patient_satisfaction === 'neutral' && '😐'}
                  {sentiment.patient_satisfaction === 'frustrated' && '😠'}
                  {sentiment.patient_satisfaction === 'angry' && '😡'}
                </span>
                <span className="text-gray-700 text-sm font-medium">
                  {capitalize(sentiment.patient_satisfaction)}
                </span>
              </div>
            </div>
          )}
          
          {/* Staff performance */}
          {sentiment.staff_performance && sentiment.staff_performance !== 'too_short' && (
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-2">
                Staff Performance:
              </label>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                  sentiment.staff_performance === 'professional'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {sentiment.staff_performance === 'professional' && '✓ Professional'}
                {sentiment.staff_performance === 'needs_improvement' && '⚠️ Needs Improvement'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


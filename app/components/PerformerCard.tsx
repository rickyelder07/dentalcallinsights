'use client'

/**
 * Performer Card Component
 * Displays extension performance metrics for highest/lowest performers
 */

import { useRouter } from 'next/navigation'
import SentimentPieChart from './SentimentPieChart'
import type { PerformerStats } from '@/types/analytics'
import { getExtensionDisplayName } from '@/lib/extension-names'

interface PerformerCardProps {
  performer: PerformerStats
  type: 'highest' | 'lowest'
  dateRange: { start: string; end: string }
}

export default function PerformerCard({ performer, type, dateRange }: PerformerCardProps) {
  const router = useRouter()

  const isHighest = type === 'highest'
  const bgColor = isHighest ? 'bg-gradient-to-br from-blue-600 to-blue-700' : 'bg-gradient-to-br from-orange-600 to-orange-700'
  const badgeColor = isHighest ? 'bg-yellow-400 text-yellow-900' : 'bg-red-500 text-white'
  const badgeText = isHighest ? '🏆 Top Performer' : '⚠️ Needs Attention'

  const handleClick = () => {
    const params = new URLSearchParams({
      tab: 'by-caller',
      extension: performer.extension,
      dateStart: dateRange.start,
      dateEnd: dateRange.end,
    })
    router.push(`/caller-analytics?${params.toString()}`)
  }

  return (
    <div
      onClick={handleClick}
      className={`${bgColor} text-white rounded-lg p-6 cursor-pointer hover:shadow-xl transition-all transform hover:scale-105`}
    >
      {/* Badge */}
      <div className="flex justify-center mb-4">
        <span className={`${badgeColor} px-4 py-2 rounded-full text-sm font-bold shadow-md`}>
          {badgeText}
        </span>
      </div>

      {/* Extension Name */}
      <div className="text-center mb-4">
        <div className="text-5xl font-bold mb-2">
          {getExtensionDisplayName(performer.extension)}
        </div>
        <div className="text-blue-100 text-sm">
          {(() => {
            const displayName = getExtensionDisplayName(performer.extension)
            return displayName === performer.extension ? 'Extension' : `Ext ${performer.extension}`
          })()}
        </div>
      </div>

      {/* Performance Score */}
      <div className="text-center mb-4">
        <div className="inline-block bg-white bg-opacity-20 rounded-lg px-6 py-3">
          <div className="text-3xl font-bold">{performer.performanceScore}</div>
          <div className="text-xs text-blue-100">Performance Score</div>
        </div>
      </div>

      {/* Call Count */}
      <div className="text-center mb-4">
        <div className="text-2xl font-semibold">
          {performer.totalCalls} call{performer.totalCalls !== 1 ? 's' : ''}
        </div>
        <div className="text-blue-100 text-sm">Total Volume</div>
      </div>

      {/* Sentiment Pie Chart */}
      <div className="flex justify-center mb-4">
        <div className="bg-white rounded-lg p-3">
          <SentimentPieChart 
            data={performer.sentimentDistribution} 
            size={120} 
            showLegend={false} 
          />
        </div>
      </div>

      {/* Sentiment Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-300">
            {performer.positivePercent}%
          </div>
          <div className="text-xs text-blue-100">Positive</div>
        </div>
        <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-300">
            {performer.negativePercent}%
          </div>
          <div className="text-xs text-blue-100">Negative</div>
        </div>
      </div>

      {/* Satisfaction Score */}
      <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
        <div className="text-2xl font-bold">
          {performer.avgSatisfactionScore}
        </div>
        <div className="text-xs text-blue-100">Avg Satisfaction Score</div>
      </div>

      {/* Click to View More */}
      <div className="mt-4 text-center">
        <div className="text-xs text-blue-100 flex items-center justify-center gap-1">
          <span>Click to view detailed analytics</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
}


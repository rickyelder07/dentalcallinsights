'use client'

/**
 * ScoreBreakdown Component
 * Visual breakdown of scores by category with progress bars
 */

import type { CallScoreWithCriteria } from '@/types/qa'
import { CATEGORY_METADATA } from '@/lib/qa-criteria'
import { getScoreGrade } from '@/lib/qa-criteria'

interface ScoreBreakdownProps {
  score: CallScoreWithCriteria
  showDetails?: boolean
}

export default function ScoreBreakdown({
  score,
  showDetails = true
}: ScoreBreakdownProps) {
  const grade = getScoreGrade(score.total_score)

  const categories = [
    {
      key: 'starting_call',
      score: score.starting_call_score || 0,
      max: CATEGORY_METADATA.starting_call.maxPoints,
      label: CATEGORY_METADATA.starting_call.label,
      color: CATEGORY_METADATA.starting_call.color
    },
    {
      key: 'upselling',
      score: score.upselling_score || 0,
      max: CATEGORY_METADATA.upselling.maxPoints,
      label: CATEGORY_METADATA.upselling.label,
      color: CATEGORY_METADATA.upselling.color
    },
    {
      key: 'rebuttals',
      score: score.rebuttals_score || 0,
      max: CATEGORY_METADATA.rebuttals.maxPoints,
      label: CATEGORY_METADATA.rebuttals.label,
      color: CATEGORY_METADATA.rebuttals.color
    },
    {
      key: 'qualitative',
      score: score.qualitative_score || 0,
      max: CATEGORY_METADATA.qualitative.maxPoints,
      label: CATEGORY_METADATA.qualitative.label,
      color: CATEGORY_METADATA.qualitative.color
    }
  ]

  const getColorClass = (color: string, type: 'bg' | 'text' | 'border') => {
    const colorMap: Record<string, Record<string, string>> = {
      blue: { bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-500' },
      green: { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-500' },
      orange: { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-500' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-500' }
    }
    return colorMap[color]?.[type] || colorMap.blue[type]
  }

  const getGradeColorClass = () => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-100 text-green-800 border-green-300',
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      red: 'bg-red-100 text-red-800 border-red-300'
    }
    return colorMap[grade.color] || colorMap.blue
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Overall Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900">Overall Score</h3>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getColorClass(grade.color, 'text')}`}>
              {score.total_score}
            </span>
            <span className="text-gray-500 text-lg">/100</span>
            <span className={`ml-2 px-3 py-1 rounded-lg border text-sm font-semibold ${getGradeColorClass()}`}>
              {grade.grade} - {grade.label}
            </span>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all duration-500 ${getColorClass(grade.color, 'bg')}`}
            style={{ width: `${score.total_score}%` }}
          />
        </div>
      </div>

      {/* Category Breakdown */}
      {showDetails && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Score by Category</h4>
          
          {categories.map(category => {
            const percentage = category.max > 0 ? Math.round((category.score / category.max) * 100) : 0
            
            return (
              <div key={category.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {category.label}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {category.score}/{category.max}
                    <span className="text-gray-500 ml-1">({percentage}%)</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getColorClass(category.color, 'bg')}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Metadata */}
      {showDetails && (
        <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
          {score.agent_name && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Agent:</span>
              <span className="font-medium text-gray-900">{score.agent_name}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Scored:</span>
            <span className="font-medium text-gray-900">
              {new Date(score.scored_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Status:</span>
            <span className={`font-medium ${
              score.review_status === 'approved' ? 'text-green-700' :
              score.review_status === 'reviewed' ? 'text-blue-700' :
              score.review_status === 'completed' ? 'text-gray-700' :
              'text-yellow-700'
            }`}>
              {score.review_status.charAt(0).toUpperCase() + score.review_status.slice(1)}
            </span>
          </div>
          {score.scorer_notes && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Scorer Notes:</p>
              <p className="text-sm text-gray-900">{score.scorer_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


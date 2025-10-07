'use client'

/**
 * ScoringCriteria Component
 * Individual criterion scoring interface with scoring slider and notes
 */

import { useState } from 'react'
import type { CriterionDefinition } from '@/types/qa'
import type { CriterionFormValue } from '@/types/qa'

interface ScoringCriteriaProps {
  criterion: CriterionDefinition
  value: CriterionFormValue
  onChange: (value: CriterionFormValue) => void
  disabled?: boolean
}

export default function ScoringCriteria({
  criterion,
  value,
  onChange,
  disabled = false
}: ScoringCriteriaProps) {
  const [showDetails, setShowDetails] = useState(false)

  const handleScoreChange = (newScore: number) => {
    onChange({
      ...value,
      score: newScore
    })
  }

  const handleApplicableChange = (applicable: boolean) => {
    onChange({
      ...value,
      applicable,
      score: applicable ? value.score : 0
    })
  }

  const handleNotesChange = (notes: string) => {
    onChange({
      ...value,
      notes
    })
  }

  const getScoreColor = () => {
    if (!value.applicable) return 'bg-gray-200'
    const percentage = (value.score / criterion.weight) * 100
    if (percentage === 100) return 'bg-green-500'
    if (percentage >= 75) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    if (percentage >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getScoreLabel = () => {
    if (!value.applicable) return 'N/A'
    return `${value.score}/${criterion.weight}`
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900">
              {criterion.name}
            </h4>
            <span className="text-xs text-gray-500">
              ({criterion.weight} pts)
            </span>
            {criterion.applicability === 'conditional' && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                Conditional
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600">
            {criterion.definition}
          </p>
        </div>

        {/* Score Display */}
        <div className="ml-4 flex-shrink-0">
          <div className={`${getScoreColor()} text-white text-sm font-bold px-3 py-1 rounded min-w-[60px] text-center`}>
            {getScoreLabel()}
          </div>
        </div>
      </div>

      {/* Applicable Checkbox */}
      <div className="mb-3">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={value.applicable}
            onChange={(e) => handleApplicableChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span>Applicable to this call</span>
        </label>
      </div>

      {/* Scoring Slider */}
      {value.applicable && (
        <div className="mb-3">
          <div className="flex items-center gap-4">
            <label className="text-xs font-medium text-gray-700 min-w-[40px]">
              Score:
            </label>
            <input
              type="range"
              min="0"
              max={criterion.weight}
              step="1"
              value={value.score}
              onChange={(e) => handleScoreChange(parseInt(e.target.value))}
              disabled={disabled}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex gap-1">
              {Array.from({ length: criterion.weight + 1 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleScoreChange(i)}
                  disabled={disabled}
                  className={`w-8 h-8 text-xs font-medium rounded border transition-colors ${
                    value.score === i
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Details Toggle */}
      {(criterion.examples || criterion.applicabilityConditions) && (
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium mb-2"
        >
          {showDetails ? '▼' : '▶'} {showDetails ? 'Hide' : 'Show'} Details & Examples
        </button>
      )}

      {/* Details */}
      {showDetails && (
        <div className="mt-2 p-3 bg-gray-50 rounded text-xs space-y-2">
          {criterion.applicabilityConditions && (
            <div>
              <p className="font-semibold text-gray-900 mb-1">When to Apply:</p>
              <p className="text-gray-700">{criterion.applicabilityConditions}</p>
            </div>
          )}
          {criterion.examples && criterion.examples.length > 0 && (
            <div>
              <p className="font-semibold text-gray-900 mb-1">Examples:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {criterion.examples.map((example, index) => (
                  <li key={index}>{example}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {value.applicable && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Notes (optional):
          </label>
          <textarea
            value={value.notes || ''}
            onChange={(e) => handleNotesChange(e.target.value)}
            disabled={disabled}
            placeholder="Add notes or evidence for this score..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
      )}
    </div>
  )
}


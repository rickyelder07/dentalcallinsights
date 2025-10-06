/**
 * Search Filters Component
 * Advanced filtering options for semantic search
 */

'use client'

import { useState } from 'react'
import type { SearchFilters as FilterType } from '@/types/embeddings'

interface SearchFiltersProps {
  filters: FilterType
  onFiltersChange: (filters: FilterType) => void
  isExpanded?: boolean
}

export default function SearchFilters({
  filters,
  onFiltersChange,
  isExpanded = true,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(isExpanded)
  
  const handleSentimentChange = (sentiment: string) => {
    const current = filters.sentiment || []
    const updated = current.includes(sentiment as any)
      ? current.filter((s) => s !== sentiment)
      : [...current, sentiment as any]
    
    onFiltersChange({ ...filters, sentiment: updated.length > 0 ? updated : undefined })
  }
  
  const handleOutcomeChange = (outcome: string) => {
    const current = filters.outcome || []
    const updated = current.includes(outcome as any)
      ? current.filter((o) => o !== outcome)
      : [...current, outcome as any]
    
    onFiltersChange({ ...filters, outcome: updated.length > 0 ? updated : undefined })
  }
  
  const handleDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    onFiltersChange({ ...filters, [field]: value || undefined })
  }
  
  const handleDurationChange = (field: 'minDuration' | 'maxDuration', value: string) => {
    const numValue = parseInt(value)
    onFiltersChange({
      ...filters,
      [field]: !isNaN(numValue) && numValue > 0 ? numValue : undefined,
    })
  }
  
  const handleToggleChange = (field: 'hasRedFlags' | 'hasActionItems') => {
    onFiltersChange({
      ...filters,
      [field]: filters[field] ? undefined : true,
    })
  }
  
  const clearAllFilters = () => {
    onFiltersChange({})
  }
  
  const hasActiveFilters = () => {
    return (
      (filters.sentiment && filters.sentiment.length > 0) ||
      (filters.outcome && filters.outcome.length > 0) ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.minDuration ||
      filters.maxDuration ||
      filters.hasRedFlags ||
      filters.hasActionItems
    )
  }
  
  return (
    <div className="w-72 bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-gray-50 border-b cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          {hasActiveFilters() && (
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </h3>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {/* Filters content */}
      {isOpen && (
        <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Sentiment filter */}
          <div>
            <label className="block font-medium text-sm text-gray-700 mb-2">
              Sentiment
            </label>
            <div className="space-y-2">
              {['positive', 'neutral', 'negative', 'mixed'].map((sentiment) => (
                <label key={sentiment} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.sentiment?.includes(sentiment as any) || false}
                    onChange={() => handleSentimentChange(sentiment)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{sentiment}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Outcome filter */}
          <div>
            <label className="block font-medium text-sm text-gray-700 mb-2">
              Call Outcome
            </label>
            <div className="space-y-2">
              {['resolved', 'pending', 'escalated', 'no_resolution'].map((outcome) => (
                <label key={outcome} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.outcome?.includes(outcome as any) || false}
                    onChange={() => handleOutcomeChange(outcome)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {outcome.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Date range filter */}
          <div>
            <label className="block font-medium text-sm text-gray-700 mb-2">
              Date Range
            </label>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">From</label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleDateChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* Duration filter */}
          <div>
            <label className="block font-medium text-sm text-gray-700 mb-2">
              Call Duration (seconds)
            </label>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Minimum</label>
                <input
                  type="number"
                  min="0"
                  value={filters.minDuration || ''}
                  onChange={(e) => handleDurationChange('minDuration', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Maximum</label>
                <input
                  type="number"
                  min="0"
                  value={filters.maxDuration || ''}
                  onChange={(e) => handleDurationChange('maxDuration', e.target.value)}
                  placeholder="No limit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* Toggle filters */}
          <div>
            <label className="block font-medium text-sm text-gray-700 mb-2">
              Special Flags
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasRedFlags || false}
                  onChange={() => handleToggleChange('hasRedFlags')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Has Red Flags</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasActionItems || false}
                  onChange={() => handleToggleChange('hasActionItems')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Has Action Items</span>
              </label>
            </div>
          </div>
          
          {/* Clear all button */}
          {hasActiveFilters() && (
            <button
              onClick={clearAllFilters}
              className="w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}


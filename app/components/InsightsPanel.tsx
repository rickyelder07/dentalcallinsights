/**
 * Insights Panel Component
 * Container for all AI insights with loading, error, and regenerate functionality
 */

'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import InsightsSummary from './InsightsSummary'
import SentimentIndicator from './SentimentIndicator'
import ActionItemsList from './ActionItemsList'
import RedFlagsList from './RedFlagsList'
import type { CallInsights } from '@/types/insights'
import { formatInsightsAsText, formatInsightsAsJSON } from '@/lib/openai-insights'

interface InsightsPanelProps {
  callId: string
  callDuration?: number
  onInsightsGenerated?: (insights: CallInsights) => void
}

export default function InsightsPanel({
  callId,
  callDuration,
  onInsightsGenerated,
}: InsightsPanelProps) {
  const supabase = createBrowserClient()
  const [insights, setInsights] = useState<CallInsights | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cached, setCached] = useState(false)
  
  // Fetch insights from database first, generate only if not exist
  useEffect(() => {
    fetchOrGenerateInsights()
  }, [callId])
  
  const fetchOrGenerateInsights = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const {
        data: { session },
      } = await supabase.auth.getSession()
      
      if (!session) {
        setError('Please sign in to view insights')
        return
      }
      
      // First, check if insights already exist in database
      const { data: existingInsights, error: fetchError } = await supabase
        .from('insights')
        .select('*')
        .eq('call_id', callId)
        .single()
      
      // Log the error for debugging
      if (fetchError) {
        console.log('Fetch insights error:', fetchError)
        // If error is 406 (PGRST116), it means no rows found - this is expected for first time
        // Continue to generate insights
        if (fetchError.code !== 'PGRST116') {
          console.error('Unexpected error fetching insights:', fetchError)
          setError(`Failed to fetch insights: ${fetchError.message}`)
          setIsLoading(false)
          return
        }
      }
      
      // If insights exist, use them (no API call)
      if (existingInsights && !fetchError) {
        const cachedInsights = {
          summary: {
            brief: '', // Not in old schema
            key_points: existingInsights.key_points || [],
            outcome: existingInsights.call_outcome || '',
          },
          sentiment: {
            overall: existingInsights.overall_sentiment || 'neutral',
            patient_satisfaction: 'neutral', // Not in old schema
            staff_performance: existingInsights.staff_performance || 'professional',
          },
          action_items: existingInsights.action_items || [],
          red_flags: existingInsights.red_flags || [],
        }
        setInsights(cachedInsights)
        setCached(true)
        onInsightsGenerated?.(cachedInsights)
        setIsLoading(false)
        return
      }
      
      // If no insights exist, generate them (only happens once)
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ callId }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to generate insights')
        return
      }
      
      if (data.success && data.insights) {
        setInsights(data.insights)
        setCached(false) // This is a fresh generation
        onInsightsGenerated?.(data.insights)
      } else {
        setError('No insights generated')
      }
    } catch (err) {
      console.error('Error fetching/generating insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true)
      setError(null)
      
      const {
        data: { session },
      } = await supabase.auth.getSession()
      
      if (!session) {
        setError('Please sign in to regenerate insights')
        return
      }
      
      // Force regeneration (updates existing record in database)
      const response = await fetch('/api/insights/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ callId }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || 'Failed to regenerate insights')
        return
      }
      
      if (data.success && data.insights) {
        setInsights(data.insights)
        setCached(false) // Mark as fresh (not cached)
        onInsightsGenerated?.(data.insights)
      } else {
        setError('No insights generated')
      }
    } catch (err) {
      console.error('Error regenerating insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to regenerate insights')
    } finally {
      setIsRegenerating(false)
    }
  }
  
  const handleExport = (format: 'text' | 'json') => {
    if (!insights) return
    
    let content: string
    let filename: string
    let mimeType: string
    
    if (format === 'json') {
      content = formatInsightsAsJSON(insights)
      filename = `insights-${callId}.json`
      mimeType = 'application/json'
    } else {
      content = formatInsightsAsText(insights)
      filename = `insights-${callId}.txt`
      mimeType = 'text/plain'
    }
    
    // Create blob and download
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Insights</h2>
            <p className="text-sm text-gray-600 mt-1">Generating insights...</p>
          </div>
        </div>
        
        {/* Loading skeletons */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
        
        <p className="text-center text-sm text-gray-500">
          Usually takes 5-10 seconds
        </p>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">AI Insights</h2>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg
            className="w-12 h-12 text-red-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Unable to generate insights
          </h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchOrGenerateInsights}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  // Success state with insights
  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Insights</h2>
          {cached && (
            <p className="text-sm text-gray-600 mt-1">
              💾 Loaded from database (generated previously)
            </p>
          )}
          {!cached && insights && (
            <p className="text-sm text-green-600 mt-1">
              ✨ Freshly generated and saved
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Regenerate button */}
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-4 h-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
          
          {/* Export dropdown */}
          <div className="relative group">
            <button className="flex items-center px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('text')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg"
              >
                Export as Text
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-b-lg"
              >
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Insights components */}
      {insights && (
        <div className="space-y-4">
          <InsightsSummary summary={insights.summary} />
          <SentimentIndicator sentiment={insights.sentiment} />
          <ActionItemsList actionItems={insights.action_items} />
          <RedFlagsList redFlags={insights.red_flags} />
        </div>
      )}
    </div>
  )
}


'use client'

/**
 * Call Highlights Page
 * Daily call performance overview with expandable sections
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import CallHighlightCard from '@/app/components/CallHighlightCard'
import PerformerCard from '@/app/components/PerformerCard'
import type { CallHighlightsData } from '@/types/analytics'

export default function CallHighlightsPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  // Date state - default to yesterday
  const getYesterday = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  const [startDate, setStartDate] = useState<string>(getYesterday())
  const [endDate, setEndDate] = useState<string>(getYesterday())
  const [data, setData] = useState<CallHighlightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Expand/collapse state for each section
  const [expandedSections, setExpandedSections] = useState({
    longest: false,
    positive: false,
    negative: false,
    newPatientGood: false,
    newPatientPoor: false,
  })

  const fetchData = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams({
        dateStart: startDate,
        dateEnd: endDate,
        ...(forceRefresh && { forceRefresh: 'true' }),
      })

      const response = await fetch(`/api/analytics/call-highlights?${params}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      // Get response text (can only be read once)
      const responseText = await response.text()
      
      // Check response status
      if (!response.ok) {
        console.error('API Response Error:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
        })
        throw new Error(`API Error (${response.status}): ${responseText || response.statusText}`)
      }

      // Try to parse JSON
      let result
      try {
        result = JSON.parse(responseText)
      } catch (jsonError) {
        console.error('JSON Parse Error:', jsonError)
        console.error('Response body:', responseText)
        throw new Error('Invalid JSON response from API')
      }
      
      if (!result.success) {
        const errorMsg = result.error || result.details || 'Failed to fetch highlights'
        console.error('API Error:', result)
        throw new Error(errorMsg)
      }

      setData(result.data)
    } catch (err) {
      console.error('Error fetching highlights:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleApply = () => {
    fetchData(true)
  }

  const handleReset = () => {
    const yesterday = getYesterday()
    setStartDate(yesterday)
    setEndDate(yesterday)
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Call Highlights</h1>
        <p className="text-gray-600">Daily call performance overview</p>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              Apply
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset to Yesterday
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && data && (
        <div className="space-y-8">
          {/* Highest & Lowest Performers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.highestPerformer && (
              <PerformerCard
                performer={data.highestPerformer}
                type="highest"
                dateRange={data.dateRange}
              />
            )}
            {data.lowestPerformer && (
              <PerformerCard
                performer={data.lowestPerformer}
                type="lowest"
                dateRange={data.dateRange}
              />
            )}
          </div>

          {/* Longest Calls Section */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Longest Calls
              </h2>
              <span className="text-sm text-gray-500">
                {data.longestCalls.length} call{data.longestCalls.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="space-y-3">
              {data.longestCalls
                .slice(0, expandedSections.longest ? 20 : 5)
                .map((highlight, idx) => (
                  <CallHighlightCard 
                    key={highlight.call.id} 
                    callHighlight={highlight}
                  />
                ))}
            </div>

            {data.longestCalls.length > 5 && (
              <button
                onClick={() => toggleSection('longest')}
                className="mt-4 w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
              >
                {expandedSections.longest ? 'Show Less' : `Show More (${data.longestCalls.length - 5} more)`}
              </button>
            )}
          </section>

          {/* Positive Calls Section */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Best Performing Calls
              </h2>
              <span className="text-sm text-gray-500">
                {data.positiveCallsRanked.length} call{data.positiveCallsRanked.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="space-y-3">
              {data.positiveCallsRanked
                .slice(0, expandedSections.positive ? 20 : 5)
                .map((highlight) => (
                  <CallHighlightCard 
                    key={highlight.call.id} 
                    callHighlight={highlight}
                    showScore={true}
                  />
                ))}
            </div>

            {data.positiveCallsRanked.length > 5 && (
              <button
                onClick={() => toggleSection('positive')}
                className="mt-4 w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
              >
                {expandedSections.positive ? 'Show Less' : `Show More (${data.positiveCallsRanked.length - 5} more)`}
              </button>
            )}
          </section>

          {/* Negative Calls Section */}
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Calls with Negative Sentiment
              </h2>
              <span className="text-sm text-gray-500">
                {data.negativeCalls.length} call{data.negativeCalls.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {data.negativeCalls.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                🎉 No calls with negative sentiment in this period
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {data.negativeCalls
                    .slice(0, expandedSections.negative ? data.negativeCalls.length : 5)
                    .map((highlight) => (
                      <CallHighlightCard 
                        key={highlight.call.id} 
                        callHighlight={highlight}
                      />
                    ))}
                </div>

                {data.negativeCalls.length > 5 && (
                  <button
                    onClick={() => toggleSection('negative')}
                    className="mt-4 w-full py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    {expandedSections.negative ? 'Show Less' : `Show All Negative (${data.negativeCalls.length - 5} more)`}
                  </button>
                )}
              </>
            )}
          </section>

          {/* New Patient Highlights */}
          <section className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                New Patient Highlights
              </h2>
              <p className="text-gray-600 text-sm">
                Track first impressions and conversion opportunities
              </p>
            </div>

            {/* Good New Patient Calls */}
            <div className="bg-white rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-green-700">
                  ✨ Excellent New Patient Calls
                </h3>
                <span className="text-sm text-gray-500">
                  {data.newPatientGood.length} call{data.newPatientGood.length !== 1 ? 's' : ''}
                </span>
              </div>

              {data.newPatientGood.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No new patient calls found in this period
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {data.newPatientGood
                      .slice(0, expandedSections.newPatientGood ? 20 : 3)
                      .map((highlight) => (
                        <CallHighlightCard 
                          key={highlight.call.id} 
                          callHighlight={highlight}
                          showScore={true}
                          showNewPatientBadge={true}
                        />
                      ))}
                  </div>

                  {data.newPatientGood.length > 3 && (
                    <button
                      onClick={() => toggleSection('newPatientGood')}
                      className="mt-4 w-full py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      {expandedSections.newPatientGood ? 'Show Less' : `Show More (${data.newPatientGood.length - 3} more)`}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Poor New Patient Calls */}
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-red-700">
                  ⚠️ Needs Improvement - New Patients
                </h3>
                <span className="text-sm text-gray-500">
                  {data.newPatientPoor.length} call{data.newPatientPoor.length !== 1 ? 's' : ''}
                </span>
              </div>

              {data.newPatientPoor.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  🎉 No poor new patient calls in this period
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {data.newPatientPoor
                      .slice(0, expandedSections.newPatientPoor ? 20 : 3)
                      .map((highlight) => (
                        <CallHighlightCard 
                          key={highlight.call.id} 
                          callHighlight={highlight}
                          showScore={true}
                          showNewPatientBadge={true}
                        />
                      ))}
                  </div>

                  {data.newPatientPoor.length > 3 && (
                    <button
                      onClick={() => toggleSection('newPatientPoor')}
                      className="mt-4 w-full py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      {expandedSections.newPatientPoor ? 'Show Less' : `Show More (${data.newPatientPoor.length - 3} more)`}
                    </button>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}


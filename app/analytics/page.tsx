'use client'

/**
 * Analytics Dashboard Page
 * Comprehensive analytics and insights dashboard for dental call data
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import type {
  AnalyticsOverview,
  AnalyticsTrends,
  SentimentAnalytics,
  PerformanceMetrics,
} from '@/types/analytics'

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null)
  const [sentiment, setSentiment] = useState<SentimentAnalytics | null>(null)
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async (forceRefresh = false) => {
    try {
      setIsLoading(true)
      setError(null)
      if (forceRefresh) setRefreshing(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const authHeader = `Bearer ${session.access_token}`
      const params = forceRefresh ? '?forceRefresh=true' : ''

      // Fetch all analytics in parallel
      const [overviewRes, trendsRes, sentimentRes, performanceRes] = await Promise.all([
        fetch(`/api/analytics/overview${params}`, {
          headers: { Authorization: authHeader },
        }),
        fetch(`/api/analytics/trends${params}`, {
          headers: { Authorization: authHeader },
        }),
        fetch(`/api/analytics/sentiment${params}`, {
          headers: { Authorization: authHeader },
        }),
        fetch(`/api/analytics/performance${params}`, {
          headers: { Authorization: authHeader },
        }),
      ])

      if (!overviewRes.ok) throw new Error('Failed to fetch analytics')

      const [overviewData, trendsData, sentimentData, performanceData] = await Promise.all([
        overviewRes.json(),
        trendsRes.json(),
        sentimentRes.json(),
        performanceRes.json(),
      ])

      if (overviewData.success) setOverview(overviewData.data)
      if (trendsData.success) setTrends(trendsData.data)
      if (sentimentData.success) setSentiment(sentimentData.data)
      if (performanceData.success) setPerformance(performanceData.data)
    } catch (error) {
      console.error('Analytics error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchAnalytics(true)
  }

  if (isLoading && !overview) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <svg
              className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">
            Insights and performance metrics for your dental call data
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {refreshing ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Overview Stats */}
      {overview && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-3xl font-bold text-gray-900">{overview.totalCalls}</div>
              <div className="text-sm text-gray-600 mt-1">Total Calls</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-3xl font-bold text-green-600">{overview.transcribedCalls}</div>
              <div className="text-sm text-gray-600 mt-1">Transcribed</div>
              <div className="text-xs text-gray-500 mt-1">
                {overview.totalCalls > 0 ? Math.round((overview.transcribedCalls / overview.totalCalls) * 100) : 0}% of total
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-3xl font-bold text-purple-600">{overview.callsWithInsights}</div>
              <div className="text-sm text-gray-600 mt-1">AI Insights</div>
              <div className="text-xs text-gray-500 mt-1">
                {overview.totalCalls > 0 ? Math.round((overview.callsWithInsights / overview.totalCalls) * 100) : 0}% of total
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-3xl font-bold text-blue-600">
                {Math.floor(overview.avgCallDuration / 60)}:{(overview.avgCallDuration % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-600 mt-1">Avg Call Duration</div>
            </div>
          </div>
        </div>
      )}

      {/* Sentiment Analysis */}
      {sentiment && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sentiment Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sentiment Distribution */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Overall Sentiment</h3>
              <div className="space-y-3">
                {sentiment.distribution.map((item) => (
                  <div key={item.sentiment} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{item.sentiment}</span>
                      <span className="text-sm text-gray-500">({item.count})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            item.sentiment === 'positive' ? 'bg-green-500' :
                            item.sentiment === 'negative' ? 'bg-red-500' :
                            item.sentiment === 'mixed' ? 'bg-orange-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Patient Satisfaction */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Patient Satisfaction</h3>
              <div className="space-y-3">
                {Object.entries(sentiment.patientSatisfaction).map(([key, count]) => {
                  if (count === 0) return null
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Satisfaction Score</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {sentiment.avgSatisfactionScore}/100
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {performance && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Call Outcomes */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Call Outcomes</h3>
              <div className="space-y-2">
                {performance.outcomes.map((outcome) => (
                  <div key={outcome.outcome} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{outcome.outcome.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{outcome.count}</span>
                      <span className="text-gray-500">({outcome.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Staff Performance */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Staff Performance</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-green-600">{performance.staffPerformance.professionalCalls}</div>
                  <div className="text-sm text-gray-600">Professional Calls</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{performance.staffPerformance.needsImprovementCalls}</div>
                  <div className="text-sm text-gray-600">Needs Improvement</div>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-xl font-bold text-blue-600">{performance.staffPerformance.resolutionRate}%</div>
                  <div className="text-sm text-gray-600">Resolution Rate</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                {overview && (
                  <>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{overview.callsWithRedFlags}</div>
                      <div className="text-sm text-gray-600">Calls with Red Flags</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{overview.callsWithActionItems}</div>
                      <div className="text-sm text-gray-600">Calls with Action Items</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{overview.positiveCalls}</div>
                      <div className="text-sm text-gray-600">Positive Sentiment Calls</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trends */}
      {trends && trends.dataPoints.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Trends</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-2xl font-bold text-gray-900">{trends.summary.totalCalls}</div>
                <div className="text-sm text-gray-600">Total Calls (Period)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{trends.summary.avgCallsPerDay}</div>
                <div className="text-sm text-gray-600">Avg Calls/Day</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${trends.summary.trendDirection === 'up' ? 'text-green-600' : trends.summary.trendDirection === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                  {trends.summary.trendDirection === 'up' ? '↑' : trends.summary.trendDirection === 'down' ? '↓' : '→'} {Math.abs(trends.summary.percentChange)}%
                </div>
                <div className="text-sm text-gray-600">Trend Direction</div>
              </div>
            </div>
            
            {/* Simple trend visualization */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Recent Activity</div>
              {trends.dataPoints.slice(-10).map((point, index) => (
                <div key={point.date} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600 w-24">{new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min((point.callCount / Math.max(...trends.dataPoints.map(p => p.callCount))) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="font-medium w-8 text-right">{point.callCount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {overview && overview.totalCalls === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Yet</h3>
          <p className="text-gray-600 mb-4">
            Upload and transcribe calls to see analytics and insights
          </p>
          <button
            onClick={() => router.push('/upload')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upload Calls
          </button>
        </div>
      )}
    </div>
  )
}


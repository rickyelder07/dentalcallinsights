'use client'

/**
 * Analytics Dashboard Page
 * Comprehensive analytics and insights dashboard for dental call data
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import VectorSearch from '../components/VectorSearch'
import type {
  AnalyticsOverview,
  AnalyticsTrends,
  SentimentAnalytics,
  PerformanceMetrics,
} from '@/types/analytics'
import type { Call } from '@/types/upload'
import type { Transcript } from '@/types/transcript'

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null)
  const [sentiment, setSentiment] = useState<SentimentAnalytics | null>(null)
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  
  // Filtered analytics state
  const [filteredOverview, setFilteredOverview] = useState<AnalyticsOverview | null>(null)
  const [filteredSentiment, setFilteredSentiment] = useState<SentimentAnalytics | null>(null)
  const [filteredPerformance, setFilteredPerformance] = useState<PerformanceMetrics | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  
  // Filter and call viewing state
  const [showFilters, setShowFilters] = useState(false)
  const [showCalls, setShowCalls] = useState(false)
  const [filteredCalls, setFilteredCalls] = useState<any[]>([])
  const [loadingCalls, setLoadingCalls] = useState(false)
  
  // Filter options
  const [dateRangeStart, setDateRangeStart] = useState<string>('')
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('')
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [directionFilter, setDirectionFilter] = useState<string>('all')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  useEffect(() => {
    if (showCalls) {
      fetchFilteredCalls()
    }
  }, [showCalls, dateRangeStart, dateRangeEnd, sentimentFilter, statusFilter, directionFilter])

  useEffect(() => {
    if (hasActiveFilters()) {
      computeFilteredAnalytics()
    } else {
      // Clear filtered analytics when no filters are active
      setFilteredOverview(null)
      setFilteredSentiment(null)
      setFilteredPerformance(null)
    }
  }, [dateRangeStart, dateRangeEnd, sentimentFilter, statusFilter, directionFilter, overview, sentiment, performance])

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

  const fetchFilteredCalls = async () => {
    try {
      setLoadingCalls(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Build query
      let query = supabase
        .from('calls')
        .select(`
          *,
          transcript:transcripts(*),
          insights:insights(*)
        `)
        .eq('user_id', session.user.id)
        .order('call_time', { ascending: false })

      // Apply filters
      if (dateRangeStart) {
        query = query.gte('call_time', dateRangeStart)
      }
      if (dateRangeEnd) {
        const endDate = new Date(dateRangeEnd)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('call_time', endDate.toISOString())
      }
      if (directionFilter !== 'all') {
        query = query.eq('call_direction', directionFilter)
      }

      const { data, error } = await query

      if (error) throw error

      let filtered = data || []

      // Apply client-side filters
      if (statusFilter !== 'all') {
        filtered = filtered.filter((call: any) => {
          if (statusFilter === 'transcribed') {
            return call.transcript?.transcription_status === 'completed'
          } else if (statusFilter === 'pending') {
            return !call.transcript || call.transcript.transcription_status === 'pending'
          }
          return true
        })
      }

      if (sentimentFilter !== 'all') {
        filtered = filtered.filter((call: any) => {
          return call.insights?.overall_sentiment === sentimentFilter
        })
      }

      setFilteredCalls(filtered)
    } catch (error) {
      console.error('Error fetching filtered calls:', error)
    } finally {
      setLoadingCalls(false)
    }
  }

  const clearFilters = () => {
    setDateRangeStart('')
    setDateRangeEnd('')
    setSentimentFilter('all')
    setStatusFilter('all')
    setDirectionFilter('all')
  }

  const hasActiveFilters = () => {
    return dateRangeStart || dateRangeEnd || sentimentFilter !== 'all' || 
           statusFilter !== 'all' || directionFilter !== 'all'
  }

  const computeFilteredAnalytics = () => {
    if (!overview || !sentiment || !performance) return

    // Get the filtered calls data
    const callsData = filteredCalls.length > 0 ? filteredCalls : []

    // Compute filtered analytics
    const filteredOverviewData = computeFilteredOverviewAnalytics(callsData)
    const filteredSentimentData = computeFilteredSentimentAnalytics(callsData)
    const filteredPerformanceData = computeFilteredPerformanceAnalytics(callsData)

    setFilteredOverview(filteredOverviewData)
    setFilteredSentiment(filteredSentimentData)
    setFilteredPerformance(filteredPerformanceData)
  }

  const computeFilteredOverviewAnalytics = (calls: any[]): AnalyticsOverview => {
    const transcriptIds = new Set(
      calls
        .filter((c) => c.transcript?.transcription_status === 'completed')
        .map((c) => c.id)
    )
    
    const insightsCallIds = new Set(
      calls
        .filter((c) => c.insights)
        .map((c) => c.id)
    )
    
    // Calculate sentiment distribution
    const sentimentCounts = {
      positive: 0,
      negative: 0,
      neutral: 0,
      mixed: 0,
    }
    
    calls.forEach((call) => {
      const sentiment = call.insights?.overall_sentiment
      if (sentiment && sentiment in sentimentCounts) {
        sentimentCounts[sentiment as keyof typeof sentimentCounts]++
      }
    })
    
    // Calculate duration statistics
    const durations = calls
      .map((c) => c.call_duration_seconds)
      .filter((d) => d != null && d > 0)
    
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    const avgDuration = durations.length > 0 ? totalDuration / durations.length : 0
    
    // Calculate action items and red flags
    const callsWithActionItems = calls.filter(
      (c) => c.insights?.action_items && Array.isArray(c.insights.action_items) && c.insights.action_items.length > 0
    ).length
    
    const callsWithRedFlags = calls.filter(
      (c) => c.insights?.red_flags && Array.isArray(c.insights.red_flags) && c.insights.red_flags.length > 0
    ).length
    
    // Get date range
    const callTimes = calls
      .map((c) => c.call_time)
      .filter((t) => t != null)
      .sort()
    
    return {
      totalCalls: calls.length,
      transcribedCalls: transcriptIds.size,
      callsWithInsights: insightsCallIds.size,
      callsWithEmbeddings: 0, // Would need to fetch embeddings separately
      avgCallDuration: Math.round(avgDuration),
      totalCallDuration: totalDuration,
      positiveCalls: sentimentCounts.positive,
      negativeCalls: sentimentCounts.negative,
      neutralCalls: sentimentCounts.neutral,
      mixedCalls: sentimentCounts.mixed,
      callsWithActionItems,
      callsWithRedFlags,
      earliestCall: callTimes[0],
      latestCall: callTimes[callTimes.length - 1],
      computedAt: new Date().toISOString(),
    }
  }

  const computeFilteredSentimentAnalytics = (calls: any[]): SentimentAnalytics => {
    const sentimentCounts = {
      positive: 0,
      negative: 0,
      neutral: 0,
      mixed: 0,
    }
    
    const satisfactionCounts = {
      happy: 0,
      satisfied: 0,
      neutral: 0,
      frustrated: 0,
      angry: 0,
      tooShort: 0,
    }
    
    calls.forEach((call) => {
      const insight = call.insights
      if (!insight) return

      // Count sentiments
      const sentiment = insight.overall_sentiment
      if (sentiment && sentiment in sentimentCounts) {
        sentimentCounts[sentiment as keyof typeof sentimentCounts]++
      }

      // Count satisfaction levels
      if (insight.patient_satisfaction) {
        const satisfaction = insight.patient_satisfaction.toLowerCase()
        if (satisfaction in satisfactionCounts) {
          satisfactionCounts[satisfaction as keyof typeof satisfactionCounts]++
        }
      }
    })

    const totalCalls = calls.length
    const totalWithSentiment = Object.values(sentimentCounts).reduce((sum, count) => sum + count, 0)
    
    const distribution = Object.entries(sentimentCounts).map(([sentiment, count]) => ({
      sentiment: sentiment as any,
      count,
      percentage: totalWithSentiment > 0 ? Math.round((count / totalWithSentiment) * 100) : 0,
    }))

    const totalSatisfaction = Object.values(satisfactionCounts).reduce((sum, count) => sum + count, 0)
    const avgSatisfactionScore = totalSatisfaction > 0 ? 
      Math.round((satisfactionCounts.happy * 100 + satisfactionCounts.satisfied * 80 + satisfactionCounts.neutral * 50 + satisfactionCounts.frustrated * 20 + satisfactionCounts.angry * 0) / totalSatisfaction) : 0

    return {
      distribution,
      patientSatisfaction: satisfactionCounts,
      sentimentTrend: {
        period: 'filtered',
        positivePercentage: totalWithSentiment > 0 ? Math.round((sentimentCounts.positive / totalWithSentiment) * 100) : 0,
        negativePercentage: totalWithSentiment > 0 ? Math.round((sentimentCounts.negative / totalWithSentiment) * 100) : 0,
        change: 0, // Would need historical data to calculate
      },
      avgSatisfactionScore,
    }
  }

  const computeFilteredPerformanceAnalytics = (calls: any[]): PerformanceMetrics => {
    const outcomeCounts: Record<string, number> = {}
    let professionalCalls = 0
    let needsImprovementCalls = 0
    let appointmentsScheduled = 0
    let appointmentsCancelled = 0

    calls.forEach((call) => {
      const insight = call.insights
      if (!insight) return

      // Count outcomes
      if (insight.call_outcome) {
        outcomeCounts[insight.call_outcome] = (outcomeCounts[insight.call_outcome] || 0) + 1
      }

      // Count professional calls
      if (insight.staff_performance === 'professional') {
        professionalCalls++
      } else if (insight.staff_performance === 'needs_improvement') {
        needsImprovementCalls++
      }

      // Count appointments
      if (insight.appointment_scheduled) appointmentsScheduled++
      if (insight.appointment_cancelled) appointmentsCancelled++
    })

    const totalCalls = calls.length
    const outcomes = Object.entries(outcomeCounts).map(([outcome, count]) => ({
      outcome: outcome as any,
      count,
      percentage: totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0,
    }))

    const durations = calls
      .map((c) => c.call_duration_seconds)
      .filter((d) => d != null && d > 0)
    const avgDuration = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0

    const resolutionRate = totalCalls > 0 ? Math.round((professionalCalls / totalCalls) * 100) : 0

    return {
      outcomes,
      staffPerformance: {
        totalCalls,
        professionalCalls,
        needsImprovementCalls,
        avgCallDuration: Math.round(avgDuration),
        avgPatientSatisfaction: 0, // Would need to calculate from satisfaction data
        resolutionRate,
      },
      revenueImpact: {
        appointmentsScheduled,
        appointmentsCancelled,
        missedOpportunities: 0, // Would need business logic
        estimatedRevenue: appointmentsScheduled * 150, // Example: $150 per appointment
      },
      callVolumePatterns: {
        peakHours: [], // Would need time analysis
        peakDays: [], // Would need day analysis
      },
    }
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
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowFilters(!showFilters)
              if (!showFilters) setShowCalls(true)
            }}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              hasActiveFilters() 
                ? 'bg-orange-600 text-white hover:bg-orange-700' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {showFilters ? 'Hide Filters' : 'Filter Analytics'}
            {hasActiveFilters() && <span className="bg-white text-orange-600 rounded-full px-2 py-0.5 text-xs font-bold">Active</span>}
          </button>
          <button
            onClick={() => setShowCalls(!showCalls)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            {showCalls ? 'Hide' : 'View'} Calls ({filteredCalls.length})
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {showSearch ? 'Hide' : 'Search'}
          </button>
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
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Filter Controls */}
      {showFilters && (
        <div className="mb-8 bg-white border-2 border-orange-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Filter Analytics Data</h2>
            <div className="flex gap-2">
              {hasActiveFilters() && (
                <button
                  onClick={clearFilters}
                  className="text-sm px-3 py-1 text-orange-600 hover:text-orange-800 border border-orange-300 rounded hover:bg-orange-50"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            
            {/* Sentiment Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sentiment</label>
              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Sentiment</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="transcribed">Transcribed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            
            {/* Direction Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Direction</label>
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Directions</option>
                <option value="Inbound">Inbound</option>
                <option value="Outbound">Outbound</option>
              </select>
            </div>
          </div>

          {hasActiveFilters() && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <span className="font-semibold">Note:</span> Filters are currently viewing {filteredCalls.length} call(s). 
                Analytics shown below will update to reflect only the filtered data.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filtered Calls View */}
      {showCalls && (
        <div className="mb-8 bg-white border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Calls in Analytics ({filteredCalls.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {hasActiveFilters() ? 'Showing filtered calls' : 'Showing all calls'}
              </p>
            </div>
            <button
              onClick={() => setShowCalls(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {loadingCalls ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading calls...</p>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No calls match the current filters</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredCalls.map((call: any) => (
                <div
                  key={call.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/calls/${call.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm">{call.filename}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {call.call_time && new Date(call.call_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {call.call_direction && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                            {call.call_direction}
                          </span>
                        )}
                        {call.transcript?.transcription_status === 'completed' && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                            Transcribed
                          </span>
                        )}
                        {call.insights?.overall_sentiment && (
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            call.insights.overall_sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                            call.insights.overall_sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {call.insights.overall_sentiment}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Database Query Search Section */}
      {showSearch && (
        <div className="mb-8 bg-white border-2 border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Database Query Search</h2>
            <button
              onClick={() => setShowSearch(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <VectorSearch />
        </div>
      )}

      {/* Overview Stats */}
      {(overview || filteredOverview) && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Overview
            {hasActiveFilters() && (
              <span className="ml-2 text-sm font-normal text-orange-600">
                (Filtered: {filteredCalls.length} calls)
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const currentOverview = hasActiveFilters() ? filteredOverview : overview
              if (!currentOverview) return null
              
              return (
                <>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="text-3xl font-bold text-gray-900">{currentOverview.totalCalls}</div>
                    <div className="text-sm text-gray-600 mt-1">Total Calls</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="text-3xl font-bold text-green-600">{currentOverview.transcribedCalls}</div>
                    <div className="text-sm text-gray-600 mt-1">Transcribed</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {currentOverview.totalCalls > 0 ? Math.round((currentOverview.transcribedCalls / currentOverview.totalCalls) * 100) : 0}% of total
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="text-3xl font-bold text-purple-600">{currentOverview.callsWithInsights}</div>
                    <div className="text-sm text-gray-600 mt-1">AI Insights</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {currentOverview.totalCalls > 0 ? Math.round((currentOverview.callsWithInsights / currentOverview.totalCalls) * 100) : 0}% of total
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="text-3xl font-bold text-blue-600">
                      {Math.floor(currentOverview.avgCallDuration / 60)}:{(currentOverview.avgCallDuration % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Avg Call Duration</div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Sentiment Analysis */}
      {(sentiment || filteredSentiment) && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Sentiment Analysis
            {hasActiveFilters() && (
              <span className="ml-2 text-sm font-normal text-orange-600">
                (Filtered)
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const currentSentiment = hasActiveFilters() ? filteredSentiment : sentiment
              if (!currentSentiment) return null
              
              return (
                <>
                  {/* Sentiment Distribution */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Overall Sentiment</h3>
                    <div className="space-y-3">
                      {currentSentiment.distribution.map((item) => (
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
                      {Object.entries(currentSentiment.patientSatisfaction).map(([key, count]) => {
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
                          {currentSentiment.avgSatisfactionScore}/100
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {(performance || filteredPerformance) && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Performance Metrics
            {hasActiveFilters() && (
              <span className="ml-2 text-sm font-normal text-orange-600">
                (Filtered)
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(() => {
              const currentPerformance = hasActiveFilters() ? filteredPerformance : performance
              const currentOverview = hasActiveFilters() ? filteredOverview : overview
              if (!currentPerformance) return null
              
              return (
                <>
                  {/* Call Outcomes */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Call Outcomes</h3>
                    <div className="space-y-2">
                      {currentPerformance.outcomes.map((outcome) => (
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
                        <div className="text-2xl font-bold text-green-600">{currentPerformance.staffPerformance.professionalCalls}</div>
                        <div className="text-sm text-gray-600">Professional Calls</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">{currentPerformance.staffPerformance.needsImprovementCalls}</div>
                        <div className="text-sm text-gray-600">Needs Improvement</div>
                      </div>
                      <div className="pt-3 border-t border-gray-200">
                        <div className="text-xl font-bold text-blue-600">{currentPerformance.staffPerformance.resolutionRate}%</div>
                        <div className="text-sm text-gray-600">Resolution Rate</div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
                    <div className="space-y-3">
                      {currentOverview && (
                        <>
                          <div>
                            <div className="text-2xl font-bold text-red-600">{currentOverview.callsWithRedFlags}</div>
                            <div className="text-sm text-gray-600">Calls with Red Flags</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-blue-600">{currentOverview.callsWithActionItems}</div>
                            <div className="text-sm text-gray-600">Calls with Action Items</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">{currentOverview.positiveCalls}</div>
                            <div className="text-sm text-gray-600">Positive Sentiment Calls</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )
            })()}
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


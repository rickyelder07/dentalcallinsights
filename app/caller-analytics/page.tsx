'use client'

/**
 * Caller Analytics Page
 * Performance analytics focused on individual callers by source extension
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import SentimentPieChart from '../components/SentimentPieChart'
import SatisfactionGauge from '../components/SatisfactionGauge'
import { HorizontalBars } from '../components/HorizontalBar'
import { formatCallTime } from '@/lib/datetime'
import type { CallerOverview, CallerPerformanceMetrics } from '@/types/analytics'

type TabType = 'overview' | 'by-caller'

export default function CallerAnalyticsPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Date filter state (shared across tabs)
  const [dateRangeStart, setDateRangeStart] = useState<string>('')
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('')

  // Overview tab state
  const [overviewData, setOverviewData] = useState<CallerOverview[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState<string | null>(null)

  // By Caller tab state
  const [selectedExtension, setSelectedExtension] = useState<string>('')
  const [availableExtensions, setAvailableExtensions] = useState<string[]>([])
  const [performanceData, setPerformanceData] = useState<CallerPerformanceMetrics | null>(null)
  const [performanceLoading, setPerformanceLoading] = useState(false)
  const [performanceError, setPerformanceError] = useState<string | null>(null)
  const [negativeCalls, setNegativeCalls] = useState<Array<{ id: string; filename: string; call_time: string; call_duration_seconds: number }>>([])
  const [negativeCallsLoading, setNegativeCallsLoading] = useState(false)
  const [longestCalls, setLongestCalls] = useState<Array<{ id: string; filename: string; call_time: string; call_duration_seconds: number }>>([])
  const [longestCallsLoading, setLongestCallsLoading] = useState(false)

  // Fetch overview data when tab is active or date filters change
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverviewData()
    }
  }, [activeTab, dateRangeStart, dateRangeEnd])

  // Fetch performance data when extension or date filters change
  useEffect(() => {
    if (activeTab === 'by-caller' && selectedExtension) {
      fetchPerformanceData()
      fetchNegativeCalls()
      fetchLongestCalls()
    }
  }, [selectedExtension, dateRangeStart, dateRangeEnd])

  // Load available extensions when switching to By Caller tab
  useEffect(() => {
    if (activeTab === 'by-caller' && availableExtensions.length === 0) {
      loadAvailableExtensions()
    }
  }, [activeTab])

  const fetchOverviewData = async () => {
    try {
      setOverviewLoading(true)
      setOverviewError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams()
      if (dateRangeStart) params.append('dateStart', dateRangeStart)
      if (dateRangeEnd) params.append('dateEnd', dateRangeEnd)

      const response = await fetch(`/api/analytics/caller-stats?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch overview data')

      const result = await response.json()
      if (result.success) {
        setOverviewData(result.data || [])
      } else {
        throw new Error(result.error || 'Failed to fetch overview data')
      }
    } catch (error) {
      console.error('Overview fetch error:', error)
      setOverviewError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setOverviewLoading(false)
    }
  }

  const loadAvailableExtensions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Fetch calls to get unique extensions
      // RLS policies will automatically filter to show team members' calls
      const { data: calls, error } = await supabase
        .from('calls')
        .select('source_extension')
        .not('source_extension', 'is', null)

      if (error) throw error

      const extensions = Array.from(
        new Set(calls?.map((c: any) => c.source_extension).filter(Boolean))
      ).sort((a, b) => {
        const numA = parseInt(a) || 0
        const numB = parseInt(b) || 0
        return numA - numB
      })

      setAvailableExtensions(extensions as string[])
      
      // Auto-select first extension if none selected
      if (extensions.length > 0 && !selectedExtension) {
        setSelectedExtension(extensions[0] as string)
      }
    } catch (error) {
      console.error('Error loading extensions:', error)
    }
  }

  const fetchPerformanceData = async () => {
    if (!selectedExtension) return

    try {
      setPerformanceLoading(true)
      setPerformanceError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams()
      params.append('extension', selectedExtension)
      if (dateRangeStart) params.append('dateStart', dateRangeStart)
      if (dateRangeEnd) params.append('dateEnd', dateRangeEnd)

      const response = await fetch(`/api/analytics/caller-stats?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch performance data')

      const result = await response.json()
      if (result.success) {
        setPerformanceData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch performance data')
      }
    } catch (error) {
      console.error('Performance fetch error:', error)
      setPerformanceError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setPerformanceLoading(false)
    }
  }

  const fetchNegativeCalls = async () => {
    if (!selectedExtension) return

    try {
      setNegativeCallsLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Build date filters
      let startDateISO: string | undefined
      let endDateISO: string | undefined
      
      if (dateRangeStart) {
        const [startYear, startMonth, startDay] = dateRangeStart.split('-').map(Number)
        const startDateLocal = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0)
        startDateISO = startDateLocal.toISOString()
      }
      if (dateRangeEnd) {
        const [endYear, endMonth, endDay] = dateRangeEnd.split('-').map(Number)
        const endDateLocal = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999)
        endDateISO = endDateLocal.toISOString()
      }

      // Join with insights table to filter by negative sentiment
      let query = supabase
        .from('calls')
        .select(`
          id,
          filename,
          call_time,
          call_duration_seconds,
          insights!inner(overall_sentiment)
        `)
        // RLS policies will automatically filter to show team members' calls
        .eq('source_extension', selectedExtension)
        .eq('insights.overall_sentiment', 'negative')
        .order('call_time', { ascending: false })

      if (startDateISO) {
        query = query.gte('call_time', startDateISO)
      }
      if (endDateISO) {
        query = query.lte('call_time', endDateISO)
      }

      const { data: calls, error } = await query

      if (error) throw error

      setNegativeCalls((calls || []).map(call => ({
        id: call.id,
        filename: call.filename,
        call_time: call.call_time,
        call_duration_seconds: call.call_duration_seconds || 0,
      })))
    } catch (error) {
      console.error('Error fetching negative calls:', error)
      setNegativeCalls([])
    } finally {
      setNegativeCallsLoading(false)
    }
  }

  const fetchLongestCalls = async () => {
    if (!selectedExtension) return

    try {
      setLongestCallsLoading(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Build date filters
      let startDateISO: string | undefined
      let endDateISO: string | undefined
      
      if (dateRangeStart) {
        const [startYear, startMonth, startDay] = dateRangeStart.split('-').map(Number)
        const startDateLocal = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0)
        startDateISO = startDateLocal.toISOString()
      }
      if (dateRangeEnd) {
        const [endYear, endMonth, endDay] = dateRangeEnd.split('-').map(Number)
        const endDateLocal = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999)
        endDateISO = endDateLocal.toISOString()
      }

      // Fetch calls ordered by duration (longest first), limit to 10
      // RLS policies will automatically filter to show team members' calls
      let query = supabase
        .from('calls')
        .select('id, filename, call_time, call_duration_seconds')
        .eq('source_extension', selectedExtension)
        .not('call_duration_seconds', 'is', null)
        .order('call_duration_seconds', { ascending: false })
        .limit(10)

      if (startDateISO) {
        query = query.gte('call_time', startDateISO)
      }
      if (endDateISO) {
        query = query.lte('call_time', endDateISO)
      }

      const { data: calls, error } = await query

      if (error) throw error

      setLongestCalls((calls || []).map(call => ({
        id: call.id,
        filename: call.filename,
        call_time: call.call_time,
        call_duration_seconds: call.call_duration_seconds || 0,
      })))
    } catch (error) {
      console.error('Error fetching longest calls:', error)
      setLongestCalls([])
    } finally {
      setLongestCallsLoading(false)
    }
  }

  const handleExtensionClick = (extension: string) => {
    setActiveTab('by-caller')
    setSelectedExtension(extension)
  }

  const clearFilters = () => {
    setDateRangeStart('')
    setDateRangeEnd('')
  }

  const hasActiveFilters = () => {
    return dateRangeStart || dateRangeEnd
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Caller Analytics</h1>
            <p className="text-gray-600">
              Performance metrics and insights by source extension
            </p>
          </div>
          <button
            onClick={() => router.push('/analytics')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            General Analytics
          </button>
        </div>
      </div>

      {/* Date Filters (Shared) */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Date Range Filter</h3>
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-2 font-medium transition-colors relative ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview (All Extensions)
          </button>
          <button
            onClick={() => setActiveTab('by-caller')}
            className={`pb-4 px-2 font-medium transition-colors relative ${
              activeTab === 'by-caller'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            By Caller
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        /* OVERVIEW TAB */
        <div>
          {overviewLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600">Loading overview...</p>
              </div>
            </div>
          ) : overviewError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{overviewError}</p>
            </div>
          ) : overviewData.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No caller data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {overviewData.map((caller) => (
                <div
                  key={caller.extension}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleExtensionClick(caller.extension)}
                >
                  <div className="flex items-center gap-6">
                    {/* Extension Number */}
                    <div className="flex-shrink-0">
                      <div className="text-3xl font-bold text-gray-900">
                        Ext {caller.extension}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {caller.totalCalls} calls
                      </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="flex-shrink-0">
                      <SentimentPieChart
                        data={caller.sentimentDistribution}
                        size={150}
                        showLegend={false}
                      />
                    </div>

                    {/* Sentiment Bars */}
                    <div className="flex-1 min-w-0">
                      <HorizontalBars
                        data={[
                          {
                            label: 'Positive',
                            value: caller.totalCalls > 0 
                              ? (caller.sentimentDistribution.positive / caller.totalCalls) * 100 
                              : 0,
                            count: caller.sentimentDistribution.positive,
                          },
                          {
                            label: 'Neutral',
                            value: caller.totalCalls > 0 
                              ? (caller.sentimentDistribution.neutral / caller.totalCalls) * 100 
                              : 0,
                            count: caller.sentimentDistribution.neutral,
                          },
                          {
                            label: 'Negative',
                            value: caller.totalCalls > 0 
                              ? (caller.sentimentDistribution.negative / caller.totalCalls) * 100 
                              : 0,
                            count: caller.sentimentDistribution.negative,
                          },
                          {
                            label: 'Mixed',
                            value: caller.totalCalls > 0 
                              ? (caller.sentimentDistribution.mixed / caller.totalCalls) * 100 
                              : 0,
                            count: caller.sentimentDistribution.mixed,
                          },
                        ]}
                      />
                    </div>

                    {/* Satisfaction Score */}
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-blue-600">
                            {caller.satisfactionScore}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Satisfaction Score
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* BY CALLER TAB - Will be implemented next */
        <div>
          {/* Extension Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Extension
            </label>
            <select
              value={selectedExtension}
              onChange={(e) => setSelectedExtension(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select an extension...</option>
              {availableExtensions.map((ext) => (
                <option key={ext} value={ext}>
                  Extension {ext}
                </option>
              ))}
            </select>
          </div>

          {/* Performance Data */}
          {performanceLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600">Loading performance data...</p>
              </div>
            </div>
          ) : performanceError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{performanceError}</p>
            </div>
          ) : !selectedExtension ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Please select an extension to view performance metrics</p>
            </div>
          ) : performanceData ? (
            /* Performance Metrics Cards */
            <div className="space-y-6">
              {/* Extension Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-2">Extension {performanceData.extension}</h2>
                <p className="text-blue-100">
                  Performance metrics for {performanceData.callVolume.totalCalls} calls
                  {hasActiveFilters() && ' (filtered)'}
                </p>
              </div>

              {/* Row 1: Call Volume & Sentiment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Call Volume Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Volume & Activity</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Calls</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {performanceData.callVolume.totalCalls}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Avg Calls/Day</span>
                      <span className="text-xl font-semibold text-gray-900">
                        {performanceData.callVolume.avgCallsPerDay}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Inbound</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {performanceData.callVolume.inboundCount}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${performanceData.callVolume.totalCalls > 0 
                              ? (performanceData.callVolume.inboundCount / performanceData.callVolume.totalCalls) * 100 
                              : 0}%`
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Outbound</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {performanceData.callVolume.outboundCount}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${performanceData.callVolume.totalCalls > 0 
                              ? (performanceData.callVolume.outboundCount / performanceData.callVolume.totalCalls) * 100 
                              : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sentiment Analysis Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment & Satisfaction</h3>
                  <div className="flex items-center justify-around">
                    <SentimentPieChart
                      data={{
                        positive: performanceData.sentimentAnalysis.distribution.find(d => d.sentiment === 'positive')?.count || 0,
                        negative: performanceData.sentimentAnalysis.distribution.find(d => d.sentiment === 'negative')?.count || 0,
                        neutral: performanceData.sentimentAnalysis.distribution.find(d => d.sentiment === 'neutral')?.count || 0,
                        mixed: performanceData.sentimentAnalysis.distribution.find(d => d.sentiment === 'mixed')?.count || 0,
                      }}
                      size={180}
                      showLegend={false}
                    />
                    <SatisfactionGauge
                      score={performanceData.sentimentAnalysis.avgSatisfactionScore}
                      size={150}
                      label=""
                    />
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Positive Interactions</span>
                      <span className="text-lg font-semibold text-green-600">
                        {performanceData.sentimentAnalysis.positivePercentage}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Quality Metrics & Performance Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quality Metrics Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Quality Metrics</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Professional Calls</span>
                      <span className="text-xl font-semibold text-green-600">
                        {performanceData.qualityMetrics.professionalCalls}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Needs Improvement</span>
                      <span className="text-xl font-semibold text-orange-600">
                        {performanceData.qualityMetrics.needsImprovementCalls}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Resolution Rate</span>
                        <span className="text-lg font-bold text-blue-600">
                          {performanceData.qualityMetrics.resolutionRate}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Avg Call Duration</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {Math.floor(performanceData.qualityMetrics.avgCallDuration / 60)}:
                          {(performanceData.qualityMetrics.avgCallDuration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Overall Average:</span>
                        <span>
                          {Math.floor(performanceData.qualityMetrics.overallAvgDuration / 60)}:
                          {(performanceData.qualityMetrics.overallAvgDuration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>
                    {performanceData.qualityMetrics.outcomes.length > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">Call Outcomes</p>
                        <div className="space-y-1">
                          {performanceData.qualityMetrics.outcomes.map((outcome) => (
                            <div key={outcome.outcome} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 capitalize">{outcome.outcome.replace(/_/g, ' ')}</span>
                              <span className="text-gray-900">{outcome.count} ({outcome.percentage}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Indicators Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Indicators</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-600">Calls with Red Flags</span>
                        <div className="text-right">
                          <span className="text-xl font-semibold text-red-600">
                            {performanceData.performanceIndicators.callsWithRedFlags}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({performanceData.performanceIndicators.redFlagsPercentage}%)
                          </span>
                        </div>
                      </div>
                      {performanceData.performanceIndicators.redFlagCategories.length > 0 && (
                        <div className="pl-4 space-y-1">
                          {performanceData.performanceIndicators.redFlagCategories.map((cat) => (
                            <div key={cat.category} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 capitalize">{cat.category.replace(/_/g, ' ')}</span>
                              <span className="text-gray-900">{cat.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-600">Calls with Action Items</span>
                        <div className="text-right">
                          <span className="text-xl font-semibold text-blue-600">
                            {performanceData.performanceIndicators.callsWithActionItems}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({performanceData.performanceIndicators.actionItemsPercentage}%)
                          </span>
                        </div>
                      </div>
                      {performanceData.performanceIndicators.actionPriorities.length > 0 && (
                        <div className="pl-4 space-y-1">
                          {performanceData.performanceIndicators.actionPriorities.map((priority) => (
                            <div key={priority.priority} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 capitalize">{priority.priority}</span>
                              <span className="text-gray-900">{priority.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Longest Calls & Negative Calls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Longest Calls Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Longest Calls</h3>
                  {longestCallsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                  ) : longestCalls.length === 0 ? (
                    <p className="text-sm text-gray-500">No calls found</p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {longestCalls.map((call) => {
                        const durationMinutes = Math.floor(call.call_duration_seconds / 60)
                        const durationSeconds = call.call_duration_seconds % 60
                        const durationStr = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`
                        
                        return (
                          <Link
                            key={call.id}
                            href={`/calls/${call.id}`}
                            className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {call.filename || 'Untitled Call'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatCallTime(call.call_time, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                                <span className="text-xs font-semibold text-gray-900">
                                  {durationStr}
                                </span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Negative Calls Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Negative Calls</h3>
                  {negativeCallsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                  ) : negativeCalls.length === 0 ? (
                    <p className="text-sm text-gray-500">No negative calls found</p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {negativeCalls.map((call) => {
                        const durationMinutes = Math.floor(call.call_duration_seconds / 60)
                        const durationSeconds = call.call_duration_seconds % 60
                        const durationStr = `${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}`
                        
                        return (
                          <Link
                            key={call.id}
                            href={`/calls/${call.id}`}
                            className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {call.filename || 'Untitled Call'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatCallTime(call.call_time, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                                <span className="text-xs text-gray-600">
                                  {durationStr}
                                </span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 4: Call Trends Chart */}
              {performanceData.callTrends.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Trends Over Time</h3>
                  <div className="space-y-2">
                    {performanceData.callTrends.slice(-14).map((trend) => (
                      <div key={trend.date} className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 w-24">
                          {new Date(trend.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            timeZone: 'America/Los_Angeles'
                          })}
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-blue-500 flex items-center justify-end pr-2"
                            style={{
                              width: `${Math.min((trend.callCount / Math.max(...performanceData.callTrends.map(t => t.callCount))) * 100, 100)}%`
                            }}
                          >
                            <span className="text-xs font-semibold text-white">{trend.callCount}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {trend.positiveCount > 0 && (
                            <div className="w-2 h-2 bg-green-500 rounded-full" title={`${trend.positiveCount} positive`} />
                          )}
                          {trend.negativeCount > 0 && (
                            <div className="w-2 h-2 bg-red-500 rounded-full" title={`${trend.negativeCount} negative`} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}


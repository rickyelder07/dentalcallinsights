'use client'

/**
 * QA Dashboard Page (Milestone 8)
 * Comprehensive QA analytics, agent performance, and scoring trends
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import ScoreBreakdown from '../components/ScoreBreakdown'
import type { QADashboardData, QADashboardFilters } from '@/types/qa'
import { CATEGORY_METADATA } from '@/lib/qa-criteria'

export default function QADashboardPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [dashboardData, setDashboardData] = useState<QADashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<QADashboardFilters>({})
  const [viewMode, setViewMode] = useState<'overview' | 'agents' | 'criteria' | 'trends'>('overview')

  useEffect(() => {
    fetchDashboardData()
  }, [filters])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Build query params
      const params = new URLSearchParams()
      if (filters.dateRange?.start) params.append('dateRangeStart', filters.dateRange.start)
      if (filters.dateRange?.end) params.append('dateRangeEnd', filters.dateRange.end)
      if (filters.agents && filters.agents.length > 0) {
        params.append('agents', filters.agents.join(','))
      }

      const response = await fetch(`/api/qa/dashboard?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      
      if (!result.success) {
        setError(result.error || 'Failed to load dashboard data')
        return
      }

      setDashboardData(result.data)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading QA dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center py-12">
          <p className="text-gray-600">No dashboard data available</p>
        </div>
      </div>
    )
  }

  const { overview, agentPerformance, failedCriteria, scoreDistribution, scoreTrends, categoryPerformance, recentScores } = dashboardData

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">QA Dashboard</h1>
            <p className="text-gray-600">
              Quality assurance metrics, agent performance, and scoring analytics
            </p>
          </div>
          <button
            onClick={() => router.push('/library-enhanced')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          {(['overview', 'agents', 'criteria', 'trends'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                viewMode === mode
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Overview View */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-1">Total Scores</div>
              <div className="text-3xl font-bold text-gray-900">{overview.total_scores}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-1">Average Score</div>
              <div className="text-3xl font-bold text-blue-600">{overview.avg_score}/100</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-1">Unique Agents</div>
              <div className="text-3xl font-bold text-purple-600">{overview.unique_agents}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-1">Scoring Days</div>
              <div className="text-3xl font-bold text-green-600">{overview.scoring_days}</div>
            </div>
          </div>

          {/* Category Performance */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Category</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categoryPerformance.map(category => (
                <div key={category.category} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{category.category_label}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {category.avg_score}/{category.max_possible} ({category.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        category.percentage >= 80 ? 'bg-green-500' :
                        category.percentage >= 60 ? 'bg-blue-500' :
                        category.percentage >= 40 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    {CATEGORY_METADATA[category.category].description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Score Distribution */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
            <div className="space-y-3">
              {scoreDistribution.map(bucket => (
                <div key={bucket.range} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium text-gray-700">{bucket.range}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-8">
                    <div
                      className="bg-blue-500 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${bucket.percentage}%`, minWidth: bucket.count > 0 ? '40px' : '0' }}
                    >
                      {bucket.count > 0 ? `${bucket.count} (${bucket.percentage}%)` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Scores */}
          {recentScores && recentScores.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Scores</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentScores.slice(0, 4).map(score => (
                  <ScoreBreakdown key={score.id} score={score} showDetails={true} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Agents View */}
      {viewMode === 'agents' && (
        <div className="space-y-6">
          {agentPerformance && agentPerformance.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Agent Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Evaluations
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Range
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Scored
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {agentPerformance.map(agent => (
                      <tr key={agent.agent_name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{agent.agent_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{agent.total_evaluations}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-blue-600">{agent.avg_score}/100</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{agent.min_score} - {agent.max_score}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(agent.last_scored).toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-600">No agent performance data available</p>
            </div>
          )}
        </div>
      )}

      {/* Criteria View */}
      {viewMode === 'criteria' && (
        <div className="space-y-6">
          {failedCriteria && failedCriteria.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Commonly Failed Criteria</h3>
              <div className="space-y-4">
                {failedCriteria.slice(0, 10).map((criterion, index) => (
                  <div key={`${criterion.criterion_name}-${index}`} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{criterion.criterion_name}</h4>
                        <p className="text-xs text-gray-600 capitalize">{criterion.criterion_category.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-red-600">{criterion.failure_count} failures</div>
                        <div className="text-xs text-gray-600">Avg: {criterion.avg_score}/{criterion.criterion_weight}</div>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-gray-600">
                      <span>Zero scores: {criterion.zero_score_count}</span>
                      <span>Not applicable: {criterion.not_applicable_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-600">No failed criteria data available</p>
            </div>
          )}
        </div>
      )}

      {/* Trends View */}
      {viewMode === 'trends' && (
        <div className="space-y-6">
          {scoreTrends && scoreTrends.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Trends Over Time</h3>
              <div className="space-y-2">
                {scoreTrends.map(trend => (
                  <div key={trend.date} className="flex items-center gap-4">
                    <div className="w-32 text-sm text-gray-700">
                      {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-8">
                      <div
                        className="bg-blue-500 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ width: `${trend.avg_score}%`, minWidth: '60px' }}
                      >
                        {trend.avg_score}/100
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-600 text-right">
                      {trend.count} {trend.count === 1 ? 'score' : 'scores'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <p className="text-gray-600">No trend data available</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

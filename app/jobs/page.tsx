'use client'

/**
 * Jobs Status Page
 * Shows all background jobs (transcriptions and insights) with their current status
 * Allows monitoring of ongoing and completed jobs with pagination
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

interface Job {
  id: string
  call_id: string
  type: 'transcription' | 'insights'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  error_message?: string
  cached?: boolean
  metadata?: any
  call?: {
    filename: string
  }
}

const JOBS_PER_PAGE = 50

export default function JobsPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('active')
  const [typeFilter, setTypeFilter] = useState<'all' | 'transcription' | 'insights'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch jobs
  const fetchJobs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Fetch transcription jobs (increased limit to 5000)
      const { data: transcriptionJobs, count: transcriptionCount } = await supabase
        .from('transcription_jobs')
        .select(`
          id,
          call_id,
          status,
          started_at,
          completed_at,
          error_message,
          metadata,
          calls!inner(filename)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5000)

      // Fetch insights jobs (increased limit to 5000)
      const { data: insightsJobs, count: insightsCount } = await supabase
        .from('insights_jobs')
        .select(`
          id,
          call_id,
          status,
          started_at,
          completed_at,
          error_message,
          cached,
          metadata,
          calls!inner(filename)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5000)

      // Combine and format jobs
      const allJobs: Job[] = []

      if (transcriptionJobs) {
        transcriptionJobs.forEach(job => {
          allJobs.push({
            id: job.id,
            call_id: job.call_id,
            type: 'transcription',
            status: job.status as any,
            started_at: job.started_at,
            completed_at: job.completed_at,
            error_message: job.error_message,
            metadata: job.metadata,
            call: { filename: (job.calls as any)?.filename || 'Unknown' },
          })
        })
      }

      if (insightsJobs) {
        insightsJobs.forEach(job => {
          allJobs.push({
            id: job.id,
            call_id: job.call_id,
            type: 'insights',
            status: job.status as any,
            started_at: job.started_at,
            completed_at: job.completed_at,
            error_message: job.error_message,
            cached: job.cached,
            metadata: job.metadata,
            call: { filename: (job.calls as any)?.filename || 'Unknown' },
          })
        })
      }

      // Sort by started_at (most recent first)
      allJobs.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())

      setJobs(allJobs)
      setTotalCount((transcriptionCount || 0) + (insightsCount || 0))
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchJobs()
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, typeFilter])

  // Auto-refresh every 5 seconds for active jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some(j => j.status === 'processing' || j.status === 'pending')
    if (!hasActiveJobs) return

    const interval = setInterval(fetchJobs, 5000)
    return () => clearInterval(interval)
  }, [jobs])

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    // Status filter
    if (filter === 'active' && job.status !== 'processing' && job.status !== 'pending') return false
    if (filter === 'completed' && job.status !== 'completed') return false
    if (filter === 'failed' && job.status !== 'failed') return false

    // Type filter
    if (typeFilter !== 'all' && job.type !== typeFilter) return false

    return true
  })

  // Paginate filtered jobs
  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE)
  const startIndex = (currentPage - 1) * JOBS_PER_PAGE
  const endIndex = startIndex + JOBS_PER_PAGE
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">Completed</span>
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Failed</span>
      case 'processing':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">Processing</span>
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">Pending</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">{status}</span>
    }
  }

  const getTypeIcon = (type: string) => {
    if (type === 'transcription') {
      return (
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
  }

  const formatDuration = (started: string, completed?: string) => {
    const start = new Date(started).getTime()
    const end = completed ? new Date(completed).getTime() : Date.now()
    const seconds = Math.floor((end - start) / 1000)
    
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const stats = {
    total: filteredJobs.length,
    active: filteredJobs.filter(j => j.status === 'processing' || j.status === 'pending').length,
    completed: filteredJobs.filter(j => j.status === 'completed').length,
    failed: filteredJobs.filter(j => j.status === 'failed').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading jobs...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Background Jobs</h1>
              <p className="text-gray-600 mt-1">Monitor transcription and insights generation jobs</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back to Library
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">
              {filteredJobs.length === jobs.length ? 'Total Jobs' : 'Filtered Jobs'}
              {totalCount > 5000 && (
                <span className="block text-xs text-gray-500 mt-1">
                  (Showing up to 5,000 most recent)
                </span>
              )}
            </div>
          </div>
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="bg-white border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white border border-red-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 text-sm rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`px-3 py-1 text-sm rounded ${filter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`px-3 py-1 text-sm rounded ${filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setFilter('failed')}
                  className={`px-3 py-1 text-sm rounded ${filter === 'failed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Failed
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1 text-sm rounded ${typeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setTypeFilter('transcription')}
                  className={`px-3 py-1 text-sm rounded ${typeFilter === 'transcription' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Transcription
                </button>
                <button
                  onClick={() => setTypeFilter('insights')}
                  className={`px-3 py-1 text-sm rounded ${typeFilter === 'insights' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Insights
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-600">No jobs found matching the selected filters.</p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="divide-y divide-gray-200">
                {paginatedJobs.map((job) => (
                <div key={job.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="mt-1">
                      {getTypeIcon(job.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {job.call?.filename || 'Unknown'}
                          </h3>
                          <span className="text-xs text-gray-500 capitalize">
                            {job.type}
                          </span>
                          {job.cached && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              Cached
                            </span>
                          )}
                        </div>
                        {getStatusBadge(job.status)}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Started: {new Date(job.started_at).toLocaleString()}</span>
                        {job.completed_at && (
                          <span>Duration: {formatDuration(job.started_at, job.completed_at)}</span>
                        )}
                        {(job.status === 'processing' || job.status === 'pending') && (
                          <span className="text-blue-600 font-medium">
                            Running for {formatDuration(job.started_at)}
                          </span>
                        )}
                      </div>

                      {/* Progress info */}
                      {job.metadata?.stage && (job.status === 'processing' || job.status === 'pending') && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-600">
                            {job.metadata.stage} {job.metadata.message && `- ${job.metadata.message}`}
                          </div>
                          {job.metadata.progress !== undefined && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all"
                                style={{ width: `${job.metadata.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error message */}
                      {job.error_message && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          <span className="font-medium">Error:</span> {job.error_message}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div>
                      <button
                        onClick={() => router.push(`/calls/${job.call_id}`)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Call →
                      </button>
                    </div>
                  </div>
                </div>
                ))}
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredJobs.length)} of {filteredJobs.length} jobs
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          } transition-colors`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Auto-refresh indicator */}
        {stats.active > 0 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            <div className="inline-flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              Auto-refreshing every 5 seconds
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


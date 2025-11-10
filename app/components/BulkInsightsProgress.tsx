/**
 * Bulk Insights Generation Progress Component
 * Shows real-time progress for bulk AI insights generation operations
 * Polls database for job status updates
 */

'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'

interface InsightsJob {
  id: string
  callId: string
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  progress?: number
  cached?: boolean
  stage?: string
  message?: string
}

interface BulkInsightsProgressProps {
  jobs: InsightsJob[]
  onComplete: (results: { success: number; failed: number; cached: number; errors: string[] }) => void
  onCancel: () => void
}

export default function BulkInsightsProgress({
  jobs,
  onComplete,
  onCancel,
}: BulkInsightsProgressProps) {
  const supabase = createBrowserClient()
  const [jobStatuses, setJobStatuses] = useState<Record<string, InsightsJob>>({})
  const [isPolling, setIsPolling] = useState(true)

  // Initialize job statuses
  useEffect(() => {
    const initialStatuses: Record<string, InsightsJob> = {}
    jobs.forEach(job => {
      initialStatuses[job.callId] = job
    })
    setJobStatuses(initialStatuses)
  }, [jobs])

  // Poll for job status updates from database
  useEffect(() => {
    if (!isPolling) return

    const pollInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Get updated job statuses from database
        const callIds = jobs.map(job => job.callId)
        const { data: updatedJobs, error } = await supabase
          .from('insights_jobs')
          .select('id, call_id, status, error_message, completed_at, cached, metadata')
          .in('call_id', callIds)

        if (error) {
          console.error('Error polling job statuses:', error)
          return
        }

        // Update job statuses
        setJobStatuses(prev => {
          const updated = { ...prev }
          updatedJobs?.forEach(job => {
            if (updated[job.call_id]) {
              const metadata = job.metadata as any
              updated[job.call_id] = {
                ...updated[job.call_id],
                status: job.status as any,
                error: job.error_message || undefined,
                cached: job.cached || false,
                progress: metadata?.progress || (job.status === 'completed' ? 100 : job.status === 'failed' ? 100 : 50),
                stage: metadata?.stage || 'analyzing',
                message: metadata?.message,
              }
            }
          })
          return updated
        })

        // Check if all jobs are complete
        const allJobs = Object.values(jobStatuses)
        if (allJobs.length === 0) return

        const completedJobs = allJobs.filter(job => 
          job.status === 'completed' || job.status === 'failed'
        )

        if (completedJobs.length === allJobs.length && allJobs.length > 0) {
          setIsPolling(false)
          const results = {
            success: allJobs.filter(job => job.status === 'completed' && !job.cached).length,
            failed: allJobs.filter(job => job.status === 'failed').length,
            cached: allJobs.filter(job => job.status === 'completed' && job.cached).length,
            errors: allJobs
              .filter(job => job.status === 'failed' && job.error)
              .map(job => `${job.filename}: ${job.error}`)
          }
          onComplete(results)
        }
      } catch (error) {
        console.error('Error in polling loop:', error)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [isPolling, jobs, jobStatuses, supabase, onComplete])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'processing':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (job: InsightsJob) => {
    if (job.status === 'completed' && job.cached) {
      return 'Cached'
    }
    switch (job.status) {
      case 'pending':
        return 'Pending'
      case 'processing':
        return 'Generating'
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      default:
        return 'Unknown'
    }
  }

  const totalJobs = jobs.length
  const completedJobs = Object.values(jobStatuses).filter(job => 
    job.status === 'completed' || job.status === 'failed'
  ).length
  const progressPercentage = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            🧠 AI Insights Generation Progress
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            disabled={isPolling}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Overall Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Overall Progress
            </span>
            <span className="text-sm font-semibold text-purple-600">
              {completedJobs}/{totalJobs} ({Math.round(progressPercentage)}%)
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-purple-600 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="w-full h-full bg-gradient-to-r from-purple-500 to-purple-600 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Individual Job Progress */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {jobs.map((job) => {
            const currentJob = jobStatuses[job.callId] || job
            return (
              <div key={job.callId} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {job.filename}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        currentJob.status === 'completed' && currentJob.cached
                          ? 'bg-blue-100 text-blue-800'
                          : currentJob.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : currentJob.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {getStatusText(currentJob)}
                    </span>
                  </div>
                </div>

                {/* Progress bar for individual job */}
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(
                        currentJob.status
                      )}`}
                      style={{ 
                        width: `${currentJob.progress || (
                          currentJob.status === 'completed' ? 100 : 
                          currentJob.status === 'failed' ? 100 : 
                          currentJob.status === 'processing' ? 50 : 0
                        )}%`
                      }}
                    />
                  </div>
                  {/* Progress text with stage info */}
                  {currentJob.status === 'processing' && (
                    <div className="text-xs text-gray-500 mt-1">
                      {currentJob.stage && currentJob.message 
                        ? `${currentJob.stage}: ${currentJob.message}` 
                        : currentJob.message 
                        ? currentJob.message
                        : 'Analyzing transcript with AI...'}
                    </div>
                  )}
                  {currentJob.cached && currentJob.status === 'completed' && (
                    <div className="text-xs text-blue-600 mt-1">
                      ✓ Using cached insights (no API call needed)
                    </div>
                  )}
                </div>

                {/* Error message */}
                {currentJob.error && (
                  <div className="text-xs text-red-600 mt-1">
                    Error: {currentJob.error}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary Stats */}
        {!isPolling && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-around text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-600">
                  {Object.values(jobStatuses).filter(j => j.status === 'completed' && !j.cached).length}
                </div>
                <div className="text-gray-600">Generated</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-600">
                  {Object.values(jobStatuses).filter(j => j.cached).length}
                </div>
                <div className="text-gray-600">Cached</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">
                  {Object.values(jobStatuses).filter(j => j.status === 'failed').length}
                </div>
                <div className="text-gray-600">Failed</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {isPolling ? 'Cancel' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}


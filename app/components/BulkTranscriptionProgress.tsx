/**
 * Bulk Transcription Progress Component
 * Shows real-time progress for bulk transcription operations
 */

'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'

interface TranscriptionJob {
  id: string
  callId: string
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  progress?: number
}

interface BulkTranscriptionProgressProps {
  jobs: TranscriptionJob[]
  onComplete: (results: { success: number; failed: number; errors: string[] }) => void
  onCancel: () => void
}

export default function BulkTranscriptionProgress({
  jobs,
  onComplete,
  onCancel,
}: BulkTranscriptionProgressProps) {
  const supabase = createBrowserClient()
  const [jobStatuses, setJobStatuses] = useState<Record<string, TranscriptionJob>>({})
  const [isPolling, setIsPolling] = useState(true)

  // Initialize job statuses
  useEffect(() => {
    const initialStatuses: Record<string, TranscriptionJob> = {}
    jobs.forEach(job => {
      initialStatuses[job.callId] = job
    })
    setJobStatuses(initialStatuses)
  }, [jobs])

  // Poll for job status updates
  useEffect(() => {
    if (!isPolling) return

    const pollInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Get updated job statuses from database
        const callIds = jobs.map(job => job.callId)
        const { data: updatedJobs, error } = await supabase
          .from('transcription_jobs')
          .select('id, call_id, status, error_message, completed_at, metadata')
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
                progress: metadata?.progress || (job.status === 'completed' ? 100 : job.status === 'failed' ? 100 : 50),
                stage: metadata?.stage || 'processing',
                message: metadata?.message,
              }
            }
          })
          return updated
        })

        // Check if all jobs are complete
        const allJobs = Object.values(jobStatuses)
        const completedJobs = allJobs.filter(job => 
          job.status === 'completed' || job.status === 'failed'
        )

        if (completedJobs.length === allJobs.length) {
          setIsPolling(false)
          const results = {
            success: allJobs.filter(job => job.status === 'completed').length,
            failed: allJobs.filter(job => job.status === 'failed').length,
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
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'processing':
        return 'Processing'
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
            Bulk Transcription Progress
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            disabled={!isPolling}
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
            <span className="text-sm font-semibold text-blue-600">
              {completedJobs}/{totalJobs} ({Math.round(progressPercentage)}%)
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="w-full h-full bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse"></div>
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
                        currentJob.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : currentJob.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {getStatusText(currentJob.status)}
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
                        width: currentJob.status === 'completed' ? '100%' : 
                              currentJob.status === 'failed' ? '100%' : 
                              `${currentJob.progress || 50}%`
                      }}
                    />
                  </div>
                  {/* Progress text */}
                  {currentJob.progress && currentJob.status === 'processing' && (
                    <div className="text-xs text-gray-500 mt-1">
                      {currentJob.progress}% - {currentJob.stage || 'Processing...'}
                      {currentJob.message && ` (${currentJob.message})`}
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

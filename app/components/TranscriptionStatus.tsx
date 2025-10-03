'use client'

/**
 * Transcription Status Component
 * Display transcription processing status with progress indicator
 */

import { useEffect, useState } from 'react'
import type { TranscriptionStatus } from '@/types/transcription'

interface TranscriptionStatusProps {
  callId: string
  status: TranscriptionStatus
  progress?: number
  errorMessage?: string
  onComplete?: () => void
  className?: string
}

export default function TranscriptionStatus({
  callId,
  status,
  progress = 0,
  errorMessage,
  onComplete,
  className = '',
}: TranscriptionStatusProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  // Track elapsed time for processing status
  useEffect(() => {
    if (status !== 'processing') return

    const startTime = Date.now()
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [status])

  // Call onComplete when status changes to completed
  useEffect(() => {
    if (status === 'completed' && onComplete) {
      onComplete()
    }
  }, [status, onComplete])

  // Format elapsed time
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`bg-white border rounded-lg shadow-sm p-4 ${className}`}>
      {/* Status: Pending */}
      {status === 'pending' && (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Transcription Pending</h4>
            <p className="text-sm text-gray-600">Waiting to start transcription...</p>
          </div>
        </div>
      )}

      {/* Status: Processing */}
      {status === 'processing' && (
        <div>
          <div className="flex items-center space-x-3 mb-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="animate-spin w-5 h-5 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Transcribing Audio</h4>
              <p className="text-sm text-gray-600">
                Processing... {elapsedTime > 0 && `(${formatElapsedTime(elapsedTime)})`}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {progress > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm font-medium text-blue-600">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                >
                  <div className="w-full h-full bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status: Completed */}
      {status === 'completed' && (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Transcription Complete</h4>
            <p className="text-sm text-gray-600">Audio has been successfully transcribed</p>
          </div>
        </div>
      )}

      {/* Status: Failed */}
      {status === 'failed' && (
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Transcription Failed</h4>
            <p className="text-sm text-gray-600">
              {errorMessage || 'An error occurred during transcription'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Status: Cancelled */}
      {status === 'cancelled' && (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">Transcription Cancelled</h4>
            <p className="text-sm text-gray-600">Transcription was cancelled by user</p>
          </div>
        </div>
      )}
    </div>
  )
}


'use client'

/**
 * ExportModal Component
 * Modal for exporting call data with format and field selection
 */

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { ExportFormat, ExportFields } from '@/types/export'
import { DEFAULT_EXPORT_FIELDS } from '@/types/export'
import { downloadCSV, downloadJSON, estimateFileSize, formatFileSize } from '@/lib/export'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCallIds: string[]
  totalCalls: number
}

export default function ExportModal({
  isOpen,
  onClose,
  selectedCallIds,
  totalCalls,
}: ExportModalProps) {
  const supabase = createBrowserClient()
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [fields, setFields] = useState<ExportFields>(DEFAULT_EXPORT_FIELDS)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const recordCount = selectedCallIds.length
  const estimatedSize = estimateFileSize(recordCount, format, fields.transcript)

  const handleExport = async () => {
    try {
      setIsExporting(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError('Please log in to export data')
        return
      }

      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          format,
          callIds: selectedCallIds,
          fields,
          includeTranscripts: fields.transcript,
          includeInsights: fields.summary || fields.sentiment || fields.actionItems || fields.redFlags,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // Get the content and trigger download
      const content = await response.text()
      
      if (format === 'csv') {
        downloadCSV(content)
      } else if (format === 'json') {
        downloadJSON(content)
      }

      onClose()
    } catch (error) {
      console.error('Export error:', error)
      setError(error instanceof Error ? error.message : 'Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const toggleField = (field: keyof ExportFields) => {
    setFields((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Export Calls</h2>
              <p className="text-sm text-gray-600 mt-1">
                Exporting {recordCount} of {totalCalls} calls
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Error */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Format Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormat('csv')}
                  className={`p-3 border-2 rounded-lg text-left transition-colors ${
                    format === 'csv'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-gray-600">Spreadsheet compatible</div>
                </button>
                <button
                  onClick={() => setFormat('json')}
                  className={`p-3 border-2 rounded-lg text-left transition-colors ${
                    format === 'json'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">JSON</div>
                  <div className="text-xs text-gray-600">Developer friendly</div>
                </button>
              </div>
            </div>

            {/* Field Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include Fields
              </label>
              <div className="space-y-2">
                {/* Basic fields */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-sm text-gray-700 mb-2">Basic Information</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['filename', 'callTime', 'direction', 'duration'] as const).map((field) => (
                      <label key={field} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fields[field]}
                          onChange={() => toggleField(field)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {field.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Call details */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-sm text-gray-700 mb-2">Call Details</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['sourceNumber', 'destinationNumber', 'disposition'] as const).map((field) => (
                      <label key={field} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fields[field]}
                          onChange={() => toggleField(field)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {field.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Transcript */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-sm text-gray-700 mb-2">Transcript</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['transcript', 'language'] as const).map((field) => (
                      <label key={field} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fields[field]}
                          onChange={() => toggleField(field)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {field}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* AI Insights */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-sm text-gray-700 mb-2">AI Insights</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['summary', 'sentiment', 'outcome', 'actionItems', 'redFlags'] as const).map((field) => (
                      <label key={field} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fields[field]}
                          onChange={() => toggleField(field)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {field.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* File size estimate */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <span className="font-medium">Estimated file size:</span> {formatFileSize(estimatedSize)}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
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
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export {format.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}


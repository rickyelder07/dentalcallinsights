'use client'

/**
 * Upload Page
 * Simplified CSV + Audio upload with direct filename matching
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UploadResult, CsvValidationError } from '@/types/upload'

export default function UploadPage() {
  const router = useRouter()
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [audioFiles, setAudioFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Please select a CSV file')
        return
      }
      setCsvFile(file)
      setError(null)
      setUploadResult(null)
    }
  }

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setAudioFiles(files)
      setError(null)
      setUploadResult(null)
    }
  }

  const handleRemoveCsv = () => {
    setCsvFile(null)
    setError(null)
    setUploadResult(null)
  }

  const handleRemoveAudio = (index: number) => {
    setAudioFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setUploadResult(null)
    setUploadProgress(0)
    setUploadStatus('')

    // Validate inputs
    if (!csvFile) {
      setError('Please select a CSV file')
      return
    }

    if (audioFiles.length === 0) {
      setError('Please select at least one audio file')
      return
    }

    setIsUploading(true)

    try {
      setUploadStatus('Processing CSV...')
      setUploadProgress(5)

      // First, process the CSV file
      const csvFormData = new FormData()
      csvFormData.append('csv', csvFile)

      const csvResponse = await fetch('/api/upload/process-csv', {
        method: 'POST',
        body: csvFormData,
      })

      if (!csvResponse.ok) {
        const errorData = await csvResponse.json()
        throw new Error(errorData.message || 'Failed to process CSV')
      }

      const csvResult = await csvResponse.json()
      setUploadProgress(10)
      setUploadStatus('CSV processed successfully')

      // Now upload audio files individually
      const totalFiles = audioFiles.length
      const uploadedFiles: string[] = []
      const uploadErrors: string[] = []

      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i]
        const progressBase = 10 + (i / totalFiles) * 80
        setUploadProgress(Math.round(progressBase))
        setUploadStatus(`Uploading ${file.name}... (${i + 1}/${totalFiles})`)

        try {
          // Find matching CSV row for this file
          const csvRow = csvResult.csvData.rows.find((row: any) => row.filename === file.name)
          if (!csvRow) {
            uploadErrors.push(`No CSV data found for file "${file.name}"`)
            continue
          }

          // Create form data for individual file upload
          const fileFormData = new FormData()
          fileFormData.append('audio', file)
          fileFormData.append('filename', file.name)
          fileFormData.append('callTime', csvRow.call_time)
          fileFormData.append('direction', csvRow.direction)
          fileFormData.append('sourceNumber', csvRow.source_number || '')
          fileFormData.append('destinationNumber', csvRow.destination_number || '')
          fileFormData.append('durationSeconds', csvRow.duration_seconds?.toString() || '')
          fileFormData.append('disposition', csvRow.disposition || '')

          const fileResponse = await fetch('/api/upload/single', {
            method: 'POST',
            body: fileFormData,
          })

          if (!fileResponse.ok) {
            const errorData = await fileResponse.json()
            uploadErrors.push(`Failed to upload "${file.name}": ${errorData.message}`)
            continue
          }

          const fileResult = await fileResponse.json()
          if (fileResult.success && fileResult.callId) {
            uploadedFiles.push(fileResult.callId)
          }
        } catch (fileError) {
          uploadErrors.push(`Error uploading "${file.name}": ${fileError instanceof Error ? fileError.message : 'Unknown error'}`)
        }
      }

      setUploadProgress(95)
      setUploadStatus('Finalizing...')

      // Combine results
      const allCallIds = [...(csvResult.callsCreated || []), ...uploadedFiles]
      const allErrors = [...(csvResult.errors || []), ...uploadErrors.map(msg => ({ row: 0, column: 'file', message: msg }))]

      const result: UploadResult = {
        success: uploadErrors.length === 0,
        message: uploadErrors.length === 0
          ? `Successfully uploaded ${allCallIds.length} call recordings`
          : `Uploaded ${uploadedFiles.length} of ${totalFiles} audio files with errors`,
        csvRowsProcessed: csvResult.csvData.rowCount,
        audioFilesUploaded: uploadedFiles.length,
        callsCreated: allCallIds,
        errors: allErrors,
        warnings: csvResult.warnings || [],
      }

      setUploadProgress(100)
      setUploadStatus('Upload complete!')
      setUploadResult(result)

      // If fully successful, redirect to library after a short delay
      if (result.success && result.callsCreated && result.callsCreated.length > 0) {
        setTimeout(() => {
          router.push('/library-enhanced')
        }, 2000)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
      setUploadProgress(0)
      setUploadStatus('')
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Upload Call Recordings
      </h1>
      <p className="text-gray-600 mb-8">
        Upload a CSV file with call data and matching audio files (MP3, WAV, M4A, AAC)
      </p>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
          <li>
            Upload a CSV file that includes a &quot;Call&quot; column with audio filenames
          </li>
          <li>
            Upload audio files (MP3, WAV, M4A, or AAC) that match the filenames in your CSV
          </li>
          <li>
            All audio filenames must exactly match entries in the CSV &quot;Call&quot; column
          </li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* CSV Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            1. Upload CSV File *
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
            {!csvFile ? (
              <div className="text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer inline-block"
                >
                  <div className="text-gray-600 mb-2">
                    📄 Click to select CSV file
                  </div>
                  <div className="text-sm text-gray-500">
                    Must include &quot;Call&quot; column with audio filenames
                  </div>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">📄</div>
                  <div>
                    <div className="font-medium text-gray-900">{csvFile.name}</div>
                    <div className="text-sm text-gray-500">
                      {formatFileSize(csvFile.size)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCsv}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Audio Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            2. Upload Audio Files *
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
            <div className="text-center mb-4">
              <input
                type="file"
                accept=".mp3,.wav,.m4a,.aac,audio/*"
                multiple
                onChange={handleAudioChange}
                className="hidden"
                id="audio-upload"
              />
              <label
                htmlFor="audio-upload"
                className="cursor-pointer inline-block"
              >
                <div className="text-gray-600 mb-2">
                  🎵 Click to select audio files (or select multiple)
                </div>
                <div className="text-sm text-gray-500">
                  Supported formats: MP3, WAV, M4A, AAC (max 100MB each)
                </div>
              </label>
            </div>

            {audioFiles.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {audioFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="text-xl">🎵</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {file.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAudio(index)}
                      className="text-red-600 hover:text-red-700 font-medium ml-4"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="font-semibold text-red-900 mb-1">Error</div>
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <div
            className={`border rounded-lg p-4 ${
              uploadResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <div
              className={`font-semibold mb-2 ${
                uploadResult.success ? 'text-green-900' : 'text-yellow-900'
              }`}
            >
              {uploadResult.success ? '✓ Upload Successful' : '⚠ Partial Upload'}
            </div>
            <div
              className={
                uploadResult.success ? 'text-green-800' : 'text-yellow-800'
              }
            >
              <p>{uploadResult.message}</p>
              <div className="mt-2 text-sm">
                <p>CSV rows processed: {uploadResult.csvRowsProcessed || 0}</p>
                <p>Audio files uploaded: {uploadResult.audioFilesUploaded || 0}</p>
                <p>Calls created: {uploadResult.callsCreated?.length || 0}</p>
              </div>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold mb-1">Errors:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {uploadResult.errors.map((err, idx) => (
                      <li key={idx}>
                        {err.column && `[${err.column}] `}
                        {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadResult.success && (
                <p className="mt-3 text-sm font-medium">
                  Redirecting to library...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!csvFile || audioFiles.length === 0 || isUploading}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              !csvFile || audioFiles.length === 0 || isUploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {uploadStatus}
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  {uploadProgress}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                >
                  <div className="w-full h-full bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Upload Details */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <svg
                  className="animate-spin h-4 w-4 text-blue-600"
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
                <span>Processing {audioFiles.length} file{audioFiles.length !== 1 ? 's' : ''}...</span>
              </div>
              <span className="text-gray-500">Please wait</span>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

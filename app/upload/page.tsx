'use client'

/**
 * Upload Page
 * Simplified CSV + Audio upload with direct filename matching
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers/auth-provider'
import { createBrowserClient } from '@/lib/supabase'
import { uploadFileAndCreateRecord, simulateUploadProgress } from '@/lib/direct-upload'
import BulkTranscriptionProgress from '../components/BulkTranscriptionProgress'
import BulkInsightsProgress from '../components/BulkInsightsProgress'
import type { UploadResult, CsvValidationError } from '@/types/upload'

export default function UploadPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createBrowserClient()
  
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [audioFiles, setAudioFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Auto-process feature
  const [autoProcess, setAutoProcess] = useState(false)
  const [showProcessConfirm, setShowProcessConfirm] = useState(false)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showTranscriptionProgress, setShowTranscriptionProgress] = useState(false)
  const [transcriptionJobs, setTranscriptionJobs] = useState<any[]>([])
  const [showInsightsProgress, setShowInsightsProgress] = useState(false)
  const [insightsJobs, setInsightsJobs] = useState<any[]>([])
  const [uploadedCallIds, setUploadedCallIds] = useState<string[]>([])

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

  // Calculate estimated cost when audio files change
  useEffect(() => {
    if (audioFiles.length > 0) {
      // Estimate: average 2 minutes per call, $0.006 per minute for transcription
      const estimatedMinutes = audioFiles.length * 2
      const cost = estimatedMinutes * 0.006
      setEstimatedCost(cost)
    } else {
      setEstimatedCost(0)
    }
  }, [audioFiles])

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

    if (!user) {
      setError('Please sign in to upload files')
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
        
        // Build detailed error message
        let errorMessage = errorData.message || 'Failed to process CSV'
        
        if (errorData.errors && errorData.errors.length > 0) {
          errorMessage += '\n\nValidation Errors:'
          errorData.errors.forEach((error: any, index: number) => {
            errorMessage += `\n${index + 1}. Row ${error.row}, Column "${error.column}": ${error.message}`
            if (error.value) {
              errorMessage += ` (Found: "${error.value}")`
            }
          })
        }
        
        if (errorData.warnings && errorData.warnings.length > 0) {
          errorMessage += '\n\nWarnings:'
          errorData.warnings.forEach((warning: any, index: number) => {
            errorMessage += `\n${index + 1}. Row ${warning.row}, Column "${warning.column}": ${warning.message}`
          })
        }
        
        throw new Error(errorMessage)
      }

      const csvResult = await csvResponse.json()
      setUploadProgress(10)
      setUploadStatus('CSV processed successfully')

      // Now upload audio files directly to Supabase
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

          // Upload file directly to Supabase and create database record
          const uploadResult = await uploadFileAndCreateRecord(
            file,
            user.id,
            csvRow,
            (progress) => {
              // Update progress for this specific file
              const fileProgress = Math.round(progressBase + (progress.percentage / 100) * (80 / totalFiles))
              setUploadProgress(fileProgress)
              setUploadStatus(`Uploading ${file.name}... ${progress.percentage}% (${i + 1}/${totalFiles})`)
            }
          )

          if (uploadResult.success && uploadResult.callId) {
            uploadedFiles.push(uploadResult.callId)
          } else {
            uploadErrors.push(`Failed to upload "${file.name}": ${uploadResult.error}`)
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

      // Store uploaded call IDs for auto-processing
      if (result.success && result.callsCreated && result.callsCreated.length > 0) {
        setUploadedCallIds(result.callsCreated)
        
        // If auto-process is enabled, show confirmation dialog
        if (autoProcess) {
          setShowProcessConfirm(true)
        } else {
          // Otherwise redirect to library after a short delay
          setTimeout(() => {
            router.push('/library-enhanced')
          }, 2000)
        }
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

  // Handle auto-process confirmation
  const handleProcessConfirm = async () => {
    setShowProcessConfirm(false)
    await startProcessing()
  }

  const handleProcessCancel = () => {
    setShowProcessConfirm(false)
    // Redirect to library
    setTimeout(() => {
      router.push('/library-enhanced')
    }, 1000)
  }

  // Start processing uploaded calls
  const startProcessing = async () => {
    if (!user || uploadedCallIds.length === 0) return

    setIsProcessing(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Session expired. Please sign in again.')
        return
      }

      // Fetch the uploaded calls with their details
      const { data: calls, error: fetchError } = await supabase
        .from('calls')
        .select('id, filename, call_duration_seconds, transcript:transcripts(transcription_status)')
        .in('id', uploadedCallIds)

      if (fetchError || !calls) {
        console.error('Failed to fetch uploaded calls:', fetchError)
        alert('Failed to fetch uploaded calls for processing')
        return
      }

      // Step 1: Queue transcriptions
      const transcriptionJobs: any[] = []
      const callsNeedingTranscription = calls.filter(c => 
        !c.transcript || c.transcript.transcription_status !== 'completed'
      )

      for (const call of callsNeedingTranscription) {
        try {
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ callId: call.id }),
          })

          if (response.ok) {
            const result = await response.json()
            transcriptionJobs.push({
              id: result.jobId,
              callId: call.id,
              filename: call.filename,
              status: 'pending'
            })
          }

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`Failed to queue transcription for ${call.filename}:`, error)
        }
      }

      if (transcriptionJobs.length > 0) {
        setTranscriptionJobs(transcriptionJobs)
        setShowTranscriptionProgress(true)
      }

      // Step 2: Set up polling to auto-trigger insights after transcriptions complete
      if (transcriptionJobs.length > 0) {
        const insightJobs: any[] = []
        
        const pollInterval = setInterval(async () => {
          try {
            const { data: transcriptsData } = await supabase
              .from('transcripts')
              .select('id, call_id, transcription_status')
              .in('call_id', transcriptionJobs.map(j => j.callId))

            const completedTranscripts = transcriptsData?.filter(t => t.transcription_status === 'completed') || []
            
            // Trigger insights for completed transcriptions
            for (const transcript of completedTranscripts) {
              const alreadyQueued = insightJobs.some(j => j.callId === transcript.call_id)
              if (!alreadyQueued) {
                // Check if insights already exist
                const { data: existingInsights } = await supabase
                  .from('insights')
                  .select('id')
                  .eq('call_id', transcript.call_id)
                  .maybeSingle()

                if (!existingInsights) {
                  const response = await fetch('/api/insights/generate', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ callId: transcript.call_id }),
                  })

                  if (response.ok) {
                    const result = await response.json()
                    const call = transcriptionJobs.find(j => j.callId === transcript.call_id)
                    insightJobs.push({
                      id: result.jobId || transcript.call_id,
                      callId: transcript.call_id,
                      filename: call?.filename || 'Unknown',
                      status: 'processing',
                      cached: false,
                    })
                    
                    setInsightsJobs([...insightJobs])
                    setShowInsightsProgress(true)
                  }
                }
              }
            }

            // Stop polling when all done
            if (completedTranscripts.length === transcriptionJobs.length) {
              clearInterval(pollInterval)
              setIsProcessing(false)
            }
          } catch (error) {
            console.error('Error polling transcriptions:', error)
          }
        }, 10000) // Poll every 10 seconds

        // Safety timeout: 30 minutes
        setTimeout(() => {
          clearInterval(pollInterval)
          setIsProcessing(false)
        }, 30 * 60 * 1000)
      } else {
        setIsProcessing(false)
      }

    } catch (error) {
      console.error('Processing error:', error)
      alert(`Failed to start processing: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsProcessing(false)
    }
  }

  // Handle progress window events
  const handleTranscriptionComplete = () => {
    setShowTranscriptionProgress(false)
    setTranscriptionJobs([])
  }

  const handleTranscriptionCancel = () => {
    setShowTranscriptionProgress(false)
    setTranscriptionJobs([])
  }

  const handleInsightsComplete = () => {
    setShowInsightsProgress(false)
    setInsightsJobs([])
  }

  const handleInsightsCancel = () => {
    setShowInsightsProgress(false)
    setInsightsJobs([])
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
            <div className="font-semibold text-red-900 mb-2">Error</div>
            <div className="text-red-800 whitespace-pre-line text-sm font-mono bg-red-100 p-3 rounded border">
              {error}
            </div>
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

              {uploadResult.success && !autoProcess && (
                <p className="mt-3 text-sm font-medium">
                  Redirecting to library...
                </p>
              )}
              
              {uploadResult.success && autoProcess && (
                <p className="mt-3 text-sm font-medium text-purple-700">
                  ⚡ Preparing to process {uploadedCallIds.length} call{uploadedCallIds.length !== 1 ? 's' : ''}...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Auto-Process Checkbox */}
        {audioFiles.length > 0 && !isUploading && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4">
            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={autoProcess}
                onChange={(e) => setAutoProcess(e.target.checked)}
                className="mt-1 h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded cursor-pointer"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    Auto-process after upload
                  </span>
                  <span className="text-sm px-2 py-0.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full">
                    ⚡ Transcribe + AI Insights
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-700">
                  Automatically transcribe and generate AI insights for all uploaded calls
                </p>
                
                {autoProcess && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      📊 Estimated costs:
                    </p>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• {audioFiles.length} transcription{audioFiles.length !== 1 ? 's' : ''}: ~${estimatedCost.toFixed(4)}</li>
                      <li>• {audioFiles.length} AI insights: Included (GPT-4o-mini)</li>
                      <li className="pt-2 border-t border-gray-200 font-semibold text-blue-700">
                        Total estimate: ~${estimatedCost.toFixed(4)}
                      </li>
                    </ul>
                    <p className="mt-2 text-xs text-gray-500">
                      * Based on average 2 min per call. Jobs run in background.
                    </p>
                  </div>
                )}
              </div>
            </label>
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
                : autoProcess
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isUploading ? 'Uploading...' : autoProcess ? '⚡ Upload and Process' : 'Upload Files'}
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

      {/* Confirmation Dialog */}
      {showProcessConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Ready to Process?</h3>
            </div>

            <div className="mb-6 space-y-3">
              <p className="text-gray-700">
                Process <span className="font-semibold text-blue-600">{uploadedCallIds.length} uploaded call{uploadedCallIds.length !== 1 ? 's' : ''}</span>?
              </p>
              
              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Transcriptions:</span>
                  <span className="font-semibold text-gray-900">{uploadedCallIds.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">AI Insights:</span>
                  <span className="font-semibold text-gray-900">{uploadedCallIds.length}</span>
                </div>
                <div className="border-t border-blue-200 pt-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Estimated cost:</span>
                    <span className="text-lg font-bold text-blue-600">~${estimatedCost.toFixed(4)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    (Insights included with GPT-4o-mini)
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ <span className="font-semibold">Processing will start immediately</span> and continue in the background. This may take several minutes.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleProcessCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Skip Processing
              </button>
              <button
                onClick={handleProcessConfirm}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium shadow-lg transition-all"
              >
                ⚡ Yes, Process All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transcription Progress */}
      {showTranscriptionProgress && (
        <BulkTranscriptionProgress
          jobs={transcriptionJobs}
          onComplete={handleTranscriptionComplete}
          onCancel={handleTranscriptionCancel}
        />
      )}

      {/* Insights Progress */}
      {showInsightsProgress && (
        <BulkInsightsProgress
          jobs={insightsJobs}
          onComplete={handleInsightsComplete}
          onCancel={handleInsightsCancel}
        />
      )}
    </div>
  )
}

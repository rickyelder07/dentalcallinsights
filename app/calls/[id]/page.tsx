'use client'

/**
 * Call Detail Page
 * Display individual call with audio player, transcript, editing capabilities, and AI insights
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { formatCallTime } from '@/lib/datetime'
import { createSignedUrl, extractStorageFilename } from '@/lib/storage'
import { formatExtension } from '@/lib/extension-names'
import AudioPlayer from '@/app/components/AudioPlayer'
import TranscriptViewer from '@/app/components/TranscriptViewer'
import TranscriptEditor from '@/app/components/TranscriptEditor'
import TranscriptionStatus from '@/app/components/TranscriptionStatus'
import InsightsPanel from '@/app/components/InsightsPanel'
import type { Call } from '@/types/upload'
import type { Transcript } from '@/types/transcript'

export default function CallDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const callId = params.id // Extract id immediately
  const [call, setCall] = useState<Call | null>(null)
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'transcript' | 'insights'>('transcript')
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<string>('') // Empty = auto-detect

  // Fetch call and transcript data
  useEffect(() => {
    if (callId) {
      fetchCallData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId])

  const fetchCallData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get user session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // Fetch call details
      // RLS policies will automatically filter to ensure user can only access
      // their own calls or calls from team members
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .select('id, user_id, filename, audio_path, file_size, file_type, upload_status, call_time, call_direction, source_number, source_name, source_extension, destination_number, destination_extension, call_duration_seconds, disposition, time_to_answer_seconds, call_flow, is_new_patient, processing_status, error_message, created_at, updated_at')
        .eq('id', callId)
        .single()

      if (callError || !callData) {
        setError('Call not found')
        return
      }

      setCall(callData)

      // Fetch transcript if exists
      const { data: transcriptData } = await supabase
        .from('transcripts')
        .select('id, call_id, content, transcript, raw_transcript, edited_transcript, transcription_status, confidence_score, language_code, language, processing_time_seconds, processing_duration_seconds, timestamps, edit_count, error_message, created_at, updated_at')
        .eq('call_id', callId)
        .single()

      if (transcriptData) {
        setTranscript(transcriptData)
      }

      // Get signed URL for audio file
      // Extract filename from audio_path (which contains {user_id}/{original_filename})
      // The filename field may have been updated to new format, but storage file still has original name
      const storageFilename = extractStorageFilename(callData.audio_path) || callData.filename
      
      const signedUrlResult = await createSignedUrl(
        callData.user_id,
        storageFilename,
        3600
      )

      if (signedUrlResult.url) {
        setAudioUrl(signedUrlResult.url)
      } else {
        console.error('Failed to create signed URL:', signedUrlResult.error)
        console.error('Attempted path:', `${callData.user_id}/${storageFilename}`)
        console.error('Audio path:', callData.audio_path)
        console.error('Display filename:', callData.filename)
        setError('Failed to load audio file')
      }
    } catch (err) {
      console.error('Error fetching call data:', err)
      setError('Failed to load call details')
    } finally {
      setIsLoading(false)
    }
  }

  // Start transcription
  const handleStartTranscription = async () => {
    try {
      setIsTranscribing(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          callId: callId,
          language: transcriptionLanguage || undefined, // Empty string = auto-detect
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start transcription')
      }

      // Poll for status
      pollTranscriptionStatus()
    } catch (err) {
      console.error('Error starting transcription:', err)
      setError(err instanceof Error ? err.message : 'Failed to start transcription')
      setIsTranscribing(false)
    }
  }

  // Poll transcription status
  const pollTranscriptionStatus = async () => {
    const pollInterval = setInterval(async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) return

        const response = await fetch(
          `/api/transcribe/status?callId=${callId}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()

          if (data.status === 'completed') {
            clearInterval(pollInterval)
            setIsTranscribing(false)
            await fetchCallData() // Refresh data
          } else if (data.status === 'failed') {
            clearInterval(pollInterval)
            setIsTranscribing(false)
            setError(data.errorMessage || 'Transcription failed')
          }
        }
      } catch (err) {
        console.error('Error polling transcription status:', err)
      }
    }, 3000) // Poll every 3 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval)
      setIsTranscribing(false)
    }, 5 * 60 * 1000)
  }

  // Save edited transcript
  const handleSaveTranscript = async (editedText: string) => {
    if (!transcript) return

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('Not authenticated')
    }

    const response = await fetch(`/api/transcripts/${transcript.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        transcriptId: transcript.id,
        edited_transcript: editedText,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save transcript')
    }

    // Refresh transcript data
    await fetchCallData()
  }

  // Re-apply user's transcription corrections
  const handleRetranscribe = async () => {
    if (!call) return

    const confirmed = window.confirm(
      'Re-transcribe this call?\n\n' +
      'This will generate a new transcript from the audio file. ' +
      'The existing transcript will be replaced.\n\n' +
      'Note: This process may take a few minutes depending on call length.'
    )

    if (!confirmed) return

    try {
      setIsTranscribing(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      // Call the transcribe API with forceRetranscribe flag
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          callId: callId,
          forceRetranscribe: true,
          language: transcriptionLanguage || undefined, // Empty string = auto-detect
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start re-transcription')
      }

      // Start polling for status
      pollTranscriptionStatus()
      
      // Show success message
      alert('Re-transcription started! The page will refresh when complete.')
    } catch (err) {
      console.error('Error starting re-transcription:', err)
      setError(err instanceof Error ? err.message : 'Failed to start re-transcription')
      setIsTranscribing(false)
    }
  }

  // Format date
  const formatDate = (dateString: string) => formatCallTime(dateString)

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <svg
              className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
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
            <p className="text-gray-600">Loading call details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !call) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => router.push('/library-enhanced')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Library
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/library-enhanced')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Library
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{call?.filename}</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          {call?.call_time && <span>📅 {formatDate(call.call_time)}</span>}
          {call?.call_direction && <span>📞 {call.call_direction}</span>}
          {call?.is_new_patient && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold text-xs">
              🆕 New Patient
            </span>
          )}
          {call?.call_duration_seconds && (
            <span>⏱️ {Math.floor(call.call_duration_seconds / 60)}m {call.call_duration_seconds % 60}s</span>
          )}
          {transcript?.language && (
            <span>
              {transcript.language === 'en' && '🇺🇸 English'}
              {transcript.language === 'es' && '🇪🇸 Spanish'}
              {transcript.language !== 'en' && transcript.language !== 'es' && `🌐 ${transcript.language.toUpperCase()}`}
            </span>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Audio Player */}
      {audioUrl && (
        <div className="mb-6">
          <AudioPlayer
            src={audioUrl}
            onTimeUpdate={setCurrentTime}
            timestamps={transcript?.timestamps}
          />
        </div>
      )}

      {/* Tabs */}
      {transcript && transcript.transcription_status === 'completed' && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('transcript')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'transcript'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📝 Transcript
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'insights'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🤖 AI Insights
            </button>
          </nav>
        </div>
      )}

      {/* Content Section */}
      <div className="space-y-6">
        {/* No transcript yet */}
        {!transcript && !isTranscribing && (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="max-w-md mx-auto">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Transcript Yet
              </h3>
              <p className="text-gray-600 mb-4">
                Transcribe this audio file to view and edit the transcript
              </p>
              <div className="flex flex-col gap-3 items-center">
                {/* Language Selector */}
                <div className="flex items-center gap-2">
                  <label htmlFor="start-transcription-language" className="text-sm text-gray-600">
                    Language:
                  </label>
                  <select
                    id="start-transcription-language"
                    value={transcriptionLanguage}
                    onChange={(e) => setTranscriptionLanguage(e.target.value)}
                    disabled={isTranscribing}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Select language for transcription (empty = auto-detect)"
                  >
                    <option value="">Auto-detect</option>
                    <option value="es">Spanish (Español)</option>
                    <option value="en">English</option>
                    <option value="fr">French (Français)</option>
                    <option value="de">German (Deutsch)</option>
                    <option value="it">Italian (Italiano)</option>
                    <option value="pt">Portuguese (Português)</option>
                  </select>
                </div>
                <button
                  onClick={handleStartTranscription}
                  disabled={isTranscribing}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTranscribing ? '⏳ Transcribing...' : 'Start Transcription'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transcription Status */}
        {(isTranscribing || transcript?.transcription_status === 'processing') && (
          <TranscriptionStatus
            callId={callId}
            status={transcript?.transcription_status || 'processing'}
            progress={50}
            onComplete={() => fetchCallData()}
          />
        )}

        {/* Transcript Tab */}
        {transcript && transcript.transcription_status === 'completed' && activeTab === 'transcript' && (
          <>
            {/* Toggle between view and edit */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Transcript</h2>
              <div className="flex gap-2 items-center">
                {/* Language Selector */}
                <div className="flex items-center gap-2">
                  <label htmlFor="transcription-language" className="text-sm text-gray-600">
                    Language:
                  </label>
                  <select
                    id="transcription-language"
                    value={transcriptionLanguage}
                    onChange={(e) => setTranscriptionLanguage(e.target.value)}
                    disabled={isTranscribing}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Select language for transcription (empty = auto-detect)"
                  >
                    <option value="">Auto-detect</option>
                    <option value="es">Spanish (Español)</option>
                    <option value="en">English</option>
                    <option value="fr">French (Français)</option>
                    <option value="de">German (Deutsch)</option>
                    <option value="it">Italian (Italiano)</option>
                    <option value="pt">Portuguese (Português)</option>
                  </select>
                </div>
                <button
                  onClick={handleRetranscribe}
                  disabled={isTranscribing}
                  className="px-4 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generate a new transcript from the audio file"
                >
                  {isTranscribing ? '⏳ Re-Transcribing...' : '🔄 Re-Transcribe'}
                </button>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  {isEditing ? '👁️ View Mode' : '✏️ Edit Mode'}
                </button>
              </div>
            </div>

            {isEditing ? (
              <TranscriptEditor
                transcript={transcript}
                onSave={handleSaveTranscript}
              />
            ) : (
              <TranscriptViewer
                transcript={transcript}
                currentTime={currentTime}
                onSeek={(time) => {
                  // Implement seek functionality
                  console.log('Seek to:', time)
                }}
              />
            )}
          </>
        )}

        {/* Insights Tab */}
        {transcript && transcript.transcription_status === 'completed' && activeTab === 'insights' && (
          <InsightsPanel 
            callId={callId} 
            callDuration={call?.call_duration_seconds}
            onInsightsGenerated={(insights) => {
              // Insights generated - could trigger a refresh of parent pages
              console.log('Insights generated for call:', callId)
            }}
          />
        )}

        {/* Failed transcription */}
        {transcript && transcript.transcription_status === 'failed' && (
          <div>
            <TranscriptionStatus
              callId={callId}
              status="failed"
              errorMessage={transcript.error_message}
            />
            <div className="mt-4 text-center">
              <button
                onClick={handleStartTranscription}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Retry Transcription
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Call Metadata */}
      {call && (
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Call Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {call.source_number && (
              <div>
                <span className="text-gray-600">From:</span>
                <span className="ml-2 text-gray-900">{call.source_number}</span>
                {call.source_extension && (
                  <span className="ml-1 text-gray-600">({formatExtension(call.source_extension)})</span>
                )}
                {call.source_name && (
                  <span className="ml-1 text-gray-600">({call.source_name})</span>
                )}
              </div>
            )}
            {call.destination_number && (
              <div>
                <span className="text-gray-600">To:</span>
                <span className="ml-2 text-gray-900">{call.destination_number}</span>
              </div>
            )}
            {call.disposition && (
              <div>
                <span className="text-gray-600">Disposition:</span>
                <span className="ml-2 text-gray-900">{call.disposition}</span>
              </div>
            )}
            {call.time_to_answer_seconds !== undefined && (
              <div>
                <span className="text-gray-600">Time to Answer:</span>
                <span className="ml-2 text-gray-900">{call.time_to_answer_seconds}s</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


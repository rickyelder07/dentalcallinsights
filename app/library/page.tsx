'use client'

/**
 * Call Library Page
 * Browse, search, and filter all call recordings with transcription status
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import type { Call } from '@/types/upload'
import type { Transcript } from '@/types/transcript'

interface CallWithTranscript extends Call {
  transcript?: Transcript | null
}

export default function LibraryPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [calls, setCalls] = useState<CallWithTranscript[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const [selectedCalls, setSelectedCalls] = useState<Set<string>>(new Set())
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionProgress, setTranscriptionProgress] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchCalls()
  }, [])

  const fetchCalls = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      console.log('Fetching calls for user:', session.user.id)

      // Fetch calls first
      const { data: callsData, error: fetchError } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      console.log('Calls query result:', { data: callsData, error: fetchError })

      if (fetchError) {
        console.error('Supabase error:', fetchError)
        setError(`Database error: ${fetchError.message}`)
        return
      }

      if (!callsData || callsData.length === 0) {
        console.log('No calls found for user')
        setCalls([])
        return
      }

      // Fetch transcripts separately
      const callIds = callsData.map((call: any) => call.id)
      const { data: transcriptsData } = await supabase
        .from('transcripts')
        .select('*')
        .in('call_id', callIds)

      console.log('Transcripts query result:', transcriptsData)

      // Transform data - match transcripts to calls
      const transformedCalls: CallWithTranscript[] = callsData.map((call: any) => ({
        ...call,
        transcript: transcriptsData?.find((t: any) => t.call_id === call.id) || null,
      }))

      console.log('Transformed calls:', transformedCalls.length)
      setCalls(transformedCalls)
    } catch (error) {
      console.error('Error fetching calls:', error)
      setError(error instanceof Error ? error.message : 'Failed to load calls')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter calls
  const filteredCalls = calls.filter((call) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      call.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.source_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.destination_number?.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'transcribed' && call.transcript?.transcription_status === 'completed') ||
      (filterStatus === 'pending' && (!call.transcript || call.transcript.transcription_status === 'pending')) ||
      (filterStatus === 'processing' && call.transcript?.transcription_status === 'processing') ||
      (filterStatus === 'failed' && call.transcript?.transcription_status === 'failed')

    return matchesSearch && matchesStatus
  })

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Get status badge
  const getStatusBadge = (call: CallWithTranscript) => {
    if (!call.transcript) {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">No Transcript</span>
    }

    switch (call.transcript.transcription_status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">✓ Transcribed</span>
      case 'processing':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">⏳ Processing</span>
      case 'failed':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">✗ Failed</span>
      case 'pending':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">⋯ Pending</span>
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">Unknown</span>
    }
  }

  // Get language display
  const getLanguageDisplay = (transcript?: Transcript | null) => {
    if (!transcript || !transcript.language) return null
    
    const languageNames: Record<string, string> = {
      'en': '🇺🇸 English',
      'es': '🇪🇸 Spanish',
      'fr': '🇫🇷 French',
      'de': '🇩🇪 German',
      'pt': '🇵🇹 Portuguese',
      'it': '🇮🇹 Italian',
      'zh': '🇨🇳 Chinese',
      'ja': '🇯🇵 Japanese',
    }

    const displayName = languageNames[transcript.language] || `${transcript.language.toUpperCase()}`
    
    return (
      <span className="text-xs text-gray-600">
        {displayName}
      </span>
    )
  }

  // Toggle call selection
  const toggleCallSelection = (callId: string) => {
    const newSelected = new Set(selectedCalls)
    if (newSelected.has(callId)) {
      newSelected.delete(callId)
    } else {
      newSelected.add(callId)
    }
    setSelectedCalls(newSelected)
  }

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedCalls.size === filteredCalls.length) {
      setSelectedCalls(new Set())
    } else {
      setSelectedCalls(new Set(filteredCalls.map((c) => c.id)))
    }
  }

  // Check if call can be transcribed
  const canTranscribe = (call: CallWithTranscript) => {
    return !call.transcript || 
           call.transcript.transcription_status === 'failed' || 
           call.transcript.transcription_status === 'pending'
  }

  // Bulk transcribe selected calls
  const handleBulkTranscribe = async () => {
    const callsToTranscribe = filteredCalls.filter((c) => 
      selectedCalls.has(c.id) && canTranscribe(c)
    )

    if (callsToTranscribe.length === 0) {
      alert('Please select calls that need transcription')
      return
    }

    if (!confirm(`Start transcription for ${callsToTranscribe.length} call(s)?`)) {
      return
    }

    setIsTranscribing(true)
    const progress: Record<string, string> = {}

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      for (const call of callsToTranscribe) {
        try {
          progress[call.id] = 'starting'
          setTranscriptionProgress({ ...progress })

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              callId: call.id,
              // No language specified - Whisper will auto-detect
            }),
          })

          if (response.ok) {
            progress[call.id] = 'processing'
          } else {
            const errorData = await response.json()
            progress[call.id] = `error: ${errorData.error || 'Failed'}`
          }
          setTranscriptionProgress({ ...progress })
        } catch (error) {
          progress[call.id] = 'error'
          setTranscriptionProgress({ ...progress })
        }
      }

      // Clear selection and refresh
      setSelectedCalls(new Set())
      setTimeout(() => {
        fetchCalls()
        setTranscriptionProgress({})
      }, 2000)
    } catch (error) {
      console.error('Bulk transcription error:', error)
      setError('Failed to start bulk transcription')
    } finally {
      setIsTranscribing(false)
    }
  }

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
            <p className="text-gray-600">Loading calls...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Call Library</h1>
        <p className="text-gray-600">
          Browse, search, and transcribe your call recordings.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading calls</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={() => fetchCalls()}
                className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-6 space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
          {/* Search */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search calls..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Calls</option>
            <option value="transcribed">Transcribed</option>
            <option value="pending">Not Transcribed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedCalls.size > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedCalls.size} call{selectedCalls.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedCalls(new Set())}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear
              </button>
            </div>
            <button
              onClick={handleBulkTranscribe}
              disabled={isTranscribing}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isTranscribing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isTranscribing ? 'Starting...' : 'Transcribe Selected'}
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{calls.length}</div>
          <div className="text-sm text-gray-600">Total Calls</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {calls.filter((c) => c.transcript?.transcription_status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Transcribed</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {calls.filter((c) => c.transcript?.transcription_status === 'processing').length}
          </div>
          <div className="text-sm text-gray-600">Processing</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-600">
            {calls.filter((c) => !c.transcript || c.transcript.transcription_status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
      </div>

      {/* Calls Table */}
      {filteredCalls.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <p className="text-gray-500">
            {calls.length === 0
              ? 'No calls yet. Upload your first call recording!'
              : 'No calls match your search or filter.'}
          </p>
          {calls.length === 0 && (
            <button
              onClick={() => router.push('/upload')}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Upload Calls
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedCalls.size === filteredCalls.length && filteredCalls.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Language
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCalls.map((call) => (
                  <tr
                    key={call.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedCalls.has(call.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCalls.has(call.id)}
                        onChange={() => toggleCallSelection(call.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <button
                          onClick={() => router.push(`/calls/${call.id}`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 text-left"
                        >
                          {call.filename}
                        </button>
                        {transcriptionProgress[call.id] && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({transcriptionProgress[call.id]})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {call.call_time ? formatDate(call.call_time) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {call.call_direction || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        {call.source_number || '-'}
                        {call.source_name && (
                          <div className="text-xs text-gray-500">{call.source_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {call.destination_number || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {call.call_duration_seconds
                        ? `${Math.floor(call.call_duration_seconds / 60)}:${(call.call_duration_seconds % 60).toString().padStart(2, '0')}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getLanguageDisplay(call.transcript)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(call)}</td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => router.push(`/calls/${call.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {filteredCalls.length} of {calls.length} call{calls.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


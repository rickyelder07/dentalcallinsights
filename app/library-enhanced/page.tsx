'use client'

/**
 * Enhanced Call Library Page (Milestone 7)
 * Advanced call management with filtering, bulk operations, and export
 * This is the new enhanced version - can replace the original library/page.tsx
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import CallCard from '../components/CallCard'
import CallList from '../components/CallList'
import BulkActions from '../components/BulkActions'
import ExportModal from '../components/ExportModal'
import CallScoringPanel from '../components/CallScoringPanel'
import type { Call } from '@/types/upload'
import type { Transcript } from '@/types/transcript'
import type { FilterConfig } from '@/types/filters'
import { applyFilters, applySorting, getPredefinedFilterPresets, getFilterSummary } from '@/lib/filters'

interface CallWithTranscript extends Call {
  transcript?: Transcript | null
  insights?: any
  hasEmbeddings?: boolean
  qaScore?: any
}

export default function EnhancedLibraryPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  
  const [calls, setCalls] = useState<CallWithTranscript[]>([])
  const [filteredCalls, setFilteredCalls] = useState<CallWithTranscript[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Selection state
  const [selectedCalls, setSelectedCalls] = useState<Set<string>>(new Set())
  
  // Filter state
  const [filters, setFilters] = useState<FilterConfig>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')
  
  // Additional filter states
  const [dateRangeStart, setDateRangeStart] = useState<string>('')
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('')
  const [durationMin, setDurationMin] = useState<string>('')
  const [durationMax, setDurationMax] = useState<string>('')
  const [directionFilter, setDirectionFilter] = useState<string>('all')
  const [sourceNumberFilter, setSourceNumberFilter] = useState<string>('')
  
  // Modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [scoringCall, setScoringCall] = useState<CallWithTranscript | null>(null)
  
  // Bulk operation progress
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<string>('')
  
  // UI state
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchCalls()
  }, [])

  // Refresh calls when returning from other pages (e.g., after generating insights)
  useEffect(() => {
    const handleFocus = () => {
      fetchCalls()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  useEffect(() => {
    applyAllFilters()
  }, [calls, filters, searchQuery, statusFilter, sentimentFilter, dateRangeStart, dateRangeEnd, durationMin, durationMax, directionFilter, sourceNumberFilter])

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

      // Fetch calls with related data including QA scores
      const { data: callsData, error: fetchError } = await supabase
        .from('calls')
        .select(`
          id, user_id, filename, audio_path, file_size, file_type, upload_status, call_time, call_direction, source_number, source_name, source_extension, destination_number, destination_extension, call_duration_seconds, disposition, time_to_answer_seconds, call_flow, processing_status, error_message, created_at, updated_at,
          transcript:transcripts(id, call_id, content, transcript, raw_transcript, edited_transcript, transcription_status, confidence_score, language_code, language, processing_time_seconds, processing_duration_seconds, timestamps, edit_count, error_message, created_at, updated_at),
          insights:insights(*),
          qaScore:call_scores(*)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Supabase error:', fetchError)
        setError(`Database error: ${fetchError.message}`)
        return
      }

      if (!callsData || callsData.length === 0) {
        setCalls([])
        return
      }

      // Fetch embeddings presence
      const callIds = callsData.map((call: any) => call.id)
      const { data: embeddingRows } = await supabase
        .from('embeddings')
        .select('call_id')
        .in('call_id', callIds)
      
      const callIdToHasEmbeddings = new Set<string>((embeddingRows || []).map((r: any) => r.call_id))

      // Transform data
      const transformedCalls: CallWithTranscript[] = callsData.map((call: any) => ({
        ...call,
        transcript: call.transcript || null,
        insights: Array.isArray(call.insights) && call.insights.length > 0 ? call.insights[0] : null,
        hasEmbeddings: callIdToHasEmbeddings.has(call.id),
        qaScore: Array.isArray(call.qaScore) && call.qaScore.length > 0 ? call.qaScore[0] : null,
      }))

      setCalls(transformedCalls)
    } catch (error) {
      console.error('Error fetching calls:', error)
      setError(error instanceof Error ? error.message : 'Failed to load calls')
    } finally {
      setIsLoading(false)
    }
  }

  const applyAllFilters = () => {
    let filtered = calls

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((call) => {
        if (statusFilter === 'transcribed') {
          return call.transcript?.transcription_status === 'completed'
        } else if (statusFilter === 'pending') {
          return !call.transcript || call.transcript.transcription_status === 'pending'
        } else if (statusFilter === 'processing') {
          return call.transcript?.transcription_status === 'processing'
        } else if (statusFilter === 'failed') {
          return call.transcript?.transcription_status === 'failed'
        }
        return true
      })
    }

    // Apply sentiment filter
    if (sentimentFilter !== 'all') {
      filtered = filtered.filter((call) => {
        return call.insights?.overall_sentiment === sentimentFilter
      })
    }

    // Apply date range filter
    if (dateRangeStart) {
      filtered = filtered.filter((call) => {
        if (!call.call_time) return false
        return new Date(call.call_time) >= new Date(dateRangeStart)
      })
    }
    if (dateRangeEnd) {
      filtered = filtered.filter((call) => {
        if (!call.call_time) return false
        const endDate = new Date(dateRangeEnd)
        endDate.setHours(23, 59, 59, 999) // Include entire end date
        return new Date(call.call_time) <= endDate
      })
    }

    // Apply duration filter
    if (durationMin) {
      const minSeconds = parseInt(durationMin) // Duration is now in seconds
      filtered = filtered.filter((call) => {
        return (call.call_duration_seconds || 0) >= minSeconds
      })
    }
    if (durationMax) {
      const maxSeconds = parseInt(durationMax) // Duration is now in seconds
      filtered = filtered.filter((call) => {
        return (call.call_duration_seconds || 0) <= maxSeconds
      })
    }

    // Apply direction filter
    if (directionFilter !== 'all') {
      filtered = filtered.filter((call) => {
        return call.call_direction === directionFilter
      })
    }


    // Apply source number filter
    if (sourceNumberFilter) {
      const query = sourceNumberFilter.toLowerCase()
      filtered = filtered.filter((call) => {
        return call.source_number?.toLowerCase().includes(query)
      })
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((call) => {
        return (
          call.filename?.toLowerCase().includes(query) ||
          call.source_number?.toLowerCase().includes(query) ||
          call.destination_number?.toLowerCase().includes(query) ||
          call.disposition?.toLowerCase().includes(query)
        )
      })
    }

    // Apply advanced filters
    if (Object.keys(filters).length > 0) {
      filtered = applyFilters(filtered, filters)
    }

    setFilteredCalls(filtered)
  }

  // Selection handlers
  const toggleCallSelection = (callId: string) => {
    const newSelected = new Set(selectedCalls)
    if (newSelected.has(callId)) {
      newSelected.delete(callId)
    } else {
      newSelected.add(callId)
    }
    setSelectedCalls(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedCalls.size === filteredCalls.length) {
      setSelectedCalls(new Set())
    } else {
      setSelectedCalls(new Set(filteredCalls.map((c) => c.id)))
    }
  }

  const clearSelection = () => {
    setSelectedCalls(new Set())
  }

  // Bulk operations
  const handleBulkTranscribe = async () => {
    const callsToTranscribe = filteredCalls.filter((c) => 
      selectedCalls.has(c.id) && 
      (!c.transcript || c.transcript.transcription_status !== 'completed')
    )

    if (callsToTranscribe.length === 0) {
      alert('No calls selected for transcription')
      return
    }

    const totalSeconds = callsToTranscribe.reduce((sum, c) => sum + (c.call_duration_seconds || 0), 0)
    const totalMinutes = totalSeconds / 60
    const estCost = totalMinutes * 0.006

    if (!confirm(
      `Transcribe ${callsToTranscribe.length} call(s)?\n\n` +
      `Estimated cost: $${estCost.toFixed(4)}`
    )) {
      return
    }

    setIsProcessing(true)
    setProcessingStatus('Starting bulk transcription...')
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Please sign in to transcribe calls')
        return
      }

      // Process calls sequentially to avoid overwhelming the API
      for (let i = 0; i < callsToTranscribe.length; i++) {
        const call = callsToTranscribe[i]
        
        try {
          setProcessingStatus(`Processing call ${i + 1}/${callsToTranscribe.length}: ${call.filename}`)
          console.log(`Starting transcription for call ${i + 1}/${callsToTranscribe.length}: ${call.filename}`)
          
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ callId: call.id }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || `HTTP ${response.status}`)
          }

          const result = await response.json()
          console.log(`Transcription started for ${call.filename}:`, result)
          results.success++

          // Small delay between requests to avoid overwhelming the API
          if (i < callsToTranscribe.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

        } catch (error) {
          console.error(`Failed to start transcription for ${call.filename}:`, error)
          results.failed++
          results.errors.push(`${call.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Show results
      let message = `Transcription started for ${results.success} call(s)`
      if (results.failed > 0) {
        message += `\n\nFailed to start ${results.failed} call(s):\n${results.errors.join('\n')}`
      }
      
      alert(message)
      clearSelection()
      
      // Refresh calls data after a short delay
      setTimeout(fetchCalls, 3000)

    } catch (error) {
      console.error('Bulk transcription error:', error)
      alert(`Failed to start bulk transcription: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
      setProcessingStatus('')
    }
  }

  const handleBulkGenerateInsights = async () => {
    const callsForInsights = filteredCalls.filter((c) => 
      selectedCalls.has(c.id) && 
      c.transcript?.transcription_status === 'completed'
    )

    if (callsForInsights.length === 0) {
      alert('No calls with completed transcripts selected')
      return
    }

    if (!confirm(`Generate AI insights for ${callsForInsights.length} call(s)?`)) {
      return
    }

    setIsProcessing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      for (const call of callsForInsights) {
        await fetch('/api/insights/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ callId: call.id }),
        })
      }

      alert('AI insights generation complete!')
      clearSelection()
      setTimeout(fetchCalls, 2000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkGenerateEmbeddings = async () => {
    const callsForEmbeddings = filteredCalls.filter((c) => 
      selectedCalls.has(c.id) && 
      c.transcript?.transcription_status === 'completed'
    )

    if (callsForEmbeddings.length === 0) {
      alert('No calls with completed transcripts selected')
      return
    }

    if (!confirm(`Generate embeddings for ${callsForEmbeddings.length} call(s)?`)) {
      return
    }

    setIsProcessing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      for (const call of callsForEmbeddings) {
        await fetch('/api/search/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ callId: call.id }),
        })
      }

      alert('Embeddings generation complete!')
      clearSelection()
      setTimeout(fetchCalls, 2000)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExport = () => {
    if (selectedCalls.size === 0) {
      alert('Please select calls to export')
      return
    }
    setShowExportModal(true)
  }

  const handleOpenScoring = (call: CallWithTranscript) => {
    // Only allow scoring for calls with transcripts
    if (!call.transcript || call.transcript.transcription_status !== 'completed') {
      alert('This call must have a completed transcript before it can be scored')
      return
    }
    setScoringCall(call)
  }

  const handleCloseScoring = () => {
    setScoringCall(null)
  }

  const handleScoringSaved = () => {
    // Reload calls to get updated QA scores
    fetchCalls()
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
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Call Library</h1>
            <p className="text-gray-600">
              Manage, filter, and analyze your call recordings
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchCalls}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Refresh
            </button>
            <button
              onClick={() => router.push('/qa')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              QA Dashboard
            </button>
            <button
              onClick={() => router.push('/analytics')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
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
          <div className="text-2xl font-bold text-purple-600">
            {calls.filter((c) => c.insights).length}
          </div>
          <div className="text-sm text-gray-600">With Insights</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-600">
            {calls.filter((c) => c.qaScore).length}
          </div>
          <div className="text-sm text-gray-600">QA Scored</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {filteredCalls.length}
          </div>
          <div className="text-sm text-gray-600">Filtered Results</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg">
        {/* Filters Header - Always Visible */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Filters Content - Collapsible */}
        {showFilters && (
          <div className="px-6 pb-6 border-t border-gray-200 pt-4">
        
        {/* Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by filename, phone numbers, or disposition..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Row 1: Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range - Start</label>
            <input
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range - End</label>
            <input
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Row 2: Duration Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration - Min (seconds)</label>
            <input
              type="number"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder="e.g., 120"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration - Max (seconds)</label>
            <input
              type="number"
              value={durationMax}
              onChange={(e) => setDurationMax(e.target.value)}
              placeholder="e.g., 600"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Row 3: Dropdown Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="transcribed">Transcribed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sentiment</label>
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sentiment</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="neutral">Neutral</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Direction</label>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Direction</option>
              <option value="Inbound">Inbound</option>
              <option value="Outbound">Outbound</option>
            </select>
          </div>
        </div>

        {/* Row 4: Source Number */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Source Number</label>
          <input
            type="text"
            value={sourceNumberFilter}
            onChange={(e) => setSourceNumberFilter(e.target.value)}
            placeholder="Enter source phone number..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Clear Filters Button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('all')
              setSentimentFilter('all')
              setDateRangeStart('')
              setDateRangeEnd('')
              setDurationMin('')
              setDurationMax('')
              setDirectionFilter('all')
              setSourceNumberFilter('')
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      <BulkActions
        selectedCalls={selectedCalls}
        calls={calls}
        onClearSelection={clearSelection}
        onBulkTranscribe={handleBulkTranscribe}
        onBulkGenerateInsights={handleBulkGenerateInsights}
        onBulkGenerateEmbeddings={handleBulkGenerateEmbeddings}
        onExport={handleExport}
      />

      {/* Processing Status */}
      {isProcessing && processingStatus && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="text-blue-800 font-medium">{processingStatus}</span>
          </div>
        </div>
      )}

      {/* Call List with QA Score Button */}
      <div className="mt-6">
        {/* Select All Button */}
        {filteredCalls.length > 0 && (
          <div className="mb-4 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <input
                  type="checkbox"
                  checked={selectedCalls.size === filteredCalls.length && filteredCalls.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                {selectedCalls.size === filteredCalls.length && filteredCalls.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-gray-600">
                {selectedCalls.size > 0 ? (
                  <span className="font-medium text-blue-600">
                    {selectedCalls.size} of {filteredCalls.length} selected
                  </span>
                ) : (
                  <span>{filteredCalls.length} calls</span>
                )}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {filteredCalls.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No calls match your filters</p>
            </div>
          ) : (
            filteredCalls.map((call) => (
              <div key={call.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedCalls.has(call.id)}
                    onChange={() => toggleCallSelection(call.id)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />

                  {/* Call Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => router.push(`/calls/${call.id}`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                        >
                          {call.filename}
                        </button>
                        <p className="text-xs text-gray-500 mt-1">
                          {call.call_time && new Date(call.call_time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      {call.call_direction && (
                        <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded whitespace-nowrap">
                          {call.call_direction}
                        </span>
                      )}
                    </div>

                    {/* Status badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {call.transcript?.transcription_status === 'completed' && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                          ✓ Transcribed
                        </span>
                      )}
                      {call.insights && (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                          🤖 AI Insights
                        </span>
                      )}
                      {call.qaScore && (
                        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                          ⭐ QA Score: {call.qaScore.total_score}/100
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/calls/${call.id}`)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details →
                      </button>
                      {call.transcript?.transcription_status === 'completed' && (
                        <button
                          onClick={() => handleOpenScoring(call)}
                          className="text-sm text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {call.qaScore ? 'Update QA Score' : 'Score Call'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedCallIds={Array.from(selectedCalls)}
        totalCalls={calls.length}
      />

      {/* QA Scoring Panel */}
      {scoringCall && (
        <CallScoringPanel
          call={scoringCall}
          onClose={handleCloseScoring}
          onSaved={handleScoringSaved}
        />
      )}
    </div>
  )
}


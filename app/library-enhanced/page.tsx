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
import type { Call } from '@/types/upload'
import type { Transcript } from '@/types/transcript'
import type { FilterConfig } from '@/types/filters'
import { applyFilters, applySorting, getPredefinedFilterPresets, getFilterSummary } from '@/lib/filters'

interface CallWithTranscript extends Call {
  transcript?: Transcript | null
  insights?: any
  hasEmbeddings?: boolean
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
  
  // Modal state
  const [showExportModal, setShowExportModal] = useState(false)
  
  // Bulk operation progress
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchCalls()
  }, [])

  useEffect(() => {
    applyAllFilters()
  }, [calls, filters, searchQuery, statusFilter, sentimentFilter])

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

      // Fetch calls with related data
      const { data: callsData, error: fetchError } = await supabase
        .from('calls')
        .select(`
          *,
          transcript:transcripts(*),
          insights:insights(*)
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
        insights: call.insights || null,
        hasEmbeddings: callIdToHasEmbeddings.has(call.id),
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

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((call) => {
        return (
          call.filename?.toLowerCase().includes(query) ||
          call.source_number?.toLowerCase().includes(query) ||
          call.destination_number?.toLowerCase().includes(query)
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
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      for (const call of callsToTranscribe) {
        await fetch('/api/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ callId: call.id }),
        })
      }

      alert('Transcription started for selected calls')
      clearSelection()
      setTimeout(fetchCalls, 2000)
    } finally {
      setIsProcessing(false)
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
          <button
            onClick={() => router.push('/analytics')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics Dashboard
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

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
          <div className="text-2xl font-bold text-purple-600">
            {calls.filter((c) => c.insights).length}
          </div>
          <div className="text-sm text-gray-600">With Insights</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {filteredCalls.length}
          </div>
          <div className="text-sm text-gray-600">Filtered Results</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search calls..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="transcribed">Transcribed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Sentiment</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
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

      {/* Call List */}
      <div className="mt-6">
        <CallList
          calls={filteredCalls}
          selectedCalls={selectedCalls}
          onSelectCall={toggleCallSelection}
          onSelectAll={toggleSelectAll}
          showCheckboxes={true}
          loading={isLoading}
          emptyMessage="No calls match your filters"
          pageSize={20}
          infiniteScroll={false}
        />
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedCallIds={Array.from(selectedCalls)}
        totalCalls={calls.length}
      />
    </div>
  )
}


'use client'

/**
 * Call Library Page
 * Browse, search, and filter all call recordings with transcription status
 * Now includes semantic search powered by vector embeddings
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import VectorSearch from '../components/VectorSearch'
import type { Call } from '@/types/upload'
import type { Transcript } from '@/types/transcript'

interface CallWithTranscript extends Call {
  transcript?: Transcript | null
  hasInsights?: boolean
  hasEmbeddings?: boolean
}

export default function LibraryPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [activeTab, setActiveTab] = useState<'browse' | 'search'>('browse')
  const [calls, setCalls] = useState<CallWithTranscript[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const [selectedCalls, setSelectedCalls] = useState<Set<string>>(new Set())
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionProgress, setTranscriptionProgress] = useState<Record<string, string>>({})
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const [insightsProgress, setInsightsProgress] = useState<Record<string, string>>({})
  const [isGeneratingEmbeddings, setIsGeneratingEmbeddings] = useState(false)
  const [embeddingProgress, setEmbeddingProgress] = useState<Record<string, string>>({})

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

      // Fetch insights presence for these calls
      const { data: insightsRows } = await supabase
        .from('insights')
        .select('call_id')
        .in('call_id', callIds)
      const callIdToHasInsights = new Set<string>((insightsRows || []).map((r: any) => r.call_id))

      // Fetch embeddings presence for these calls
      const { data: embeddingRows } = await supabase
        .from('embeddings')
        .select('call_id')
        .in('call_id', callIds)
      const callIdToHasEmbeddings = new Set<string>((embeddingRows || []).map((r: any) => r.call_id))

      // Transform data - match transcripts to calls and attach AI status flags
      const transformedCalls: CallWithTranscript[] = callsData.map((call: any) => ({
        ...call,
        transcript: transcriptsData?.find((t: any) => t.call_id === call.id) || null,
        hasInsights: callIdToHasInsights.has(call.id),
        hasEmbeddings: callIdToHasEmbeddings.has(call.id),
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

    const status = call.transcript.transcription_status
    const hasInsights = call.hasInsights
    const hasEmbeddings = call.hasEmbeddings

    // Base transcription status
    let baseStatus = ''
    let baseClass = ''
    
    switch (status) {
      case 'completed':
        baseStatus = '✓ Transcribed'
        baseClass = 'bg-green-100 text-green-700'
        break
      case 'processing':
        baseStatus = '⏳ Processing'
        baseClass = 'bg-blue-100 text-blue-700'
        break
      case 'failed':
        baseStatus = '✗ Failed'
        baseClass = 'bg-red-100 text-red-700'
        break
      case 'pending':
        baseStatus = '⋯ Pending'
        baseClass = 'bg-yellow-100 text-yellow-700'
        break
      default:
        baseStatus = 'Unknown'
        baseClass = 'bg-gray-100 text-gray-700'
    }

    // Add AI status indicators
    const aiStatus = []
    if (hasInsights) aiStatus.push('🤖')
    if (hasEmbeddings) aiStatus.push('🔍')
    
    const aiIndicators = aiStatus.length > 0 ? ` ${aiStatus.join('')}` : ''

    return (
      <div className="flex flex-col space-y-1">
        <span className={`px-2 py-1 text-xs rounded ${baseClass}`}>
          {baseStatus}
        </span>
        {aiStatus.length > 0 && (
          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
            AI Ready{aiIndicators}
          </span>
        )}
      </div>
    )
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

  // Check if call can have insights generated
  const canGenerateInsights = (call: CallWithTranscript) => {
    return call.transcript && call.transcript.transcription_status === 'completed'
  }

  // ============================================
  // Insights cost estimation (gpt-4o-mini)
  // ============================================
  const INSIGHTS_INPUT_PER_1K = 0.00015 // USD per 1K tokens (input)
  const INSIGHTS_OUTPUT_PER_1K = 0.00060 // USD per 1K tokens (output)

  // Rough token estimator (1 token ≈ 4 chars)
  const estimateTokens = (text: string) => Math.ceil((text?.length || 0) / 4)

  // Estimate per-call insights cost using transcript length and expected output size
  const estimateInsightsCostForTranscript = (
    transcriptText: string,
    expectedOutputTokens = 600 // summary + sentiment + items + flags
  ) => {
    const inputTokens = estimateTokens(transcriptText)
    const inputCost = (inputTokens / 1000) * INSIGHTS_INPUT_PER_1K
    const outputCost = (expectedOutputTokens / 1000) * INSIGHTS_OUTPUT_PER_1K
    const total = inputCost + outputCost
    return Number(total.toFixed(4))
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

    // Cost estimate for Whisper transcription
    const WHISPER_COST_PER_MIN = 0.006 // USD per audio minute (whisper-1)
    const totalSeconds = callsToTranscribe.reduce((sum, c) => sum + (c.call_duration_seconds || 0), 0)
    const totalMinutes = totalSeconds / 60
    const estCost = totalMinutes * WHISPER_COST_PER_MIN

    if (
      !confirm(
        `Start transcription for ${callsToTranscribe.length} call(s)?\n\n` +
          `Estimated audio length: ${totalMinutes.toFixed(1)} min\n` +
          `Whisper cost: $${WHISPER_COST_PER_MIN.toFixed(3)}/min\n` +
          `Estimated total: $${estCost.toFixed(4)}`
      )
    ) {
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

  // Bulk generate AI insights for selected calls
  const handleBulkGenerateInsights = async () => {
    const callsForInsights = filteredCalls.filter((c) => 
      selectedCalls.has(c.id) && canGenerateInsights(c)
    )

    if (callsForInsights.length === 0) {
      alert('Please select calls with completed transcriptions')
      return
    }

    // Build dynamic cost estimate using transcript lengths
    const perCallEstimates = callsForInsights.map((c) =>
      estimateInsightsCostForTranscript(
        c.transcript?.edited_transcript ||
          c.transcript?.raw_transcript ||
          c.transcript?.transcript ||
          ''
      )
    )
    const totalCost = perCallEstimates.reduce((a, b) => a + b, 0)
    const avgPerCall = callsForInsights.length
      ? totalCost / callsForInsights.length
      : 0

    if (!confirm(
      `Generate AI insights for ${callsForInsights.length} call(s)?\n\n` +
        `Estimated total: $${totalCost.toFixed(4)}  (avg ~$${avgPerCall.toFixed(4)} per call)\n` +
        `Model: gpt-4o-mini\n` +
        `Note: Actual cost varies with transcript length.`
    )) {
      return
    }

    setIsGeneratingInsights(true)
    const progress: Record<string, string> = {}

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const call of callsForInsights) {
        try {
          progress[call.id] = 'generating...'
          setInsightsProgress({ ...progress })

          const response = await fetch('/api/insights/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              callId: call.id,
              forceRegenerate: false, // Use cached if available
            }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.cached) {
              progress[call.id] = '✓ loaded from cache'
            } else {
              progress[call.id] = '✓ generated'
            }
            successCount++
          } else {
            const errorData = await response.json()
            progress[call.id] = `✗ ${errorData.error || 'Failed'}`
            errorCount++
          }
          setInsightsProgress({ ...progress })
        } catch (error) {
          progress[call.id] = '✗ error'
          errorCount++
          setInsightsProgress({ ...progress })
        }
      }

      // Show summary
      alert(`AI Insights Generation Complete!\n\n✓ Success: ${successCount}\n✗ Errors: ${errorCount}`)

      // Clear selection and refresh
      setSelectedCalls(new Set())
      setTimeout(() => {
        setInsightsProgress({})
      }, 3000)
    } catch (error) {
      console.error('Bulk insights generation error:', error)
      setError('Failed to generate insights')
    } finally {
      setIsGeneratingInsights(false)
    }
  }

  // Bulk generate embeddings for selected calls
  const handleBulkGenerateEmbeddings = async () => {
    const selected = Array.from(selectedCalls)
    
    if (selected.length === 0) {
      alert('Please select calls to generate embeddings')
      return
    }

    // Filter only calls with completed transcripts
    const callsWithTranscripts = selected.filter((callId) => {
      const call = calls.find((c) => c.id === callId)
      return call?.transcript?.transcription_status === 'completed'
    })

    if (callsWithTranscripts.length === 0) {
      alert('Selected calls must have completed transcripts before generating embeddings')
      return
    }

    const confirmed = confirm(
      `Generate embeddings for ${callsWithTranscripts.length} call${callsWithTranscripts.length > 1 ? 's' : ''}?\n\n` +
      `This will enable semantic search for these calls.\n` +
      `Estimated cost: $${(callsWithTranscripts.length * 0.00004).toFixed(4)}`
    )

    if (!confirmed) return

    setIsGeneratingEmbeddings(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) return

      // Process in batches
      for (const callId of callsWithTranscripts) {
        setEmbeddingProgress((prev) => ({ ...prev, [callId]: 'generating' }))

        try {
          const response = await fetch('/api/search/embeddings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ callId }),
          })

          if (response.ok) {
            const data = await response.json()
            setEmbeddingProgress((prev) => ({ 
              ...prev, 
              [callId]: data.cached ? 'cached' : 'completed' 
            }))
          } else {
            setEmbeddingProgress((prev) => ({ ...prev, [callId]: 'failed' }))
          }
        } catch (error) {
          console.error(`Error generating embedding for ${callId}:`, error)
          setEmbeddingProgress((prev) => ({ ...prev, [callId]: 'failed' }))
        }

        // Small delay between calls
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // Clear selection after completion
      setSelectedCalls(new Set())
    } finally {
      setIsGeneratingEmbeddings(false)
      setTimeout(() => setEmbeddingProgress({}), 3000)
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
          {activeTab === 'browse' 
            ? 'Browse, search, and transcribe your call recordings.'
            : 'Search your calls using natural language semantic search.'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('browse')}
            className={`${
              activeTab === 'browse'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Browse
            </span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`${
              activeTab === 'search'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Semantic Search
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">AI</span>
            </span>
          </button>
        </nav>
      </div>

      {/* Conditional Rendering Based on Active Tab */}
      {activeTab === 'search' ? (
        <VectorSearch />
      ) : (
        <div>

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
            <button
              onClick={handleBulkGenerateInsights}
              disabled={isGeneratingInsights}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isGeneratingInsights
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isGeneratingInsights ? 'Generating...' : '🤖 AI Insights'}
            </button>
            <button
              onClick={handleBulkGenerateEmbeddings}
              disabled={isGeneratingEmbeddings}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isGeneratingEmbeddings
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isGeneratingEmbeddings ? 'Generating...' : '🔍 Generate Embeddings'}
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
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {calls.filter((c) => c.hasInsights).length}
          </div>
          <div className="text-sm text-gray-600">AI Insights Ready</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">
            {calls.filter((c) => c.hasEmbeddings).length}
          </div>
          <div className="text-sm text-gray-600">Embeddings Ready</div>
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
                          <span className="ml-2 text-xs text-blue-500">
                            (Transcription: {transcriptionProgress[call.id]})
                          </span>
                        )}
                        {insightsProgress[call.id] && (
                          <span className="ml-2 text-xs text-purple-500">
                            (Insights: {insightsProgress[call.id]})
                          </span>
                        )}
                        {embeddingProgress[call.id] && (
                          <span className="ml-2 text-xs text-green-500">
                            (Embedding: {embeddingProgress[call.id]})
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
      )}
    </div>
  )
}


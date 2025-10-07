/**
 * Search Debug Component
 * Helps validate semantic search setup and troubleshoot issues
 */

'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export default function SearchDebug() {
  const supabase = createBrowserClient()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkSearchSetup()
  }, [])

  const checkSearchSetup = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Use the debug API to avoid user_id issues
      const response = await fetch('/api/debug/transcripts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        setDebugInfo({ error: errorData.error || 'Debug API failed' })
        return
      }

      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      console.error('Debug check error:', error)
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsLoading(false)
    }
  }

  const testSearch = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/search/semantic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          query: 'appointment',
          limit: 5,
          threshold: 0.5, // Lower threshold for testing
        }),
      })

      const data = await response.json()
      console.log('Search test result:', data)
      alert(`Search test: ${data.success ? 'Success' : 'Failed'}\nResults: ${data.totalResults || 0}\nDebug: ${JSON.stringify(data.debug || {})}`)
    } catch (error) {
      console.error('Search test error:', error)
      alert(`Search test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (isLoading) {
    return <div className="p-4">Loading debug info...</div>
  }

  if (!debugInfo) {
    return <div className="p-4 text-red-600">Failed to load debug info</div>
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">🔍 Search Debug Information</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-900">User Info</h4>
          <p className="text-sm text-gray-600">ID: {debugInfo.user?.id}</p>
          <p className="text-sm text-gray-600">Email: {debugInfo.user?.email}</p>
        </div>

        <div>
          <h4 className="font-medium text-gray-900">Calls ({debugInfo.calls?.count || 0})</h4>
          {debugInfo.calls?.error && (
            <p className="text-sm text-red-600">Error: {debugInfo.calls.error}</p>
          )}
          {debugInfo.calls?.data?.map((call: any) => (
            <p key={call.id} className="text-sm text-gray-600">• {call.filename}</p>
          ))}
        </div>

        <div>
          <h4 className="font-medium text-gray-900">Transcripts ({debugInfo.transcripts?.count || 0})</h4>
          <p className="text-sm text-gray-600">Completed: {debugInfo.transcripts?.completed || 0}</p>
          {debugInfo.transcripts?.error && (
            <p className="text-sm text-red-600">Error: {debugInfo.transcripts.error}</p>
          )}
        </div>

        <div>
          <h4 className="font-medium text-gray-900">Embeddings ({debugInfo.embeddings?.count || 0})</h4>
          {debugInfo.embeddings?.error && (
            <p className="text-sm text-red-600">Error: {debugInfo.embeddings.error}</p>
          )}
          {debugInfo.embeddings?.data?.map((embedding: any) => (
            <p key={embedding.call_id} className="text-sm text-gray-600">
              • Call {embedding.call_id} - {embedding.embedding_model}
            </p>
          ))}
        </div>

        <div>
          <h4 className="font-medium text-gray-900">Insights ({debugInfo.insights?.count || 0})</h4>
          {debugInfo.insights?.error && (
            <p className="text-sm text-red-600">Error: {debugInfo.insights.error}</p>
          )}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={testSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Test Search "appointment"
          </button>
        </div>

        {debugInfo.embeddings?.count === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800">⚠️ No Embeddings Found</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Semantic search requires embeddings. Go to the Library page and generate embeddings for your calls first.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

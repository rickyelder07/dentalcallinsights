/**
 * Vector Search Container Component
 * Unified semantic search interface integrating SearchBar, Filters, and Results
 */

'use client'

import { useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import SearchBar from './SearchBar'
import SearchFilters from './SearchFilters'
import SearchResults from './SearchResults'
import SearchDebug from './SearchDebug'
import type { SearchResult, SearchFilters as FilterType } from '@/types/embeddings'

export default function VectorSearch() {
  const supabase = createBrowserClient()
  
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterType>({})
  const [error, setError] = useState<string | null>(null)
  const [searchTime, setSearchTime] = useState<number | undefined>()
  
  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        return
      }
      
      setQuery(searchQuery)
      setIsLoading(true)
      setError(null)
      
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        
        if (!session) {
          setError('Please sign in to search')
          setIsLoading(false)
          return
        }
        
        const response = await fetch('/api/search/semantic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: searchQuery,
            filters,
            limit: 20,
            threshold: 0.7,
          }),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Search failed')
        }
        
        const data = await response.json()
        
        if (data.success) {
          setResults(data.results || [])
          setSearchTime(data.searchTime)
        } else {
          throw new Error(data.error || 'Search failed')
        }
      } catch (err) {
        console.error('Search error:', err)
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
      } finally {
        setIsLoading(false)
      }
    },
    [supabase, filters]
  )
  
  const handleFiltersChange = useCallback((newFilters: FilterType) => {
    setFilters(newFilters)
    // Re-run search if there's an active query
    if (query.trim()) {
      handleSearch(query)
    }
  }, [query, handleSearch])
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Debug Panel */}
      <div className="mb-8">
        <SearchDebug />
      </div>
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Semantic Call Search
        </h1>
        <p className="text-gray-600">
          Search your calls by meaning, not just keywords. Powered by AI vector embeddings.
        </p>
      </div>
      
      {/* Search bar */}
      <div className="mb-6">
        <SearchBar
          onSearch={handleSearch}
          isLoading={isLoading}
          initialQuery={query}
          placeholder="Search calls by meaning... e.g., 'billing issues', 'emergency calls', 'happy patients'"
        />
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="font-medium text-red-900 mb-1">Search Error</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {/* Main content area with filters and results */}
      <div className="flex gap-6">
        {/* Filters sidebar */}
        <div className="flex-shrink-0">
          <SearchFilters filters={filters} onFiltersChange={handleFiltersChange} />
        </div>
        
        {/* Results area */}
        <div className="flex-1 min-w-0">
          <SearchResults
            results={results}
            isLoading={isLoading}
            query={query}
            searchTime={searchTime}
          />
        </div>
      </div>
      
      {/* Help section */}
      {!query && !isLoading && (
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            How Semantic Search Works
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>Semantic search</strong> understands the meaning of your query, not just exact keyword matches.
            </p>
            <p>
              Instead of searching for specific words, describe what you're looking for:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>"calls where patients were frustrated about billing"</li>
              <li>"emergency dental situations"</li>
              <li>"appointment scheduling requests"</li>
              <li>"follow-up needed for the dentist"</li>
            </ul>
            <p className="mt-3">
              <strong>Note:</strong> To use semantic search, calls must first have embeddings generated.
              Generate embeddings from the Library page using the "Generate Embeddings" button.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


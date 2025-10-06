/**
 * Semantic Search API Route
 * POST /api/search/semantic
 * 
 * Performs vector similarity search across call transcripts
 * Security: Server-side only, validates user access via RLS
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { generateEmbeddingWithRetry } from '@/lib/embeddings'
import { searchSimilarCalls, hybridSearch } from '@/lib/vector-search'
import type { SemanticSearchRequest } from '@/types/embeddings'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Parse request
    const body: SemanticSearchRequest = await req.json()
    const { query, limit = 20, threshold = 0.7, filters } = body
    
    // Validate input
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      )
    }
    
    // Get user from session
    const supabase = createAdminClient()
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      )
    }
    
    // Verify token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      )
    }
    
    // Generate embedding for search query
    const embeddingResult = await generateEmbeddingWithRetry(query)
    
    if (!embeddingResult.success || !embeddingResult.embedding) {
      return NextResponse.json(
        { error: embeddingResult.error || 'Failed to generate query embedding' },
        { status: 500 }
      )
    }
    
    // Perform hybrid search (vector + keyword)
    const searchResult = await hybridSearch(
      embeddingResult.embedding,
      query,
      user.id,
      { limit, threshold, filters }
    )
    
    if (!searchResult.success) {
      return NextResponse.json(
        { error: searchResult.error || 'Search failed' },
        { status: 500 }
      )
    }
    
    const searchTime = Date.now() - startTime
    
    // Log search query for analytics
    try {
      await supabase.from('search_queries').insert({
        user_id: user.id,
        query_text: query,
        query_type: 'semantic',
        filters: filters || {},
        result_count: searchResult.results?.length || 0,
        has_results: (searchResult.results?.length || 0) > 0,
        search_time_ms: searchTime,
      })
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to log search query:', logError)
    }
    
    // Return results
    return NextResponse.json({
      success: true,
      query,
      results: searchResult.results || [],
      totalResults: searchResult.results?.length || 0,
      searchTime,
    })
  } catch (error) {
    console.error('Semantic search API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


/**
 * Vector Search Utilities
 * pgvector similarity search operations for semantic call discovery
 * 
 * Security: Uses Supabase client with RLS policies
 */

import { createAdminClient } from './supabase-server'
import type {
  SearchFilters,
  SearchResult,
  SimilarityMetric,
} from '@/types/embeddings'

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_SIMILARITY_THRESHOLD = 0.7 // 70% similarity minimum
const DEFAULT_SEARCH_LIMIT = 20
const MAX_SEARCH_LIMIT = 100

// ============================================
// SIMILARITY SEARCH
// ============================================

/**
 * Search for similar calls using vector similarity
 * @param queryEmbedding - Query vector (1536 dimensions)
 * @param userId - User ID for RLS filtering
 * @param options - Search options
 */
export async function searchSimilarCalls(
  queryEmbedding: number[],
  userId: string,
  options: {
    limit?: number
    threshold?: number
    filters?: SearchFilters
  } = {}
): Promise<{
  success: boolean
  results?: SearchResult[]
  searchTime?: number
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    const supabase = createAdminClient()
    const limit = Math.min(options.limit || DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT)
    const threshold = options.threshold || DEFAULT_SIMILARITY_THRESHOLD
    
    // Build query
    let query = supabase.rpc('search_similar_calls', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: threshold,
      match_count: limit,
      target_user_id: userId,
    })
    
    const { data: similarityData, error: searchError } = await query
    
    if (searchError) {
      console.error('Similarity search error:', searchError)
      return {
        success: false,
        error: searchError.message,
      }
    }
    
    if (!similarityData || similarityData.length === 0) {
      return {
        success: true,
        results: [],
        searchTime: Date.now() - startTime,
      }
    }
    
    // Get call details for results
    const callIds = similarityData.map((item: any) => item.call_id)
    
    let callQuery = supabase
      .from('calls')
      .select(`
        id,
        filename,
        call_time,
        call_duration_seconds,
        transcripts (
          transcript,
          raw_transcript,
          language
        ),
        insights (
          overall_sentiment,
          call_outcome,
          action_items,
          red_flags
        )
      `)
      .in('id', callIds)
      .eq('user_id', userId)
    
    // Apply filters if provided
    if (options.filters) {
      callQuery = applyFilters(callQuery, options.filters)
    }
    
    const { data: calls, error: callsError } = await callQuery
    
    if (callsError) {
      console.error('Calls fetch error:', callsError)
      return {
        success: false,
        error: callsError.message,
      }
    }
    
    // Merge similarity scores with call data
    let results: SearchResult[] = calls.map((call: any) => {
      const similarityItem = similarityData.find((s: any) => s.call_id === call.id)
      const transcript = call.transcripts?.[0]
      const insights = call.insights?.[0]
      
      // Get transcript preview (first 200 chars)
      const transcriptText = transcript?.raw_transcript || transcript?.transcript || ''
      const transcriptPreview = transcriptText.length > 200
        ? transcriptText.substring(0, 200) + '...'
        : transcriptText
      
      return {
        callId: call.id,
        filename: call.filename,
        callTime: call.call_time,
        duration: call.call_duration_seconds,
        transcriptPreview,
        similarity: similarityItem?.similarity || 0,
        sentiment: insights?.overall_sentiment,
        outcome: insights?.call_outcome,
        language: transcript?.language,
        hasRedFlags: insights?.red_flags?.length > 0,
        hasActionItems: insights?.action_items?.length > 0,
      }
    })
    
    // Apply post-query filters for complex joins
    if (options.filters) {
      results = applyPostQueryFilters(results, options.filters)
    }
    
    // Sort by similarity score (highest first)
    results.sort((a, b) => b.similarity - a.similarity)
    
    const searchTime = Date.now() - startTime
    
    return {
      success: true,
      results,
      searchTime,
    }
  } catch (error) {
    console.error('Vector search error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Find calls similar to a specific call
 * @param callId - Source call ID
 * @param userId - User ID for RLS filtering
 * @param limit - Number of results
 */
export async function findSimilarCallsByCallId(
  callId: string,
  userId: string,
  limit: number = 10
): Promise<{
  success: boolean
  results?: SearchResult[]
  error?: string
}> {
  try {
    const supabase = createAdminClient()
    
    // Get embedding for source call
    const { data: embedding, error: embeddingError } = await supabase
      .from('embeddings')
      .select('embedding')
      .eq('call_id', callId)
      .eq('user_id', userId)
      .single()
    
    if (embeddingError || !embedding) {
      return {
        success: false,
        error: 'Embedding not found for this call',
      }
    }
    
    // Search for similar calls (exclude the source call)
    const searchResult = await searchSimilarCalls(
      embedding.embedding,
      userId,
      { limit: limit + 1 } // +1 to account for excluding source
    )
    
    if (!searchResult.success) {
      return searchResult
    }
    
    // Filter out the source call
    const results = searchResult.results?.filter(r => r.callId !== callId) || []
    
    return {
      success: true,
      results: results.slice(0, limit),
    }
  } catch (error) {
    console.error('Find similar calls error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// FILTER APPLICATION
// ============================================

/**
 * Apply search filters to Supabase query
 */
function applyFilters(query: any, filters: SearchFilters): any {
  let filteredQuery = query
  
  // Date range filter
  if (filters.dateFrom) {
    filteredQuery = filteredQuery.gte('call_time', filters.dateFrom)
  }
  if (filters.dateTo) {
    filteredQuery = filteredQuery.lte('call_time', filters.dateTo)
  }
  
  // Duration filter
  if (filters.minDuration) {
    filteredQuery = filteredQuery.gte('call_duration_seconds', filters.minDuration)
  }
  if (filters.maxDuration) {
    filteredQuery = filteredQuery.lte('call_duration_seconds', filters.maxDuration)
  }
  
  // Note: Sentiment, outcome, and language filters are applied after the query
  // since they require joins that aren't supported in the main query structure
  
  return filteredQuery
}

/**
 * Apply filters after query execution (for complex joins)
 */
function applyPostQueryFilters(results: SearchResult[], filters: SearchFilters): SearchResult[] {
  let filteredResults = results
  
  // Sentiment filter
  if (filters.sentiment && filters.sentiment.length > 0) {
    filteredResults = filteredResults.filter(result => 
      result.sentiment && filters.sentiment!.includes(result.sentiment as any)
    )
  }
  
  // Outcome filter
  if (filters.outcome && filters.outcome.length > 0) {
    filteredResults = filteredResults.filter(result => 
      result.outcome && filters.outcome!.includes(result.outcome as any)
    )
  }
  
  // Language filter
  if (filters.language && filters.language.length > 0) {
    filteredResults = filteredResults.filter(result => 
      result.language && filters.language!.includes(result.language)
    )
  }
  
  return filteredResults
}

// ============================================
// HYBRID SEARCH
// ============================================

/**
 * Hybrid search combining vector similarity and keyword matching
 * @param queryEmbedding - Query vector
 * @param queryText - Query text for keyword matching
 * @param userId - User ID
 * @param options - Search options
 */
export async function hybridSearch(
  queryEmbedding: number[],
  queryText: string,
  userId: string,
  options: {
    limit?: number
    threshold?: number
    filters?: SearchFilters
  } = {}
): Promise<{
  success: boolean
  results?: SearchResult[]
  searchTime?: number
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    // Perform vector search
    const vectorResults = await searchSimilarCalls(queryEmbedding, userId, options)
    
    if (!vectorResults.success) {
      return vectorResults
    }
    
    // Perform keyword search on transcripts
    const supabase = createAdminClient()
    const { data: keywordMatches, error: keywordError } = await supabase
      .from('transcripts')
      .select(`
        call_id,
        transcript,
        raw_transcript,
        calls!inner (
          id,
          filename,
          call_time,
          call_duration_seconds,
          user_id
        )
      `)
      .eq('calls.user_id', userId)
      .textSearch('transcript', queryText.split(' ').join(' | '), {
        type: 'websearch',
      })
      .limit(options.limit || DEFAULT_SEARCH_LIMIT)
    
    if (keywordError) {
      // If keyword search fails, just return vector results
      console.warn('Keyword search failed:', keywordError)
      return vectorResults
    }
    
    // Merge results, boosting items that appear in both
    const vectorResultMap = new Map(
      vectorResults.results?.map(r => [r.callId, r]) || []
    )
    
    const keywordResultIds = new Set(
      keywordMatches?.map((m: any) => m.call_id) || []
    )
    
    // Boost similarity scores for items that match both
    const boostedResults = vectorResults.results?.map(result => ({
      ...result,
      similarity: keywordResultIds.has(result.callId)
        ? Math.min(result.similarity * 1.2, 1.0) // 20% boost, max 1.0
        : result.similarity,
    })) || []
    
    // Re-sort by boosted similarity
    boostedResults.sort((a, b) => b.similarity - a.similarity)
    
    const searchTime = Date.now() - startTime
    
    return {
      success: true,
      results: boostedResults,
      searchTime,
    }
  } catch (error) {
    console.error('Hybrid search error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// SIMILARITY METRICS
// ============================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Calculate euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  
  return Math.sqrt(sum)
}

// ============================================
// SEARCH STATISTICS
// ============================================

/**
 * Get embedding coverage statistics for a user
 */
export async function getEmbeddingCoverage(
  userId: string
): Promise<{
  totalCalls: number
  embeddedCalls: number
  coveragePercent: number
  missingCallIds: string[]
}> {
  try {
    const supabase = createAdminClient()
    
    // Get total calls
    const { count: totalCalls } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    // Get calls with embeddings
    const { data: embedded } = await supabase
      .from('embeddings')
      .select('call_id')
      .eq('user_id', userId)
    
    const embeddedCallIds = new Set(embedded?.map(e => e.call_id) || [])
    const embeddedCalls = embeddedCallIds.size
    
    // Get calls without embeddings
    const { data: allCalls } = await supabase
      .from('calls')
      .select('id')
      .eq('user_id', userId)
    
    const missingCallIds = allCalls
      ?.filter(call => !embeddedCallIds.has(call.id))
      .map(call => call.id) || []
    
    const coveragePercent = totalCalls ? (embeddedCalls / totalCalls) * 100 : 0
    
    return {
      totalCalls: totalCalls || 0,
      embeddedCalls,
      coveragePercent,
      missingCallIds,
    }
  } catch (error) {
    console.error('Get embedding coverage error:', error)
    return {
      totalCalls: 0,
      embeddedCalls: 0,
      coveragePercent: 0,
      missingCallIds: [],
    }
  }
}


/**
 * Automatic Embedding Generation
 * Utility functions for automatically generating embeddings after transcription
 * 
 * This module provides functions to automatically generate and store embeddings
 * when transcripts are completed, ensuring semantic search works out of the box.
 */

import { createAdminClient } from './supabase-server'
import {
  prepareTranscriptForEmbedding,
  generateEmbeddingWithRetry,
  generateContentHash,
  calculateEmbeddingCost,
} from './embeddings'

// ============================================
// AUTOMATIC EMBEDDING GENERATION
// ============================================

/**
 * Automatically generate and store embedding for a completed transcript
 * @param callId - The call ID
 * @param userId - The user ID
 * @param transcriptText - The transcript text to embed
 * @param contentType - Type of content (default: 'transcript')
 * @returns Promise with success status and details
 */
export async function generateAutomaticEmbedding(
  callId: string,
  userId: string,
  transcriptText: string,
  contentType: 'transcript' | 'insights' | 'metadata' = 'transcript'
): Promise<{
  success: boolean
  embeddingId?: string
  cached?: boolean
  error?: string
  cost?: number
}> {
  try {
    const supabase = createAdminClient()
    
    // Debug logging
    console.log(`generateAutomaticEmbedding called for call ${callId}:`, {
      transcriptText: transcriptText ? transcriptText.substring(0, 100) + '...' : 'null',
      transcriptTextLength: transcriptText?.length || 0,
      transcriptTextType: typeof transcriptText,
      userId,
      contentType
    })
    
    // Validate input - more robust check
    if (!transcriptText || typeof transcriptText !== 'string' || transcriptText.trim().length === 0) {
      console.error(`Invalid transcript text for call ${callId}:`, { 
        transcriptText, 
        type: typeof transcriptText,
        length: transcriptText?.length || 0,
        isNull: transcriptText === null,
        isUndefined: transcriptText === undefined
      })
      return {
        success: false,
        error: 'Transcript text is empty, null, or not a string',
      }
    }
    
    // Prepare content for embedding
    const preparedContent = prepareTranscriptForEmbedding(transcriptText)
    const contentHash = generateContentHash(preparedContent)
    
    // Check if embedding already exists
    const { data: existingEmbedding } = await supabase
      .from('embeddings')
      .select('*')
      .eq('call_id', callId)
      .eq('content_type', contentType)
      .single()
    
    if (existingEmbedding && existingEmbedding.content_hash === contentHash) {
      console.log(`Embedding already exists for call ${callId}`)
      return {
        success: true,
        embeddingId: existingEmbedding.id,
        cached: true,
      }
    }
    
    // Generate embedding
    const embeddingResult = await generateEmbeddingWithRetry(preparedContent)
    
    if (!embeddingResult.success || !embeddingResult.embedding) {
      return {
        success: false,
        error: embeddingResult.error || 'Failed to generate embedding',
      }
    }
    
    // Calculate cost
    const cost = calculateEmbeddingCost(embeddingResult.tokenCount || 0)
    
    // Final validation before saving
    const finalContent = transcriptText?.trim()
    if (!finalContent || finalContent.length === 0) {
      console.error(`Final content validation failed for call ${callId}:`, {
        transcriptText,
        finalContent,
        length: finalContent?.length || 0
      })
      return {
        success: false,
        error: 'Content is null or empty after processing',
      }
    }
    
    console.log(`Saving embedding for call ${callId} with content length: ${finalContent.length}`)
    console.log(`Content preview: ${finalContent.substring(0, 200)}...`)
    
    // Double-check content is not null before database operation
    if (!finalContent || finalContent.trim().length === 0) {
      console.error(`CRITICAL: finalContent is null or empty before database save for call ${callId}`)
      return {
        success: false,
        error: 'Content is null or empty before database save',
      }
    }
    
    // Save embedding to database (using full schema)
    const { data: savedEmbedding, error: upsertError } = await supabase
      .from('embeddings')
      .upsert({
        call_id: callId,
        user_id: userId,
        content: finalContent,
        embedding: JSON.stringify(embeddingResult.embedding),
        embedding_model: 'text-embedding-3-small',
        embedding_version: 1,
        content_type: contentType,
        content_hash: contentHash,
        token_count: embeddingResult.tokenCount || 0,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'call_id,content_type'
      })
      .select()
      .single()
    
    if (upsertError) {
      console.error('Failed to save embedding:', upsertError)
      return {
        success: false,
        error: 'Failed to save embedding to database',
      }
    }
    
    // Log cost (optional, don't fail if this fails)
    try {
      await supabase.from('embedding_costs').insert({
        user_id: userId,
        call_id: callId,
        token_count: embeddingResult.tokenCount || 0,
        model: 'text-embedding-3-small',
        cost_usd: cost,
        operation_type: 'automatic',
      })
    } catch (costError) {
      console.warn('Failed to log embedding cost:', costError)
    }
    
    console.log(`Embedding generated and saved for call ${callId}`)
    return {
      success: true,
      embeddingId: savedEmbedding.id,
      cached: false,
      cost,
    }
  } catch (error) {
    console.error(`Error generating automatic embedding for call ${callId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate embeddings for multiple calls in batch
 * @param calls - Array of call data with callId, userId, and transcriptText
 * @returns Promise with batch results
 */
export async function generateBatchAutomaticEmbeddings(
  calls: Array<{
    callId: string
    userId: string
    transcriptText: string
    contentType?: 'transcript' | 'insights' | 'metadata'
  }>
): Promise<{
  success: boolean
  results: Array<{
    callId: string
    success: boolean
    embeddingId?: string
    cached?: boolean
    error?: string
    cost?: number
  }>
  summary: {
    total: number
    success: number
    cached: number
    failed: number
  }
  totalCost: number
}> {
  const results: Array<{
    callId: string
    success: boolean
    embeddingId?: string
    cached?: boolean
    error?: string
    cost?: number
  }> = []
  
  let totalCost = 0
  
  for (const call of calls) {
    const result = await generateAutomaticEmbedding(
      call.callId,
      call.userId,
      call.transcriptText,
      call.contentType || 'transcript'
    )
    
    results.push({
      callId: call.callId,
      success: result.success,
      embeddingId: result.embeddingId,
      cached: result.cached,
      error: result.error,
      cost: result.cost,
    })
    
    if (result.cost) {
      totalCost += result.cost
    }
    
    // Rate limiting: small delay between calls
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  const successCount = results.filter(r => r.success).length
  const cachedCount = results.filter(r => r.cached).length
  
  return {
    success: true,
    results,
    summary: {
      total: calls.length,
      success: successCount,
      cached: cachedCount,
      failed: calls.length - successCount,
    },
    totalCost,
  }
}

/**
 * Check if a call has embeddings
 * @param callId - The call ID
 * @param contentType - Type of content to check
 * @returns Promise with boolean indicating if embeddings exist
 */
export async function hasEmbeddings(
  callId: string,
  contentType: 'transcript' | 'insights' | 'metadata' = 'transcript'
): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from('embeddings')
      .select('id')
      .eq('call_id', callId)
      .eq('content_type', contentType)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking embeddings:', error)
      return false
    }
    
    return !!data
  } catch (error) {
    console.error('Error checking embeddings:', error)
    return false
  }
}

/**
 * Get embedding statistics for a user
 * @param userId - The user ID
 * @returns Promise with embedding statistics
 */
export async function getEmbeddingStats(userId: string): Promise<{
  totalEmbeddings: number
  totalCost: number
  averageCost: number
  byContentType: Record<string, number>
}> {
  try {
    const supabase = createAdminClient()
    
    // Get embedding count
    const { count: embeddingCount } = await supabase
      .from('embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    // Get cost data
    const { data: costData } = await supabase
      .from('embedding_costs')
      .select('cost_usd')
      .eq('user_id', userId)
    
    const totalCost = costData?.reduce((sum, row) => sum + (row.cost_usd || 0), 0) || 0
    
    // Get by content type
    const { data: contentTypeData } = await supabase
      .from('embeddings')
      .select('content_type')
      .eq('user_id', userId)
    
    const byContentType: Record<string, number> = {}
    contentTypeData?.forEach(row => {
      byContentType[row.content_type] = (byContentType[row.content_type] || 0) + 1
    })
    
    return {
      totalEmbeddings: embeddingCount || 0,
      totalCost,
      averageCost: (embeddingCount || 0) > 0 ? totalCost / embeddingCount : 0,
      byContentType,
    }
  } catch (error) {
    console.error('Error getting embedding stats:', error)
    return {
      totalEmbeddings: 0,
      totalCost: 0,
      averageCost: 0,
      byContentType: {},
    }
  }
}

/**
 * Clean up old or invalid embeddings
 * @param userId - The user ID (optional, if not provided cleans all)
 * @param maxAge - Maximum age in days (default: 30)
 * @returns Promise with cleanup results
 */
export async function cleanupEmbeddings(
  userId?: string,
  maxAge: number = 30
): Promise<{
  success: boolean
  deletedCount: number
  error?: string
}> {
  try {
    const supabase = createAdminClient()
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - maxAge)
    
    let query = supabase
      .from('embeddings')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
    
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    const { error, count } = await query
    
    if (error) {
      return {
        success: false,
        deletedCount: 0,
        error: error.message,
      }
    }
    
    return {
      success: true,
      deletedCount: count || 0,
    }
  } catch (error) {
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

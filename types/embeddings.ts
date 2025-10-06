/**
 * Embeddings Type Definitions
 * Types for vector embeddings, semantic search, and similarity operations
 */

// ============================================
// EMBEDDING TYPES
// ============================================

/**
 * Vector embedding record in database
 */
export interface Embedding {
  id: string
  call_id: string
  user_id: string
  
  // Vector data
  embedding: number[] // 1536-dimensional vector from OpenAI
  embedding_model: string // e.g., 'text-embedding-3-small'
  embedding_version: number // For tracking model updates
  
  // Source content
  content_type: 'transcript' | 'summary' | 'combined'
  content_hash: string // For cache invalidation
  token_count: number
  
  // Metadata
  generated_at: string
  created_at: string
  updated_at: string
}

/**
 * Request to generate embedding
 */
export interface GenerateEmbeddingRequest {
  callId: string
  contentType?: 'transcript' | 'summary' | 'combined'
  forceRegenerate?: boolean
}

/**
 * Response from embedding generation
 */
export interface GenerateEmbeddingResponse {
  success: boolean
  embeddingId?: string
  cached?: boolean
  tokenCount?: number
  error?: string
}

/**
 * Batch embedding generation request
 */
export interface BatchEmbeddingRequest {
  callIds: string[]
  contentType?: 'transcript' | 'summary' | 'combined'
  forceRegenerate?: boolean
}

/**
 * Batch embedding generation response
 */
export interface BatchEmbeddingResponse {
  success: boolean
  results: {
    callId: string
    success: boolean
    embeddingId?: string
    cached?: boolean
    error?: string
  }[]
  totalCost?: number
  totalTokens?: number
}

// ============================================
// VECTOR SEARCH TYPES
// ============================================

/**
 * Semantic search request
 */
export interface SemanticSearchRequest {
  query: string
  limit?: number
  threshold?: number // Similarity threshold (0-1)
  filters?: SearchFilters
}

/**
 * Search filters for refined results
 */
export interface SearchFilters {
  // Sentiment filters
  sentiment?: ('positive' | 'neutral' | 'negative' | 'mixed')[]
  
  // Outcome filters
  outcome?: ('resolved' | 'pending' | 'escalated' | 'no_resolution')[]
  
  // Date range
  dateFrom?: string
  dateTo?: string
  
  // Duration range
  minDuration?: number // seconds
  maxDuration?: number // seconds
  
  // Language
  language?: string[]
  
  // Has red flags
  hasRedFlags?: boolean
  
  // Has action items
  hasActionItems?: boolean
}

/**
 * Search result item
 */
export interface SearchResult {
  // Call data
  callId: string
  filename: string
  callTime: string
  duration?: number
  
  // Transcript preview
  transcriptPreview: string
  
  // Similarity score
  similarity: number // 0-1, higher is more similar
  
  // Highlights
  highlights?: string[]
  
  // Metadata
  sentiment?: string
  outcome?: string
  language?: string
  hasRedFlags?: boolean
  hasActionItems?: boolean
}

/**
 * Semantic search response
 */
export interface SemanticSearchResponse {
  success: boolean
  query: string
  results: SearchResult[]
  totalResults: number
  searchTime: number // milliseconds
  error?: string
}

// ============================================
// SIMILARITY SEARCH TYPES
// ============================================

/**
 * Find similar calls request
 */
export interface FindSimilarCallsRequest {
  callId: string
  limit?: number
  threshold?: number
}

/**
 * Find similar calls response
 */
export interface FindSimilarCallsResponse {
  success: boolean
  sourceCallId: string
  similarCalls: SearchResult[]
  error?: string
}

// ============================================
// EMBEDDING CACHE TYPES
// ============================================

/**
 * Embedding cache entry
 */
export interface EmbeddingCacheEntry {
  contentHash: string
  embedding: number[]
  model: string
  tokenCount: number
  createdAt: Date
}

/**
 * Cache statistics
 */
export interface EmbeddingCacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

// ============================================
// EMBEDDING GENERATION CONFIG
// ============================================

/**
 * OpenAI embedding configuration
 */
export interface EmbeddingConfig {
  model: 'text-embedding-3-small' | 'text-embedding-3-large'
  dimensions: 1536 | 3072
  batchSize: number
  maxRetries: number
  timeout: number
}

/**
 * Default embedding configuration
 */
export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  model: 'text-embedding-3-small',
  dimensions: 1536,
  batchSize: 100,
  maxRetries: 3,
  timeout: 30000,
}

// ============================================
// COST TRACKING TYPES
// ============================================

/**
 * Embedding cost record
 */
export interface EmbeddingCost {
  id: string
  user_id: string
  call_id?: string
  
  // Usage metrics
  token_count: number
  model: string
  cost_usd: number
  
  // Context
  operation_type: 'generate' | 'batch' | 'regenerate'
  
  // Timestamps
  created_at: string
}

/**
 * User embedding usage
 */
export interface UserEmbeddingUsage {
  userId: string
  totalCalls: number
  totalTokens: number
  totalCost: number
  lastGenerated: string
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Vector similarity metric
 */
export type SimilarityMetric = 'cosine' | 'euclidean' | 'dot_product'

/**
 * Content to embed
 */
export interface EmbeddingContent {
  text: string
  metadata?: {
    callId?: string
    type?: string
    [key: string]: any
  }
}

/**
 * Embedding generation result
 */
export interface EmbeddingResult {
  embedding: number[]
  tokenCount: number
  model: string
}


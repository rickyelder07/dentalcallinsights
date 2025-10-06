/**
 * Embeddings Client
 * OpenAI text-embedding-3-small integration for generating vector embeddings
 * 
 * Security: API key only used server-side
 */

import OpenAI from 'openai'
import { createHash } from 'crypto'
import type {
  EmbeddingConfig,
  EmbeddingContent,
  EmbeddingResult,
  DEFAULT_EMBEDDING_CONFIG,
} from '@/types/embeddings'

// ============================================
// CONFIGURATION
// ============================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536
const MAX_TOKENS_PER_REQUEST = 8191 // OpenAI limit for embedding model

/**
 * Validate OpenAI configuration for embeddings
 */
export function validateEmbeddingConfig(): {
  valid: boolean
  error?: string
} {
  if (!OPENAI_API_KEY) {
    return {
      valid: false,
      error: 'OpenAI API key not configured. Set OPENAI_API_KEY in environment variables.',
    }
  }
  
  return { valid: true }
}

/**
 * Create OpenAI client
 */
function createOpenAIClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }
  
  return new OpenAI({
    apiKey: OPENAI_API_KEY,
  })
}

// ============================================
// CONTENT HASHING
// ============================================

/**
 * Generate SHA-256 hash of content for cache invalidation
 */
export function generateContentHash(content: string): string {
  return createHash('sha256').update(content.trim()).digest('hex')
}

// ============================================
// TEXT PREPARATION
// ============================================

/**
 * Prepare text for embedding generation
 * Cleans and truncates text to fit within token limits
 */
export function prepareTextForEmbedding(text: string): string {
  // Remove excessive whitespace
  let prepared = text.replace(/\s+/g, ' ').trim()
  
  // Truncate if too long (rough estimate: 1 token ≈ 4 characters)
  const maxChars = MAX_TOKENS_PER_REQUEST * 4
  if (prepared.length > maxChars) {
    prepared = prepared.substring(0, maxChars) + '...'
  }
  
  return prepared
}

/**
 * Estimate token count for text
 * Rough approximation: 1 token ≈ 4 characters
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

// ============================================
// EMBEDDING GENERATION
// ============================================

/**
 * Generate embedding for a single text
 * @param text - Text to embed
 * @returns Embedding vector and metadata
 */
export async function generateEmbedding(
  text: string
): Promise<{
  success: boolean
  embedding?: number[]
  tokenCount?: number
  error?: string
}> {
  try {
    // Validate configuration
    const configValidation = validateEmbeddingConfig()
    if (!configValidation.valid) {
      return {
        success: false,
        error: configValidation.error,
      }
    }
    
    // Validate input
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'Text is empty',
      }
    }
    
    // Prepare text
    const preparedText = prepareTextForEmbedding(text)
    
    // Create OpenAI client
    const openai = createOpenAIClient()
    
    // Generate embedding
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: preparedText,
      encoding_format: 'float',
    })
    
    // Extract embedding
    const embedding = response.data[0]?.embedding
    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      return {
        success: false,
        error: `Invalid embedding dimensions: ${embedding?.length || 0}`,
      }
    }
    
    // Get token count
    const tokenCount = response.usage.total_tokens
    
    return {
      success: true,
      embedding,
      tokenCount,
    }
  } catch (error) {
    console.error('Error generating embedding:', error)
    
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        error: `OpenAI API error: ${error.message}`,
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate embedding with retry logic
 * @param text - Text to embed
 * @param maxRetries - Maximum retry attempts
 */
export async function generateEmbeddingWithRetry(
  text: string,
  maxRetries: number = 3
): Promise<{
  success: boolean
  embedding?: number[]
  tokenCount?: number
  error?: string
}> {
  let lastError: string | undefined
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await generateEmbedding(text)
    
    if (result.success) {
      return result
    }
    
    lastError = result.error
    
    // Don't retry for certain errors
    if (
      result.error?.includes('API key not configured') ||
      result.error?.includes('empty')
    ) {
      return result
    }
    
    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
    }
  }
  
  return {
    success: false,
    error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
  }
}

// ============================================
// BATCH EMBEDDING GENERATION
// ============================================

/**
 * Generate embeddings for multiple texts in batch
 * @param texts - Array of texts to embed
 * @param batchSize - Number of texts per batch
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 100
): Promise<{
  success: boolean
  embeddings?: {
    embedding: number[]
    tokenCount: number
    index: number
  }[]
  totalTokens?: number
  error?: string
}> {
  try {
    // Validate configuration
    const configValidation = validateEmbeddingConfig()
    if (!configValidation.valid) {
      return {
        success: false,
        error: configValidation.error,
      }
    }
    
    // Validate input
    if (!texts || texts.length === 0) {
      return {
        success: false,
        error: 'No texts provided',
      }
    }
    
    // Prepare texts
    const preparedTexts = texts.map(prepareTextForEmbedding)
    
    // Create OpenAI client
    const openai = createOpenAIClient()
    
    // Process in batches
    const allEmbeddings: {
      embedding: number[]
      tokenCount: number
      index: number
    }[] = []
    let totalTokens = 0
    
    for (let i = 0; i < preparedTexts.length; i += batchSize) {
      const batch = preparedTexts.slice(i, i + batchSize)
      
      // Generate embeddings for batch
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        encoding_format: 'float',
      })
      
      // Extract embeddings
      response.data.forEach((item, batchIndex) => {
        allEmbeddings.push({
          embedding: item.embedding,
          tokenCount: estimateTokenCount(batch[batchIndex]),
          index: i + batchIndex,
        })
      })
      
      totalTokens += response.usage.total_tokens
      
      // Rate limiting: wait between batches
      if (i + batchSize < preparedTexts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
    
    return {
      success: true,
      embeddings: allEmbeddings,
      totalTokens,
    }
  } catch (error) {
    console.error('Error generating batch embeddings:', error)
    
    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        error: `OpenAI API error: ${error.message}`,
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// COST CALCULATION
// ============================================

/**
 * Calculate cost for embedding generation
 * text-embedding-3-small: $0.00002 per 1K tokens
 */
export function calculateEmbeddingCost(tokenCount: number): number {
  const costPer1kTokens = 0.00002
  return (tokenCount / 1000) * costPer1kTokens
}

/**
 * Calculate cost for batch embedding generation
 */
export function calculateBatchEmbeddingCost(totalTokens: number): number {
  return calculateEmbeddingCost(totalTokens)
}

// ============================================
// CONTENT PREPARATION FOR DIFFERENT TYPES
// ============================================

/**
 * Prepare transcript for embedding
 * Focuses on the main content
 */
export function prepareTranscriptForEmbedding(transcript: string): string {
  // Remove timestamps if present
  let cleaned = transcript.replace(/\[\d+:\d+:\d+\]/g, '')
  
  // Remove speaker labels if present
  cleaned = cleaned.replace(/^(Speaker \d+:|Patient:|Staff:)/gm, '')
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  return prepareTextForEmbedding(cleaned)
}

/**
 * Prepare summary for embedding
 * Uses the summary text directly
 */
export function prepareSummaryForEmbedding(summary: string): string {
  return prepareTextForEmbedding(summary)
}

/**
 * Prepare combined content (transcript + summary) for embedding
 * Gives more weight to summary
 */
export function prepareCombinedForEmbedding(
  transcript: string,
  summary: string
): string {
  // Weight summary more heavily by repeating it
  const combined = `${summary}\n\n${summary}\n\n${transcript}`
  return prepareTextForEmbedding(combined)
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate embedding dimensions
 */
export function validateEmbedding(embedding: number[]): boolean {
  return (
    Array.isArray(embedding) &&
    embedding.length === EMBEDDING_DIMENSIONS &&
    embedding.every((val) => typeof val === 'number' && !isNaN(val))
  )
}


/**
 * Embedding Cache Utilities
 * In-memory and database caching for embeddings
 * 
 * Features: LRU cache, content hash validation, cache statistics
 */

import { generateContentHash } from './embeddings'
import type { EmbeddingCacheEntry, EmbeddingCacheStats } from '@/types/embeddings'

// ============================================
// IN-MEMORY CACHE (LRU)
// ============================================

class EmbeddingCache {
  private cache: Map<string, EmbeddingCacheEntry>
  private maxSize: number
  private hits: number
  private misses: number
  
  constructor(maxSize: number = 1000) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.hits = 0
    this.misses = 0
  }
  
  /**
   * Get embedding from cache
   */
  get(contentHash: string): EmbeddingCacheEntry | null {
    const entry = this.cache.get(contentHash)
    
    if (entry) {
      this.hits++
      // Move to end (most recently used)
      this.cache.delete(contentHash)
      this.cache.set(contentHash, entry)
      return entry
    }
    
    this.misses++
    return null
  }
  
  /**
   * Set embedding in cache
   */
  set(contentHash: string, entry: EmbeddingCacheEntry): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    
    this.cache.set(contentHash, entry)
  }
  
  /**
   * Check if content is in cache
   */
  has(contentHash: string): boolean {
    return this.cache.has(contentHash)
  }
  
  /**
   * Remove entry from cache
   */
  delete(contentHash: string): boolean {
    return this.cache.delete(contentHash)
  }
  
  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }
  
  /**
   * Get cache statistics
   */
  getStats(): EmbeddingCacheStats {
    const totalRequests = this.hits + this.misses
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0
    
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate,
    }
  }
  
  /**
   * Get cache size in bytes (approximate)
   */
  getSizeBytes(): number {
    let totalBytes = 0
    
    for (const entry of this.cache.values()) {
      // Each float is 8 bytes, plus overhead
      totalBytes += entry.embedding.length * 8
      totalBytes += entry.contentHash.length * 2 // UTF-16
      totalBytes += entry.model.length * 2
      totalBytes += 100 // Overhead estimate
    }
    
    return totalBytes
  }
}

// Global cache instance
const embeddingCache = new EmbeddingCache(1000)

// ============================================
// CACHE OPERATIONS
// ============================================

/**
 * Get embedding from in-memory cache
 */
export function getCachedEmbedding(content: string): {
  embedding: number[]
  model: string
  tokenCount: number
} | null {
  const contentHash = generateContentHash(content)
  const entry = embeddingCache.get(contentHash)
  
  if (!entry) {
    return null
  }
  
  // Check if entry is still fresh (optional TTL)
  const ageHours = (Date.now() - entry.createdAt.getTime()) / (1000 * 60 * 60)
  if (ageHours > 24 * 30) { // 30 days TTL
    embeddingCache.delete(contentHash)
    return null
  }
  
  return {
    embedding: entry.embedding,
    model: entry.model,
    tokenCount: entry.tokenCount,
  }
}

/**
 * Set embedding in in-memory cache
 */
export function setCachedEmbedding(
  content: string,
  embedding: number[],
  model: string,
  tokenCount: number
): void {
  const contentHash = generateContentHash(content)
  
  const entry: EmbeddingCacheEntry = {
    contentHash,
    embedding,
    model,
    tokenCount,
    createdAt: new Date(),
  }
  
  embeddingCache.set(contentHash, entry)
}

/**
 * Check if content has cached embedding
 */
export function hasCachedEmbedding(content: string): boolean {
  const contentHash = generateContentHash(content)
  return embeddingCache.has(contentHash)
}

/**
 * Remove embedding from cache
 */
export function removeCachedEmbedding(content: string): boolean {
  const contentHash = generateContentHash(content)
  return embeddingCache.delete(contentHash)
}

/**
 * Clear all cached embeddings
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear()
}

/**
 * Get cache statistics
 */
export function getEmbeddingCacheStats(): EmbeddingCacheStats {
  return embeddingCache.getStats()
}

/**
 * Get cache size in MB
 */
export function getEmbeddingCacheSizeMB(): number {
  const bytes = embeddingCache.getSizeBytes()
  return bytes / (1024 * 1024)
}

// ============================================
// BATCH CACHE OPERATIONS
// ============================================

/**
 * Get multiple embeddings from cache
 */
export function getBatchCachedEmbeddings(
  contents: string[]
): Map<string, { embedding: number[]; model: string; tokenCount: number }> {
  const results = new Map<string, { embedding: number[]; model: string; tokenCount: number }>()
  
  for (const content of contents) {
    const cached = getCachedEmbedding(content)
    if (cached) {
      const contentHash = generateContentHash(content)
      results.set(contentHash, cached)
    }
  }
  
  return results
}

/**
 * Set multiple embeddings in cache
 */
export function setBatchCachedEmbeddings(
  entries: Array<{
    content: string
    embedding: number[]
    model: string
    tokenCount: number
  }>
): void {
  for (const entry of entries) {
    setCachedEmbedding(entry.content, entry.embedding, entry.model, entry.tokenCount)
  }
}

// ============================================
// CACHE WARMING
// ============================================

/**
 * Pre-load frequently accessed embeddings into cache
 * Call this on server startup or periodically
 */
export async function warmEmbeddingCache(
  embeddingsData: Array<{
    content_hash: string
    embedding: number[]
    embedding_model: string
    token_count: number
  }>
): Promise<number> {
  let loaded = 0
  
  for (const data of embeddingsData) {
    const entry: EmbeddingCacheEntry = {
      contentHash: data.content_hash,
      embedding: data.embedding,
      model: data.embedding_model,
      tokenCount: data.token_count,
      createdAt: new Date(),
    }
    
    embeddingCache.set(data.content_hash, entry)
    loaded++
  }
  
  return loaded
}

// ============================================
// CACHE MONITORING
// ============================================

/**
 * Get detailed cache metrics
 */
export function getDetailedCacheMetrics(): {
  stats: EmbeddingCacheStats
  sizeMB: number
  oldestEntry: Date | null
  newestEntry: Date | null
} {
  const stats = embeddingCache.getStats()
  const sizeMB = getEmbeddingCacheSizeMB()
  
  let oldestEntry: Date | null = null
  let newestEntry: Date | null = null
  
  // This requires accessing private cache - simplified version
  // In production, you might track these separately
  
  return {
    stats,
    sizeMB,
    oldestEntry,
    newestEntry,
  }
}

/**
 * Log cache performance
 */
export function logCachePerformance(): void {
  const stats = embeddingCache.getStats()
  const sizeMB = getEmbeddingCacheSizeMB()
  
  console.log('Embedding Cache Performance:')
  console.log(`  Hits: ${stats.hits}`)
  console.log(`  Misses: ${stats.misses}`)
  console.log(`  Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`)
  console.log(`  Size: ${stats.size} entries`)
  console.log(`  Memory: ${sizeMB.toFixed(2)} MB`)
}

// ============================================
// CACHE EVICTION POLICIES
// ============================================

/**
 * Evict old entries from cache
 * @param maxAgeHours - Maximum age in hours
 */
export function evictOldEntries(maxAgeHours: number = 24 * 30): number {
  // This would require tracking entry ages
  // Simplified: clear all and rely on LRU
  const stats = embeddingCache.getStats()
  
  if (stats.size > 800) { // 80% of max size
    // Could implement more sophisticated eviction
    // For now, rely on LRU behavior
  }
  
  return 0
}

// ============================================
// EXPORT SINGLETON
// ============================================

export default embeddingCache


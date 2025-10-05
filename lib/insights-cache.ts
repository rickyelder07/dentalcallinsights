/**
 * Insights Caching Utilities
 * Simple database-backed caching to reduce redundant API calls
 */

import { createHash } from 'crypto'

/**
 * Generate hash of transcript for cache invalidation
 * When transcript changes, hash changes, triggering regeneration
 */
export function generateTranscriptHash(transcript: string): string {
  return createHash('sha256').update(transcript.trim()).digest('hex')
}

/**
 * Check if cached insights are still valid
 * @param generatedAt - When insights were generated
 * @param transcriptHash - Hash of transcript used
 * @param currentTranscriptHash - Hash of current transcript
 * @param cacheMaxAge - Max age in days (default 30)
 */
export function isCacheValid(
  generatedAt: string,
  transcriptHash: string | null,
  currentTranscriptHash: string,
  cacheMaxAge: number = 30
): boolean {
  // Check if transcript has changed
  if (transcriptHash !== currentTranscriptHash) {
    return false
  }
  
  // Check if cache has expired
  const generatedDate = new Date(generatedAt)
  const now = new Date()
  const ageInDays = (now.getTime() - generatedDate.getTime()) / (1000 * 60 * 60 * 24)
  
  if (ageInDays > cacheMaxAge) {
    return false
  }
  
  return true
}

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  MAX_AGE_DAYS: 30, // Cache for 30 days
  ENABLED: true, // Enable caching by default
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number
  misses: number
  invalidations: number
  hitRate: number
}


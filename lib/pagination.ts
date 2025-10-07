/**
 * Pagination Library
 * Functions for paginating data with offset and cursor-based pagination
 */

import type { PaginationConfig, CursorPagination } from '@/types/filters'

// ============================================
// OFFSET-BASED PAGINATION
// ============================================

/**
 * Paginate array with offset-based pagination
 */
export function paginateArray<T>(
  items: T[],
  page: number,
  pageSize: number
): {
  items: T[]
  pagination: PaginationConfig
} {
  const totalItems = items.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const validPage = Math.max(1, Math.min(page, totalPages || 1))
  
  const startIndex = (validPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  
  const paginatedItems = items.slice(startIndex, endIndex)
  
  return {
    items: paginatedItems,
    pagination: {
      page: validPage,
      pageSize,
      totalPages,
      totalItems,
    },
  }
}

/**
 * Get pagination metadata
 */
export function getPaginationMetadata(
  totalItems: number,
  page: number,
  pageSize: number
): PaginationConfig {
  const totalPages = Math.ceil(totalItems / pageSize)
  const validPage = Math.max(1, Math.min(page, totalPages || 1))
  
  return {
    page: validPage,
    pageSize,
    totalPages,
    totalItems,
  }
}

/**
 * Check if has next page
 */
export function hasNextPage(pagination: PaginationConfig): boolean {
  if (!pagination.totalPages) return false
  return pagination.page < pagination.totalPages
}

/**
 * Check if has previous page
 */
export function hasPreviousPage(pagination: PaginationConfig): boolean {
  return pagination.page > 1
}

/**
 * Get page range for display
 */
export function getPageRange(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): number[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  
  const half = Math.floor(maxVisible / 2)
  let start = Math.max(1, currentPage - half)
  let end = Math.min(totalPages, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

// ============================================
// CURSOR-BASED PAGINATION (for infinite scroll)
// ============================================

/**
 * Paginate with cursor
 */
export function paginateWithCursor<T extends { id: string }>(
  items: T[],
  cursor: string | undefined,
  limit: number
): {
  items: T[]
  pagination: CursorPagination
} {
  let startIndex = 0
  
  if (cursor) {
    const cursorIndex = items.findIndex((item) => item.id === cursor)
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1
    }
  }
  
  const paginatedItems = items.slice(startIndex, startIndex + limit)
  const hasMore = startIndex + limit < items.length
  const nextCursor = hasMore && paginatedItems.length > 0
    ? paginatedItems[paginatedItems.length - 1].id
    : undefined
  
  return {
    items: paginatedItems,
    pagination: {
      cursor: nextCursor,
      limit,
      hasMore,
    },
  }
}

/**
 * Create infinite scroll loader
 */
export class InfiniteScrollLoader<T extends { id: string }> {
  private items: T[] = []
  private cursor?: string
  private hasMore: boolean = true
  private limit: number
  
  constructor(limit: number = 20) {
    this.limit = limit
  }
  
  /**
   * Load next page
   */
  loadNext(allItems: T[]): T[] {
    const result = paginateWithCursor(allItems, this.cursor, this.limit)
    
    this.items = [...this.items, ...result.items]
    this.cursor = result.pagination.cursor
    this.hasMore = result.pagination.hasMore
    
    return result.items
  }
  
  /**
   * Reset loader
   */
  reset(): void {
    this.items = []
    this.cursor = undefined
    this.hasMore = true
  }
  
  /**
   * Get all loaded items
   */
  getItems(): T[] {
    return this.items
  }
  
  /**
   * Check if more items available
   */
  canLoadMore(): boolean {
    return this.hasMore
  }
}

// ============================================
// PAGINATION HELPERS
// ============================================

/**
 * Calculate offset from page and page size
 */
export function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize
}

/**
 * Calculate page from offset and page size
 */
export function calculatePage(offset: number, pageSize: number): number {
  return Math.floor(offset / pageSize) + 1
}

/**
 * Get item range text (e.g., "1-20 of 100")
 */
export function getItemRangeText(pagination: PaginationConfig): string {
  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, pagination.totalItems || 0)
  const total = pagination.totalItems || 0
  
  if (total === 0) return 'No items'
  
  return `${start}-${end} of ${total}`
}

/**
 * Generate pagination summary
 */
export function getPaginationSummary(pagination: PaginationConfig): {
  showing: number
  total: number
  start: number
  end: number
  canNext: boolean
  canPrevious: boolean
} {
  const start = (pagination.page - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.page * pagination.pageSize, pagination.totalItems || 0)
  const showing = Math.max(0, end - start + 1)
  
  return {
    showing,
    total: pagination.totalItems || 0,
    start,
    end,
    canNext: hasNextPage(pagination),
    canPrevious: hasPreviousPage(pagination),
  }
}

// ============================================
// COMMON PAGE SIZES
// ============================================

export const DEFAULT_PAGE_SIZE = 20
export const COMMON_PAGE_SIZES = [10, 20, 50, 100]

/**
 * Get recommended page size based on total items
 */
export function getRecommendedPageSize(totalItems: number): number {
  if (totalItems <= 20) return 10
  if (totalItems <= 100) return 20
  if (totalItems <= 500) return 50
  return 100
}


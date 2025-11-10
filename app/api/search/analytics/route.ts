/**
 * Search Analytics API Route
 * GET /api/search/analytics
 * 
 * Retrieves search analytics and usage statistics
 * Security: Server-side only, user-specific data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
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
    
    // Get query parameters
    const searchParams = req.nextUrl.searchParams
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Get total searches
    let searchQuery = supabase
      .from('search_queries')
      .select('*', { count: 'exact', head: false })
      .eq('user_id', user.id)
    
    // Fix timezone issue: format dates in local timezone for proper comparison
    if (dateFrom) {
      const [startYear, startMonth, startDay] = dateFrom.split('-').map(Number)
      const startDateStr = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')} 00:00:00`
      searchQuery = searchQuery.gte('created_at', startDateStr)
    }
    if (dateTo) {
      const [endYear, endMonth, endDay] = dateTo.split('-').map(Number)
      const endDateStr = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')} 23:59:59`
      searchQuery = searchQuery.lte('created_at', endDateStr)
    }
    
    const { data: searches, count: totalSearches, error: searchError } = await searchQuery
    
    if (searchError) {
      console.error('Search analytics error:', searchError)
      return NextResponse.json(
        { error: searchError.message },
        { status: 500 }
      )
    }
    
    // Calculate statistics
    const uniqueQueries = new Set(searches?.map(s => s.query_text) || []).size
    const avgResultCount = searches?.length
      ? searches.reduce((sum, s) => sum + s.result_count, 0) / searches.length
      : 0
    const avgSearchTime = searches?.length
      ? searches.reduce((sum, s) => sum + s.search_time_ms, 0) / searches.length
      : 0
    const successRate = searches?.length
      ? searches.filter(s => s.has_results).length / searches.length
      : 0
    
    // Get popular queries
    const queryMap = new Map<string, {
      count: number
      totalResults: number
      totalTime: number
      lastSearched: string
    }>()
    
    searches?.forEach(search => {
      const existing = queryMap.get(search.query_text) || {
        count: 0,
        totalResults: 0,
        totalTime: 0,
        lastSearched: search.created_at,
      }
      
      queryMap.set(search.query_text, {
        count: existing.count + 1,
        totalResults: existing.totalResults + search.result_count,
        totalTime: existing.totalTime + search.search_time_ms,
        lastSearched: search.created_at > existing.lastSearched
          ? search.created_at
          : existing.lastSearched,
      })
    })
    
    const popularQueries = Array.from(queryMap.entries())
      .map(([query, stats]) => ({
        query,
        searchCount: stats.count,
        avgResultCount: stats.totalResults / stats.count,
        avgSearchTime: stats.totalTime / stats.count,
        lastSearched: stats.lastSearched,
      }))
      .sort((a, b) => b.searchCount - a.searchCount)
      .slice(0, limit)
    
    // Get searches by day
    const dayMap = new Map<string, number>()
    searches?.forEach(search => {
      const date = new Date(search.created_at).toISOString().split('T')[0]
      dayMap.set(date, (dayMap.get(date) || 0) + 1)
    })
    
    const searchesByDay = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    // Get click-through rate
    const { data: clicks, error: clicksError } = await supabase
      .from('search_result_clicks')
      .select('search_query_id')
      .eq('user_id', user.id)
    
    const searchesWithClicks = new Set(clicks?.map(c => c.search_query_id) || [])
    const clickThroughRate = searches?.length
      ? searchesWithClicks.size / searches.length
      : 0
    
    // Return analytics
    return NextResponse.json({
      success: true,
      analytics: {
        totalSearches: totalSearches || 0,
        uniqueQueries,
        avgResultCount,
        avgSearchTime,
        popularQueries,
        searchesByDay,
        successRate,
        clickThroughRate,
      },
    })
  } catch (error) {
    console.error('Search analytics API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


/**
 * Caller Analytics API Route
 * GET /api/analytics/caller-stats - Get caller performance analytics
 * Query params:
 *   - extension: specific extension (optional, if omitted returns all extensions overview)
 *   - dateStart: start date for filtering (optional)
 *   - dateEnd: end date for filtering (optional)
 *   - forceRefresh: bypass cache (optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAPIClient } from '@/lib/supabase-server'
import { computeCallerOverviewAnalytics, computeCallerPerformanceMetrics } from '@/lib/analytics'

export async function GET(request: NextRequest) {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create Supabase client with user context
    const supabase = createAPIClient(token)

    // Verify user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const extension = searchParams.get('extension')
    const dateStart = searchParams.get('dateStart')
    const dateEnd = searchParams.get('dateEnd')
    const forceRefresh = searchParams.get('forceRefresh') === 'true'

    // Build cache key
    const cacheKey = extension 
      ? `caller-performance:${user.id}:${extension}:${dateStart || 'all'}:${dateEnd || 'all'}`
      : `caller-overview:${user.id}:${dateStart || 'all'}:${dateEnd || 'all'}`
    
    const cacheType = extension ? 'caller_performance' : 'caller_overview'

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const { data: cachedData } = await supabase
        .from('analytics_cache')
        .select('*')
        .eq('user_id', user.id)
        .eq('cache_key', cacheKey)
        .single()

      if (cachedData && cachedData.expires_at) {
        const expiresAt = new Date(cachedData.expires_at)
        if (expiresAt > new Date()) {
          return NextResponse.json({
            success: true,
            data: cachedData.data,
            cached: true,
            computedAt: cachedData.computed_at,
          })
        }
      }
    }

    // Fetch calls with date filtering if provided
    // RLS policies will automatically filter to show team members' calls
    let callsQuery = supabase
      .from('calls')
      .select('*')
      .order('call_time', { ascending: false })
      .limit(10000) // Increase from default 1000 to support larger datasets

    // Fix timezone issue: format dates in local timezone for proper comparison
    if (dateStart) {
      const [startYear, startMonth, startDay] = dateStart.split('-').map(Number)
      const startDateStr = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')} 00:00:00`
      callsQuery = callsQuery.gte('call_time', startDateStr)
    }
    if (dateEnd) {
      const [endYear, endMonth, endDay] = dateEnd.split('-').map(Number)
      const endDateStr = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')} 23:59:59`
      callsQuery = callsQuery.lte('call_time', endDateStr)
    }

    const { data: calls, error: callsError } = await callsQuery

    if (callsError) throw callsError

    // Fetch insights
    const { data: insights, error: insightsError } = await supabase
      .from('insights')
      .select('*')
      .eq('user_id', user.id)
      .limit(10000) // Increase from default 1000 to support larger datasets

    if (insightsError) throw insightsError

    // Compute analytics based on whether extension is specified
    let analyticsData
    
    if (extension) {
      // Single extension performance metrics
      analyticsData = computeCallerPerformanceMetrics(
        extension,
        calls || [],
        insights || [],
        { start: dateStart || undefined, end: dateEnd || undefined }
      )
    } else {
      // All extensions overview
      // Apply date filtering to insights as well
      let filteredInsights = insights || []
      if (calls && calls.length > 0) {
        const callIds = new Set(calls.map((c: any) => c.id))
        filteredInsights = filteredInsights.filter((i: any) => callIds.has(i.call_id))
      }
      
      analyticsData = computeCallerOverviewAnalytics(
        calls || [],
        filteredInsights
      )
    }

    // Cache the result (expires in 1 hour)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    await supabase
      .from('analytics_cache')
      .upsert({
        user_id: user.id,
        cache_key: cacheKey,
        cache_type: cacheType,
        data: analyticsData,
        computed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        date_range_start: dateStart || null,
        date_range_end: dateEnd || null,
      })
      .select()

    return NextResponse.json({
      success: true,
      data: analyticsData,
      cached: false,
      computedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Caller analytics error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch caller analytics',
      },
      { status: 500 }
    )
  }
}


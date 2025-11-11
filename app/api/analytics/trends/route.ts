/**
 * Analytics Trends API Route
 * GET /api/analytics/trends - Get trend analytics over time
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAPIClient } from '@/lib/supabase-server'
import { computeTrendsAnalytics } from '@/lib/analytics'

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
    const period = (searchParams.get('period') || 'day') as 'day' | 'week' | 'month'
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    const cacheKey = `trends:${user.id}:${period}`

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const { data: cachedData } = await supabase
        .from('analytics_cache')
        .select('*')
        .eq('user_id', user.id)
        .eq('cache_key', cacheKey)
        .eq('cache_type', 'trends')
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

    // Fetch calls and insights
    // RLS policies will automatically filter to show team members' data
    const [callsResult, insightsResult] = await Promise.all([
      supabase.from('calls').select('*').limit(10000),
      supabase.from('insights').select('*').limit(10000),
    ])

    if (callsResult.error) throw callsResult.error

    const calls = callsResult.data || []
    const insights = insightsResult.data || []

    // Compute trends
    const trends = computeTrendsAnalytics(calls, insights, period)

    // Cache the result (expires in 1 hour)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    await supabase
      .from('analytics_cache')
      .upsert({
        user_id: user.id,
        cache_key: cacheKey,
        cache_type: 'trends',
        data: trends,
        computed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()

    return NextResponse.json({
      success: true,
      data: trends,
      cached: false,
      computedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Analytics trends error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trends',
      },
      { status: 500 }
    )
  }
}


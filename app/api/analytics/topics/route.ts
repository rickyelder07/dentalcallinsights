/**
 * Analytics Topics API Route
 * GET /api/analytics/topics - Get topic analytics and keyword extraction
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAPIClient } from '@/lib/supabase-server'
import { computeTopicsAnalytics } from '@/lib/analytics'

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
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    const cacheKey = `topics:${user.id}`

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const { data: cachedData } = await supabase
        .from('analytics_cache')
        .select('*')
        .eq('user_id', user.id)
        .eq('cache_key', cacheKey)
        .eq('cache_type', 'topics')
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

    // Fetch insights and transcripts
    // RLS policies will automatically filter to show team members' data
    const [insightsResult, transcriptsResult] = await Promise.all([
      supabase.from('insights').select('*'),
      supabase
        .from('transcripts')
        .select('*, calls!inner(id)'),
    ])

    if (insightsResult.error) throw insightsResult.error

    const insights = insightsResult.data || []
    const transcripts = transcriptsResult.data || []

    // Compute topics analytics
    const topicsAnalytics = computeTopicsAnalytics(insights, transcripts)

    // Cache the result (expires in 6 hours - topics change less frequently)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 6)

    await supabase
      .from('analytics_cache')
      .upsert({
        user_id: user.id,
        cache_key: cacheKey,
        cache_type: 'topics',
        data: topicsAnalytics,
        computed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()

    return NextResponse.json({
      success: true,
      data: topicsAnalytics,
      cached: false,
      computedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Analytics topics error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch topics analytics',
      },
      { status: 500 }
    )
  }
}


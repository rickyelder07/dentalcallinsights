/**
 * Call Highlights API Route
 * GET /api/analytics/call-highlights - Get daily call highlights
 * Query params:
 *   - dateStart: start date for filtering (required)
 *   - dateEnd: end date for filtering (required)
 *   - forceRefresh: bypass cache (optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAPIClient } from '@/lib/supabase-server'
import {
  rankCallsByPerformance,
  findHighestPerformer,
  findLowestPerformer,
  rankNewPatientCalls,
} from '@/lib/analytics'

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
    const dateStart = searchParams.get('dateStart')
    const dateEnd = searchParams.get('dateEnd')
    const forceRefresh = searchParams.get('forceRefresh') === 'true'

    if (!dateStart || !dateEnd) {
      return NextResponse.json(
        { success: false, error: 'dateStart and dateEnd are required' },
        { status: 400 }
      )
    }

    // Build cache key
    const cacheKey = `call-highlights:${user.id}:${dateStart}:${dateEnd}`

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

    // Fetch calls with date filtering
    const endDate = new Date(dateEnd)
    endDate.setHours(23, 59, 59, 999)

    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', user.id)
      .gte('call_time', dateStart)
      .lte('call_time', endDate.toISOString())
      .order('call_time', { ascending: false })

    if (callsError) throw callsError

    // Fetch insights for those calls
    const callIds = (calls || []).map((c: any) => c.id)
    
    const { data: insights, error: insightsError } = await supabase
      .from('insights')
      .select('*')
      .in('call_id', callIds)

    if (insightsError) throw insightsError

    // Process all the data
    const allCalls = calls || []
    const allInsights = insights || []

    // 1. Longest Calls - top 20 by duration
    const longestCalls = [...allCalls]
      .filter((c) => c.call_duration_seconds && c.call_duration_seconds > 0)
      .sort((a, b) => b.call_duration_seconds - a.call_duration_seconds)
      .slice(0, 20)
      .map((call) => {
        const insight = allInsights.find((i: any) => i.call_id === call.id)
        return {
          call,
          insights: insight || null,
          duration: call.call_duration_seconds,
          sentiment: insight?.overall_sentiment || 'unknown',
          satisfactionScore: 50,
        }
      })

    // 2. Positive Calls - top 20 by performance score
    const positiveCallsRanked = rankCallsByPerformance(allCalls, allInsights).slice(0, 20)

    // 3. Negative Calls - all calls with negative sentiment
    const insightsByCallId = new Map(allInsights.map((i: any) => [i.call_id, i]))
    const negativeCalls = allCalls
      .filter((call) => {
        const insight = insightsByCallId.get(call.id)
        return insight && insight.overall_sentiment === 'negative'
      })
      .map((call) => {
        const insight = insightsByCallId.get(call.id)
        return {
          call,
          insights: insight,
          duration: call.call_duration_seconds || 0,
          sentiment: 'negative',
          satisfactionScore: 50,
        }
      })

    // 4. Highest Performer
    const highestPerformer = findHighestPerformer(allCalls, allInsights)

    // 5. Lowest Performer
    const lowestPerformer = findLowestPerformer(allCalls, allInsights)

    // 6. Good New Patient Calls - top 20
    const newPatientGood = rankNewPatientCalls(allCalls, allInsights, 'good').slice(0, 20)

    // 7. Poor New Patient Calls - top 20
    const newPatientPoor = rankNewPatientCalls(allCalls, allInsights, 'poor').slice(0, 20)

    const highlightsData = {
      longestCalls,
      positiveCallsRanked,
      negativeCalls,
      highestPerformer,
      lowestPerformer,
      newPatientGood,
      newPatientPoor,
      dateRange: { start: dateStart, end: dateEnd },
    }

    // Cache the result (expires in 1 hour)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    await supabase
      .from('analytics_cache')
      .upsert({
        user_id: user.id,
        cache_key: cacheKey,
        cache_type: 'call_highlights',
        data: highlightsData,
        computed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        date_range_start: dateStart,
        date_range_end: dateEnd,
      })
      .select()

    return NextResponse.json({
      success: true,
      data: highlightsData,
      cached: false,
      computedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Call highlights error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch call highlights',
      },
      { status: 500 }
    )
  }
}


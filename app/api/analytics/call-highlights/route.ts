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
  console.log('=== CALL HIGHLIGHTS API CALLED ===')
  console.log('Request URL:', request.url)
  
  // Declare variables in outer scope for error handler
  let dateStart: string | null = null
  let dateEnd: string | null = null
  
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      console.error('No auth token provided')
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
    dateStart = searchParams.get('dateStart')
    dateEnd = searchParams.get('dateEnd')
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
    // Use ISO format for timestamptz comparisons (Supabase expects ISO format)
    // Create dates in UTC directly to avoid timezone conversion issues
    let startDateISO: string
    let endDateISO: string
    
    try {
      const [startYear, startMonth, startDay] = dateStart.split('-').map(Number)
      if (isNaN(startYear) || isNaN(startMonth) || isNaN(startDay)) {
        throw new Error(`Invalid start date: ${dateStart}`)
      }
      // Create UTC date directly (midnight UTC for the start date)
      startDateISO = `${dateStart}T00:00:00.000Z`
      
      const [endYear, endMonth, endDay] = dateEnd.split('-').map(Number)
      if (isNaN(endYear) || isNaN(endMonth) || isNaN(endDay)) {
        throw new Error(`Invalid end date: ${dateEnd}`)
      }
      // Create UTC date directly (end of day UTC for the end date)
      endDateISO = `${dateEnd}T23:59:59.999Z`
      
      console.log('Date range:', { dateStart, dateEnd, startDateISO, endDateISO })
    } catch (dateError) {
      console.error('Date parsing error:', dateError)
      throw new Error(`Date parsing failed: ${dateError instanceof Error ? dateError.message : 'Unknown error'}`)
    }

    console.log('Fetching calls...')
    // RLS policies will automatically filter to show team members' calls
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .gte('call_time', startDateISO)
      .lte('call_time', endDateISO)
      .order('call_time', { ascending: false })
      .limit(10000) // Increase from default 1000 to support larger datasets

    if (callsError) {
      console.error('Error fetching calls:', callsError)
      throw callsError
    }
    console.log(`Fetched ${calls?.length || 0} calls`)

    // Fetch insights for those calls
    // Batch the query in chunks of 100 to avoid timeout issues
    const callIds = (calls || []).map((c: any) => c.id)
    
    let insights: any[] = []
    if (callIds.length > 0) {
      console.log(`Fetching insights for ${callIds.length} calls...`)
      
      // Split into chunks of 100
      const chunkSize = 100
      const chunks = []
      for (let i = 0; i < callIds.length; i += chunkSize) {
        chunks.push(callIds.slice(i, i + chunkSize))
      }
      
      // Fetch each chunk
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Fetching chunk ${i + 1}/${chunks.length}...`)
        const { data: insightsData, error: insightsError } = await supabase
          .from('insights')
          .select('*')
          .in('call_id', chunks[i])

        if (insightsError) {
          console.error(`Error fetching insights chunk ${i + 1}:`, insightsError)
          throw insightsError
        }
        insights = insights.concat(insightsData || [])
      }
      
      console.log(`Fetched ${insights.length} total insights`)
    }

    // Process all the data
    console.log('Processing data...')
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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      dateStart,
      dateEnd,
    })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch call highlights',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      { status: 500 }
    )
  }
}


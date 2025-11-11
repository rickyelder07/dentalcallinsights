/**
 * GET /api/qa/dashboard
 * Get comprehensive QA dashboard data and analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAPIClient } from '@/lib/supabase-server'
import type { QADashboardData } from '@/types/qa'

export async function GET(request: NextRequest) {
  try {
    // Get authorization token from header
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
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters for filtering
    const url = new URL(request.url)
    const dateRangeStart = url.searchParams.get('dateRangeStart')
    const dateRangeEnd = url.searchParams.get('dateRangeEnd')
    const agents = url.searchParams.get('agents')?.split(',').filter(Boolean)

    // Build base query
    let scoresQuery = supabase
      .from('call_scores')
      .select(`
        *,
        call:calls(
          id,
          filename,
          call_time,
          call_direction,
          call_duration_seconds
        )
      `)
      // RLS policies will automatically filter to show team members' data
      .order('scored_at', { ascending: false })

    // Apply filters
    // Fix timezone issue: format dates in local timezone for proper comparison
    if (dateRangeStart) {
      const [startYear, startMonth, startDay] = dateRangeStart.split('-').map(Number)
      const startDateStr = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')} 00:00:00`
      scoresQuery = scoresQuery.gte('scored_at', startDateStr)
    }
    if (dateRangeEnd) {
      const [endYear, endMonth, endDay] = dateRangeEnd.split('-').map(Number)
      const endDateStr = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')} 23:59:59`
      scoresQuery = scoresQuery.lte('scored_at', endDateStr)
    }
    if (agents && agents.length > 0) {
      scoresQuery = scoresQuery.in('agent_name', agents)
    }

    const { data: scores, error: scoresError } = await scoresQuery

    if (scoresError) {
      console.error('Error fetching scores:', scoresError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch scores' },
        { status: 500 }
      )
    }

    // Get criteria for all scores
    let criteriaData: any[] = []
    if (scores && scores.length > 0) {
      const scoreIds = scores.map(s => s.id)
      const { data: criteria, error: criteriaError } = await supabase
        .from('score_criteria')
        .select('*')
        .in('score_id', scoreIds)

      if (criteriaError) {
        console.error('Error fetching criteria:', criteriaError)
      } else {
        criteriaData = criteria || []
      }
    }

    // Get pending assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('qa_assignments')
      .select(`
        *,
        call:calls(
          id,
          filename,
          call_time,
          call_direction,
          call_duration_seconds
        )
      `)
      .eq('assigned_to', user.id)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(10)

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
    }

    // ========================================
    // CALCULATE STATISTICS
    // ========================================

    // Overview statistics
    const overview = {
      user_id: user.id,
      total_scores: scores?.length || 0,
      avg_score: 0,
      min_score: 0,
      max_score: 0,
      avg_starting_call: 0,
      avg_upselling: 0,
      avg_rebuttals: 0,
      avg_qualitative: 0,
      unique_agents: 0,
      scoring_days: 0
    }

    if (scores && scores.length > 0) {
      const totalScores = scores.map(s => s.total_score)
      overview.avg_score = Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length)
      overview.min_score = Math.min(...totalScores)
      overview.max_score = Math.max(...totalScores)

      overview.avg_starting_call = Math.round(
        scores.reduce((a, b) => a + (b.starting_call_score || 0), 0) / scores.length
      )
      overview.avg_upselling = Math.round(
        scores.reduce((a, b) => a + (b.upselling_score || 0), 0) / scores.length
      )
      overview.avg_rebuttals = Math.round(
        scores.reduce((a, b) => a + (b.rebuttals_score || 0), 0) / scores.length
      )
      overview.avg_qualitative = Math.round(
        scores.reduce((a, b) => a + (b.qualitative_score || 0), 0) / scores.length
      )

      const uniqueAgents = new Set(scores.map(s => s.agent_name).filter(Boolean))
      overview.unique_agents = uniqueAgents.size

      const uniqueDays = new Set(scores.map(s => s.scored_at.split('T')[0]))
      overview.scoring_days = uniqueDays.size
    }

    // Agent performance
    const agentPerformance: any[] = []
    if (scores && scores.length > 0) {
      const agentMap = new Map()
      scores.forEach(score => {
        if (!score.agent_name) return
        
        if (!agentMap.has(score.agent_name)) {
          agentMap.set(score.agent_name, {
            user_id: user.id,
            agent_name: score.agent_name,
            total_evaluations: 0,
            total_score: 0,
            min_score: 100,
            max_score: 0,
            starting_call_sum: 0,
            upselling_sum: 0,
            rebuttals_sum: 0,
            qualitative_sum: 0,
            last_scored: score.scored_at
          })
        }

        const agent = agentMap.get(score.agent_name)
        agent.total_evaluations++
        agent.total_score += score.total_score
        agent.min_score = Math.min(agent.min_score, score.total_score)
        agent.max_score = Math.max(agent.max_score, score.total_score)
        agent.starting_call_sum += score.starting_call_score || 0
        agent.upselling_sum += score.upselling_score || 0
        agent.rebuttals_sum += score.rebuttals_score || 0
        agent.qualitative_sum += score.qualitative_score || 0
        
        if (score.scored_at > agent.last_scored) {
          agent.last_scored = score.scored_at
        }
      })

      agentMap.forEach(agent => {
        agentPerformance.push({
          user_id: agent.user_id,
          agent_name: agent.agent_name,
          total_evaluations: agent.total_evaluations,
          avg_score: Math.round(agent.total_score / agent.total_evaluations),
          min_score: agent.min_score,
          max_score: agent.max_score,
          avg_starting_call: Math.round(agent.starting_call_sum / agent.total_evaluations),
          avg_upselling: Math.round(agent.upselling_sum / agent.total_evaluations),
          avg_rebuttals: Math.round(agent.rebuttals_sum / agent.total_evaluations),
          avg_qualitative: Math.round(agent.qualitative_sum / agent.total_evaluations),
          last_scored: agent.last_scored
        })
      })
    }

    // Failed criteria analysis
    const failedCriteria: any[] = []
    if (criteriaData.length > 0) {
      const criteriaMap = new Map()
      
      criteriaData.forEach(criterion => {
        if (criterion.score >= criterion.criterion_weight) return // Not failed
        
        const key = `${criterion.criterion_name}_${criterion.criterion_category}`
        if (!criteriaMap.has(key)) {
          criteriaMap.set(key, {
            user_id: user.id,
            criterion_name: criterion.criterion_name,
            criterion_category: criterion.criterion_category,
            criterion_weight: criterion.criterion_weight,
            failure_count: 0,
            total_score: 0,
            zero_score_count: 0,
            not_applicable_count: 0
          })
        }

        const item = criteriaMap.get(key)
        item.failure_count++
        item.total_score += criterion.score
        if (criterion.score === 0) item.zero_score_count++
        if (!criterion.applicable) item.not_applicable_count++
      })

      criteriaMap.forEach(item => {
        failedCriteria.push({
          ...item,
          avg_score: Math.round(item.total_score / item.failure_count)
        })
      })

      // Sort by failure count
      failedCriteria.sort((a, b) => b.failure_count - a.failure_count)
    }

    // Score distribution
    const scoreDistribution = [
      { range: '0-20', count: 0, percentage: 0 },
      { range: '21-40', count: 0, percentage: 0 },
      { range: '41-60', count: 0, percentage: 0 },
      { range: '61-80', count: 0, percentage: 0 },
      { range: '81-100', count: 0, percentage: 0 }
    ]

    if (scores && scores.length > 0) {
      scores.forEach(score => {
        const s = score.total_score
        if (s <= 20) scoreDistribution[0].count++
        else if (s <= 40) scoreDistribution[1].count++
        else if (s <= 60) scoreDistribution[2].count++
        else if (s <= 80) scoreDistribution[3].count++
        else scoreDistribution[4].count++
      })

      scoreDistribution.forEach(bucket => {
        bucket.percentage = Math.round((bucket.count / scores.length) * 100)
      })
    }

    // Score trends (last 30 days)
    const scoreTrends: any[] = []
    if (scores && scores.length > 0) {
      const trendsMap = new Map()
      
      scores.forEach(score => {
        const date = score.scored_at.split('T')[0]
        if (!trendsMap.has(date)) {
          trendsMap.set(date, { total: 0, count: 0 })
        }
        const day = trendsMap.get(date)
        day.total += score.total_score
        day.count++
      })

      trendsMap.forEach((value, date) => {
        scoreTrends.push({
          date,
          avg_score: Math.round(value.total / value.count),
          count: value.count
        })
      })

      scoreTrends.sort((a, b) => a.date.localeCompare(b.date))
    }

    // Category performance
    const categoryPerformance = [
      {
        category: 'starting_call' as const,
        category_label: 'Starting The Call Right',
        avg_score: overview.avg_starting_call,
        max_possible: 30,
        percentage: Math.round((overview.avg_starting_call / 30) * 100),
        trend: 'stable' as const
      },
      {
        category: 'upselling' as const,
        category_label: 'Upselling & Closing',
        avg_score: overview.avg_upselling,
        max_possible: 25,
        percentage: Math.round((overview.avg_upselling / 25) * 100),
        trend: 'stable' as const
      },
      {
        category: 'rebuttals' as const,
        category_label: 'Handling Rebuttals',
        avg_score: overview.avg_rebuttals,
        max_possible: 10,
        percentage: Math.round((overview.avg_rebuttals / 10) * 100),
        trend: 'stable' as const
      },
      {
        category: 'qualitative' as const,
        category_label: 'Qualitative Assessments',
        avg_score: overview.avg_qualitative,
        max_possible: 35,
        percentage: Math.round((overview.avg_qualitative / 35) * 100),
        trend: 'stable' as const
      }
    ]

    // Recent scores with criteria
    const recentScores = scores?.slice(0, 10).map(score => ({
      ...score,
      criteria: criteriaData.filter(c => c.score_id === score.id)
    })) || []

    // Prepare dashboard data
    const dashboardData: QADashboardData = {
      overview,
      agentPerformance,
      failedCriteria,
      scoreDistribution,
      scoreTrends,
      categoryPerformance,
      recentScores,
      pendingAssignments: assignments || []
    }

    return NextResponse.json({
      success: true,
      data: dashboardData
    })

  } catch (error) {
    console.error('Error in GET /api/qa/dashboard:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


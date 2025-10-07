/**
 * GET /api/qa/scores/:callId
 * Get scoring history for a specific call
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAPIClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
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

    const callId = params.callId

    // Verify call belongs to user
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, user_id')
      .eq('id', callId)
      .single()

    if (callError || !call) {
      return NextResponse.json(
        { success: false, error: 'Call not found' },
        { status: 404 }
      )
    }

    if (call.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get scores for this call
    const { data: scores, error: scoresError } = await supabase
      .from('call_scores')
      .select('*')
      .eq('call_id', callId)
      .eq('user_id', user.id)
      .order('scored_at', { ascending: false })

    if (scoresError) {
      console.error('Error fetching scores:', scoresError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch scores' },
        { status: 500 }
      )
    }

    // If no scores found, return empty array
    if (!scores || scores.length === 0) {
      return NextResponse.json({
        success: true,
        scores: []
      })
    }

    // Get criteria for each score
    const scoreIds = scores.map(s => s.id)
    const { data: allCriteria, error: criteriaError } = await supabase
      .from('score_criteria')
      .select('*')
      .in('score_id', scoreIds)
      .order('created_at', { ascending: true })

    if (criteriaError) {
      console.error('Error fetching criteria:', criteriaError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch criteria' },
        { status: 500 }
      )
    }

    // Combine scores with criteria
    const scoresWithCriteria = scores.map(score => ({
      ...score,
      criteria: allCriteria?.filter(c => c.score_id === score.id) || []
    }))

    return NextResponse.json({
      success: true,
      scores: scoresWithCriteria
    })

  } catch (error) {
    console.error('Error in GET /api/qa/scores/:callId:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


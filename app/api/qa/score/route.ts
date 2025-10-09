/**
 * POST /api/qa/score
 * Submit or update QA scores for a call
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAPIClient } from '@/lib/supabase-server'
import type { ScoreSubmissionRequest, ScoreUpdateRequest as _ScoreUpdateRequest } from '@/types/qa'

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body: ScoreSubmissionRequest = await request.json()

    // Validate required fields
    if (!body.call_id || !body.criteria || !Array.isArray(body.criteria)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: call_id and criteria are required' },
        { status: 400 }
      )
    }

    // Validate criteria format
    for (const criterion of body.criteria) {
      if (
        !criterion.criterion_name ||
        !criterion.criterion_category ||
        criterion.criterion_weight === undefined ||
        criterion.score === undefined ||
        criterion.applicable === undefined
      ) {
        return NextResponse.json(
          { success: false, error: 'Invalid criterion format' },
          { status: 400 }
        )
      }

      // Validate score is within valid range
      if (criterion.score < 0 || criterion.score > criterion.criterion_weight) {
        return NextResponse.json(
          { success: false, error: `Invalid score for ${criterion.criterion_name}: must be between 0 and ${criterion.criterion_weight}` },
          { status: 400 }
        )
      }
    }

    // Verify call belongs to user
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, user_id')
      .eq('id', body.call_id)
      .single()

    if (callError || !call) {
      return NextResponse.json(
        { success: false, error: 'Call not found' },
        { status: 404 }
      )
    }

    if (call.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to score this call' },
        { status: 403 }
      )
    }

    // Calculate category scores
    const categoryScores = {
      starting_call: 0,
      upselling: 0,
      rebuttals: 0,
      qualitative: 0
    }

    let totalScore = 0

    body.criteria.forEach(criterion => {
      if (criterion.applicable) {
        const category = criterion.criterion_category as keyof typeof categoryScores
        if (categoryScores[category] !== undefined) {
          categoryScores[category] += criterion.score
        }
        totalScore += criterion.score
      }
    })

    // Check if score already exists for this call
    const { data: existingScore, error: existingError } = await supabase
      .from('call_scores')
      .select('id')
      .eq('call_id', body.call_id)
      .eq('user_id', user.id)
      .single()

    let scoreId: string

    if (existingScore) {
      // Update existing score
      const { data: updatedScore, error: updateError } = await supabase
        .from('call_scores')
        .update({
          total_score: totalScore,
          starting_call_score: categoryScores.starting_call,
          upselling_score: categoryScores.upselling,
          rebuttals_score: categoryScores.rebuttals,
          qualitative_score: categoryScores.qualitative,
          scorer_notes: body.scorer_notes,
          agent_name: body.agent_name,
          review_status: body.review_status || 'completed',
          scored_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingScore.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating score:', updateError)
        return NextResponse.json(
          { success: false, error: 'Failed to update score' },
          { status: 500 }
        )
      }

      scoreId = existingScore.id

      // Delete existing criteria
      await supabase
        .from('score_criteria')
        .delete()
        .eq('score_id', scoreId)
    } else {
      // Insert new score
      const { data: newScore, error: insertError } = await supabase
        .from('call_scores')
        .insert({
          call_id: body.call_id,
          user_id: user.id,
          total_score: totalScore,
          starting_call_score: categoryScores.starting_call,
          upselling_score: categoryScores.upselling,
          rebuttals_score: categoryScores.rebuttals,
          qualitative_score: categoryScores.qualitative,
          scorer_notes: body.scorer_notes,
          agent_name: body.agent_name,
          review_status: body.review_status || 'completed',
          scored_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting score:', insertError)
        return NextResponse.json(
          { success: false, error: 'Failed to save score' },
          { status: 500 }
        )
      }

      scoreId = newScore.id
    }

    // Insert criteria
    const criteriaToInsert = body.criteria.map(criterion => ({
      score_id: scoreId,
      criterion_name: criterion.criterion_name,
      criterion_category: criterion.criterion_category,
      criterion_weight: criterion.criterion_weight,
      score: criterion.score,
      applicable: criterion.applicable,
      notes: criterion.notes,
      transcript_excerpt: criterion.transcript_excerpt
    }))

    const { error: criteriaError } = await supabase
      .from('score_criteria')
      .insert(criteriaToInsert)

    if (criteriaError) {
      console.error('Error inserting criteria:', criteriaError)
      return NextResponse.json(
        { success: false, error: 'Failed to save criteria' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      score_id: scoreId,
      total_score: totalScore,
      message: existingScore ? 'Score updated successfully' : 'Score saved successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/qa/score:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


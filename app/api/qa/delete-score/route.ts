/**
 * DELETE /api/qa/delete-score
 * Delete a specific QA score and its criteria
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAPIClient } from '@/lib/supabase-server'

export async function DELETE(request: NextRequest) {
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

    // Parse request body to get scoreId
    const body = await request.json()
    const { scoreId } = body

    if (!scoreId) {
      return NextResponse.json(
        { success: false, error: 'Missing scoreId' },
        { status: 400 }
      )
    }

    // Verify score belongs to user
    const { data: score, error: scoreError } = await supabase
      .from('call_scores')
      .select('id, user_id, call_id')
      .eq('id', scoreId)
      .single()

    if (scoreError || !score) {
      return NextResponse.json(
        { success: false, error: 'Score not found' },
        { status: 404 }
      )
    }

    if (score.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Delete the score (cascade will delete criteria automatically)
    const { error: deleteError } = await supabase
      .from('call_scores')
      .delete()
      .eq('id', scoreId)

    if (deleteError) {
      console.error('Error deleting score:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete score' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Score deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/qa/delete-score:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/qa/assign
 * Create QA assignments for calls
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAPIClient } from '@/lib/supabase-server'
import type { AssignmentCreateRequest } from '@/types/qa'

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
    const body: AssignmentCreateRequest = await request.json()

    // Validate required fields
    if (!body.call_ids || !Array.isArray(body.call_ids) || body.call_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: call_ids array is required' },
        { status: 400 }
      )
    }

    if (!body.assigned_to) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: assigned_to is required' },
        { status: 400 }
      )
    }

    // Verify all calls belong to user
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('id, user_id')
      .in('id', body.call_ids)

    if (callsError || !calls) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch calls' },
        { status: 500 }
      )
    }

    // Check that all calls belong to the user
    const invalidCalls = calls.filter(call => call.user_id !== user.id)
    if (invalidCalls.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to assign some calls' },
        { status: 403 }
      )
    }

    if (calls.length !== body.call_ids.length) {
      return NextResponse.json(
        { success: false, error: 'Some calls not found' },
        { status: 404 }
      )
    }

    // Create assignments
    const assignmentsToInsert = body.call_ids.map(callId => ({
      call_id: callId,
      assigned_to: body.assigned_to,
      assigned_by: user.id,
      priority: body.priority || 'normal',
      due_date: body.due_date || null,
      assignment_notes: body.assignment_notes || null,
      status: 'pending'
    }))

    const { data: assignments, error: assignError } = await supabase
      .from('qa_assignments')
      .insert(assignmentsToInsert)
      .select()

    if (assignError) {
      // Check if it's a duplicate assignment error
      if (assignError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'One or more calls already have active assignments' },
          { status: 409 }
        )
      }

      console.error('Error creating assignments:', assignError)
      return NextResponse.json(
        { success: false, error: 'Failed to create assignments' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      assignments,
      message: `Successfully created ${assignments.length} QA assignment(s)`
    })

  } catch (error) {
    console.error('Error in POST /api/qa/assign:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/qa/assign
 * Update QA assignment status
 */
export async function PATCH(request: NextRequest) {
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
    const body = await request.json()
    const { assignment_id, status, completion_notes, priority, due_date } = body

    if (!assignment_id) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: assignment_id is required' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: any = {}
    if (status) updateData.status = status
    if (completion_notes) updateData.completion_notes = completion_notes
    if (priority) updateData.priority = priority
    if (due_date !== undefined) updateData.due_date = due_date

    // If status is completed, set completed_at
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    // Update assignment
    const { data: assignment, error: updateError } = await supabase
      .from('qa_assignments')
      .update(updateData)
      .eq('id', assignment_id)
      .eq('assigned_to', user.id) // Only the assignee can update
      .select()
      .single()

    if (updateError || !assignment) {
      console.error('Error updating assignment:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      assignment,
      message: 'Assignment updated successfully'
    })

  } catch (error) {
    console.error('Error in PATCH /api/qa/assign:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


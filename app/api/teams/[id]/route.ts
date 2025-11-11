/**
 * Team Management API Route
 * DELETE /api/teams/[id] - Delete team
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { deleteTeam } from '@/lib/teams'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const teamId = params.id

    const success = await deleteTeam(teamId, user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete team. You must be a team owner.' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


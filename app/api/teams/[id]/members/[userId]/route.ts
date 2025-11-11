/**
 * Team Member Management API Route
 * PUT /api/teams/[id]/members/[userId] - Update member role
 * DELETE /api/teams/[id]/members/[userId] - Remove member
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase-server'
import { updateTeamMemberRole, removeTeamMember } from '@/lib/teams'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
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
    const targetUserId = params.userId
    const body = await req.json()
    const { role } = body

    if (!role || !['owner', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "owner" or "member"' },
        { status: 400 }
      )
    }

    // Verify current user is team owner using admin client to bypass RLS
    const adminClient = createAdminClient()
    const { data: member, error: memberError } = await adminClient
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberError) {
      console.error('Error checking team membership:', memberError)
      return NextResponse.json(
        { error: 'Failed to verify team ownership' },
        { status: 500 }
      )
    }

    if (!member || member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only team owners can update member roles' },
        { status: 403 }
      )
    }

    const success = await updateTeamMemberRole(teamId, targetUserId, role as 'owner' | 'member')

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update member role' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Member role updated successfully',
    })
  } catch (error) {
    console.error('Error updating team member role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
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
    const targetUserId = params.userId

    // Users can remove themselves, or owners can remove others
    const isSelf = user.id === targetUserId

    if (!isSelf) {
      // Verify current user is team owner using admin client to bypass RLS
      const adminClient = createAdminClient()
      const { data: member, error: memberError } = await adminClient
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (memberError) {
        console.error('Error checking team membership:', memberError)
        return NextResponse.json(
          { error: 'Failed to verify team ownership' },
          { status: 500 }
        )
      }

      if (!member || member.role !== 'owner') {
        return NextResponse.json(
          { error: 'Only team owners can remove members' },
          { status: 403 }
        )
      }
    }

    const success = await removeTeamMember(teamId, targetUserId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove team member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
    })
  } catch (error) {
    console.error('Error removing team member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


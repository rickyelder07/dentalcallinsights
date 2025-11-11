/**
 * Team Members API Route
 * GET /api/teams/[id]/members - Get team members
 * POST /api/teams/[id]/members - Add team member
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createAdminClient } from '@/lib/supabase-server'
import { getTeamMembersWithEmails, addTeamMember, isTeamMember } from '@/lib/teams'

export async function GET(
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

    // Verify user is a team member
    const userIsMember = await isTeamMember(teamId, user.id)
    if (!userIsMember) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const members = await getTeamMembersWithEmails(teamId)

    return NextResponse.json({
      success: true,
      members,
    })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const body = await req.json()
    const { email, role = 'member' } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Verify user is team owner using admin client to bypass RLS
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
        { error: 'Only team owners can add members' },
        { status: 403 }
      )
    }

    // Find user by email using admin client (already created above)
    const { data: users, error: userError } = await adminClient.auth.admin.listUsers()
    
    if (userError) {
      return NextResponse.json(
        { error: 'Failed to search for user' },
        { status: 500 }
      )
    }

    const targetUser = users.users.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    )

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found with that email' },
        { status: 404 }
      )
    }

    // Add member to team
    const success = await addTeamMember(teamId, targetUser.id, role as 'owner' | 'member')

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add team member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Team member added successfully',
    })
  } catch (error) {
    console.error('Error adding team member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


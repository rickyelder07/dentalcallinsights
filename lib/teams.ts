/**
 * Team Management Utilities
 * Helper functions for team operations
 */

import { createAdminClient } from './supabase-server'

export interface Team {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  user_email?: string // Populated when fetching with user data
}

/**
 * Get all teams a user belongs to
 */
export async function getUserTeams(userId: string): Promise<Team[]> {
  const supabase = createAdminClient()
  
  // First get team IDs the user belongs to
  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
  
  if (membersError) {
    console.error('Error fetching user team members:', membersError)
    return []
  }
  
  if (!members || members.length === 0) {
    return []
  }
  
  // Then fetch the teams
  const teamIds = members.map((m: any) => m.team_id)
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .in('id', teamIds)
  
  if (teamsError) {
    console.error('Error fetching teams:', teamsError)
    return []
  }
  
  return (teams || []) as Team[]
}

/**
 * Get team members for a team
 */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching team members:', error)
    return []
  }
  
  return data || []
}

/**
 * Get team members with user email addresses
 */
export async function getTeamMembersWithEmails(teamId: string): Promise<TeamMember[]> {
  const supabase = createAdminClient()
  
  // Get team members
  const { data: members, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching team members:', error)
    return []
  }
  
  if (!members || members.length === 0) {
    return []
  }
  
  // Get all users to map emails
  const { data: usersData } = await supabase.auth.admin.listUsers()
  const usersMap = new Map(
    (usersData?.users || []).map((u) => [u.id, u.email || null])
  )
  
  // Map members with emails
  return members.map((member: any) => ({
    ...member,
    user_email: usersMap.get(member.user_id) || null,
  }))
}

/**
 * Create a new team
 */
export async function createTeam(name: string, userId: string): Promise<Team | null> {
  const supabase = createAdminClient()
  
  // Create team
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({
      name,
      created_by: userId,
    })
    .select()
    .single()
  
  if (teamError || !team) {
    console.error('Error creating team:', teamError)
    return null
  }
  
  // Add creator as owner
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: userId,
      role: 'owner',
    })
  
  if (memberError) {
    console.error('Error adding team owner:', memberError)
    // Try to delete the team if adding owner fails
    await supabase.from('teams').delete().eq('id', team.id)
    return null
  }
  
  return team
}

/**
 * Add a user to a team
 */
export async function addTeamMember(
  teamId: string,
  userId: string,
  role: 'owner' | 'member' = 'member'
): Promise<boolean> {
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id: userId,
      role,
    })
  
  if (error) {
    console.error('Error adding team member:', error)
    return false
  }
  
  return true
}

/**
 * Remove a user from a team
 */
export async function removeTeamMember(teamId: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error removing team member:', error)
    return false
  }
  
  return true
}

/**
 * Update a team member's role
 */
export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  role: 'owner' | 'member'
): Promise<boolean> {
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error updating team member role:', error)
    return false
  }
  
  return true
}

/**
 * Delete a team (only owners can do this)
 */
export async function deleteTeam(teamId: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient()
  
  // Verify user is owner
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle()
  
  if (memberError) {
    console.error('Error checking team membership:', memberError)
    return false
  }
  
  if (!member || member.role !== 'owner') {
    console.error('User is not team owner')
    return false
  }
  
  // Delete team (cascade will handle team_members)
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId)
  
  if (error) {
    console.error('Error deleting team:', error)
    return false
  }
  
  return true
}

/**
 * Get user's primary team (first team they joined, or most recent)
 */
export async function getUserPrimaryTeam(userId: string): Promise<string | null> {
  const teams = await getUserTeams(userId)
  if (teams.length === 0) return null
  
  // Return the first team (or you could return the most recent)
  return teams[0].id
}

/**
 * Check if a user is a member of a team
 */
export async function isTeamMember(teamId: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single()
  
  if (error || !data) return false
  return true
}

/**
 * Get team ID for a user's call (if call belongs to a team)
 * This is used when creating calls to assign them to a team
 */
export async function getCallTeamId(userId: string): Promise<string | null> {
  // Get user's primary team
  const primaryTeam = await getUserPrimaryTeam(userId)
  return primaryTeam
}


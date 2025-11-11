'use client'

/**
 * Team Detail Page
 * View and manage team members
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import type { TeamMember } from '@/lib/teams'

export default function TeamDetailPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string
  const supabase = createBrowserClient()

  const [teamName, setTeamName] = useState<string>('')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'member' | null>(null)
  const [showAddMemberForm, setShowAddMemberForm] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'owner' | 'member'>('member')
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (teamId) {
      fetchTeamData()
    }
  }, [teamId])

  const fetchTeamData = async () => {
    try {
      setLoading(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // Fetch team members
      const membersResponse = await fetch(`/api/teams/${teamId}/members`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const membersData = await membersResponse.json()

      if (!membersResponse.ok) {
        throw new Error(membersData.error || 'Failed to fetch team members')
      }

      setMembers(membersData.members || [])

      // Find current user's role
      const currentUser = membersData.members.find(
        (m: TeamMember) => m.user_id === session.user.id
      )
      setCurrentUserRole(currentUser?.role || null)

      // Fetch team name from teams list
      const teamsResponse = await fetch('/api/teams', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const teamsData = await teamsResponse.json()
      if (teamsData.success) {
        const team = teamsData.teams.find((t: any) => t.id === teamId)
        if (team) {
          setTeamName(team.name)
        }
      }
    } catch (err) {
      console.error('Error fetching team data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load team')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMemberEmail.trim()) {
      setError('Email is required')
      return
    }

    try {
      setAdding(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          role: newMemberRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add team member')
      }

      setNewMemberEmail('')
      setNewMemberRole('member')
      setShowAddMemberForm(false)
      await fetchTeamData()
    } catch (err) {
      console.error('Error adding team member:', err)
      setError(err instanceof Error ? err.message : 'Failed to add team member')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return
    }

    try {
      setDeleting(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove team member')
      }

      await fetchTeamData()
    } catch (err) {
      console.error('Error removing team member:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove team member')
    } finally {
      setDeleting(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: 'owner' | 'member') => {
    try {
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update member role')
      }

      await fetchTeamData()
    } catch (err) {
      console.error('Error updating member role:', err)
      setError(err instanceof Error ? err.message : 'Failed to update member role')
    }
  }

  const handleDeleteTeam = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this team? This action cannot be undone and all team data will remain but team sharing will be removed.'
      )
    ) {
      return
    }

    try {
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete team')
      }

      router.push('/teams')
    } catch (err) {
      console.error('Error deleting team:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete team')
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  const isOwner = currentUserRole === 'owner'

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <button
          onClick={() => router.push('/teams')}
          className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Teams
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{teamName || 'Team'}</h1>
            <p className="text-gray-600">Manage team members and permissions</p>
          </div>
          {isOwner && (
            <button
              onClick={handleDeleteTeam}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Team
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {isOwner && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Add Team Member</h2>
            <button
              onClick={() => setShowAddMemberForm(!showAddMemberForm)}
              className="text-gray-500 hover:text-gray-700"
            >
              {showAddMemberForm ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          </div>

          {showAddMemberForm && (
            <form onSubmit={handleAddMember}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={adding}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as 'owner' | 'member')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={adding}
                  >
                    <option value="member">Member</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {adding ? 'Adding...' : 'Add Member'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberForm(false)
                    setNewMemberEmail('')
                    setError(null)
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Team Members ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-gray-500">No members yet</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {member.user_email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.user_email || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {isOwner && (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleUpdateRole(member.user_id, e.target.value as 'owner' | 'member')
                      }
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="member">Member</option>
                      <option value="owner">Owner</option>
                    </select>
                  )}
                  {!isOwner && (
                    <span
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        member.role === 'owner'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {member.role === 'owner' ? 'Owner' : 'Member'}
                    </span>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={deleting}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      title="Remove member"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


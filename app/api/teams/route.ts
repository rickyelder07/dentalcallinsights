/**
 * Get User's Teams API Route
 * GET /api/teams
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getUserTeams } from '@/lib/teams'

export async function GET(req: NextRequest) {
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

    const teams = await getUserTeams(user.id)

    return NextResponse.json({
      success: true,
      teams,
    })
  } catch (error) {
    console.error('Error fetching teams:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    )
  }
}


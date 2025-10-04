/**
 * Insights Regeneration API Route
 * POST /api/insights/regenerate
 * 
 * Forces regeneration of insights (bypasses cache)
 * Security: Server-side only, validates user access
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/insights/regenerate
 * Regenerate insights for a call (bypasses cache)
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request
    const body = await req.json()
    const { callId } = body
    
    if (!callId) {
      return NextResponse.json(
        { error: 'Missing required field: callId' },
        { status: 400 }
      )
    }
    
    // Forward to generate endpoint with forceRegenerate flag
    const generateUrl = new URL('/api/insights/generate', req.url)
    const authHeader = req.headers.get('authorization')
    
    const response = await fetch(generateUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader || '',
      },
      body: JSON.stringify({
        callId,
        forceRegenerate: true,
      }),
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Insights regeneration API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


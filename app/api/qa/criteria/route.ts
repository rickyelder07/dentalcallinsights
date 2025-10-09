/**
 * GET /api/qa/criteria
 * Get scoring criteria definitions
 */

import { NextRequest, NextResponse } from 'next/server'
import { SCORING_CRITERIA_CONFIG, getAllCriteria, CATEGORY_METADATA } from '@/lib/qa-criteria'

export async function GET(_request: NextRequest) {
  try {
    // This endpoint can be called without authentication
    // as it just returns the static criteria definitions
    
    // Get all criteria definitions
    const criteria = getAllCriteria()

    // Return full config
    return NextResponse.json({
      success: true,
      data: {
        criteria,
        config: SCORING_CRITERIA_CONFIG,
        categoryMetadata: CATEGORY_METADATA
      }
    })

  } catch (error) {
    console.error('Error in GET /api/qa/criteria:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


/**
 * Call Matching API Route
 * Handles matching audio recordings with CSV call data
 * SECURITY: Uses RLS policies, validates all inputs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { CallMatcher } from '@/lib/call-matcher';

export const dynamic = 'force-dynamic';

/**
 * POST /api/match-calls
 * Find potential matches for a call recording
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { callId, callTime, phoneNumber, duration, options } = body;

    if (!callId || !callTime) {
      return NextResponse.json(
        {
          error: 'Missing required fields: callId and callTime are required',
        },
        { status: 400 }
      );
    }

    // Validate call time
    const callTimeDate = new Date(callTime);
    if (isNaN(callTimeDate.getTime())) {
      return NextResponse.json(
        {
          error: 'Invalid call time format',
        },
        { status: 400 }
      );
    }

    // Set default matching options
    const matchingOptions = {
      time_tolerance_minutes: options?.time_tolerance_minutes || 5,
      phone_number_match: options?.phone_number_match !== false,
      duration_tolerance_seconds: options?.duration_tolerance_seconds || 30,
      require_disposition_match: options?.require_disposition_match || false,
    };

    // Find matches using database function
    const { data: matches, error: matchError } = await supabase.rpc('find_csv_matches', {
      p_user_id: user.id,
      p_call_time: callTime,
      p_time_tolerance_minutes: matchingOptions.time_tolerance_minutes,
    });

    if (matchError) {
      console.error('Match finding error:', matchError);
      return NextResponse.json(
        {
          error: 'Failed to find matches',
          details: matchError.message,
        },
        { status: 500 }
      );
    }

    // Calculate match scores for each potential match
    interface ScoredMatch {
      csv_id: string;
      call_time: string;
      call_direction: 'Inbound' | 'Outbound';
      source_number?: string;
      source_name?: string;
      destination_number?: string;
      call_duration_seconds?: number;
      disposition?: string;
      time_to_answer_seconds?: number;
      match_score: number;
      time_diff_minutes: number;
      duration_diff_seconds?: number;
      match_reasons: string[];
    }

    const scoredMatches: ScoredMatch[] = (matches || []).map((match: any) => {
      const score = CallMatcher.calculateMatchScore(
        callTimeDate,
        new Date(match.call_time),
        phoneNumber,
        match.source_number,
        match.destination_number,
        duration,
        match.call_duration_seconds,
        matchingOptions
      );

      // Calculate duration difference
      const durationDiff = duration && match.call_duration_seconds
        ? Math.abs(duration - match.call_duration_seconds)
        : undefined;

      // Build match reasons
      const reasons: string[] = [];
      if (Math.abs(match.time_diff_minutes) < 1) reasons.push('Exact time match');
      else if (Math.abs(match.time_diff_minutes) < 2) reasons.push('Close time match');
      
      if (durationDiff !== undefined) {
        if (durationDiff === 0) reasons.push('Exact duration match');
        else if (durationDiff <= 5) reasons.push('Very close duration');
        else if (durationDiff <= 30) reasons.push('Similar duration');
      }

      if (phoneNumber && (match.source_number === phoneNumber || match.destination_number === phoneNumber)) {
        reasons.push('Phone number match');
      }

      return {
        csv_id: match.csv_id,
        call_time: match.call_time,
        call_direction: match.call_direction,
        source_number: match.source_number,
        source_name: match.source_name,
        destination_number: match.destination_number,
        call_duration_seconds: match.call_duration_seconds,
        disposition: match.disposition,
        time_to_answer_seconds: match.time_to_answer_seconds,
        match_score: score,
        time_diff_minutes: match.time_diff_minutes,
        duration_diff_seconds: durationDiff,
        match_reasons: reasons,
      };
    });

    // Sort by match score (highest first), then by time difference
    scoredMatches.sort((a: ScoredMatch, b: ScoredMatch) => {
      if (Math.abs(b.match_score - a.match_score) > 0.01) {
        return b.match_score - a.match_score;
      }
      // If scores are very close, prefer closer time match
      return Math.abs(a.time_diff_minutes) - Math.abs(b.time_diff_minutes);
    });

    return NextResponse.json({
      success: true,
      matches: scoredMatches,
      count: scoredMatches.length,
    });
  } catch (error) {
    console.error('Match calls API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/match-calls
 * Link a call with a CSV record
 */
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { callId, csvCallId } = body;

    if (!callId || !csvCallId) {
      return NextResponse.json(
        {
          error: 'Missing required fields: callId and csvCallId are required',
        },
        { status: 400 }
      );
    }

    // Update call record to link with CSV data
    const { data: updatedCall, error: updateError } = await supabase
      .from('calls')
      .update({
        csv_call_id: csvCallId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId)
      .eq('user_id', user.id) // Ensure user owns the call
      .select()
      .single();

    if (updateError) {
      console.error('Call update error:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to link call with CSV data',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    if (!updatedCall) {
      return NextResponse.json(
        {
          error: 'Call not found or access denied',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      call: updatedCall,
    });
  } catch (error) {
    console.error('Link calls API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


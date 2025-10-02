/**
 * CSV Upload API Route
 * Handles CSV call data uploads, parsing, and database insertion
 * SECURITY: Uses RLS policies, validates all inputs, sanitizes data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { CsvParser } from '@/lib/csv-parser';
import { validateCsvFile } from '@/lib/file-validation';

export const dynamic = 'force-dynamic';

/**
 * POST /api/csv-upload
 * Upload and process CSV call data
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    const validation = validateCsvFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'File validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Read CSV content
    const csvContent = await file.text();

    // Parse and validate CSV
    const csvValidation = CsvParser.parseCsvFile(csvContent);
    if (!csvValidation.valid) {
      return NextResponse.json(
        {
          error: 'CSV validation failed',
          validationResult: csvValidation,
        },
        { status: 400 }
      );
    }

    // Parse CSV to call data
    const callDataArray = CsvParser.parseCsvToCallData(csvContent, user.id);

    if (callDataArray.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid call data found in CSV',
        },
        { status: 400 }
      );
    }

    // Insert call data into database (batch insert)
    const { data: insertedData, error: insertError } = await supabase
      .from('csv_call_data')
      .insert(callDataArray)
      .select();

    if (insertError) {
      console.error('CSV data insert error:', insertError);
      return NextResponse.json(
        {
          error: 'Failed to insert CSV data',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      rowsProcessed: callDataArray.length,
      rowsInserted: insertedData?.length || 0,
      warnings: csvValidation.warnings,
    });
  } catch (error) {
    console.error('CSV upload API error:', error);
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
 * GET /api/csv-upload
 * Get user's CSV call data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's CSV call data
    const { data: csvData, error: dbError } = await supabase
      .from('csv_call_data')
      .select('*')
      .eq('user_id', user.id)
      .order('call_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbError) {
      return NextResponse.json(
        {
          error: 'Failed to fetch CSV data',
          details: dbError.message,
        },
        { status: 500 }
      );
    }

    // Get total count
    const { count } = await supabase
      .from('csv_call_data')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      data: csvData || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Get CSV data API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


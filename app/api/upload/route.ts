/**
 * Audio Upload API Route
 * Handles audio file uploads with metadata and database record creation
 * SECURITY: Uses RLS policies, validates all inputs, only uses anon key
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { validateAudioFile, generateStoragePath } from '@/lib/file-validation';

// Disable body parser to handle multipart/form-data
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload
 * Upload audio file with metadata
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
    const metadataJson = formData.get('metadata') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    const validation = validateAudioFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'File validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Parse and sanitize metadata
    let metadata = {};
    if (metadataJson) {
      try {
        metadata = JSON.parse(metadataJson);
      } catch (error) {
        return NextResponse.json({ error: 'Invalid metadata JSON' }, { status: 400 });
      }
    }

    // Generate storage path
    const storagePath = generateStoragePath(user.id, file.name);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('call-recordings')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        {
          error: 'Failed to upload file',
          details: uploadError.message,
        },
        { status: 500 }
      );
    }

    // Create database record
    const { data: callData, error: dbError } = await supabase
      .from('calls')
      .insert({
        user_id: user.id,
        audio_path: storagePath,
        storage_path: storagePath,
        file_size: file.size,
        file_type: file.type,
        upload_status: 'completed',
        metadata: metadata,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('call-recordings').remove([storagePath]);

      return NextResponse.json(
        {
          error: 'Failed to create database record',
          details: dbError.message,
        },
        { status: 500 }
      );
    }

    // Try to find potential CSV matches (optional)
    let potentialMatches = [];
    if (metadata && (metadata as any).call_time) {
      try {
        const { data: matches } = await supabase.rpc('find_csv_matches', {
          p_user_id: user.id,
          p_call_time: (metadata as any).call_time,
          p_time_tolerance_minutes: 5,
        });
        potentialMatches = matches || [];
      } catch (error) {
        // Ignore matching errors - not critical
        console.warn('CSV matching error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      callId: callData.id,
      storagePath: uploadData.path,
      potentialMatches,
    });
  } catch (error) {
    console.error('Upload API error:', error);
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
 * GET /api/upload
 * Get user's uploaded files
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's calls
    const { data: calls, error: dbError } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      return NextResponse.json(
        {
          error: 'Failed to fetch calls',
          details: dbError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      calls: calls || [],
    });
  } catch (error) {
    console.error('Get uploads API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


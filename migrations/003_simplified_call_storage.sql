-- Simplified Call Storage Migration
-- This migration creates a streamlined structure for uploading CSV files with matching audio files
-- 
-- Prerequisites:
-- 1. Run migrations 001_init.sql and 002_enable_rls.sql first
-- 2. Ensure RLS is enabled on existing tables
--
-- Key Changes:
-- - Each CSV row maps directly to one audio file via the "Call" column filename
-- - Simplified matching: filename in CSV must match uploaded MP3 filename
-- - No complex matching algorithms needed - direct 1:1 relationship

-- ============================================
-- UPDATE CALLS TABLE
-- Add columns for simplified CSV-audio mapping
-- ============================================

-- Add columns to track CSV data and audio file details
ALTER TABLE calls ADD COLUMN IF NOT EXISTS filename TEXT NOT NULL DEFAULT '';
ALTER TABLE calls ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT 'completed';

-- Call time and metadata from CSV
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_time TIMESTAMPTZ;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_direction TEXT CHECK (call_direction IN ('Inbound', 'Outbound'));
ALTER TABLE calls ADD COLUMN IF NOT EXISTS source_number TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS source_extension TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS destination_number TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS destination_extension TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_duration_seconds INTEGER CHECK (call_duration_seconds >= 0);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS disposition TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS time_to_answer_seconds INTEGER CHECK (time_to_answer_seconds >= 0);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_flow TEXT;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_calls_filename ON calls(filename);
CREATE INDEX IF NOT EXISTS idx_calls_call_time ON calls(call_time);
CREATE INDEX IF NOT EXISTS idx_calls_source_number ON calls(source_number);
CREATE INDEX IF NOT EXISTS idx_calls_destination_number ON calls(destination_number);
CREATE INDEX IF NOT EXISTS idx_calls_upload_status ON calls(upload_status);

-- ============================================
-- DROP OLD CSV_CALL_DATA TABLE IF EXISTS
-- We no longer need a separate table - everything goes in calls
-- ============================================

-- Note: Only drop if you haven't inserted production data yet
-- If you have production data, you'll need a data migration instead
-- DROP TABLE IF EXISTS csv_call_data CASCADE;

-- ============================================
-- UTILITY FUNCTION
-- Parse duration string to seconds (e.g., "4 mins. 5 secs" -> 245)
-- ============================================

CREATE OR REPLACE FUNCTION parse_duration_to_seconds(duration_str TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    minutes INTEGER := 0;
    seconds INTEGER := 0;
    total_seconds INTEGER := 0;
BEGIN
    -- Handle NULL or empty strings
    IF duration_str IS NULL OR duration_str = '' THEN
        RETURN NULL;
    END IF;
    
    -- Extract minutes
    IF duration_str ~* '(\d+)\s*mins?' THEN
        minutes := (regexp_match(duration_str, '(\d+)\s*mins?', 'i'))[1]::INTEGER;
    END IF;
    
    -- Extract seconds
    IF duration_str ~* '(\d+)\s*secs?' THEN
        seconds := (regexp_match(duration_str, '(\d+)\s*secs?', 'i'))[1]::INTEGER;
    END IF;
    
    -- Calculate total
    total_seconds := (minutes * 60) + seconds;
    
    RETURN total_seconds;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

-- ============================================
-- STORAGE BUCKET POLICIES (Manual Setup Required)
-- Run these in the Supabase Dashboard after creating the bucket
-- ============================================

-- NOTE: Storage policies must be created via Supabase Dashboard
-- 1. Go to Storage > Create new bucket
-- 2. Name it: call-recordings
-- 3. Public: No (private bucket)
-- 4. File size limit: 100MB
-- 5. Allowed MIME types: audio/mpeg, audio/mp3, audio/wav, audio/m4a, audio/aac

-- After creating the bucket, apply these policies via SQL:

-- Policy: Users can only view their own files
-- CREATE POLICY "Users can view own files" ON storage.objects
-- FOR SELECT
-- USING (
--     bucket_id = 'call-recordings' AND
--     auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy: Users can only upload to their own folder
-- CREATE POLICY "Users can upload own files" ON storage.objects
-- FOR INSERT
-- WITH CHECK (
--     bucket_id = 'call-recordings' AND
--     auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Policy: Users can only delete their own files
-- CREATE POLICY "Users can delete own files" ON storage.objects
-- FOR DELETE
-- USING (
--     bucket_id = 'call-recordings' AND
--     auth.uid()::text = (storage.foldername(name))[1]
-- );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify migration:
-- 1. Check that calls table has new columns:
--    SELECT column_name, data_type FROM information_schema.columns 
--    WHERE table_name = 'calls' ORDER BY ordinal_position;
--
-- 2. Test parse_duration_to_seconds function:
--    SELECT parse_duration_to_seconds('4 mins. 5 secs'); -- Should return 245
--
-- 3. Create storage bucket in Supabase Dashboard (Storage section)
-- 4. Apply storage policies listed above

-- Next steps:
-- 1. Create storage bucket 'call-recordings' in Supabase Dashboard
-- 2. Apply storage RLS policies
-- 3. Test CSV upload with matching audio files
-- 4. Verify user data isolation


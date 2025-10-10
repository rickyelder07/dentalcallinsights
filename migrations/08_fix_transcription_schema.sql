-- ============================================
-- DentalCallInsights - Fix Transcription Schema
-- Migration 08: Fix transcription tables and columns
-- ============================================
-- This migration fixes the transcription system by:
-- 1. Creating the missing transcription_jobs table
-- 2. Adding missing columns to transcripts table
-- 3. Ensuring column names match API expectations
-- ============================================

-- Create transcription_jobs table
CREATE TABLE IF NOT EXISTS transcription_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to transcripts table
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS raw_transcript TEXT;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS edited_transcript TEXT;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS timestamps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS processing_duration_seconds INTEGER;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Update existing records to have transcript = content for backward compatibility
UPDATE transcripts 
SET transcript = content 
WHERE transcript IS NULL AND content IS NOT NULL;

-- Enable RLS on transcription_jobs
ALTER TABLE transcription_jobs ENABLE ROW LEVEL SECURITY;

-- Transcription jobs policies
CREATE POLICY "Users can view own transcription jobs" ON transcription_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transcription jobs" ON transcription_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcription jobs" ON transcription_jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transcription jobs" ON transcription_jobs
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for transcription_jobs
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_call_id ON transcription_jobs(call_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_user_id ON transcription_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status ON transcription_jobs(status);

-- Trigger to update updated_at timestamp for transcription_jobs
CREATE TRIGGER update_transcription_jobs_updated_at 
    BEFORE UPDATE ON transcription_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Transcription schema fix completed successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   - Created transcription_jobs table';
    RAISE NOTICE '   - Added missing columns to transcripts table';
    RAISE NOTICE '   - Applied RLS policies and indexes';
    RAISE NOTICE '   - Added triggers for updated_at timestamps';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Test transcription functionality';
    RAISE NOTICE '   2. Verify API endpoints work correctly';
    RAISE NOTICE '   3. Check transcription job tracking';
END $$;

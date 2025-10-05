-- ============================================
-- MILESTONE 4: TRANSCRIPTION PIPELINE SCHEMA
-- ============================================
-- This migration adds transcription functionality to the DentalCallInsights platform
-- 
-- Prerequisites:
-- 1. Run migrations 001, 002, and 003 first
-- 2. Ensure RLS is enabled on existing tables
-- 3. OpenAI API key configured in environment
--
-- Features:
-- - Transcription status tracking
-- - Confidence scores and quality metrics
-- - Edit history and version control
-- - Background job processing
-- - Speaker diarization support (optional)
-- - Timestamp alignment for audio sync

-- ============================================
-- UPDATE TRANSCRIPTS TABLE
-- Add transcription-specific columns
-- ============================================

-- Add transcription status and processing metadata
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS transcription_status TEXT DEFAULT 'pending' CHECK (
  transcription_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
);
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1);
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS processing_duration_seconds INTEGER;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add transcript content columns
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS raw_transcript TEXT;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS edited_transcript TEXT;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Add advanced features (JSONB for flexibility)
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS speaker_segments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS timestamps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Track edit history
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(transcription_status);
CREATE INDEX IF NOT EXISTS idx_transcripts_call_id ON transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_processing_started ON transcripts(processing_started_at);
CREATE INDEX IF NOT EXISTS idx_transcripts_completed ON transcripts(processing_completed_at);

-- Full-text search index on transcript content
CREATE INDEX IF NOT EXISTS idx_transcripts_raw_search ON transcripts USING gin(to_tsvector('english', COALESCE(raw_transcript, '')));
CREATE INDEX IF NOT EXISTS idx_transcripts_edited_search ON transcripts USING gin(to_tsvector('english', COALESCE(edited_transcript, '')));

-- ============================================
-- CREATE TRANSCRIPTION_JOBS TABLE
-- Track background transcription jobs
-- ============================================

CREATE TABLE IF NOT EXISTS transcription_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
    ),
    priority INTEGER DEFAULT 0,
    
    -- Timing information
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Job metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Processing metrics
    audio_duration_seconds INTEGER,
    processing_cost_usd NUMERIC(10,4),
    
    -- Indexes
    CONSTRAINT unique_call_transcription UNIQUE(call_id)
);

-- Create indexes for transcription_jobs
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_user_id ON transcription_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_status ON transcription_jobs(status);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_call_id ON transcription_jobs(call_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_created_at ON transcription_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_priority ON transcription_jobs(priority DESC, created_at ASC);

-- ============================================
-- RLS POLICIES FOR TRANSCRIPTS
-- Ensure users can only access their own transcripts
-- ============================================

-- Enable RLS on transcripts table (if not already enabled)
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean migration)
DROP POLICY IF EXISTS "Users can view own transcripts" ON transcripts;
DROP POLICY IF EXISTS "Users can insert own transcripts" ON transcripts;
DROP POLICY IF EXISTS "Users can update own transcripts" ON transcripts;
DROP POLICY IF EXISTS "Users can delete own transcripts" ON transcripts;

-- Policy: Users can view their own transcripts
CREATE POLICY "Users can view own transcripts" ON transcripts
FOR SELECT
USING (
    call_id IN (
        SELECT id FROM calls WHERE user_id = auth.uid()
    )
);

-- Policy: Users can insert transcripts for their own calls
CREATE POLICY "Users can insert own transcripts" ON transcripts
FOR INSERT
WITH CHECK (
    call_id IN (
        SELECT id FROM calls WHERE user_id = auth.uid()
    )
);

-- Policy: Users can update their own transcripts
CREATE POLICY "Users can update own transcripts" ON transcripts
FOR UPDATE
USING (
    call_id IN (
        SELECT id FROM calls WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    call_id IN (
        SELECT id FROM calls WHERE user_id = auth.uid()
    )
);

-- Policy: Users can delete their own transcripts
CREATE POLICY "Users can delete own transcripts" ON transcripts
FOR DELETE
USING (
    call_id IN (
        SELECT id FROM calls WHERE user_id = auth.uid()
    )
);

-- ============================================
-- RLS POLICIES FOR TRANSCRIPTION_JOBS
-- Ensure users can only access their own jobs
-- ============================================

-- Enable RLS on transcription_jobs table
ALTER TABLE transcription_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own transcription jobs
CREATE POLICY "Users can view own transcription jobs" ON transcription_jobs
FOR SELECT
USING (user_id = auth.uid());

-- Policy: Users can insert their own transcription jobs
CREATE POLICY "Users can insert own transcription jobs" ON transcription_jobs
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own transcription jobs
CREATE POLICY "Users can update own transcription jobs" ON transcription_jobs
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own transcription jobs
CREATE POLICY "Users can delete own transcription jobs" ON transcription_jobs
FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- UTILITY FUNCTIONS
-- Helper functions for transcription management
-- ============================================

-- Function: Create or update transcript for a call
CREATE OR REPLACE FUNCTION upsert_transcript(
    p_call_id UUID,
    p_raw_transcript TEXT,
    p_confidence_score NUMERIC DEFAULT NULL,
    p_language TEXT DEFAULT 'en',
    p_timestamps JSONB DEFAULT '[]'::jsonb,
    p_speaker_segments JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_transcript_id UUID;
BEGIN
    -- Insert or update transcript
    INSERT INTO transcripts (
        call_id,
        transcript,
        raw_transcript,
        transcription_status,
        confidence_score,
        language,
        timestamps,
        speaker_segments,
        processing_completed_at
    )
    VALUES (
        p_call_id,
        p_raw_transcript, -- Also set legacy transcript field
        p_raw_transcript,
        'completed',
        p_confidence_score,
        p_language,
        p_timestamps,
        p_speaker_segments,
        NOW()
    )
    ON CONFLICT (call_id)
    DO UPDATE SET
        raw_transcript = EXCLUDED.raw_transcript,
        transcript = EXCLUDED.transcript,
        transcription_status = 'completed',
        confidence_score = EXCLUDED.confidence_score,
        language = EXCLUDED.language,
        timestamps = EXCLUDED.timestamps,
        speaker_segments = EXCLUDED.speaker_segments,
        processing_completed_at = NOW()
    RETURNING id INTO v_transcript_id;
    
    RETURN v_transcript_id;
END;
$$;

-- Function: Update transcript edit history
CREATE OR REPLACE FUNCTION update_transcript_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update edit tracking when edited_transcript changes
    IF OLD.edited_transcript IS DISTINCT FROM NEW.edited_transcript THEN
        NEW.last_edited_at := NOW();
        NEW.edit_count := COALESCE(OLD.edit_count, 0) + 1;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for transcript edit tracking
DROP TRIGGER IF EXISTS track_transcript_edits ON transcripts;
CREATE TRIGGER track_transcript_edits
    BEFORE UPDATE ON transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_transcript_edit();

-- Function: Get transcription statistics for a user
CREATE OR REPLACE FUNCTION get_transcription_stats(p_user_id UUID)
RETURNS TABLE (
    total_transcripts BIGINT,
    completed_transcripts BIGINT,
    pending_transcripts BIGINT,
    failed_transcripts BIGINT,
    total_duration_seconds BIGINT,
    avg_confidence_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_transcripts,
        COUNT(*) FILTER (WHERE t.transcription_status = 'completed')::BIGINT as completed_transcripts,
        COUNT(*) FILTER (WHERE t.transcription_status IN ('pending', 'processing'))::BIGINT as pending_transcripts,
        COUNT(*) FILTER (WHERE t.transcription_status = 'failed')::BIGINT as failed_transcripts,
        COALESCE(SUM(c.call_duration_seconds), 0)::BIGINT as total_duration_seconds,
        AVG(t.confidence_score) as avg_confidence_score
    FROM transcripts t
    INNER JOIN calls c ON t.call_id = c.id
    WHERE c.user_id = p_user_id;
END;
$$;

-- ============================================
-- VIEWS FOR EASY QUERYING
-- Simplified views for common queries
-- ============================================

-- View: Complete call information with transcription status
CREATE OR REPLACE VIEW call_with_transcription AS
SELECT
    c.id as call_id,
    c.user_id,
    c.filename,
    c.audio_path,
    c.call_time,
    c.call_direction,
    c.source_number,
    c.destination_number,
    c.call_duration_seconds,
    c.created_at as uploaded_at,
    t.id as transcript_id,
    t.transcription_status,
    t.confidence_score,
    t.raw_transcript,
    t.edited_transcript,
    COALESCE(t.edited_transcript, t.raw_transcript) as display_transcript,
    t.language,
    t.processing_completed_at as transcribed_at,
    tj.status as job_status,
    tj.retry_count
FROM calls c
LEFT JOIN transcripts t ON c.id = t.call_id
LEFT JOIN transcription_jobs tj ON c.id = tj.call_id;

-- ============================================
-- DATA INTEGRITY CONSTRAINTS
-- Ensure data consistency
-- ============================================

-- Constraint: Processing timestamps must be logical
ALTER TABLE transcripts ADD CONSTRAINT check_processing_timestamps
    CHECK (
        (processing_started_at IS NULL OR processing_completed_at IS NULL) OR
        (processing_completed_at >= processing_started_at)
    );

-- Constraint: Retry count must be non-negative
ALTER TABLE transcription_jobs ADD CONSTRAINT check_retry_count
    CHECK (retry_count >= 0 AND retry_count <= max_retries);

-- ============================================
-- MIGRATION VERIFICATION
-- ============================================

-- Verify transcripts table columns
DO $$
DECLARE
    missing_columns TEXT[];
BEGIN
    SELECT ARRAY_AGG(column_name)
    INTO missing_columns
    FROM (
        VALUES 
            ('transcription_status'),
            ('confidence_score'),
            ('raw_transcript'),
            ('edited_transcript'),
            ('timestamps'),
            ('speaker_segments')
    ) AS required(column_name)
    WHERE NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'transcripts'
        AND column_name = required.column_name
    );
    
    IF missing_columns IS NOT NULL THEN
        RAISE EXCEPTION 'Missing columns in transcripts table: %', missing_columns;
    END IF;
END $$;

-- Verify transcription_jobs table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'transcription_jobs'
    ) THEN
        RAISE EXCEPTION 'transcription_jobs table was not created';
    END IF;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 005_transcription_schema.sql completed successfully';
    RAISE NOTICE '📊 Transcripts table enhanced with transcription fields';
    RAISE NOTICE '🔄 Transcription_jobs table created for background processing';
    RAISE NOTICE '🔒 RLS policies applied for data security';
    RAISE NOTICE '⚙️  Utility functions and triggers created';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure OpenAI API key in environment variables';
    RAISE NOTICE '2. Deploy transcription API endpoints';
    RAISE NOTICE '3. Test transcription workflow with sample audio file';
END $$;


-- ============================================
-- DentalCallInsights - Comprehensive Column Fixes
-- Migration 11: Fix all column mismatches between database and frontend
-- ============================================
-- This migration ensures all database columns match frontend expectations
-- ============================================

-- ============================================
-- CALLS TABLE FIXES
-- ============================================

-- Add missing columns to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT 'pending';

-- Update existing records to map mime_type to file_type
UPDATE calls 
SET file_type = mime_type 
WHERE file_type IS NULL AND mime_type IS NOT NULL;

-- Update existing records to map processing_status to upload_status
UPDATE calls 
SET upload_status = processing_status 
WHERE upload_status IS NULL AND processing_status IS NOT NULL;

-- Add constraint for upload_status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'calls_upload_status_check'
    ) THEN
        ALTER TABLE calls ADD CONSTRAINT calls_upload_status_check 
        CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed'));
    END IF;
END $$;

-- ============================================
-- TRANSCRIPTS TABLE FIXES
-- ============================================

-- Ensure language column is properly set
UPDATE transcripts 
SET language = COALESCE(language, language_code, 'en')
WHERE language IS NULL;

-- Ensure processing_duration_seconds is set from processing_time_seconds
UPDATE transcripts 
SET processing_duration_seconds = processing_time_seconds 
WHERE processing_duration_seconds IS NULL AND processing_time_seconds IS NOT NULL;

-- Ensure all required columns have proper defaults
UPDATE transcripts 
SET 
    transcript = COALESCE(transcript, content, ''),
    raw_transcript = COALESCE(raw_transcript, content, ''),
    edited_transcript = COALESCE(edited_transcript, content, ''),
    edit_count = COALESCE(edit_count, 0),
    timestamps = COALESCE(timestamps, '[]'::jsonb),
    speaker_segments = COALESCE(speaker_segments, '[]'::jsonb),
    metadata = COALESCE(metadata, '{}'::jsonb)
WHERE 
    transcript IS NULL 
    OR raw_transcript IS NULL 
    OR edited_transcript IS NULL 
    OR edit_count IS NULL 
    OR timestamps IS NULL 
    OR speaker_segments IS NULL 
    OR metadata IS NULL;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN calls.file_type IS 'File type (maps from mime_type for frontend compatibility)';
COMMENT ON COLUMN calls.upload_status IS 'Upload status (maps from processing_status for frontend compatibility)';
COMMENT ON COLUMN transcripts.language IS 'Language code (primary field for frontend)';
COMMENT ON COLUMN transcripts.processing_duration_seconds IS 'Processing duration in seconds (primary field for frontend)';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Comprehensive column fixes completed successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   - Added file_type column to calls table';
    RAISE NOTICE '   - Added upload_status column to calls table';
    RAISE NOTICE '   - Mapped mime_type to file_type for compatibility';
    RAISE NOTICE '   - Mapped processing_status to upload_status for compatibility';
    RAISE NOTICE '   - Ensured language column is properly set in transcripts';
    RAISE NOTICE '   - Ensured processing_duration_seconds is set in transcripts';
    RAISE NOTICE '   - Added proper defaults for all transcript columns';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Update frontend SELECT queries to use correct column names';
    RAISE NOTICE '   2. Test call and transcript display functionality';
    RAISE NOTICE '   3. Verify all frontend components work correctly';
END $$;

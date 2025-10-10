-- ============================================
-- DentalCallInsights - Fix Transcript Columns
-- Migration 09: Add missing columns to match frontend expectations
-- ============================================
-- This migration adds missing columns that the frontend expects
-- to resolve the 406 Not Acceptable error when fetching transcripts
-- ============================================

-- Add missing columns to transcripts table
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS speaker_segments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS sentiment TEXT;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Ensure all required columns exist with proper defaults
UPDATE transcripts 
SET 
    transcript = COALESCE(transcript, content, ''),
    raw_transcript = COALESCE(raw_transcript, content, ''),
    edited_transcript = COALESCE(edited_transcript, content, ''),
    language = COALESCE(language, language_code, 'en'),
    edit_count = COALESCE(edit_count, 0),
    timestamps = COALESCE(timestamps, '[]'::jsonb),
    speaker_segments = COALESCE(speaker_segments, '[]'::jsonb),
    metadata = COALESCE(metadata, '{}'::jsonb)
WHERE 
    transcript IS NULL 
    OR raw_transcript IS NULL 
    OR edited_transcript IS NULL 
    OR language IS NULL 
    OR edit_count IS NULL 
    OR timestamps IS NULL 
    OR speaker_segments IS NULL 
    OR metadata IS NULL;

-- Add comments to document the columns
COMMENT ON COLUMN transcripts.transcript IS 'Legacy field for backward compatibility';
COMMENT ON COLUMN transcripts.raw_transcript IS 'Original transcription from Whisper';
COMMENT ON COLUMN transcripts.edited_transcript IS 'User-edited version';
COMMENT ON COLUMN transcripts.speaker_segments IS 'Speaker diarization segments';
COMMENT ON COLUMN transcripts.timestamps IS 'Word-level timestamps';
COMMENT ON COLUMN transcripts.metadata IS 'Additional transcript metadata';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Transcript columns fix completed successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   - Added missing columns to match frontend expectations';
    RAISE NOTICE '   - Updated existing records with proper defaults';
    RAISE NOTICE '   - Added column documentation';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Test call detail page loading';
    RAISE NOTICE '   2. Verify transcript fetching works';
    RAISE NOTICE '   3. Check for 406 errors resolution';
END $$;

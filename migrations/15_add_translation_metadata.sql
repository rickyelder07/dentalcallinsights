-- ============================================
-- DentalCallInsights - Add Translation Metadata
-- Migration 15: Add translation tracking to transcripts
-- ============================================
-- This migration adds columns to track when Spanish transcripts
-- are translated to English for better user experience.
-- ============================================

-- ============================================
-- ADD TRANSLATION COLUMNS TO TRANSCRIPTS TABLE
-- ============================================

-- Add column to track if transcript was translated
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS was_translated BOOLEAN DEFAULT FALSE;

-- Add column to track original language before translation
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS original_language TEXT;

-- Add index for querying translated transcripts
CREATE INDEX IF NOT EXISTS idx_transcripts_was_translated ON transcripts(was_translated);

-- ============================================
-- UPDATE EXISTING RECORDS
-- ============================================

-- Mark existing Spanish transcripts
UPDATE transcripts 
SET 
    original_language = language,
    was_translated = FALSE
WHERE language IN ('es', 'spanish', 'spa')
AND was_translated IS NULL;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN transcripts.was_translated IS 'Indicates if the transcript was translated from another language to English';
COMMENT ON COLUMN transcripts.original_language IS 'The original language code before translation (e.g., es for Spanish)';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Translation metadata migration completed successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   - Added was_translated column to transcripts';
    RAISE NOTICE '   - Added original_language column to transcripts';
    RAISE NOTICE '   - Created index for translated transcripts';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Update transcription pipeline to use translation';
    RAISE NOTICE '   2. Test with Spanish audio files';
END $$;


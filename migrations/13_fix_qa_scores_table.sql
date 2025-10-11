-- ============================================
-- DentalCallInsights - Fix QA Scores Table Schema
-- Migration 13: Add missing columns to call_scores and score_criteria tables
-- ============================================
-- This migration adds the missing columns that the QA scoring API expects
-- ============================================

-- ============================================
-- ADD MISSING COLUMNS TO CALL_SCORES TABLE
-- ============================================

-- Add category score columns
ALTER TABLE call_scores ADD COLUMN IF NOT EXISTS starting_call_score INTEGER CHECK (starting_call_score >= 0 AND starting_call_score <= 30);
ALTER TABLE call_scores ADD COLUMN IF NOT EXISTS upselling_score INTEGER CHECK (upselling_score >= 0 AND upselling_score <= 25);
ALTER TABLE call_scores ADD COLUMN IF NOT EXISTS rebuttals_score INTEGER CHECK (rebuttals_score >= 0 AND rebuttals_score <= 10);
ALTER TABLE call_scores ADD COLUMN IF NOT EXISTS qualitative_score INTEGER CHECK (qualitative_score >= 0 AND qualitative_score <= 35);

-- Add workflow columns
ALTER TABLE call_scores ADD COLUMN IF NOT EXISTS agent_name TEXT;
ALTER TABLE call_scores ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'completed' CHECK (review_status IN ('draft', 'completed', 'reviewed'));

-- ============================================
-- ADD MISSING COLUMNS TO SCORE_CRITERIA TABLE
-- ============================================

-- Add missing columns for detailed criteria tracking
ALTER TABLE score_criteria ADD COLUMN IF NOT EXISTS criterion_category TEXT;
ALTER TABLE score_criteria ADD COLUMN IF NOT EXISTS transcript_excerpt TEXT;

-- ============================================
-- UPDATE EXISTING RECORDS
-- ============================================

-- Set default review_status for existing records
UPDATE call_scores 
SET review_status = 'completed' 
WHERE review_status IS NULL;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN call_scores.starting_call_score IS 'Score for starting call category (0-30 points)';
COMMENT ON COLUMN call_scores.upselling_score IS 'Score for upselling category (0-25 points)';
COMMENT ON COLUMN call_scores.rebuttals_score IS 'Score for rebuttals category (0-10 points)';
COMMENT ON COLUMN call_scores.qualitative_score IS 'Score for qualitative category (0-35 points)';
COMMENT ON COLUMN call_scores.agent_name IS 'Name of the agent being scored';
COMMENT ON COLUMN call_scores.review_status IS 'Status of the review (draft/completed/reviewed)';
COMMENT ON COLUMN score_criteria.criterion_category IS 'Category of the scoring criterion';
COMMENT ON COLUMN score_criteria.transcript_excerpt IS 'Relevant excerpt from transcript for this criterion';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ QA scores table schema fixes completed successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   - Added starting_call_score column (0-30 points)';
    RAISE NOTICE '   - Added upselling_score column (0-25 points)';
    RAISE NOTICE '   - Added rebuttals_score column (0-10 points)';
    RAISE NOTICE '   - Added qualitative_score column (0-35 points)';
    RAISE NOTICE '   - Added agent_name column';
    RAISE NOTICE '   - Added review_status column (draft/completed/reviewed)';
    RAISE NOTICE '   - Added criterion_category column to score_criteria';
    RAISE NOTICE '   - Added transcript_excerpt column to score_criteria';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Test QA scoring functionality';
    RAISE NOTICE '   2. Verify scores are saved correctly';
    RAISE NOTICE '   3. Check that category scores are calculated properly';
END $$;

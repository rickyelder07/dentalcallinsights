-- ============================================
-- DentalCallInsights - Fix Insights Table Schema
-- Migration 12: Add missing columns to insights table
-- ============================================
-- This migration adds the missing columns that the insights API expects
-- ============================================

-- ============================================
-- ADD MISSING COLUMNS TO INSIGHTS TABLE
-- ============================================

-- Add summary columns
ALTER TABLE insights ADD COLUMN IF NOT EXISTS summary_brief TEXT;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS summary_key_points TEXT[];

-- Add sentiment analysis columns (different from existing ones)
ALTER TABLE insights ADD COLUMN IF NOT EXISTS patient_satisfaction TEXT;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS staff_performance TEXT;

-- Add caching and metadata columns
ALTER TABLE insights ADD COLUMN IF NOT EXISTS transcript_hash TEXT;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- ADD UNIQUE CONSTRAINT FOR CACHING
-- ============================================

-- Add unique constraint on call_id to ensure one insight per call
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'insights_call_id_unique'
    ) THEN
        ALTER TABLE insights ADD CONSTRAINT insights_call_id_unique UNIQUE (call_id);
    END IF;
END $$;

-- ============================================
-- UPDATE EXISTING RECORDS
-- ============================================

-- Update existing records to have generated_at timestamp
UPDATE insights 
SET generated_at = COALESCE(generated_at, created_at)
WHERE generated_at IS NULL;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN insights.summary_brief IS 'Brief summary of the call (2-3 sentences)';
COMMENT ON COLUMN insights.summary_key_points IS 'Array of key points from the call';
COMMENT ON COLUMN insights.patient_satisfaction IS 'Patient satisfaction level (positive/negative/neutral)';
COMMENT ON COLUMN insights.staff_performance IS 'Staff performance assessment';
COMMENT ON COLUMN insights.transcript_hash IS 'Hash of transcript content for caching';
COMMENT ON COLUMN insights.generated_at IS 'When insights were generated';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Insights table schema fixes completed successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   - Added summary_brief column';
    RAISE NOTICE '   - Added summary_key_points array column';
    RAISE NOTICE '   - Added patient_satisfaction column';
    RAISE NOTICE '   - Added staff_performance column';
    RAISE NOTICE '   - Added transcript_hash column for caching';
    RAISE NOTICE '   - Added generated_at timestamp column';
    RAISE NOTICE '   - Added unique constraint on call_id';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Test insights generation';
    RAISE NOTICE '   2. Verify insights are saved to database';
    RAISE NOTICE '   3. Check that existing insights are retrieved correctly';
END $$;

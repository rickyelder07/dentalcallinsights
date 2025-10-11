-- ============================================
-- DentalCallInsights - Add Transcript Unique Constraint
-- Migration 10: Add unique constraint on call_id for transcripts table
-- ============================================
-- This migration adds a unique constraint on call_id to allow upsert operations
-- and prevent duplicate transcript records for the same call
-- ============================================

-- Add unique constraint on call_id
ALTER TABLE transcripts ADD CONSTRAINT transcripts_call_id_unique UNIQUE (call_id);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Transcript unique constraint added successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   - Added unique constraint on call_id column';
    RAISE NOTICE '   - Enables upsert operations with onConflict: call_id';
    RAISE NOTICE '   - Prevents duplicate transcript records';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Test transcription API upsert functionality';
    RAISE NOTICE '   2. Verify no duplicate transcript records';
    RAISE NOTICE '   3. Confirm transcription works without 500 errors';
END $$;

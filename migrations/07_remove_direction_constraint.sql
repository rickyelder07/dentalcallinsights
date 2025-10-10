-- ============================================
-- DentalCallInsights - Remove Direction Constraint
-- Migration 07: Allow flexible direction values
-- ============================================
-- This migration removes the strict direction constraint to allow
-- more flexible direction values in CSV files.
-- ============================================

-- Remove the call_direction check constraint
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_call_direction_check;

-- Add a comment to document the change
COMMENT ON COLUMN calls.call_direction IS 'Call direction - accepts any text value for flexibility';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Direction constraint removal completed successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   - Removed call_direction check constraint';
    RAISE NOTICE '   - Direction column now accepts any text value';
    RAISE NOTICE '   - CSV validation no longer requires specific direction values';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Update API code to handle flexible direction values';
    RAISE NOTICE '   2. Test CSV upload with various direction formats';
    RAISE NOTICE '   3. Verify database accepts new direction values';
END $$;

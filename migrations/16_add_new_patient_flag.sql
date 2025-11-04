-- ============================================
-- DentalCallInsights - Add New Patient Flag
-- Migration 16: Add new patient detection
-- ============================================
-- This migration adds a column to track new patient calls.
-- A call is considered "new patient" when:
-- 1. It is an inbound call
-- 2. The second "dialed:" value in call_flow is "1"
-- ============================================

-- ============================================
-- ADD NEW PATIENT FLAG TO CALLS TABLE
-- ============================================

-- Add column to track new patient calls
ALTER TABLE calls ADD COLUMN IF NOT EXISTS is_new_patient BOOLEAN DEFAULT FALSE;

-- Add index for querying new patient calls
CREATE INDEX IF NOT EXISTS idx_calls_is_new_patient ON calls(is_new_patient);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN calls.is_new_patient IS 'Indicates if this is a new patient call (inbound with second dialed:1 in call_flow)';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ New patient flag migration completed successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   - Added is_new_patient column to calls';
    RAISE NOTICE '   - Created index for new patient queries';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Update CSV upload logic to detect new patient status';
    RAISE NOTICE '   2. Add new patient filter to library and analytics pages';
END $$;


-- ============================================
-- DentalCallInsights - Backfill New Patient Flag
-- Migration 18: Update existing records with new patient status
-- ============================================
-- This migration updates existing call records to calculate
-- the is_new_patient flag based on their call_flow data.
-- Run this AFTER migration 16 if you have existing data.
-- ============================================

-- ============================================
-- BACKFILL EXISTING RECORDS
-- ============================================

-- First, set all to FALSE as default
UPDATE calls
SET is_new_patient = FALSE
WHERE is_new_patient IS NULL;

-- Now update the ones that ARE new patients
-- Using a subquery to identify which calls have second dialed:1
WITH new_patient_calls AS (
    SELECT id
    FROM calls
    WHERE 
        -- Must be inbound
        LOWER(call_direction) = 'inbound'
        -- Must have call flow data
        AND call_flow IS NOT NULL
        -- Extract all dialed values and check if second one is "1"
        AND (
            SELECT COUNT(*) 
            FROM regexp_matches(call_flow, 'dialed:(\d+)', 'g') 
        ) >= 2
        AND (
            SELECT (regexp_matches(call_flow, 'dialed:(\d+)', 'g'))[1]
            FROM regexp_matches(call_flow, 'dialed:(\d+)', 'g') m
            OFFSET 1 LIMIT 1
        ) = '1'
)
UPDATE calls
SET is_new_patient = TRUE
WHERE id IN (SELECT id FROM new_patient_calls);

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- This query shows the breakdown of new vs existing patients
-- Run this to verify the backfill worked correctly
DO $$
DECLARE
    total_calls INTEGER;
    new_patients INTEGER;
    existing_patients INTEGER;
    inbound_calls INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_calls FROM calls;
    SELECT COUNT(*) INTO new_patients FROM calls WHERE is_new_patient = TRUE;
    SELECT COUNT(*) INTO existing_patients FROM calls WHERE is_new_patient = FALSE;
    SELECT COUNT(*) INTO inbound_calls FROM calls WHERE LOWER(call_direction) = 'inbound';
    
    RAISE NOTICE '✅ New patient flag backfill completed!';
    RAISE NOTICE '📊 Statistics:';
    RAISE NOTICE '   - Total calls: %', total_calls;
    RAISE NOTICE '   - Inbound calls: %', inbound_calls;
    RAISE NOTICE '   - New patients: %', new_patients;
    RAISE NOTICE '   - Existing patients: %', existing_patients;
END $$;

-- ============================================
-- SAMPLE QUERY TO VERIFY
-- ============================================

-- Uncomment to see sample records with their new patient status
-- SELECT 
--     id,
--     call_time,
--     call_direction,
--     is_new_patient,
--     call_flow
-- FROM calls
-- WHERE LOWER(call_direction) = 'inbound'
-- ORDER BY call_time DESC
-- LIMIT 20;


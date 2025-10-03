-- Prevent Duplicate Calls Migration
-- Adds unique constraint to prevent duplicate call records
-- 
-- This ensures that the same call (same user, filename, and call time) 
-- cannot be inserted multiple times

-- ============================================
-- ADD UNIQUE CONSTRAINT
-- ============================================

-- Create unique index to prevent duplicates
-- A call is considered unique by: user_id + filename + call_time
CREATE UNIQUE INDEX IF NOT EXISTS idx_calls_unique_record 
ON calls(user_id, filename, call_time);

-- ============================================
-- REMOVE EXISTING DUPLICATES (OPTIONAL)
-- ============================================

-- If you have existing duplicates, you can remove them with this query:
-- This keeps the most recent version of each duplicate

/*
WITH duplicates AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, filename, call_time 
            ORDER BY created_at DESC
        ) as rn
    FROM calls
)
DELETE FROM calls 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);
*/

-- To run the duplicate removal, uncomment the query above

-- ============================================
-- VERIFY NO DUPLICATES
-- ============================================

-- Query to check for duplicates (should return 0 rows after cleanup):
-- SELECT 
--     user_id, 
--     filename, 
--     call_time, 
--     COUNT(*) as duplicate_count
-- FROM calls
-- GROUP BY user_id, filename, call_time
-- HAVING COUNT(*) > 1;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Next steps:
-- 1. Review existing data for duplicates
-- 2. Run duplicate removal query if needed (uncomment above)
-- 3. Verify unique constraint is working
-- 4. Test upload with existing data - should update instead of duplicate


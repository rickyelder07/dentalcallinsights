-- ===================================================================
-- DIAGNOSTIC QUERIES: Check if insights table exists and is working
-- Run these in Supabase SQL Editor to diagnose the issue
-- ===================================================================

-- 1. Check if insights table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'insights'
) as table_exists;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'insights'
ORDER BY ordinal_position;

-- 3. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'insights';

-- 4. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'insights';

-- 5. Try to query insights (as current user)
SELECT COUNT(*) as total_insights
FROM insights;

-- 6. Check if any insights exist at all (bypass RLS with service role)
-- Note: This query will only work if you're using service role key
SELECT 
    id,
    call_id,
    user_id,
    summary_brief,
    overall_sentiment,
    generated_at
FROM insights
LIMIT 5;

-- 7. Check for specific call_id (replace with your actual call_id)
-- SELECT * FROM insights WHERE call_id = 'your-call-id-here';

-- ===================================================================
-- EXPECTED RESULTS
-- ===================================================================

-- Query 1 should return: table_exists = true
-- Query 2 should return: ~15 columns
-- Query 3 should return: rowsecurity = true
-- Query 4 should return: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- Query 5 should return: Your insight count (may be 0 if none generated yet)
-- Query 6 should return: Insight records (if any exist)

-- ===================================================================
-- IF TABLE DOESN'T EXIST
-- ===================================================================

-- Run the migration file:
-- migrations/006_insights_schema.sql

-- Copy and paste the entire contents into Supabase SQL Editor and execute

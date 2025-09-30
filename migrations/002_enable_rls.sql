-- ============================================
-- DentalCallInsights - Row Level Security (RLS) Migration
-- Milestone 2: Authentication & Authorization
-- ============================================
-- This migration enables Row Level Security on all tables and creates
-- policies to ensure users can only access their own data.
--
-- Security Model:
-- - Each row is associated with a user_id (UUID)
-- - RLS policies filter queries to auth.uid() = user_id
-- - Users can only SELECT, INSERT, UPDATE, DELETE their own data
-- - Service role key bypasses RLS for admin operations
--
-- Prerequisites:
-- - Run migration 001_init.sql first
-- - Enable authentication in Supabase dashboard
-- - auth.uid() function is available (provided by Supabase Auth)
-- ============================================

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on calls table
-- Ensures users can only access calls they created
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Enable RLS on transcripts table
-- Ensures users can only access transcripts for their calls
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on embeddings table
-- Ensures users can only access embeddings for their calls
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CALLS TABLE POLICIES
-- ============================================

-- Policy: Users can view their own calls
-- Filters SELECT queries to only return rows where user_id matches authenticated user
CREATE POLICY "users_select_own_calls" ON calls
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own calls
-- Validates INSERT operations to ensure user_id matches authenticated user
CREATE POLICY "users_insert_own_calls" ON calls
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own calls
-- Validates UPDATE operations to ensure user_id matches authenticated user
CREATE POLICY "users_update_own_calls" ON calls
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own calls
-- Validates DELETE operations to ensure user_id matches authenticated user
CREATE POLICY "users_delete_own_calls" ON calls
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- TRANSCRIPTS TABLE POLICIES
-- ============================================

-- Policy: Users can view transcripts for their calls
-- Uses a subquery to check if the associated call belongs to the user
CREATE POLICY "users_select_own_transcripts" ON transcripts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = transcripts.call_id
            AND calls.user_id = auth.uid()
        )
    );

-- Policy: Users can insert transcripts for their calls
-- Validates that the call_id belongs to a call owned by the user
CREATE POLICY "users_insert_own_transcripts" ON transcripts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = transcripts.call_id
            AND calls.user_id = auth.uid()
        )
    );

-- Policy: Users can update transcripts for their calls
-- Validates that the call_id belongs to a call owned by the user
CREATE POLICY "users_update_own_transcripts" ON transcripts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = transcripts.call_id
            AND calls.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = transcripts.call_id
            AND calls.user_id = auth.uid()
        )
    );

-- Policy: Users can delete transcripts for their calls
-- Validates that the call_id belongs to a call owned by the user
CREATE POLICY "users_delete_own_transcripts" ON transcripts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = transcripts.call_id
            AND calls.user_id = auth.uid()
        )
    );

-- ============================================
-- EMBEDDINGS TABLE POLICIES
-- ============================================

-- Policy: Users can view embeddings for their calls
-- Uses a subquery to check if the associated call belongs to the user
CREATE POLICY "users_select_own_embeddings" ON embeddings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = embeddings.call_id
            AND calls.user_id = auth.uid()
        )
    );

-- Policy: Users can insert embeddings for their calls
-- Validates that the call_id belongs to a call owned by the user
CREATE POLICY "users_insert_own_embeddings" ON embeddings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = embeddings.call_id
            AND calls.user_id = auth.uid()
        )
    );

-- Policy: Users can update embeddings for their calls
-- Validates that the call_id belongs to a call owned by the user
CREATE POLICY "users_update_own_embeddings" ON embeddings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = embeddings.call_id
            AND calls.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = embeddings.call_id
            AND calls.user_id = auth.uid()
        )
    );

-- Policy: Users can delete embeddings for their calls
-- Validates that the call_id belongs to a call owned by the user
CREATE POLICY "users_delete_own_embeddings" ON embeddings
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM calls
            WHERE calls.id = embeddings.call_id
            AND calls.user_id = auth.uid()
        )
    );

-- ============================================
-- UPDATE SEARCH FUNCTION FOR RLS
-- ============================================

-- Update the search_embeddings function to respect RLS
-- by joining with calls table to filter results
DROP FUNCTION IF EXISTS search_embeddings(vector(1536), float, int);

CREATE OR REPLACE FUNCTION search_embeddings(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.78,
    match_count int DEFAULT 10,
    user_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    call_id uuid,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        embeddings.id,
        embeddings.call_id,
        embeddings.content,
        1 - (embeddings.embedding <=> query_embedding) as similarity
    FROM embeddings
    INNER JOIN calls ON calls.id = embeddings.call_id
    WHERE 1 - (embeddings.embedding <=> query_embedding) > match_threshold
    AND (user_id_filter IS NULL OR calls.user_id = user_id_filter)
    ORDER BY embeddings.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify RLS is enabled and policies are created

-- Check RLS is enabled on all tables
-- Expected: All should show 't' (true)
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('calls', 'transcripts', 'embeddings');

-- Check policies are created
-- Expected: 12 policies total (4 per table: SELECT, INSERT, UPDATE, DELETE)
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('calls', 'transcripts', 'embeddings')
-- ORDER BY tablename, cmd;

-- ============================================
-- TESTING INSTRUCTIONS
-- ============================================
-- To test RLS policies:
--
-- 1. Create test users via Supabase Auth dashboard or signup flow
-- 2. Sign in as User A and create a call
-- 3. Sign in as User B and try to access User A's call
-- 4. Verify User B cannot see or modify User A's data
--
-- For SQL-level testing:
-- SET request.jwt.claim.sub = 'user-a-uuid';
-- INSERT INTO calls (user_id, audio_path, metadata) VALUES ('user-a-uuid', 'test.mp3', '{}');
-- SELECT * FROM calls; -- Should see User A's calls
--
-- SET request.jwt.claim.sub = 'user-b-uuid';
-- SELECT * FROM calls; -- Should NOT see User A's calls
--
-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================
-- If you need to rollback this migration:
--
-- DROP POLICY IF EXISTS "users_delete_own_embeddings" ON embeddings;
-- DROP POLICY IF EXISTS "users_update_own_embeddings" ON embeddings;
-- DROP POLICY IF EXISTS "users_insert_own_embeddings" ON embeddings;
-- DROP POLICY IF EXISTS "users_select_own_embeddings" ON embeddings;
--
-- DROP POLICY IF EXISTS "users_delete_own_transcripts" ON transcripts;
-- DROP POLICY IF EXISTS "users_update_own_transcripts" ON transcripts;
-- DROP POLICY IF EXISTS "users_insert_own_transcripts" ON transcripts;
-- DROP POLICY IF EXISTS "users_select_own_transcripts" ON transcripts;
--
-- DROP POLICY IF EXISTS "users_delete_own_calls" ON calls;
-- DROP POLICY IF EXISTS "users_update_own_calls" ON calls;
-- DROP POLICY IF EXISTS "users_insert_own_calls" ON calls;
-- DROP POLICY IF EXISTS "users_select_own_calls" ON calls;
--
-- ALTER TABLE embeddings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE transcripts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE calls DISABLE ROW LEVEL SECURITY;
--
-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Row Level Security is now enabled!
-- Users can only access their own data.
-- Service role key bypasses RLS for admin operations.


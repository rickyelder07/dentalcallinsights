-- ============================================
-- DentalCallInsights - Add Search Similar Calls Function
-- Migration 17: Create proper search_similar_calls function
-- ============================================
-- This migration creates the search_similar_calls function that
-- the semantic search API expects. It uses pgvector for similarity search.
-- ============================================

-- ============================================
-- CREATE SEARCH SIMILAR CALLS FUNCTION
-- ============================================

-- Drop function if it exists (to allow recreation)
DROP FUNCTION IF EXISTS search_similar_calls(vector(1536), float, integer, uuid);

-- Create the search_similar_calls function
CREATE OR REPLACE FUNCTION search_similar_calls(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count integer DEFAULT 20,
    target_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
    call_id uuid,
    chunk_index integer,
    content text,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.call_id,
        e.chunk_index,
        e.content,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM embeddings e
    INNER JOIN calls c ON e.call_id = c.id
    WHERE 
        -- Filter by user if specified, otherwise use auth.uid()
        c.user_id = COALESCE(target_user_id, auth.uid())
        -- Filter by similarity threshold
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_similar_calls(vector(1536), float, integer, uuid) TO authenticated;

-- ============================================
-- ADD SEARCH QUERIES TABLE FOR ANALYTICS
-- ============================================

-- Create search queries table if it doesn't exist
CREATE TABLE IF NOT EXISTS search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    query_text TEXT NOT NULL,
    query_type TEXT DEFAULT 'semantic' CHECK (query_type IN ('semantic', 'keyword', 'hybrid')),
    filters JSONB DEFAULT '{}'::jsonb,
    result_count INTEGER DEFAULT 0,
    has_results BOOLEAN DEFAULT FALSE,
    search_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on search_queries
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for search_queries
DO $$
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "Users can view own search queries" ON search_queries;
    DROP POLICY IF EXISTS "Users can insert own search queries" ON search_queries;
    
    -- Create policies
    CREATE POLICY "Users can view own search queries" ON search_queries
        FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert own search queries" ON search_queries
        FOR INSERT WITH CHECK (auth.uid() = user_id);
END $$;

-- Add index for search queries
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at DESC);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION search_similar_calls IS 'Performs vector similarity search on call embeddings using pgvector';
COMMENT ON TABLE search_queries IS 'Tracks user search queries for analytics and debugging';

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Search similar calls function migration completed successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   - Created search_similar_calls function with pgvector';
    RAISE NOTICE '   - Created/updated search_queries table for analytics';
    RAISE NOTICE '   - Added RLS policies for search_queries';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Test semantic search functionality';
    RAISE NOTICE '   2. Generate embeddings for calls';
    RAISE NOTICE '   3. Use search debug panel to verify';
END $$;


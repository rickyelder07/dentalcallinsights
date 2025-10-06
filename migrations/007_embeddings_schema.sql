-- ===================================================================
-- Milestone 6: Embeddings and Search - Database Schema
-- Creates pgvector extension, embeddings table, and search infrastructure
-- Features: Vector storage, similarity search, cost tracking
-- ===================================================================

-- ===================================================================
-- ENABLE PGVECTOR EXTENSION
-- ===================================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ===================================================================
-- EMBEDDINGS TABLE
-- ===================================================================

-- Create embeddings table for storing vector representations of call transcripts
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Vector data (1536 dimensions for text-embedding-3-small)
    embedding vector(1536) NOT NULL,
    embedding_model TEXT DEFAULT 'text-embedding-3-small' NOT NULL,
    embedding_version INTEGER DEFAULT 1 NOT NULL,
    
    -- Source content
    content_type TEXT DEFAULT 'transcript' NOT NULL, -- 'transcript', 'summary', 'combined'
    content_hash TEXT NOT NULL, -- SHA-256 hash for cache invalidation
    token_count INTEGER NOT NULL,
    
    -- Metadata
    generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Unique constraint (one embedding per call per content type)
    UNIQUE(call_id, content_type)
);

-- ===================================================================
-- INDEXES FOR EMBEDDINGS
-- ===================================================================

-- Index for call lookup
CREATE INDEX idx_embeddings_call_id ON embeddings(call_id);

-- Index for user lookup
CREATE INDEX idx_embeddings_user_id ON embeddings(user_id);

-- Index for content type filtering
CREATE INDEX idx_embeddings_content_type ON embeddings(content_type);

-- Vector similarity search index (HNSW for fast approximate nearest neighbor search)
-- This is the critical index for semantic search performance
CREATE INDEX idx_embeddings_vector ON embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Note: HNSW parameters:
-- m = 16: Number of connections per layer (higher = more accurate but slower)
-- ef_construction = 64: Size of dynamic candidate list (higher = better index quality)

-- Index for cache lookups
CREATE INDEX idx_embeddings_content_hash ON embeddings(content_hash);

-- ===================================================================
-- EMBEDDING COSTS TABLE
-- ===================================================================

-- Track embedding generation costs for billing and analytics
CREATE TABLE IF NOT EXISTS embedding_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    
    -- Usage metrics
    token_count INTEGER NOT NULL,
    model TEXT NOT NULL,
    cost_usd DECIMAL(10, 6) NOT NULL, -- Cost in USD (6 decimal places for precision)
    
    -- Context
    operation_type TEXT DEFAULT 'generate' NOT NULL, -- 'generate', 'batch', 'regenerate'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for user cost tracking
CREATE INDEX idx_embedding_costs_user_id ON embedding_costs(user_id);

-- Index for date-based queries
CREATE INDEX idx_embedding_costs_created_at ON embedding_costs(created_at);

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS on embeddings table
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Users can view their own embeddings
CREATE POLICY "Users can view own embeddings" ON embeddings
FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own embeddings
CREATE POLICY "Users can insert own embeddings" ON embeddings
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own embeddings
CREATE POLICY "Users can update own embeddings" ON embeddings
FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own embeddings
CREATE POLICY "Users can delete own embeddings" ON embeddings
FOR DELETE USING (user_id = auth.uid());

-- Enable RLS on embedding_costs table
ALTER TABLE embedding_costs ENABLE ROW LEVEL SECURITY;

-- Users can view their own costs
CREATE POLICY "Users can view own embedding costs" ON embedding_costs
FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own costs
CREATE POLICY "Users can insert own embedding costs" ON embedding_costs
FOR INSERT WITH CHECK (user_id = auth.uid());

-- ===================================================================
-- HELPER FUNCTIONS
-- ===================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on embeddings table
CREATE TRIGGER embeddings_updated_at_trigger
BEFORE UPDATE ON embeddings
FOR EACH ROW
EXECUTE FUNCTION update_embeddings_updated_at();

-- ===================================================================
-- VECTOR SIMILARITY SEARCH FUNCTION
-- ===================================================================

-- Function to search for similar calls using cosine similarity
CREATE OR REPLACE FUNCTION search_similar_calls(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    target_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
    call_id uuid,
    similarity float,
    embedding_id uuid
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.call_id,
        1 - (e.embedding <=> query_embedding) as similarity,
        e.id as embedding_id
    FROM embeddings e
    WHERE 
        (target_user_id IS NULL OR e.user_id = target_user_id)
        AND (1 - (e.embedding <=> query_embedding)) >= match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- USER STATISTICS VIEWS
-- ===================================================================

-- View for user embedding usage statistics
CREATE OR REPLACE VIEW user_embedding_stats AS
SELECT 
    user_id,
    COUNT(DISTINCT call_id) as total_calls_embedded,
    SUM(token_count) as total_tokens,
    AVG(token_count) as avg_tokens_per_call,
    MAX(generated_at) as last_generated,
    MIN(created_at) as first_generated
FROM embeddings
GROUP BY user_id;

-- View for user cost statistics
CREATE OR REPLACE VIEW user_cost_stats AS
SELECT 
    user_id,
    COUNT(*) as total_operations,
    SUM(token_count) as total_tokens,
    SUM(cost_usd) as total_cost_usd,
    AVG(cost_usd) as avg_cost_per_operation,
    MAX(created_at) as last_operation
FROM embedding_costs
GROUP BY user_id;

-- ===================================================================
-- CLEANUP FUNCTIONS
-- ===================================================================

-- Function to delete embeddings for deleted calls (handled by CASCADE)
-- Function to recalculate embeddings if content changes (based on content_hash)

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Composite index for common query patterns
CREATE INDEX idx_embeddings_user_call ON embeddings(user_id, call_id);

-- Index for model version tracking
CREATE INDEX idx_embeddings_model_version ON embeddings(embedding_model, embedding_version);

-- ===================================================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================================================

COMMENT ON TABLE embeddings IS 'Stores vector embeddings for semantic search of call transcripts';
COMMENT ON COLUMN embeddings.embedding IS '1536-dimensional vector from OpenAI text-embedding-3-small';
COMMENT ON COLUMN embeddings.content_hash IS 'SHA-256 hash of source content for cache invalidation';
COMMENT ON COLUMN embeddings.token_count IS 'Number of tokens used for embedding generation (for cost tracking)';

COMMENT ON TABLE embedding_costs IS 'Tracks costs associated with embedding generation for billing and analytics';
COMMENT ON COLUMN embedding_costs.cost_usd IS 'Cost in USD with 6 decimal precision';

COMMENT ON FUNCTION search_similar_calls IS 'Searches for calls similar to the query embedding using cosine similarity';

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- To verify installation, run:
-- SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
-- SELECT COUNT(*) FROM embeddings;
-- SELECT * FROM user_embedding_stats LIMIT 5;

-- ===================================================================
-- NOTES
-- ===================================================================

-- 1. pgvector extension must be enabled in your Supabase project
-- 2. Vector dimensions (1536) match OpenAI text-embedding-3-small
-- 3. HNSW index provides fast approximate nearest neighbor search
-- 4. Cosine similarity is used for measuring vector similarity
-- 5. RLS policies ensure users can only access their own embeddings
-- 6. content_hash enables efficient cache invalidation
-- 7. Unique constraint prevents duplicate embeddings per call

-- Cost calculation for text-embedding-3-small:
-- $0.00002 per 1K tokens
-- Average transcript: ~2,000 tokens
-- Cost per embedding: ~$0.00004


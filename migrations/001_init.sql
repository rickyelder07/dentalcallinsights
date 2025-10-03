-- DentalCallInsights Database Schema Initialization
-- This migration sets up the core tables for call storage, transcripts, and vector embeddings
-- 
-- Prerequisites:
-- 1. Enable pgvector extension in your Supabase project
-- 2. Ensure you have proper authentication policies set up

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- CALLS TABLE
-- Stores audio file metadata and references
-- ============================================
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    audio_path TEXT NOT NULL DEFAULT '', -- Allow empty for calls without recordings
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    
    -- Note: No constraint on audio_path to allow calls without recordings
);

-- Create index on user_id for efficient user-specific queries
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);

-- Create GIN index on metadata JSONB for flexible querying
-- Useful for searching by patient_id, call_type, tags, etc.
CREATE INDEX IF NOT EXISTS idx_calls_metadata ON calls USING GIN (metadata jsonb_path_ops);

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRANSCRIPTS TABLE
-- Stores transcription results and AI-generated insights
-- ============================================
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    summary TEXT,
    sentiment TEXT,
    duration INTEGER, -- Duration in seconds
    language TEXT DEFAULT 'en',
    confidence_score NUMERIC(3, 2), -- 0.00 to 1.00
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT transcripts_transcript_not_empty CHECK (transcript <> ''),
    CONSTRAINT transcripts_duration_positive CHECK (duration IS NULL OR duration > 0),
    CONSTRAINT transcripts_confidence_range CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

-- Create index on call_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_transcripts_call_id ON transcripts(call_id);

-- Create full-text search index on transcript for efficient text search
CREATE INDEX IF NOT EXISTS idx_transcripts_fulltext ON transcripts USING GIN (to_tsvector('english', transcript));

-- Create index on sentiment for filtering
CREATE INDEX IF NOT EXISTS idx_transcripts_sentiment ON transcripts(sentiment);

-- ============================================
-- EMBEDDINGS TABLE
-- Stores vector embeddings for semantic search
-- ============================================
-- NOTE: vector(1536) is sized for OpenAI's text-embedding-ada-002 model
-- If using a different embedding model, adjust the dimension:
--   - text-embedding-3-small: vector(1536)
--   - text-embedding-3-large: vector(3072)
--   - Other models: check model documentation
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL, -- Adjust dimension if needed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT embeddings_content_not_empty CHECK (content <> ''),
    CONSTRAINT embeddings_chunk_index_positive CHECK (chunk_index >= 0),
    UNIQUE(call_id, chunk_index)
);

-- Create index on call_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_embeddings_call_id ON embeddings(call_id);

-- Create vector similarity index for fast nearest neighbor search
-- Using ivfflat index for efficient cosine similarity searches
-- Lists parameter (100) can be tuned based on dataset size:
--   - Small datasets (< 1M rows): lists = rows / 1000
--   - Larger datasets: tune based on performance testing
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function to search embeddings by similarity
-- Returns the most similar embeddings to a query vector
CREATE OR REPLACE FUNCTION search_embeddings(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.78,
    match_count int DEFAULT 10
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
    WHERE 1 - (embeddings.embedding <=> query_embedding) > match_threshold
    ORDER BY embeddings.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- Uncomment and customize based on your auth strategy
-- ============================================

-- Enable RLS on all tables
-- ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only access their own calls
-- CREATE POLICY "Users can view own calls" ON calls
--     FOR SELECT
--     USING (auth.uid() = user_id);

-- CREATE POLICY "Users can insert own calls" ON calls
--     FOR INSERT
--     WITH CHECK (auth.uid() = user_id);

-- Example policy: Users can access transcripts for their calls
-- CREATE POLICY "Users can view own transcripts" ON transcripts
--     FOR SELECT
--     USING (
--         EXISTS (
--             SELECT 1 FROM calls
--             WHERE calls.id = transcripts.call_id
--             AND calls.user_id = auth.uid()
--         )
--     );

-- ============================================
-- SAMPLE DATA (OPTIONAL - REMOVE IN PRODUCTION)
-- ============================================

-- Uncomment to insert sample data for testing
-- INSERT INTO calls (user_id, audio_path, metadata) VALUES
--     ('00000000-0000-0000-0000-000000000000', 'uploads/sample1.mp3', '{"patient_id": "P001", "call_type": "appointment_booking"}'),
--     ('00000000-0000-0000-0000-000000000000', 'uploads/sample2.mp3', '{"patient_id": "P002", "call_type": "follow_up"}');

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Review and customize RLS policies based on your auth requirements
-- 2. Adjust vector dimension in embeddings table if using different model
-- 3. Test the schema with sample inserts
-- 4. Run performance tests and tune index parameters if needed

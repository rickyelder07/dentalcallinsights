-- ============================================
-- DentalCallInsights - Fix Embeddings Schema
-- Migration 14: Fix Embeddings Table Schema
-- ============================================
-- This migration fixes the embeddings table to include all required columns
-- that the API code expects for proper embedding storage and caching.
--
-- Prerequisites:
-- - Run all previous migrations first
-- - Ensure embeddings table exists
-- ============================================

-- ============================================
-- ADD MISSING COLUMNS TO EMBEDDINGS TABLE
-- ============================================

-- Add content hash for cache invalidation
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Add embedding model information
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';

-- Add embedding version for model updates
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS embedding_version INTEGER DEFAULT 1;

-- Add token count for cost tracking
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS token_count INTEGER DEFAULT 0;

-- Add generation timestamp
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at timestamp
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- ADD EMBEDDING COSTS TABLE
-- ============================================

-- Create table to track embedding generation costs
CREATE TABLE IF NOT EXISTS embedding_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    token_count INTEGER NOT NULL DEFAULT 0,
    model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,
    operation_type TEXT DEFAULT 'generate' CHECK (operation_type IN ('generate', 'regenerate', 'batch')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on embedding_costs
ALTER TABLE embedding_costs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for embedding_costs
CREATE POLICY "Users can view own embedding costs" ON embedding_costs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own embedding costs" ON embedding_costs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Index for content hash lookups
CREATE INDEX IF NOT EXISTS idx_embeddings_content_hash ON embeddings(content_hash);

-- Index for embedding model filtering
CREATE INDEX IF NOT EXISTS idx_embeddings_model ON embeddings(embedding_model);

-- Index for generation timestamp
CREATE INDEX IF NOT EXISTS idx_embeddings_generated_at ON embeddings(generated_at);

-- Index for embedding costs
CREATE INDEX IF NOT EXISTS idx_embedding_costs_user_id ON embedding_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_embedding_costs_call_id ON embedding_costs(call_id);
CREATE INDEX IF NOT EXISTS idx_embedding_costs_created_at ON embedding_costs(created_at);

-- ============================================
-- UPDATE EXISTING RECORDS
-- ============================================

-- Update existing embeddings with default values
UPDATE embeddings 
SET 
    content_hash = encode(digest(content, 'sha256'), 'hex'),
    embedding_model = 'text-embedding-3-small',
    embedding_version = 1,
    token_count = LENGTH(content) / 4, -- Rough estimate
    generated_at = COALESCE(generated_at, created_at),
    updated_at = NOW()
WHERE content_hash IS NULL;

-- ============================================
-- ADD UNIQUE CONSTRAINT
-- ============================================

-- Add unique constraint to prevent duplicate embeddings for same call/content type
-- First check if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_call_content_type' 
        AND table_name = 'embeddings'
    ) THEN
        ALTER TABLE embeddings 
        ADD CONSTRAINT unique_call_content_type 
        UNIQUE (call_id, content_type);
    END IF;
END $$;

-- ============================================
-- ADD COMMENTS
-- ============================================

COMMENT ON COLUMN embeddings.content_hash IS 'SHA-256 hash of content for cache invalidation';
COMMENT ON COLUMN embeddings.embedding_model IS 'OpenAI model used for embedding generation';
COMMENT ON COLUMN embeddings.embedding_version IS 'Version number for model updates';
COMMENT ON COLUMN embeddings.token_count IS 'Number of tokens processed for cost tracking';
COMMENT ON COLUMN embeddings.generated_at IS 'When the embedding was generated';
COMMENT ON COLUMN embeddings.updated_at IS 'When the record was last updated';

COMMENT ON TABLE embedding_costs IS 'Tracks costs for embedding generation operations';
COMMENT ON COLUMN embedding_costs.operation_type IS 'Type of operation: generate, regenerate, or batch';

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the schema is correct
DO $$
BEGIN
    -- Check that all required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'embeddings' 
        AND column_name = 'content_hash'
    ) THEN
        RAISE EXCEPTION 'content_hash column missing from embeddings table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'embeddings' 
        AND column_name = 'embedding_model'
    ) THEN
        RAISE EXCEPTION 'embedding_model column missing from embeddings table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'embeddings' 
        AND column_name = 'token_count'
    ) THEN
        RAISE EXCEPTION 'token_count column missing from embeddings table';
    END IF;
    
    RAISE NOTICE '✅ Embeddings schema migration completed successfully';
    RAISE NOTICE '📋 Added columns: content_hash, embedding_model, embedding_version, token_count, generated_at, updated_at';
    RAISE NOTICE '📋 Created embedding_costs table for cost tracking';
    RAISE NOTICE '📋 Added indexes for performance';
    RAISE NOTICE '📋 Updated existing records with default values';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Test embedding generation API endpoints';
    RAISE NOTICE '   2. Add automatic embedding generation after transcription';
    RAISE NOTICE '   3. Verify embeddings are being created and stored';
END $$;

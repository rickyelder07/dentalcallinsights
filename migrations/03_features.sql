-- ============================================
-- DentalCallInsights - Core Features
-- Migration 03: Core Features Setup
-- ============================================
-- This migration adds core functionality including:
-- - Call upload and processing
-- - Transcription pipeline
-- - Insights generation
-- - Search functionality
-- - Export capabilities
--
-- Prerequisites:
-- - Run migrations 01_core_schema.sql and 02_auth_security.sql first
-- - Ensure authentication is working
-- ============================================

-- ============================================
-- CALL PROCESSING ENHANCEMENTS
-- ============================================

-- Add columns for enhanced call processing
ALTER TABLE calls ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS transcription_job_id TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS insights_job_id TEXT;

-- Add duplicate prevention
ALTER TABLE calls ADD COLUMN IF NOT EXISTS file_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_calls_user_file_hash ON calls(user_id, file_hash) WHERE file_hash IS NOT NULL;

-- ============================================
-- SEARCH ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    query TEXT NOT NULL,
    query_type TEXT DEFAULT 'semantic' CHECK (query_type IN ('semantic', 'keyword', 'filter')),
    results_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    filters_applied JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on search_analytics
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Search analytics policies
CREATE POLICY "Users can view own search analytics" ON search_analytics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search analytics" ON search_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for search analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at DESC);

-- ============================================
-- EXPORT HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS export_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    export_type TEXT NOT NULL CHECK (export_type IN ('calls', 'transcripts', 'insights', 'analytics')),
    file_format TEXT NOT NULL CHECK (file_format IN ('csv', 'json', 'xlsx')),
    filters_applied JSONB DEFAULT '{}'::jsonb,
    records_exported INTEGER DEFAULT 0,
    file_size_bytes BIGINT,
    download_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on export_history
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;

-- Export history policies
CREATE POLICY "Users can view own export history" ON export_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own export history" ON export_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for export history
CREATE INDEX IF NOT EXISTS idx_export_history_user_id ON export_history(user_id);
CREATE INDEX IF NOT EXISTS idx_export_history_created_at ON export_history(created_at DESC);

-- ============================================
-- FILTER PRESETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS filter_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on filter_presets
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;

-- Filter presets policies
CREATE POLICY "Users can view own filter presets" ON filter_presets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own filter presets" ON filter_presets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own filter presets" ON filter_presets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own filter presets" ON filter_presets
    FOR DELETE USING (auth.uid() = user_id);

-- Index for filter presets
CREATE INDEX IF NOT EXISTS idx_filter_presets_user_id ON filter_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_filter_presets_is_default ON filter_presets(user_id, is_default);

-- ============================================
-- TRANSCRIPTION CORRECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transcription_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    find_text TEXT NOT NULL,
    replace_text TEXT NOT NULL,
    is_regex BOOLEAN DEFAULT FALSE,
    case_sensitive BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on transcription_corrections
ALTER TABLE transcription_corrections ENABLE ROW LEVEL SECURITY;

-- Transcription corrections policies
CREATE POLICY "Users can view own transcription corrections" ON transcription_corrections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transcription corrections" ON transcription_corrections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transcription corrections" ON transcription_corrections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transcription corrections" ON transcription_corrections
    FOR DELETE USING (auth.uid() = user_id);

-- Index for transcription corrections
CREATE INDEX IF NOT EXISTS idx_transcription_corrections_user_id ON transcription_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_transcription_corrections_priority ON transcription_corrections(priority);

-- ============================================
-- HELPER FUNCTIONS FOR FEATURES
-- ============================================

-- Function to get call statistics for a user
CREATE OR REPLACE FUNCTION get_user_call_stats()
RETURNS TABLE (
    total_calls BIGINT,
    transcribed_calls BIGINT,
    calls_with_insights BIGINT,
    calls_with_embeddings BIGINT,
    avg_call_duration DECIMAL,
    total_duration_seconds BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_calls,
        COUNT(t.id) as transcribed_calls,
        COUNT(i.id) as calls_with_insights,
        COUNT(e.id) as calls_with_embeddings,
        AVG(c.call_duration_seconds) as avg_call_duration,
        SUM(c.call_duration_seconds) as total_duration_seconds
    FROM calls c
    LEFT JOIN transcripts t ON c.id = t.call_id AND t.transcription_status = 'completed'
    LEFT JOIN insights i ON c.id = i.call_id
    LEFT JOIN embeddings e ON c.id = e.call_id
    WHERE c.user_id = auth.uid();
END;
$$;

-- Function to search calls semantically
CREATE OR REPLACE FUNCTION semantic_search_calls(
    search_query TEXT,
    similarity_threshold DECIMAL DEFAULT 0.7,
    limit_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    call_id UUID,
    filename TEXT,
    call_time TIMESTAMP WITH TIME ZONE,
    similarity_score DECIMAL,
    content_preview TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    query_embedding VECTOR(1536);
BEGIN
    -- Note: In production, you would generate the embedding using OpenAI API
    -- For now, we'll use a placeholder
    query_embedding := array_fill(0.0, ARRAY[1536])::vector;
    
    RETURN QUERY
    SELECT 
        e.call_id,
        c.filename,
        c.call_time,
        (1 - (e.embedding <=> query_embedding)) as similarity_score,
        LEFT(e.content, 200) as content_preview
    FROM embeddings e
    JOIN calls c ON e.call_id = c.id
    WHERE c.user_id = auth.uid()
    AND (1 - (e.embedding <=> query_embedding)) > similarity_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT limit_results;
END;
$$;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Core Features migration completed successfully!';
    RAISE NOTICE '📋 Features added:';
    RAISE NOTICE '   - Enhanced call processing';
    RAISE NOTICE '   - Search analytics tracking';
    RAISE NOTICE '   - Export history management';
    RAISE NOTICE '   - Filter presets';
    RAISE NOTICE '   - Transcription corrections';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Run migration 04_qa_analytics.sql';
    RAISE NOTICE '   2. Test file upload functionality';
    RAISE NOTICE '   3. Test search and export features';
END $$;

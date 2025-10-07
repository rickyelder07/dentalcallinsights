-- ===================================================================
-- Milestone 7: Analytics Database Schema
-- Creates analytics tables, views, and materialized views for dashboard
-- Features: Call analytics, trend analysis, performance metrics
-- ===================================================================

-- ===================================================================
-- ANALYTICS CACHE TABLE
-- Stores pre-computed analytics to reduce processing time
-- ===================================================================

CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    cache_key TEXT NOT NULL,
    cache_type TEXT NOT NULL, -- 'overview', 'trends', 'sentiment', 'topics', 'performance'
    
    -- Cached data (JSONB for flexibility)
    data JSONB NOT NULL,
    
    -- Cache metadata
    date_range_start TIMESTAMPTZ,
    date_range_end TIMESTAMPTZ,
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate cache entries
    UNIQUE(user_id, cache_key)
);

-- ===================================================================
-- CALL TAGS TABLE
-- User-defined tags for organizing calls
-- ===================================================================

CREATE TABLE IF NOT EXISTS call_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    
    tag TEXT NOT NULL,
    color TEXT, -- Hex color for UI
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate tags on same call
    UNIQUE(call_id, tag)
);

-- ===================================================================
-- ANALYTICS MATERIALIZED VIEW
-- Pre-computed call statistics for fast dashboard loading
-- ===================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS call_analytics_summary AS
SELECT 
    c.user_id,
    COUNT(DISTINCT c.id) as total_calls,
    COUNT(DISTINCT CASE WHEN t.transcription_status = 'completed' THEN c.id END) as transcribed_calls,
    COUNT(DISTINCT CASE WHEN i.id IS NOT NULL THEN c.id END) as calls_with_insights,
    COUNT(DISTINCT CASE WHEN e.call_id IS NOT NULL THEN c.id END) as calls_with_embeddings,
    
    -- Duration stats
    AVG(c.call_duration_seconds) as avg_call_duration,
    SUM(c.call_duration_seconds) as total_call_duration,
    
    -- Sentiment stats (from insights)
    COUNT(CASE WHEN i.overall_sentiment = 'positive' THEN 1 END) as positive_calls,
    COUNT(CASE WHEN i.overall_sentiment = 'negative' THEN 1 END) as negative_calls,
    COUNT(CASE WHEN i.overall_sentiment = 'neutral' THEN 1 END) as neutral_calls,
    COUNT(CASE WHEN i.overall_sentiment = 'mixed' THEN 1 END) as mixed_calls,
    
    -- Action items and red flags
    COUNT(CASE WHEN jsonb_array_length(i.action_items) > 0 THEN 1 END) as calls_with_action_items,
    COUNT(CASE WHEN jsonb_array_length(i.red_flags) > 0 THEN 1 END) as calls_with_red_flags,
    
    -- Date range
    MIN(c.call_time) as earliest_call,
    MAX(c.call_time) as latest_call,
    
    -- Updated timestamp
    NOW() as computed_at
FROM calls c
LEFT JOIN transcripts t ON c.id = t.call_id
LEFT JOIN insights i ON c.id = i.call_id
LEFT JOIN (SELECT DISTINCT call_id FROM embeddings) e ON c.id = e.call_id
GROUP BY c.user_id;

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_call_analytics_summary_user_id ON call_analytics_summary(user_id);

-- ===================================================================
-- DAILY CALL TRENDS VIEW
-- Aggregates call volume and sentiment by day
-- ===================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_call_trends AS
SELECT 
    c.user_id,
    DATE(c.call_time) as call_date,
    COUNT(c.id) as call_count,
    AVG(c.call_duration_seconds) as avg_duration,
    
    -- Sentiment distribution
    COUNT(CASE WHEN i.overall_sentiment = 'positive' THEN 1 END) as positive_count,
    COUNT(CASE WHEN i.overall_sentiment = 'negative' THEN 1 END) as negative_count,
    COUNT(CASE WHEN i.overall_sentiment = 'neutral' THEN 1 END) as neutral_count,
    
    -- Call direction
    COUNT(CASE WHEN c.call_direction = 'Inbound' THEN 1 END) as inbound_count,
    COUNT(CASE WHEN c.call_direction = 'Outbound' THEN 1 END) as outbound_count
FROM calls c
LEFT JOIN insights i ON c.id = i.call_id
WHERE c.call_time IS NOT NULL
GROUP BY c.user_id, DATE(c.call_time)
ORDER BY c.user_id, call_date DESC;

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_daily_trends_user_date ON daily_call_trends(user_id, call_date);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Analytics cache indexes
CREATE INDEX idx_analytics_cache_user_id ON analytics_cache(user_id);
CREATE INDEX idx_analytics_cache_type ON analytics_cache(cache_type);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);

-- Call tags indexes
CREATE INDEX idx_call_tags_user_id ON call_tags(user_id);
CREATE INDEX idx_call_tags_call_id ON call_tags(call_id);
CREATE INDEX idx_call_tags_tag ON call_tags(tag);

-- Calls table indexes for analytics queries (if not already exist)
CREATE INDEX IF NOT EXISTS idx_calls_user_call_time ON calls(user_id, call_time);
CREATE INDEX IF NOT EXISTS idx_calls_call_direction ON calls(call_direction);
CREATE INDEX IF NOT EXISTS idx_calls_call_time ON calls(call_time);

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Analytics cache policies
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics cache" ON analytics_cache
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own analytics cache" ON analytics_cache
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own analytics cache" ON analytics_cache
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own analytics cache" ON analytics_cache
FOR DELETE 
USING (user_id = auth.uid());

-- Call tags policies
ALTER TABLE call_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own call tags" ON call_tags
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own call tags" ON call_tags
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own call tags" ON call_tags
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own call tags" ON call_tags
FOR DELETE 
USING (user_id = auth.uid());

-- ===================================================================
-- HELPER FUNCTIONS
-- ===================================================================

-- Function to refresh analytics materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY call_analytics_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_call_trends;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_analytics_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM analytics_cache 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update analytics_cache updated_at timestamp
CREATE OR REPLACE FUNCTION update_analytics_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update analytics_cache updated_at
CREATE TRIGGER analytics_cache_updated_at_trigger
BEFORE UPDATE ON analytics_cache
FOR EACH ROW
EXECUTE FUNCTION update_analytics_cache_updated_at();

-- ===================================================================
-- SAMPLE ANALYTICS QUERIES
-- ===================================================================

-- Get user analytics summary
-- SELECT * FROM call_analytics_summary WHERE user_id = auth.uid();

-- Get daily trends for last 30 days
-- SELECT * FROM daily_call_trends 
-- WHERE user_id = auth.uid() 
-- AND call_date >= CURRENT_DATE - INTERVAL '30 days'
-- ORDER BY call_date DESC;

-- Get calls with high-priority action items
-- SELECT c.*, i.action_items 
-- FROM calls c
-- JOIN insights i ON c.id = i.call_id
-- WHERE c.user_id = auth.uid()
-- AND i.action_items @> '[{"priority": "urgent"}]'::jsonb;

-- Get calls with red flags by severity
-- SELECT c.*, i.red_flags 
-- FROM calls c
-- JOIN insights i ON c.id = i.call_id
-- WHERE c.user_id = auth.uid()
-- AND i.red_flags @> '[{"severity": "high"}]'::jsonb;

-- Get sentiment distribution
-- SELECT 
--     overall_sentiment,
--     COUNT(*) as count,
--     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
-- FROM insights
-- WHERE user_id = auth.uid()
-- GROUP BY overall_sentiment
-- ORDER BY count DESC;

-- ===================================================================
-- MIGRATION NOTES
-- ===================================================================

-- This migration creates:
-- 1. analytics_cache table for storing pre-computed analytics
-- 2. call_tags table for user-defined call organization
-- 3. Materialized views for fast analytics queries
-- 4. Indexes for performance optimization
-- 5. RLS policies for data isolation
-- 6. Helper functions for cache management

-- To refresh materialized views:
-- SELECT refresh_analytics_views();

-- To clean expired cache:
-- SELECT clean_expired_analytics_cache();

-- To rollback this migration:
-- DROP MATERIALIZED VIEW IF EXISTS daily_call_trends;
-- DROP MATERIALIZED VIEW IF EXISTS call_analytics_summary;
-- DROP TABLE IF EXISTS call_tags CASCADE;
-- DROP TABLE IF EXISTS analytics_cache CASCADE;
-- DROP FUNCTION IF EXISTS refresh_analytics_views CASCADE;
-- DROP FUNCTION IF EXISTS clean_expired_analytics_cache CASCADE;
-- DROP FUNCTION IF EXISTS update_analytics_cache_updated_at CASCADE;

-- ===================================================================


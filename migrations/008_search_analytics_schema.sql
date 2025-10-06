-- ===================================================================
-- Milestone 6: Search Analytics - Database Schema
-- Creates search query tracking, user behavior, and analytics tables
-- Features: Search history, popular queries, result clicks, performance metrics
-- ===================================================================

-- ===================================================================
-- SEARCH QUERIES TABLE
-- ===================================================================

-- Track all search queries for analytics and user history
CREATE TABLE IF NOT EXISTS search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Query details
    query_text TEXT NOT NULL,
    query_type TEXT DEFAULT 'semantic' NOT NULL, -- 'semantic', 'keyword', 'filter'
    
    -- Filters applied (stored as JSONB for flexibility)
    filters JSONB DEFAULT '{}'::jsonb,
    
    -- Results
    result_count INTEGER NOT NULL,
    has_results BOOLEAN DEFAULT false NOT NULL,
    
    -- Performance
    search_time_ms INTEGER NOT NULL, -- Search time in milliseconds
    
    -- User interaction
    clicked_result_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===================================================================
-- SEARCH RESULT CLICKS TABLE
-- ===================================================================

-- Track which search results users click on
CREATE TABLE IF NOT EXISTS search_result_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_query_id UUID NOT NULL REFERENCES search_queries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Click details
    result_call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    result_position INTEGER NOT NULL, -- Position in search results (1-based)
    
    -- Timestamps
    clicked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===================================================================
-- SEARCH PREFERENCES TABLE
-- ===================================================================

-- User-specific search preferences and settings
CREATE TABLE IF NOT EXISTS search_preferences (
    user_id UUID PRIMARY KEY,
    
    -- Display preferences
    results_per_page INTEGER DEFAULT 20 NOT NULL,
    show_previews BOOLEAN DEFAULT true NOT NULL,
    highlight_matches BOOLEAN DEFAULT true NOT NULL,
    
    -- Filter defaults (stored as JSONB)
    default_filters JSONB DEFAULT '{}'::jsonb,
    
    -- Personalization
    enable_personalization BOOLEAN DEFAULT true NOT NULL,
    save_search_history BOOLEAN DEFAULT true NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===================================================================
-- INDEXES FOR SEARCH QUERIES
-- ===================================================================

-- Index for user lookup
CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);

-- Index for query text (for autocomplete and suggestions)
CREATE INDEX idx_search_queries_query_text ON search_queries(query_text);

-- Index for date-based queries
CREATE INDEX idx_search_queries_created_at ON search_queries(created_at);

-- Index for performance analysis
CREATE INDEX idx_search_queries_search_time ON search_queries(search_time_ms);

-- Composite index for user history queries
CREATE INDEX idx_search_queries_user_created ON search_queries(user_id, created_at DESC);

-- Index for result count analysis
CREATE INDEX idx_search_queries_result_count ON search_queries(result_count);

-- ===================================================================
-- INDEXES FOR SEARCH RESULT CLICKS
-- ===================================================================

-- Index for click analysis
CREATE INDEX idx_search_clicks_query_id ON search_result_clicks(search_query_id);

-- Index for call popularity
CREATE INDEX idx_search_clicks_call_id ON search_result_clicks(result_call_id);

-- Index for user behavior
CREATE INDEX idx_search_clicks_user_id ON search_result_clicks(user_id);

-- Index for time-based analysis
CREATE INDEX idx_search_clicks_clicked_at ON search_result_clicks(clicked_at);

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS on search_queries table
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- Users can view their own search queries
CREATE POLICY "Users can view own search queries" ON search_queries
FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own search queries
CREATE POLICY "Users can insert own search queries" ON search_queries
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Enable RLS on search_result_clicks table
ALTER TABLE search_result_clicks ENABLE ROW LEVEL SECURITY;

-- Users can view their own clicks
CREATE POLICY "Users can view own search clicks" ON search_result_clicks
FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own clicks
CREATE POLICY "Users can insert own search clicks" ON search_result_clicks
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Enable RLS on search_preferences table
ALTER TABLE search_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own search preferences" ON search_preferences
FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can insert own search preferences" ON search_preferences
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update own search preferences" ON search_preferences
FOR UPDATE USING (user_id = auth.uid());

-- ===================================================================
-- HELPER FUNCTIONS
-- ===================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_search_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on search_preferences table
CREATE TRIGGER search_preferences_updated_at_trigger
BEFORE UPDATE ON search_preferences
FOR EACH ROW
EXECUTE FUNCTION update_search_prefs_updated_at();

-- ===================================================================
-- ANALYTICS VIEWS
-- ===================================================================

-- View for popular search queries
CREATE OR REPLACE VIEW popular_search_queries AS
SELECT 
    query_text,
    COUNT(*) as search_count,
    AVG(result_count) as avg_result_count,
    AVG(search_time_ms) as avg_search_time_ms,
    MAX(created_at) as last_searched,
    SUM(CASE WHEN has_results THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
FROM search_queries
GROUP BY query_text
HAVING COUNT(*) > 1
ORDER BY search_count DESC;

-- View for user search statistics
CREATE OR REPLACE VIEW user_search_stats AS
SELECT 
    user_id,
    COUNT(*) as total_searches,
    COUNT(DISTINCT query_text) as unique_queries,
    AVG(result_count) as avg_results,
    AVG(search_time_ms) as avg_search_time_ms,
    MAX(created_at) as last_search,
    SUM(CASE WHEN has_results THEN 1 ELSE 0 END)::float / COUNT(*) as success_rate
FROM search_queries
GROUP BY user_id;

-- View for search performance metrics
CREATE OR REPLACE VIEW search_performance_metrics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_searches,
    AVG(search_time_ms) as avg_search_time_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY search_time_ms) as p50_search_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY search_time_ms) as p95_search_time_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY search_time_ms) as p99_search_time_ms,
    SUM(CASE WHEN search_time_ms > 1000 THEN 1 ELSE 0 END) as slow_searches
FROM search_queries
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- View for click-through rates
CREATE OR REPLACE VIEW search_click_through_rates AS
SELECT 
    sq.user_id,
    sq.query_text,
    COUNT(DISTINCT sq.id) as search_count,
    COUNT(DISTINCT src.id) as click_count,
    (COUNT(DISTINCT src.id)::float / NULLIF(COUNT(DISTINCT sq.id), 0)) as click_through_rate
FROM search_queries sq
LEFT JOIN search_result_clicks src ON sq.id = src.search_query_id
GROUP BY sq.user_id, sq.query_text
HAVING COUNT(DISTINCT sq.id) > 0;

-- View for most clicked results
CREATE OR REPLACE VIEW most_clicked_results AS
SELECT 
    src.result_call_id,
    c.filename,
    COUNT(*) as click_count,
    AVG(src.result_position) as avg_position,
    MAX(src.clicked_at) as last_clicked
FROM search_result_clicks src
JOIN calls c ON src.result_call_id = c.id
GROUP BY src.result_call_id, c.filename
ORDER BY click_count DESC;

-- ===================================================================
-- ANALYTICS FUNCTIONS
-- ===================================================================

-- Function to get user's recent searches
CREATE OR REPLACE FUNCTION get_user_search_history(
    target_user_id uuid,
    limit_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    query_text text,
    result_count int,
    search_time_ms int,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sq.id,
        sq.query_text,
        sq.result_count,
        sq.search_time_ms,
        sq.created_at
    FROM search_queries sq
    WHERE sq.user_id = target_user_id
    ORDER BY sq.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get search suggestions based on popular queries
CREATE OR REPLACE FUNCTION get_search_suggestions(
    query_prefix text,
    limit_count int DEFAULT 5
)
RETURNS TABLE (
    suggestion text,
    search_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        query_text as suggestion,
        COUNT(*) as search_count
    FROM search_queries
    WHERE query_text ILIKE query_prefix || '%'
    GROUP BY query_text
    ORDER BY COUNT(*) DESC, query_text
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- CLEANUP FUNCTIONS
-- ===================================================================

-- Function to clean up old search queries (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_search_queries()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM search_queries
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================================================

COMMENT ON TABLE search_queries IS 'Tracks all search queries for analytics and user history';
COMMENT ON COLUMN search_queries.query_text IS 'The search query entered by the user';
COMMENT ON COLUMN search_queries.filters IS 'JSONB object containing applied filters';
COMMENT ON COLUMN search_queries.search_time_ms IS 'Search execution time in milliseconds';

COMMENT ON TABLE search_result_clicks IS 'Tracks which search results users click on for relevance feedback';
COMMENT ON COLUMN search_result_clicks.result_position IS '1-based position of result in search results';

COMMENT ON TABLE search_preferences IS 'User-specific search preferences and settings';

COMMENT ON VIEW popular_search_queries IS 'Most frequently searched queries with statistics';
COMMENT ON VIEW user_search_stats IS 'Aggregate search statistics per user';
COMMENT ON VIEW search_performance_metrics IS 'Search performance metrics over time';

-- ===================================================================
-- VERIFICATION QUERIES
-- ===================================================================

-- To verify installation, run:
-- SELECT COUNT(*) FROM search_queries;
-- SELECT * FROM popular_search_queries LIMIT 5;
-- SELECT * FROM user_search_stats LIMIT 5;

-- ===================================================================
-- NOTES
-- ===================================================================

-- 1. Search queries are stored for analytics and user history
-- 2. JSONB is used for flexible filter storage
-- 3. Click tracking enables relevance feedback and personalization
-- 4. Views provide pre-computed analytics for performance
-- 5. RLS policies ensure users can only access their own data
-- 6. Cleanup function can be scheduled to maintain database size
-- 7. Search suggestions based on popular queries


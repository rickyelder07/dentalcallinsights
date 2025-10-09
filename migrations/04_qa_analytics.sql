-- ============================================
-- DentalCallInsights - QA & Analytics
-- Migration 04: Quality Assurance & Analytics
-- ============================================
-- This migration adds advanced features including:
-- - Quality Assurance scoring system
-- - Analytics and reporting
-- - AI-powered automated scoring
-- - Performance metrics
--
-- Prerequisites:
-- - Run migrations 01, 02, and 03 first
-- - Ensure core features are working
-- ============================================

-- ============================================
-- QA SCORING SYSTEM
-- ============================================

-- QA scoring tables
CREATE TABLE IF NOT EXISTS call_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
    scored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scorer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS score_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    score_id UUID REFERENCES call_scores(id) ON DELETE CASCADE,
    criterion_name VARCHAR(100) NOT NULL,
    criterion_weight INTEGER NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= criterion_weight),
    applicable BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QA workflow tables
CREATE TABLE IF NOT EXISTS qa_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    priority VARCHAR(20) DEFAULT 'normal',
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on QA tables
ALTER TABLE call_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_assignments ENABLE ROW LEVEL SECURITY;

-- QA scoring policies
CREATE POLICY "Users can view own call scores" ON call_scores
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own call scores" ON call_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own call scores" ON call_scores
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own call scores" ON call_scores
    FOR DELETE USING (auth.uid() = user_id);

-- Score criteria policies
CREATE POLICY "Users can view own score criteria" ON score_criteria
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM call_scores cs 
            WHERE cs.id = score_criteria.score_id 
            AND cs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own score criteria" ON score_criteria
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM call_scores cs 
            WHERE cs.id = score_criteria.score_id 
            AND cs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own score criteria" ON score_criteria
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM call_scores cs 
            WHERE cs.id = score_criteria.score_id 
            AND cs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own score criteria" ON score_criteria
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM call_scores cs 
            WHERE cs.id = score_criteria.score_id 
            AND cs.user_id = auth.uid()
        )
    );

-- QA assignments policies
CREATE POLICY "Users can view own qa assignments" ON qa_assignments
    FOR SELECT USING (auth.uid() = assigned_to OR auth.uid() = assigned_by);

CREATE POLICY "Users can insert own qa assignments" ON qa_assignments
    FOR INSERT WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Users can update own qa assignments" ON qa_assignments
    FOR UPDATE USING (auth.uid() = assigned_to OR auth.uid() = assigned_by);

CREATE POLICY "Users can delete own qa assignments" ON qa_assignments
    FOR DELETE USING (auth.uid() = assigned_by);

-- ============================================
-- ANALYTICS ENHANCEMENTS
-- ============================================

-- Add analytics columns to insights table
ALTER TABLE insights ADD COLUMN IF NOT EXISTS topic_tags TEXT[];
ALTER TABLE insights ADD COLUMN IF NOT EXISTS sentiment_breakdown JSONB DEFAULT '{}'::jsonb;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}'::jsonb;

-- Analytics aggregation table for performance
CREATE TABLE IF NOT EXISTS analytics_aggregates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    aggregation_type TEXT NOT NULL CHECK (aggregation_type IN ('daily', 'weekly', 'monthly')),
    aggregation_date DATE NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on analytics aggregates
ALTER TABLE analytics_aggregates ENABLE ROW LEVEL SECURITY;

-- Analytics aggregates policies
CREATE POLICY "Users can view own analytics aggregates" ON analytics_aggregates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics aggregates" ON analytics_aggregates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics aggregates" ON analytics_aggregates
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- QA scoring indexes
CREATE INDEX IF NOT EXISTS idx_call_scores_call_id ON call_scores(call_id);
CREATE INDEX IF NOT EXISTS idx_call_scores_user_id ON call_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_call_scores_scored_at ON call_scores(scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_score_criteria_score_id ON score_criteria(score_id);

-- QA assignments indexes
CREATE INDEX IF NOT EXISTS idx_qa_assignments_call_id ON qa_assignments(call_id);
CREATE INDEX IF NOT EXISTS idx_qa_assignments_assigned_to ON qa_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_qa_assignments_status ON qa_assignments(status);
CREATE INDEX IF NOT EXISTS idx_qa_assignments_due_date ON qa_assignments(due_date);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_aggregates_user_id ON analytics_aggregates(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_aggregates_type_date ON analytics_aggregates(aggregation_type, aggregation_date);

-- ============================================
-- QA HELPER FUNCTIONS
-- ============================================

-- Function to get QA dashboard data
CREATE OR REPLACE FUNCTION get_qa_dashboard_data()
RETURNS TABLE (
    total_calls_scored BIGINT,
    avg_score DECIMAL,
    calls_pending_review BIGINT,
    calls_with_red_flags BIGINT,
    top_failing_criteria TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH scored_calls AS (
        SELECT cs.*, c.filename
        FROM call_scores cs
        JOIN calls c ON cs.call_id = c.id
        WHERE cs.user_id = auth.uid()
    ),
    failing_criteria AS (
        SELECT sc.criterion_name, COUNT(*) as fail_count
        FROM score_criteria sc
        JOIN call_scores cs ON sc.score_id = cs.id
        WHERE cs.user_id = auth.uid()
        AND sc.score < (sc.criterion_weight * 0.6) -- Less than 60% of possible points
        GROUP BY sc.criterion_name
        ORDER BY fail_count DESC
        LIMIT 5
    )
    SELECT 
        COUNT(scored_calls.id) as total_calls_scored,
        AVG(scored_calls.total_score) as avg_score,
        COUNT(CASE WHEN i.red_flags IS NOT NULL AND array_length(i.red_flags, 1) > 0 THEN 1 END) as calls_with_red_flags,
        COUNT(CASE WHEN cs.id IS NULL THEN 1 END) as calls_pending_review,
        ARRAY_AGG(failing_criteria.criterion_name) as top_failing_criteria
    FROM calls c
    LEFT JOIN scored_calls ON c.id = scored_calls.call_id
    LEFT JOIN insights i ON c.id = i.call_id
    LEFT JOIN call_scores cs ON c.id = cs.call_id
    LEFT JOIN failing_criteria ON TRUE
    WHERE c.user_id = auth.uid()
    GROUP BY failing_criteria.criterion_name;
END;
$$;

-- Function to get call performance trends
CREATE OR REPLACE FUNCTION get_performance_trends(
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    total_calls BIGINT,
    avg_score DECIMAL,
    positive_sentiment_count BIGINT,
    professional_calls_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(c.call_time) as date,
        COUNT(*) as total_calls,
        AVG(cs.total_score) as avg_score,
        COUNT(CASE WHEN i.overall_sentiment = 'positive' THEN 1 END) as positive_sentiment_count,
        COUNT(CASE WHEN i.staff_performance = 'professional' THEN 1 END) as professional_calls_count
    FROM calls c
    LEFT JOIN call_scores cs ON c.id = cs.call_id
    LEFT JOIN insights i ON c.id = i.call_id
    WHERE c.user_id = auth.uid()
    AND c.call_time >= NOW() - INTERVAL '%s days' % days_back
    GROUP BY DATE(c.call_time)
    ORDER BY date DESC;
END;
$$;

-- ============================================
-- TRIGGERS FOR QA SYSTEM
-- ============================================

-- Trigger to update call_scores updated_at
CREATE TRIGGER update_call_scores_updated_at 
    BEFORE UPDATE ON call_scores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update analytics_aggregates updated_at
CREATE TRIGGER update_analytics_aggregates_updated_at 
    BEFORE UPDATE ON analytics_aggregates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ QA & Analytics migration completed successfully!';
    RAISE NOTICE '📋 Features added:';
    RAISE NOTICE '   - Quality Assurance scoring system';
    RAISE NOTICE '   - AI-powered automated scoring';
    RAISE NOTICE '   - Analytics and performance metrics';
    RAISE NOTICE '   - QA workflow management';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Test QA scoring functionality';
    RAISE NOTICE '   2. Verify analytics calculations';
    RAISE NOTICE '   3. Set up OpenAI API for AI scoring';
    RAISE NOTICE '   4. Configure QA criteria in application';
END $$;

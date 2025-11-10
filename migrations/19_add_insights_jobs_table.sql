-- ============================================
-- DentalCallInsights - Insights Jobs Table
-- Migration 19: Add insights job queue for background processing
-- ============================================
-- This migration creates the insights_jobs table to enable:
-- 1. Background processing of AI insights generation
-- 2. Job persistence across page refreshes
-- 3. Retry logic and error tracking
-- 4. Progress monitoring
-- ============================================

-- Create insights_jobs table
CREATE TABLE IF NOT EXISTS insights_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    cached BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on insights_jobs
ALTER TABLE insights_jobs ENABLE ROW LEVEL SECURITY;

-- Insights jobs policies
CREATE POLICY "Users can view own insights jobs" ON insights_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights jobs" ON insights_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights jobs" ON insights_jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights jobs" ON insights_jobs
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for insights_jobs
CREATE INDEX IF NOT EXISTS idx_insights_jobs_call_id ON insights_jobs(call_id);
CREATE INDEX IF NOT EXISTS idx_insights_jobs_user_id ON insights_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_jobs_status ON insights_jobs(status);
CREATE INDEX IF NOT EXISTS idx_insights_jobs_created_at ON insights_jobs(created_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_insights_jobs_updated_at 
    BEFORE UPDATE ON insights_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Insights jobs table created successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   - Created insights_jobs table with status tracking';
    RAISE NOTICE '   - Added RLS policies for user isolation';
    RAISE NOTICE '   - Created indexes for performance';
    RAISE NOTICE '   - Added triggers for updated_at timestamps';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Update API routes to use jobs table';
    RAISE NOTICE '   2. Implement background worker';
    RAISE NOTICE '   3. Update UI to poll job status';
END $$;

-- ===================================================================
-- Milestone 5: AI Insights Database Schema
-- Creates insights table for storing GPT-4o generated insights
-- Features: Summary, Sentiment, Action Items, Red Flags
-- ===================================================================

-- Create insights table
CREATE TABLE IF NOT EXISTS insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Summary
    summary_brief TEXT NOT NULL,
    summary_key_points TEXT[] NOT NULL, -- Array of strings (3-5 bullet points)
    call_outcome TEXT, -- 'resolved', 'pending', 'escalated', 'no_resolution', 'too_short'
    
    -- Sentiment
    overall_sentiment TEXT NOT NULL, -- 'positive', 'negative', 'neutral', 'mixed', 'too_short'
    patient_satisfaction TEXT, -- 'happy', 'satisfied', 'neutral', 'frustrated', 'angry', 'too_short'
    staff_performance TEXT, -- 'professional', 'needs_improvement', 'too_short'
    
    -- Action Items (stored as JSONB)
    action_items JSONB NOT NULL DEFAULT '[]',
    -- Structure: [{"action": string, "priority": string, "assignee": string}]
    
    -- Red Flags (stored as JSONB)
    red_flags JSONB NOT NULL DEFAULT '[]',
    -- Structure: [{"concern": string, "severity": string, "category": string}]
    
    -- Metadata
    model_used TEXT DEFAULT 'gpt-4o',
    transcript_hash TEXT, -- For cache invalidation when transcript changes
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for caching (one insight record per call)
    UNIQUE(call_id)
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

-- Index for call lookup (most common query)
CREATE INDEX idx_insights_call_id ON insights(call_id);

-- Index for user-based queries
CREATE INDEX idx_insights_user_id ON insights(user_id);

-- Index for sentiment filtering
CREATE INDEX idx_insights_sentiment ON insights(overall_sentiment);

-- Index for generated_at (for cache expiration queries)
CREATE INDEX idx_insights_generated_at ON insights(generated_at);

-- Index for transcript hash (cache validation)
CREATE INDEX idx_insights_transcript_hash ON insights(transcript_hash);

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS on insights table
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own insights
CREATE POLICY "Users can view own insights" ON insights
FOR SELECT 
USING (user_id = auth.uid());

-- Policy: Users can insert only their own insights
CREATE POLICY "Users can insert own insights" ON insights
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update only their own insights
CREATE POLICY "Users can update own insights" ON insights
FOR UPDATE 
USING (user_id = auth.uid());

-- Policy: Users can delete only their own insights
CREATE POLICY "Users can delete own insights" ON insights
FOR DELETE 
USING (user_id = auth.uid());

-- ===================================================================
-- HELPER FUNCTIONS
-- ===================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER insights_updated_at_trigger
BEFORE UPDATE ON insights
FOR EACH ROW
EXECUTE FUNCTION update_insights_updated_at();

-- ===================================================================
-- VERIFICATION QUERIES
-- Run these to verify the setup
-- ===================================================================

-- Verify table was created
-- SELECT EXISTS (
--     SELECT FROM information_schema.tables 
--     WHERE table_schema = 'public' 
--     AND table_name = 'insights'
-- );

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename = 'insights';

-- Verify indexes were created
-- SELECT indexname 
-- FROM pg_indexes 
-- WHERE tablename = 'insights';

-- Verify RLS policies were created
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'insights';

-- ===================================================================
-- SAMPLE QUERIES
-- ===================================================================

-- Get insights for a specific call
-- SELECT * FROM insights WHERE call_id = 'your-call-id';

-- Get all insights for current user
-- SELECT * FROM insights WHERE user_id = auth.uid();

-- Get insights with positive sentiment
-- SELECT * FROM insights 
-- WHERE user_id = auth.uid() 
-- AND overall_sentiment = 'positive';

-- Get insights with action items
-- SELECT * FROM insights 
-- WHERE user_id = auth.uid() 
-- AND jsonb_array_length(action_items) > 0;

-- Get insights with red flags
-- SELECT * FROM insights 
-- WHERE user_id = auth.uid() 
-- AND jsonb_array_length(red_flags) > 0;

-- ===================================================================
-- MIGRATION NOTES
-- ===================================================================

-- This migration creates:
-- 1. insights table with all required fields
-- 2. Indexes for performance optimization
-- 3. RLS policies for data isolation
-- 4. Helper functions for timestamps
-- 5. Unique constraint on call_id for caching

-- To rollback this migration:
-- DROP TABLE IF EXISTS insights CASCADE;
-- DROP FUNCTION IF EXISTS update_insights_updated_at CASCADE;

-- ===================================================================


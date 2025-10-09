-- ============================================
-- DentalCallInsights - Authentication & Security
-- Migration 02: Row Level Security (RLS) Setup
-- ============================================
-- This migration enables Row Level Security on all tables and creates
-- policies to ensure users can only access their own data.
--
-- Security Model:
-- - Each row is associated with a user_id (UUID)
-- - RLS policies filter queries to auth.uid() = user_id
-- - Users can only SELECT, INSERT, UPDATE, DELETE their own data
-- - Service role key bypasses RLS for admin operations
--
-- Prerequisites:
-- - Run migration 01_core_schema.sql first
-- - Enable authentication in Supabase dashboard
-- - auth.uid() function is available (provided by Supabase Auth)
-- ============================================

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CALLS TABLE POLICIES
-- ============================================

-- Users can view their own calls
CREATE POLICY "Users can view own calls" ON calls
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own calls
CREATE POLICY "Users can insert own calls" ON calls
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own calls
CREATE POLICY "Users can update own calls" ON calls
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own calls
CREATE POLICY "Users can delete own calls" ON calls
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRANSCRIPTS TABLE POLICIES
-- ============================================

-- Users can view transcripts for their own calls
CREATE POLICY "Users can view own transcripts" ON transcripts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert transcripts for their own calls
CREATE POLICY "Users can insert own transcripts" ON transcripts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update transcripts for their own calls
CREATE POLICY "Users can update own transcripts" ON transcripts
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete transcripts for their own calls
CREATE POLICY "Users can delete own transcripts" ON transcripts
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- INSIGHTS TABLE POLICIES
-- ============================================

-- Users can view insights for their own calls
CREATE POLICY "Users can view own insights" ON insights
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert insights for their own calls
CREATE POLICY "Users can insert own insights" ON insights
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update insights for their own calls
CREATE POLICY "Users can update own insights" ON insights
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete insights for their own calls
CREATE POLICY "Users can delete own insights" ON insights
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- EMBEDDINGS TABLE POLICIES
-- ============================================

-- Users can view embeddings for their own calls
CREATE POLICY "Users can view own embeddings" ON embeddings
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert embeddings for their own calls
CREATE POLICY "Users can insert own embeddings" ON embeddings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update embeddings for their own calls
CREATE POLICY "Users can update own embeddings" ON embeddings
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete embeddings for their own calls
CREATE POLICY "Users can delete own embeddings" ON embeddings
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Users can upload audio files to their own folder
CREATE POLICY "Users can upload own audio files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'audio-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can view their own audio files
CREATE POLICY "Users can view own audio files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'audio-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can update their own audio files
CREATE POLICY "Users can update own audio files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'audio-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can delete their own audio files
CREATE POLICY "Users can delete own audio files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'audio-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- HELPER FUNCTIONS FOR SECURITY
-- ============================================

-- Function to get current user's calls with related data
CREATE OR REPLACE FUNCTION get_user_calls_with_data()
RETURNS TABLE (
    call_id UUID,
    filename TEXT,
    call_time TIMESTAMP WITH TIME ZONE,
    call_direction TEXT,
    call_duration_seconds INTEGER,
    transcription_status TEXT,
    overall_sentiment TEXT,
    has_insights BOOLEAN,
    has_embeddings BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as call_id,
        c.filename,
        c.call_time,
        c.call_direction,
        c.call_duration_seconds,
        t.transcription_status,
        i.overall_sentiment,
        (i.id IS NOT NULL) as has_insights,
        (e.id IS NOT NULL) as has_embeddings
    FROM calls c
    LEFT JOIN transcripts t ON c.id = t.call_id
    LEFT JOIN insights i ON c.id = i.call_id
    LEFT JOIN embeddings e ON c.id = e.call_id
    WHERE c.user_id = auth.uid()
    ORDER BY c.created_at DESC;
END;
$$;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Authentication & Security migration completed successfully!';
    RAISE NOTICE '🔒 Row Level Security enabled on all tables';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Configure authentication providers in Supabase dashboard';
    RAISE NOTICE '   2. Test user signup/login flow';
    RAISE NOTICE '   3. Run migration 03_features.sql';
    RAISE NOTICE '   4. Verify RLS policies work correctly';
END $$;

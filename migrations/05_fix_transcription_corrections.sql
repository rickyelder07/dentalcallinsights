-- ============================================
-- DentalCallInsights - Fix Transcription Corrections Schema
-- Migration 05: Fix transcription_corrections table structure
-- ============================================
-- This migration fixes the transcription_corrections table to match
-- the expected schema used by the application code.
--
-- The current schema has:
-- - original_text, corrected_text (for manual corrections)
-- 
-- The application expects:
-- - find_text, replace_text (for user-managed correction rules)
-- - is_regex, case_sensitive, priority (for rule configuration)
--
-- We'll drop the old table and create a new one with the correct structure.
-- ============================================

-- Drop the existing transcription_corrections table
DROP TABLE IF EXISTS transcription_corrections CASCADE;

-- Create the corrected transcription_corrections table
CREATE TABLE transcription_corrections (
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

-- Indexes for transcription corrections
CREATE INDEX idx_transcription_corrections_user_id ON transcription_corrections(user_id);
CREATE INDEX idx_transcription_corrections_priority ON transcription_corrections(priority);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_transcription_corrections_updated_at 
    BEFORE UPDATE ON transcription_corrections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Transcription corrections schema fix completed successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   - Dropped old transcription_corrections table';
    RAISE NOTICE '   - Created new table with correct schema';
    RAISE NOTICE '   - Added find_text, replace_text, is_regex, case_sensitive, priority columns';
    RAISE NOTICE '   - Applied RLS policies and indexes';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Test transcription corrections functionality';
    RAISE NOTICE '   2. Users can now add custom correction rules';
    RAISE NOTICE '   3. Rules will be applied during transcription processing';
END $$;

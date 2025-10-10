-- ============================================
-- DentalCallInsights - Fix Upload Issues
-- Migration 06: Fix database schema and storage issues
-- ============================================
-- This migration fixes the upload issues:
-- 1. Adds missing columns to calls table
-- 2. Ensures storage bucket exists with correct name
-- ============================================

-- Add missing columns to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS call_flow TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS source_extension TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS destination_extension TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS time_to_answer_seconds INTEGER;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT 'pending';
ALTER TABLE calls ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Update upload_status constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'calls_upload_status_check'
    ) THEN
        ALTER TABLE calls ADD CONSTRAINT calls_upload_status_check 
        CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed'));
    END IF;
END $$;

-- Ensure the audio-files storage bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-files', 'audio-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies if they don't exist
DO $$
BEGIN
    -- Check if policies exist, if not create them
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can upload own audio files'
    ) THEN
        CREATE POLICY "Users can upload own audio files" ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = 'audio-files' AND
                auth.uid()::text = (storage.foldername(name))[1]
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can view own audio files'
    ) THEN
        CREATE POLICY "Users can view own audio files" ON storage.objects
            FOR SELECT USING (
                bucket_id = 'audio-files' AND
                auth.uid()::text = (storage.foldername(name))[1]
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can update own audio files'
    ) THEN
        CREATE POLICY "Users can update own audio files" ON storage.objects
            FOR UPDATE USING (
                bucket_id = 'audio-files' AND
                auth.uid()::text = (storage.foldername(name))[1]
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can delete own audio files'
    ) THEN
        CREATE POLICY "Users can delete own audio files" ON storage.objects
            FOR DELETE USING (
                bucket_id = 'audio-files' AND
                auth.uid()::text = (storage.foldername(name))[1]
            );
    END IF;
END $$;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Upload issues fix completed successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   - Added missing columns to calls table (call_flow, source_name, etc.)';
    RAISE NOTICE '   - Ensured audio-files storage bucket exists';
    RAISE NOTICE '   - Created storage policies for file access';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '   1. Update API code to use correct bucket name (audio-files)';
    RAISE NOTICE '   2. Test file upload functionality';
    RAISE NOTICE '   3. Verify database schema matches code expectations';
END $$;

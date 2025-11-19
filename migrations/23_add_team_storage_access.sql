-- ============================================
-- Add Team Storage Access Policies
-- Migration 23: Allow team members to access audio files from other team members
-- ============================================
-- This migration adds storage policies to allow team members to access
-- audio files stored in other team members' folders.
--
-- Storage path format: {userId}/{filename}
-- We extract the userId from the first folder name and check if the
-- current user is in the same team as that user.
-- ============================================

-- ============================================
-- UPDATE STORAGE POLICIES FOR TEAM ACCESS
-- ============================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own audio files" ON storage.objects;

-- Create new SELECT policy that allows:
-- 1. Users to view their own files (auth.uid() matches folder name)
-- 2. Team members to view files from other team members
-- Note: (storage.foldername(name))[1] extracts the first folder name (user_id)
CREATE POLICY "Users can view own or team audio files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'audio-files' AND (
            -- User owns the file
            auth.uid()::text = (storage.foldername(name))[1] OR
            -- User is in the same team as the file owner
            -- Extract user_id from folder name and check if they're in the same team
            users_in_same_team(
                (storage.foldername(name))[1]::UUID,
                auth.uid()
            )
        )
    );

-- Note: We keep INSERT, UPDATE, and DELETE policies as-is since
-- team members should only be able to modify their own files.
-- If you need team members to modify each other's files, you can
-- update those policies similarly.

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Team storage access policies added successfully!';
END $$;


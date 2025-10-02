-- Storage Setup Migration
-- This migration configures Supabase Storage for call recordings with RLS policies
-- 
-- Prerequisites:
-- 1. Run migrations 001_init.sql and 002_enable_rls.sql first
-- 2. Ensure Supabase Storage is enabled in your project
-- 
-- IMPORTANT: Run this migration through Supabase Dashboard SQL Editor
-- Storage bucket creation requires admin privileges

-- ============================================
-- UPDATE CALLS TABLE FOR STORAGE INTEGRATION
-- ============================================

-- Add storage-related columns to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS file_size BIGINT CHECK (file_size > 0);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT 'uploading' CHECK (upload_status IN ('uploading', 'completed', 'failed', 'processing'));
ALTER TABLE calls ADD COLUMN IF NOT EXISTS duration INTEGER CHECK (duration >= 0);

-- Create indexes for storage-related queries
CREATE INDEX IF NOT EXISTS idx_calls_storage_path ON calls(storage_path);
CREATE INDEX IF NOT EXISTS idx_calls_upload_status ON calls(upload_status);

-- Add constraint to ensure storage_path is set for uploaded files
ALTER TABLE calls ADD CONSTRAINT calls_storage_path_required 
    CHECK (storage_path IS NULL OR storage_path <> '');

-- ============================================
-- STORAGE BUCKET CONFIGURATION
-- ============================================

-- NOTE: Storage bucket creation must be done via Supabase Dashboard or API
-- Navigate to: Storage > Create Bucket
-- 
-- Bucket Configuration:
--   Name: call-recordings
--   Public: false (private bucket)
--   File Size Limit: 104857600 (100MB)
--   Allowed MIME Types: audio/mpeg, audio/wav, audio/x-m4a, audio/mp4, audio/aac
--
-- After creating the bucket, run the RLS policies below

-- ============================================
-- STORAGE RLS POLICIES
-- ============================================

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Policy: Users can view their own files
-- This policy allows users to SELECT their own files from storage
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'call-recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can upload files to their own folder
-- This policy allows users to INSERT files into their folder
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'call-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files
-- This policy allows users to UPDATE their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'call-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
-- This policy allows users to DELETE their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'call-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get storage URL for a call
CREATE OR REPLACE FUNCTION get_call_storage_url(p_call_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_storage_path TEXT;
BEGIN
    SELECT storage_path INTO v_storage_path
    FROM calls
    WHERE id = p_call_id AND user_id = auth.uid();
    
    RETURN v_storage_path;
END;
$$;

-- Function to update call upload status
CREATE OR REPLACE FUNCTION update_call_upload_status(
    p_call_id UUID,
    p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE calls
    SET upload_status = p_status,
        updated_at = NOW()
    WHERE id = p_call_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- ============================================
-- STORAGE STATISTICS VIEW
-- ============================================

-- View for user storage statistics
CREATE OR REPLACE VIEW user_storage_stats AS
SELECT 
    user_id,
    COUNT(*) as total_files,
    SUM(file_size) as total_size_bytes,
    ROUND(SUM(file_size) / (1024.0 * 1024.0), 2) as total_size_mb,
    MAX(created_at) as last_upload,
    COUNT(CASE WHEN upload_status = 'completed' THEN 1 END) as completed_uploads,
    COUNT(CASE WHEN upload_status = 'failed' THEN 1 END) as failed_uploads,
    COUNT(CASE WHEN upload_status = 'uploading' THEN 1 END) as in_progress_uploads
FROM calls
WHERE storage_path IS NOT NULL
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON user_storage_stats TO authenticated;

-- RLS policy for the view
ALTER VIEW user_storage_stats SET (security_invoker = true);

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Function to cleanup failed uploads older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_failed_uploads()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM calls
    WHERE upload_status = 'failed'
    AND created_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to validate storage path format
CREATE OR REPLACE FUNCTION validate_storage_path()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Ensure storage path starts with user_id
    IF NEW.storage_path IS NOT NULL THEN
        IF NEW.storage_path NOT LIKE NEW.user_id::text || '/%' THEN
            RAISE EXCEPTION 'Storage path must start with user_id';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER check_storage_path_before_insert
BEFORE INSERT OR UPDATE ON calls
FOR EACH ROW
WHEN (NEW.storage_path IS NOT NULL)
EXECUTE FUNCTION validate_storage_path();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Create 'call-recordings' storage bucket via Supabase Dashboard
-- 2. Configure bucket settings (100MB limit, private, allowed MIME types)
-- 3. Test file upload with a sample audio file
-- 4. Verify RLS policies prevent cross-user access
-- 
-- To create the bucket via Supabase Dashboard:
-- 1. Go to Storage section
-- 2. Click "Create Bucket"
-- 3. Name: call-recordings
-- 4. Public: OFF (private bucket)
-- 5. File Size Limit: 104857600 bytes (100MB)
-- 6. Allowed MIME Types: audio/mpeg, audio/wav, audio/x-m4a, audio/mp4, audio/aac


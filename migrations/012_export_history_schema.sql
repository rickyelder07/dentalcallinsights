-- ===================================================================
-- Milestone 7: Export History Database Schema
-- Tracks user export operations for auditing and access
-- ===================================================================

CREATE TABLE IF NOT EXISTS export_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Export metadata
    export_type TEXT NOT NULL, -- 'csv', 'pdf', 'excel', 'json'
    export_format TEXT, -- Additional format details
    
    -- Export scope
    call_ids UUID[], -- Array of call IDs included in export
    filter_preset_id UUID REFERENCES filter_presets(id) ON DELETE SET NULL,
    filters JSONB, -- Filters used for export
    
    -- File information
    filename TEXT NOT NULL,
    file_size INTEGER, -- Bytes
    storage_path TEXT, -- If stored temporarily
    
    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'expired'
    error_message TEXT,
    
    -- Access control
    download_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ, -- Auto-cleanup after expiration
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_downloaded_at TIMESTAMPTZ
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

CREATE INDEX idx_export_history_user_id ON export_history(user_id);
CREATE INDEX idx_export_history_status ON export_history(status);
CREATE INDEX idx_export_history_created_at ON export_history(created_at DESC);
CREATE INDEX idx_export_history_expires_at ON export_history(expires_at);

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export history" ON export_history
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own export history" ON export_history
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own export history" ON export_history
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own export history" ON export_history
FOR DELETE 
USING (user_id = auth.uid());

-- ===================================================================
-- HELPER FUNCTIONS
-- ===================================================================

-- Function to clean expired exports
CREATE OR REPLACE FUNCTION clean_expired_exports()
RETURNS void AS $$
BEGIN
    UPDATE export_history 
    SET status = 'expired'
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW()
    AND status NOT IN ('expired', 'failed');
END;
$$ LANGUAGE plpgsql;

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_export_download(export_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE export_history 
    SET download_count = download_count + 1,
        last_downloaded_at = NOW()
    WHERE id = export_id 
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- SAMPLE QUERIES
-- ===================================================================

-- Get user's export history
-- SELECT * FROM export_history 
-- WHERE user_id = auth.uid()
-- ORDER BY created_at DESC;

-- Get active exports (not expired)
-- SELECT * FROM export_history 
-- WHERE user_id = auth.uid()
-- AND status = 'completed'
-- AND (expires_at IS NULL OR expires_at > NOW())
-- ORDER BY created_at DESC;

-- Clean expired exports
-- SELECT clean_expired_exports();

-- ===================================================================
-- MIGRATION NOTES
-- ===================================================================

-- To rollback this migration:
-- DROP TABLE IF EXISTS export_history CASCADE;
-- DROP FUNCTION IF EXISTS clean_expired_exports CASCADE;
-- DROP FUNCTION IF EXISTS increment_export_download CASCADE;

-- ===================================================================


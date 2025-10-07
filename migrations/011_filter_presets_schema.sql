-- ===================================================================
-- Milestone 7: Filter Presets Database Schema
-- User-saved filter configurations for quick access
-- ===================================================================

CREATE TABLE IF NOT EXISTS filter_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Preset metadata
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Filter configuration (JSONB for flexibility)
    filters JSONB NOT NULL,
    -- Structure: {
    --   "dateRange": {"start": "ISO", "end": "ISO"},
    --   "sentiment": ["positive", "negative"],
    --   "outcome": ["resolved", "pending"],
    --   "duration": {"min": 60, "max": 600},
    --   "tags": ["important", "follow-up"],
    --   "hasInsights": true,
    --   "hasEmbeddings": true,
    --   "direction": "Inbound"
    -- }
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================================

CREATE INDEX idx_filter_presets_user_id ON filter_presets(user_id);
CREATE INDEX idx_filter_presets_is_default ON filter_presets(is_default);
CREATE INDEX idx_filter_presets_usage ON filter_presets(usage_count DESC);

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own filter presets" ON filter_presets
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own filter presets" ON filter_presets
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own filter presets" ON filter_presets
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own filter presets" ON filter_presets
FOR DELETE 
USING (user_id = auth.uid());

-- ===================================================================
-- HELPER FUNCTIONS
-- ===================================================================

-- Function to update filter_presets updated_at timestamp
CREATE OR REPLACE FUNCTION update_filter_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update filter_presets updated_at
CREATE TRIGGER filter_presets_updated_at_trigger
BEFORE UPDATE ON filter_presets
FOR EACH ROW
EXECUTE FUNCTION update_filter_presets_updated_at();

-- ===================================================================
-- SAMPLE QUERIES
-- ===================================================================

-- Get user's filter presets
-- SELECT * FROM filter_presets 
-- WHERE user_id = auth.uid()
-- ORDER BY is_default DESC, usage_count DESC;

-- Get default preset
-- SELECT * FROM filter_presets 
-- WHERE user_id = auth.uid() 
-- AND is_default = TRUE 
-- LIMIT 1;

-- Increment usage count
-- UPDATE filter_presets 
-- SET usage_count = usage_count + 1, last_used_at = NOW()
-- WHERE id = 'preset-id' AND user_id = auth.uid();

-- ===================================================================
-- MIGRATION NOTES
-- ===================================================================

-- To rollback this migration:
-- DROP TABLE IF EXISTS filter_presets CASCADE;
-- DROP FUNCTION IF EXISTS update_filter_presets_updated_at CASCADE;

-- ===================================================================


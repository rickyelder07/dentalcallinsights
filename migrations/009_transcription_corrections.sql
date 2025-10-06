-- ============================================================
-- Transcription Corrections (User-managed dictionary)
-- Enables automatic post-processing fixes (e.g., brand names)
-- ============================================================

CREATE TABLE IF NOT EXISTS transcription_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,

    -- What to find and how to replace it
    find_text TEXT NOT NULL,
    replace_text TEXT NOT NULL,
    is_regex BOOLEAN DEFAULT FALSE NOT NULL,
    case_sensitive BOOLEAN DEFAULT FALSE NOT NULL,

    -- Ordering (lower runs first)
    priority INTEGER DEFAULT 100 NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_transcription_corrections_user ON transcription_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_transcription_corrections_priority ON transcription_corrections(user_id, priority);

-- RLS
ALTER TABLE transcription_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own corrections" ON transcription_corrections
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own corrections" ON transcription_corrections
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own corrections" ON transcription_corrections
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own corrections" ON transcription_corrections
FOR DELETE USING (user_id = auth.uid());

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION update_transcription_corrections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transcription_corrections_updated_at_trigger
BEFORE UPDATE ON transcription_corrections
FOR EACH ROW
EXECUTE FUNCTION update_transcription_corrections_updated_at();

-- Seed example (commented out)
-- INSERT INTO transcription_corrections (user_id, find_text, replace_text, is_regex, case_sensitive, priority)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Solar Dental', 'Sola Dental', FALSE, FALSE, 10);



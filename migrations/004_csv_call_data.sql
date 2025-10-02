-- CSV Call Data Migration
-- This migration adds support for CSV call data upload and matching with audio recordings
-- 
-- Prerequisites:
-- 1. Run migrations 001_init.sql and 002_enable_rls.sql first
-- 2. Ensure RLS is enabled on existing tables

-- ============================================
-- CSV CALL DATA TABLE
-- Stores uploaded CSV call data for matching with recordings
-- ============================================
CREATE TABLE IF NOT EXISTS csv_call_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    call_time TIMESTAMPTZ NOT NULL,
    call_direction TEXT NOT NULL CHECK (call_direction IN ('Inbound', 'Outbound')),
    source_number TEXT,
    source_name TEXT,
    source_extension TEXT,
    destination_number TEXT,
    destination_extension TEXT,
    call_duration_seconds INTEGER CHECK (call_duration_seconds >= 0),
    disposition TEXT,
    time_to_answer_seconds INTEGER CHECK (time_to_answer_seconds >= 0),
    call_flow TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_csv_call_data_user_id ON csv_call_data(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_call_data_call_time ON csv_call_data(call_time);
CREATE INDEX IF NOT EXISTS idx_csv_call_data_source_number ON csv_call_data(source_number);
CREATE INDEX IF NOT EXISTS idx_csv_call_data_destination_number ON csv_call_data(destination_number);
CREATE INDEX IF NOT EXISTS idx_csv_call_data_disposition ON csv_call_data(disposition);

-- Add trigger to auto-update updated_at timestamp
CREATE TRIGGER update_csv_call_data_updated_at BEFORE UPDATE ON csv_call_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- UPDATE CALLS TABLE
-- Add foreign key to link calls with CSV data
-- ============================================
ALTER TABLE calls ADD COLUMN IF NOT EXISTS csv_call_id UUID REFERENCES csv_call_data(id);

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_calls_csv_call_id ON calls(csv_call_id);

-- ============================================
-- CALL MATCHING UTILITY FUNCTIONS
-- ============================================

-- Function to find potential CSV matches for a call recording
CREATE OR REPLACE FUNCTION find_csv_matches(
    p_user_id UUID,
    p_call_time TIMESTAMPTZ,
    p_time_tolerance_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
    csv_id UUID,
    call_time TIMESTAMPTZ,
    call_direction TEXT,
    source_number TEXT,
    source_name TEXT,
    destination_number TEXT,
    call_duration_seconds INTEGER,
    disposition TEXT,
    time_to_answer_seconds INTEGER,
    time_diff_minutes NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ccd.id,
        ccd.call_time,
        ccd.call_direction,
        ccd.source_number,
        ccd.source_name,
        ccd.destination_number,
        ccd.call_duration_seconds,
        ccd.disposition,
        ccd.time_to_answer_seconds,
        EXTRACT(EPOCH FROM (ccd.call_time - p_call_time)) / 60.0 as time_diff_minutes
    FROM csv_call_data ccd
    WHERE ccd.user_id = p_user_id
    AND ccd.call_time BETWEEN 
        (p_call_time - INTERVAL '1 minute' * p_time_tolerance_minutes) AND 
        (p_call_time + INTERVAL '1 minute' * p_time_tolerance_minutes)
    ORDER BY ABS(EXTRACT(EPOCH FROM (ccd.call_time - p_call_time)));
END;
$$;

-- Function to match calls by phone number and time proximity
CREATE OR REPLACE FUNCTION match_calls_by_phone(
    p_user_id UUID,
    p_phone_number TEXT,
    p_call_time TIMESTAMPTZ,
    p_time_tolerance_minutes INTEGER DEFAULT 10
)
RETURNS TABLE (
    csv_id UUID,
    call_time TIMESTAMPTZ,
    call_direction TEXT,
    source_number TEXT,
    destination_number TEXT,
    match_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ccd.id,
        ccd.call_time,
        ccd.call_direction,
        ccd.source_number,
        ccd.destination_number,
        CASE 
            WHEN ccd.source_number = p_phone_number OR ccd.destination_number = p_phone_number THEN 1.0
            ELSE 0.5
        END * (1.0 - (ABS(EXTRACT(EPOCH FROM (ccd.call_time - p_call_time))) / (p_time_tolerance_minutes * 60.0))) as match_score
    FROM csv_call_data ccd
    WHERE ccd.user_id = p_user_id
    AND (ccd.source_number = p_phone_number OR ccd.destination_number = p_phone_number)
    AND ccd.call_time BETWEEN 
        (p_call_time - INTERVAL '1 minute' * p_time_tolerance_minutes) AND 
        (p_call_time + INTERVAL '1 minute' * p_time_tolerance_minutes)
    ORDER BY match_score DESC;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on csv_call_data table
ALTER TABLE csv_call_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own CSV call data
CREATE POLICY "Users can view own csv call data" ON csv_call_data
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own csv call data" ON csv_call_data
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own csv call data" ON csv_call_data
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own csv call data" ON csv_call_data
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- SAMPLE DATA (OPTIONAL - REMOVE IN PRODUCTION)
-- ============================================

-- Uncomment to insert sample CSV call data for testing
-- INSERT INTO csv_call_data (
--     user_id, 
--     call_time, 
--     call_direction, 
--     source_number, 
--     source_name, 
--     destination_number, 
--     call_duration_seconds, 
--     disposition, 
--     time_to_answer_seconds
-- ) VALUES
--     ('00000000-0000-0000-0000-000000000000', '2024-09-23 16:49:00', 'Outbound', '+1 (323) 325-5641', 'SOLA Kids Dental', '(323) 243-1791', 40, 'answered', 0);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Test the new table and functions
-- 2. Implement CSV upload functionality
-- 3. Create call matching interface
-- 4. Test RLS policies with sample data

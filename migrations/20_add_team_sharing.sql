-- ============================================
-- DentalCallInsights - Team Sharing
-- Migration 20: Add Team-Based Data Sharing
-- ============================================
-- This migration adds team functionality allowing multiple users
-- to share access to all calls, transcripts, and insights.
--
-- Features:
-- - Teams table for organizing users
-- - Team members table with roles (owner/member)
-- - Team ID added to calls, transcripts, insights
-- - Updated RLS policies to allow team member access
--
-- Prerequisites:
-- - Run all previous migrations
-- ============================================

-- ============================================
-- TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TEAM MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Create indexes for team_members
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- ============================================
-- ADD TEAM_ID TO EXISTING TABLES
-- ============================================

-- Add team_id to calls (nullable for backward compatibility)
ALTER TABLE calls ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add team_id to transcripts (nullable)
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add team_id to insights (nullable)
ALTER TABLE insights ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add team_id to embeddings (nullable)
ALTER TABLE embeddings ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add team_id to transcription_jobs (nullable)
ALTER TABLE transcription_jobs ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add team_id to insights_jobs (nullable)
ALTER TABLE insights_jobs ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Create indexes for team_id columns
CREATE INDEX IF NOT EXISTS idx_calls_team_id ON calls(team_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_team_id ON transcripts(team_id);
CREATE INDEX IF NOT EXISTS idx_insights_team_id ON insights(team_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_team_id ON embeddings(team_id);
CREATE INDEX IF NOT EXISTS idx_transcription_jobs_team_id ON transcription_jobs(team_id);
CREATE INDEX IF NOT EXISTS idx_insights_jobs_team_id ON insights_jobs(team_id);

-- ============================================
-- HELPER FUNCTION: Get User's Team IDs
-- ============================================
CREATE OR REPLACE FUNCTION get_user_team_ids()
RETURNS TABLE (team_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT tm.team_id
    FROM team_members tm
    WHERE tm.user_id = auth.uid();
END;
$$;

-- ============================================
-- HELPER FUNCTION: Check if user is team member
-- Uses SECURITY DEFINER to bypass RLS and prevent recursion
-- ============================================
CREATE OR REPLACE FUNCTION is_team_member(check_team_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = check_team_id
        AND tm.user_id = check_user_id
    );
END;
$$;

-- ============================================
-- HELPER FUNCTION: Check if user is team owner
-- Uses SECURITY DEFINER to bypass RLS and prevent recursion
-- ============================================
CREATE OR REPLACE FUNCTION is_team_owner(check_team_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = check_team_id
        AND tm.user_id = check_user_id
        AND tm.role = 'owner'
    );
END;
$$;

-- ============================================
-- ENABLE RLS ON NEW TABLES
-- ============================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TEAMS TABLE POLICIES
-- ============================================

-- Users can view teams they are members of
-- Use helper function to avoid recursion
CREATE POLICY "Users can view own teams" ON teams
    FOR SELECT USING (is_team_member(id));

-- Users can create teams
CREATE POLICY "Users can create teams" ON teams
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update teams they own
-- Use helper function to avoid recursion
CREATE POLICY "Owners can update teams" ON teams
    FOR UPDATE USING (is_team_owner(id));

-- Owners can delete teams
-- Use helper function to avoid recursion
CREATE POLICY "Owners can delete teams" ON teams
    FOR DELETE USING (is_team_owner(id));

-- ============================================
-- TEAM MEMBERS TABLE POLICIES
-- ============================================

-- Users can view team members of teams they belong to
-- Use helper function to avoid recursion
CREATE POLICY "Users can view team members" ON team_members
    FOR SELECT USING (is_team_member(team_id));

-- Owners can add members to their teams
-- Use helper function to avoid recursion
CREATE POLICY "Owners can add team members" ON team_members
    FOR INSERT WITH CHECK (is_team_owner(team_id));

-- Owners can update team members (change roles)
-- Use helper function to avoid recursion
CREATE POLICY "Owners can update team members" ON team_members
    FOR UPDATE USING (is_team_owner(team_id));

-- Owners can remove team members
-- Use helper function to avoid recursion
CREATE POLICY "Owners can remove team members" ON team_members
    FOR DELETE USING (is_team_owner(team_id));

-- Users can leave teams (remove themselves)
CREATE POLICY "Users can leave teams" ON team_members
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- UPDATE RLS POLICIES FOR SHARED DATA ACCESS
-- ============================================

-- Drop existing policies that only check user_id
DROP POLICY IF EXISTS "Users can view own calls" ON calls;
DROP POLICY IF EXISTS "Users can view own transcripts" ON transcripts;
DROP POLICY IF EXISTS "Users can view own insights" ON insights;
DROP POLICY IF EXISTS "Users can view own embeddings" ON embeddings;

-- New policies that allow team member access
-- Use helper function to avoid recursion
CREATE POLICY "Users can view own or team calls" ON calls
    FOR SELECT USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id))
    );

CREATE POLICY "Users can view own or team transcripts" ON transcripts
    FOR SELECT USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id))
    );

CREATE POLICY "Users can view own or team insights" ON insights
    FOR SELECT USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id))
    );

CREATE POLICY "Users can view own or team embeddings" ON embeddings
    FOR SELECT USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id))
    );

-- Update INSERT policies to allow team members to create data for their team
DROP POLICY IF EXISTS "Users can insert own calls" ON calls;
DROP POLICY IF EXISTS "Users can insert own transcripts" ON transcripts;
DROP POLICY IF EXISTS "Users can insert own insights" ON insights;
DROP POLICY IF EXISTS "Users can insert own embeddings" ON embeddings;

CREATE POLICY "Users can insert own or team calls" ON calls
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND (
            team_id IS NULL OR
            is_team_member(team_id)
        )
    );

CREATE POLICY "Users can insert own or team transcripts" ON transcripts
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND (
            team_id IS NULL OR
            is_team_member(team_id)
        )
    );

CREATE POLICY "Users can insert own or team insights" ON insights
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND (
            team_id IS NULL OR
            is_team_member(team_id)
        )
    );

CREATE POLICY "Users can insert own or team embeddings" ON embeddings
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND (
            team_id IS NULL OR
            is_team_member(team_id)
        )
    );

-- Update UPDATE policies
DROP POLICY IF EXISTS "Users can update own calls" ON calls;
DROP POLICY IF EXISTS "Users can update own transcripts" ON transcripts;
DROP POLICY IF EXISTS "Users can update own insights" ON insights;
DROP POLICY IF EXISTS "Users can update own embeddings" ON embeddings;

CREATE POLICY "Users can update own or team calls" ON calls
    FOR UPDATE USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id))
    );

CREATE POLICY "Users can update own or team transcripts" ON transcripts
    FOR UPDATE USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id))
    );

CREATE POLICY "Users can update own or team insights" ON insights
    FOR UPDATE USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id))
    );

CREATE POLICY "Users can update own or team embeddings" ON embeddings
    FOR UPDATE USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id))
    );

-- Update DELETE policies
DROP POLICY IF EXISTS "Users can delete own calls" ON calls;
DROP POLICY IF EXISTS "Users can delete own transcripts" ON transcripts;
DROP POLICY IF EXISTS "Users can delete own insights" ON insights;
DROP POLICY IF EXISTS "Users can delete own embeddings" ON embeddings;

CREATE POLICY "Users can delete own or team calls" ON calls
    FOR DELETE USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id))
    );

CREATE POLICY "Users can delete own or team transcripts" ON transcripts
    FOR DELETE USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id))
    );

CREATE POLICY "Users can delete own or team insights" ON insights
    FOR DELETE USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id))
    );

CREATE POLICY "Users can delete own or team embeddings" ON embeddings
    FOR DELETE USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id))
    );

-- ============================================
-- UPDATE JOB TABLES POLICIES
-- ============================================

-- Update transcription_jobs and insights_jobs policies if they exist
-- (These might not have RLS enabled yet, so we'll check)

DO $$
BEGIN
    -- Check if transcription_jobs has RLS enabled
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'transcription_jobs'
    ) THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view own transcription jobs" ON transcription_jobs;
        DROP POLICY IF EXISTS "Users can insert own transcription jobs" ON transcription_jobs;
        DROP POLICY IF EXISTS "Users can update own transcription jobs" ON transcription_jobs;
        DROP POLICY IF EXISTS "Users can delete own transcription jobs" ON transcription_jobs;
        
        -- Create new policies using helper function to avoid recursion
        CREATE POLICY "Users can view own or team transcription jobs" ON transcription_jobs
            FOR SELECT USING (
                auth.uid() = user_id OR
                (team_id IS NOT NULL AND is_team_member(team_id))
            );
        
        CREATE POLICY "Users can insert own or team transcription jobs" ON transcription_jobs
            FOR INSERT WITH CHECK (
                auth.uid() = user_id AND (
                    team_id IS NULL OR
                    is_team_member(team_id)
                )
            );
        
        CREATE POLICY "Users can update own or team transcription jobs" ON transcription_jobs
            FOR UPDATE USING (
                auth.uid() = user_id OR
                (team_id IS NOT NULL AND is_team_member(team_id))
            );
        
        CREATE POLICY "Users can delete own or team transcription jobs" ON transcription_jobs
            FOR DELETE USING (
                auth.uid() = user_id OR
                (team_id IS NOT NULL AND is_team_member(team_id))
            );
    END IF;
    
    -- Check if insights_jobs has RLS enabled
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'insights_jobs'
    ) THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view own insights jobs" ON insights_jobs;
        DROP POLICY IF EXISTS "Users can insert own insights jobs" ON insights_jobs;
        DROP POLICY IF EXISTS "Users can update own insights jobs" ON insights_jobs;
        DROP POLICY IF EXISTS "Users can delete own insights jobs" ON insights_jobs;
        
        -- Create new policies using helper function to avoid recursion
        CREATE POLICY "Users can view own or team insights jobs" ON insights_jobs
            FOR SELECT USING (
                auth.uid() = user_id OR
                (team_id IS NOT NULL AND is_team_member(team_id))
            );
        
        CREATE POLICY "Users can insert own or team insights jobs" ON insights_jobs
            FOR INSERT WITH CHECK (
                auth.uid() = user_id AND (
                    team_id IS NULL OR
                    is_team_member(team_id)
                )
            );
        
        CREATE POLICY "Users can update own or team insights jobs" ON insights_jobs
            FOR UPDATE USING (
                auth.uid() = user_id OR
                (team_id IS NOT NULL AND is_team_member(team_id))
            );
        
        CREATE POLICY "Users can delete own or team insights jobs" ON insights_jobs
            FOR DELETE USING (
                auth.uid() = user_id OR
                (team_id IS NOT NULL AND is_team_member(team_id))
            );
    END IF;
END $$;


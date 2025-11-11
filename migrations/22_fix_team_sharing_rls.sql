-- ============================================
-- Fix Team Sharing RLS Policies
-- Migration 22: Allow team members to see each other's calls even if team_id is NULL
-- ============================================
-- This migration fixes the issue where existing calls (without team_id) 
-- are not visible to team members. It adds a helper function to check
-- if two users are in the same team, and updates RLS policies to use it.
-- ============================================

-- ============================================
-- HELPER FUNCTION: Check if two users are in the same team
-- Uses SECURITY DEFINER to bypass RLS and prevent recursion
-- ============================================
CREATE OR REPLACE FUNCTION users_in_same_team(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- Check if both users are members of at least one common team
    RETURN EXISTS (
        SELECT 1
        FROM team_members tm1
        INNER JOIN team_members tm2 ON tm1.team_id = tm2.team_id
        WHERE tm1.user_id = user1_id
        AND tm2.user_id = user2_id
    );
END;
$$;

-- ============================================
-- UPDATE CALLS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own or team calls" ON calls;

-- Create new policy that checks:
-- 1. User owns the call (user_id = auth.uid())
-- 2. Call has team_id and user is member of that team
-- 3. Call owner and viewer are in the same team (even if team_id is NULL)
CREATE POLICY "Users can view own or team calls" ON calls
    FOR SELECT USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id)) OR
        users_in_same_team(user_id, auth.uid())
    );

-- ============================================
-- UPDATE TRANSCRIPTS RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own or team transcripts" ON transcripts;

CREATE POLICY "Users can view own or team transcripts" ON transcripts
    FOR SELECT USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id)) OR
        EXISTS (
            SELECT 1 FROM calls c
            WHERE c.id = transcripts.call_id
            AND users_in_same_team(c.user_id, auth.uid())
        )
    );

-- ============================================
-- UPDATE INSIGHTS RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own or team insights" ON insights;

CREATE POLICY "Users can view own or team insights" ON insights
    FOR SELECT USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id)) OR
        EXISTS (
            SELECT 1 FROM calls c
            WHERE c.id = insights.call_id
            AND users_in_same_team(c.user_id, auth.uid())
        )
    );

-- ============================================
-- UPDATE EMBEDDINGS RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own or team embeddings" ON embeddings;

CREATE POLICY "Users can view own or team embeddings" ON embeddings
    FOR SELECT USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id)) OR
        EXISTS (
            SELECT 1 FROM calls c
            WHERE c.id = embeddings.call_id
            AND users_in_same_team(c.user_id, auth.uid())
        )
    );

-- ============================================
-- UPDATE JOB TABLE POLICIES (if tables exist)
-- ============================================

DO $$
BEGIN
    -- Transcription jobs
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'transcription_jobs'
    ) THEN
        DROP POLICY IF EXISTS "Users can view own or team transcription jobs" ON transcription_jobs;
        
        CREATE POLICY "Users can view own or team transcription jobs" ON transcription_jobs
            FOR SELECT USING (
                auth.uid() = user_id OR
                (team_id IS NOT NULL AND is_team_member(team_id)) OR
                EXISTS (
                    SELECT 1 FROM calls c
                    WHERE c.id = transcription_jobs.call_id
                    AND users_in_same_team(c.user_id, auth.uid())
                )
            );
    END IF;
    
    -- Insights jobs
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'insights_jobs'
    ) THEN
        DROP POLICY IF EXISTS "Users can view own or team insights jobs" ON insights_jobs;
        
        CREATE POLICY "Users can view own or team insights jobs" ON insights_jobs
            FOR SELECT USING (
                auth.uid() = user_id OR
                (team_id IS NOT NULL AND is_team_member(team_id)) OR
                EXISTS (
                    SELECT 1 FROM calls c
                    WHERE c.id = insights_jobs.call_id
                    AND users_in_same_team(c.user_id, auth.uid())
                )
            );
    END IF;
END $$;


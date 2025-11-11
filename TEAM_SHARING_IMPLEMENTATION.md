# Team Sharing Implementation Guide

## Overview
This implementation adds team-based data sharing to the application, allowing multiple users to access the same calls, transcripts, and insights.

## What Was Implemented

### 1. Database Changes (Migration 20)
- **`teams` table**: Stores team information
- **`team_members` table**: Many-to-many relationship between users and teams with roles (owner/member)
- **`team_id` column**: Added to `calls`, `transcripts`, `insights`, `embeddings`, `transcription_jobs`, and `insights_jobs` tables
- **Updated RLS policies**: All policies now allow team members to access each other's data

### 2. Code Changes

#### New Files:
- `lib/teams.ts`: Team management utility functions
- `migrations/20_add_team_sharing.sql`: Database migration

#### Updated Files:
- `app/api/upload/route.ts`: Now assigns `team_id` to new calls
- `app/api/transcribe/route.ts`: Now includes `team_id` when creating transcripts and transcription jobs

#### Still Needs Updates:
- `app/api/insights/generate/route.ts`: Should include `team_id` when creating insights and insights_jobs
- `lib/inngest-transcription.ts`: Should include `team_id` when updating transcripts
- `lib/inngest-insights.ts`: Should include `team_id` when updating insights
- All query files that filter by `user_id` should work automatically due to RLS, but may need refinement

## How It Works

### Team Structure
- Users can belong to multiple teams
- Each team has one or more owners (who can manage members)
- Members have full read/write access to all team data

### Data Sharing
- When a user creates a call, it's assigned to their primary team (if they belong to one)
- All team members can see and edit all calls, transcripts, and insights in their team
- RLS policies automatically filter data based on team membership

### Backward Compatibility
- Existing data without `team_id` still works (users can only see their own data)
- New data created by users without teams also works normally
- The `team_id` column is nullable, so no breaking changes

## Next Steps

### 1. Run the Migration
```sql
-- Run this in Supabase SQL Editor
-- File: migrations/20_add_team_sharing.sql
```

### 2. Update Remaining Code
- Update `app/api/insights/generate/route.ts` to include `team_id`
- Update Inngest workers to include `team_id` when updating records
- Test all queries to ensure team data is accessible

### 3. Create Team Management UI
- Team creation page
- Team member invitation/management
- Team selection/switching (if users belong to multiple teams)

### 4. Testing
- Create a test team with 2+ users
- Verify team members can see each other's calls
- Verify team members can edit each other's data
- Verify non-team members cannot access team data

## API Routes Needed

### Team Management Routes
- `POST /api/teams/create` - Create a new team
- `GET /api/teams` - Get user's teams
- `GET /api/teams/[id]/members` - Get team members
- `POST /api/teams/[id]/members` - Add a team member (by email)
- `DELETE /api/teams/[id]/members/[userId]` - Remove a team member
- `PUT /api/teams/[id]/members/[userId]` - Update member role
- `DELETE /api/teams/[id]` - Delete team (owners only)

## Security Considerations

✅ **Implemented:**
- RLS policies prevent unauthorized access
- Only team members can access team data
- Only owners can manage team members
- Users can leave teams themselves

⚠️ **To Consider:**
- Rate limiting on team operations
- Audit logging for team changes
- Email verification for team invitations
- Team size limits (if needed)

## Notes

- The current implementation uses the user's "primary team" (first team they joined) for new data
- If users belong to multiple teams, you may want to add team selection UI
- Consider adding team context to the UI (show which team's data is being viewed)


# Team Sharing Fix - Complete Implementation

## Problem
Team members were unable to see each other's call data despite being in the same team.

## Root Cause
Two issues prevented team sharing from working:

1. **Application-Level Filters**: Nearly all API routes and frontend pages were filtering queries by `user_id`, which prevented RLS policies from showing team members' data.

2. **RLS Policy Limitations**: The original RLS policies only checked:
   - If the user owns the record
   - If the record has a `team_id` and the user is a member of that team

   This meant existing calls (without `team_id`) were not visible to team members.

## Solution

### 1. Database Migration (Migration 22)

Created `migrations/22_fix_team_sharing_rls.sql` which:

- **Adds Helper Function**: `users_in_same_team(user1_id, user2_id)` 
  - Uses `SECURITY DEFINER` to bypass RLS and prevent recursion
  - Checks if two users are members of at least one common team

- **Updates RLS Policies**: Modified SELECT policies for all data tables to allow access if:
  - User owns the record (`user_id = auth.uid()`)
  - Record has `team_id` and user is a member of that team
  - **NEW**: Record owner and viewer are in the same team (even if `team_id` is NULL)

### 2. Application Code Changes

Removed `user_id` filters from:

#### Frontend Pages
- `app/library-enhanced/page.tsx` - Main call library
- `app/calls/[id]/page.tsx` - Individual call detail page
- `app/caller-analytics/page.tsx` - Caller analytics (3 instances)

#### Analytics API Routes
- `app/api/analytics/call-highlights/route.ts`
- `app/api/analytics/caller-stats/route.ts`
- `app/api/analytics/export/route.ts`
- `app/api/analytics/overview/route.ts`
- `app/api/analytics/performance/route.ts`
- `app/api/analytics/sentiment/route.ts`
- `app/api/analytics/topics/route.ts`
- `app/api/analytics/trends/route.ts`

#### Other API Routes
- `app/api/qa/dashboard/route.ts`
- `app/api/search/analytics/route.ts`
- `app/api/search/batch-embeddings/route.ts`
- `app/api/search/embeddings/route.ts`
- `app/api/search/semantic/route.ts`

**Total**: 16 files updated, removing 27+ `user_id` filters

## Deployment Steps

### 1. Run Database Migration

In Supabase Dashboard → SQL Editor:

```sql
-- Run migrations/22_fix_team_sharing_rls.sql
```

This will:
- Create the `users_in_same_team()` helper function
- Update all RLS policies to use the helper function
- Enable team members to see each other's data

### 2. Deploy Application Code

The code has been committed and pushed to GitHub:
- Commit: `8ec1d34` - "fix: Remove user_id filters from all queries to enable team sharing via RLS"

If using Vercel or similar:
- The deployment should happen automatically
- Or manually trigger a deployment from your dashboard

### 3. Verify Team Sharing Works

1. **Create a team** (if not already done):
   - User A creates a team
   - User A invites User B

2. **Test visibility**:
   - User A should see their own calls
   - User B should now see User A's calls (even those created before the team was formed)
   - Both users should see new calls uploaded by either user

3. **Test across features**:
   - Library page
   - Individual call pages
   - Analytics dashboards
   - Caller analytics
   - Call highlights
   - QA dashboard
   - Search features

## How It Works Now

### RLS-Based Access Control

All data access is now controlled by Row Level Security policies in Supabase:

1. **User's Own Data**: Always accessible
2. **Team Data with `team_id`**: Accessible to team members
3. **Legacy Data without `team_id`**: Accessible if the record owner and viewer are in the same team

### No Application-Level Filtering

The application no longer filters by `user_id`. Instead:
- Queries fetch all data the user has access to
- RLS policies automatically filter results
- Team members see a combined view of all team data

### Benefits

1. **Centralized Access Control**: All access logic in one place (database)
2. **Consistent Behavior**: Same access rules across all features
3. **Backward Compatible**: Existing calls (without `team_id`) are accessible to team members
4. **Forward Compatible**: New calls with `team_id` work seamlessly

## Technical Details

### Helper Function

```sql
CREATE OR REPLACE FUNCTION users_in_same_team(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM team_members tm1
        INNER JOIN team_members tm2 ON tm1.team_id = tm2.team_id
        WHERE tm1.user_id = user1_id
        AND tm2.user_id = user2_id
    );
END;
$$;
```

### Example RLS Policy (for calls)

```sql
CREATE POLICY "Users can view own or team calls" ON calls
    FOR SELECT USING (
        auth.uid() = user_id OR
        (team_id IS NOT NULL AND is_team_member(team_id)) OR
        users_in_same_team(user_id, auth.uid())
    );
```

## Troubleshooting

### Team members still can't see each other's data

1. **Check migration was run**:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'users_in_same_team';
   ```
   Should return the function name.

2. **Check team membership**:
   ```sql
   SELECT * FROM team_members WHERE user_id = '<user_id>';
   ```
   Verify both users are in the same team.

3. **Check RLS is enabled**:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE schemaname = 'public' AND tablename = 'calls';
   ```
   `rowsecurity` should be `true`.

4. **Test RLS policy directly**:
   ```sql
   -- As user A
   SELECT COUNT(*) FROM calls;
   
   -- As user B (after joining team)
   SELECT COUNT(*) FROM calls;
   ```
   Both should see all team calls.

### Performance concerns

If you notice slow queries after enabling team sharing:

1. **Check indexes** on `team_id` columns (already created in migration 20)
2. **Monitor query performance** in Supabase Dashboard
3. **Consider materialized views** for analytics if needed

## Migration History

- **Migration 20**: Created teams and team_members tables, added team_id columns
- **Migration 21**: (Not used/deleted) - Was an alternate fix attempt
- **Migration 22**: ✅ **Current fix** - Adds `users_in_same_team()` and updates RLS policies

## Files Changed

- 1 new migration file
- 16 application files updated
- 27+ user_id filters removed

## Commit Reference

- Main fix: `8ec1d34`
- Team sharing implementation: `3976d97`
- Search button removal: `d910c91`


# Authentication & Security Setup Guide

This guide walks you through setting up proper authentication and Row Level Security (RLS) for your Dental Call Insights application.

---

## Table of Contents

1. [Understanding the Security Model](#understanding-the-security-model)
2. [Step-by-Step Setup](#step-by-step-setup)
3. [Testing Your Policies](#testing-your-policies)
4. [Common Patterns](#common-patterns)
5. [Troubleshooting](#troubleshooting)

---

## Understanding the Security Model

### What is Row Level Security (RLS)?

RLS is PostgreSQL's built-in feature that restricts which rows users can access in a table. Think of it as "per-row permissions."

**Without RLS:**

```sql
-- User A can see ALL calls, including User B's calls ❌
SELECT * FROM calls;
```

**With RLS:**

```sql
-- User A can only see their own calls ✅
SELECT * FROM calls; -- Automatically filtered to user_id = current_user
```

### Two Types of Supabase Keys

| Key Type             | Purpose              | Respects RLS?        | Where to Use                   |
| -------------------- | -------------------- | -------------------- | ------------------------------ |
| **Anon Key**         | Client-side access   | ✅ Yes               | Frontend, public API           |
| **Service Role Key** | Admin/Backend access | ❌ No (bypasses RLS) | Server-side only, never expose |

---

## Step-by-Step Setup

### 1. Enable Authentication in Supabase

#### Option A: Email/Password Auth (Recommended for MVP)

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Enable **Email** provider
3. Configure email settings:
   - ✅ Enable email confirmations (for production)
   - ✅ Enable password recovery
   - Set minimum password strength

#### Option B: OAuth Providers (Optional)

Enable social login (Google, GitHub, etc.):

1. Go to **Authentication** → **Providers**
2. Click on provider (e.g., Google)
3. Add OAuth credentials from provider
4. Enable the provider

### 2. Run the RLS Migration

After enabling pgvector (see previous instructions), run both migrations in order:

```sql
-- In Supabase SQL Editor:

-- First, run the initial schema
-- Copy/paste contents of migrations/001_init.sql

-- Then, enable RLS policies
-- Copy/paste contents of migrations/002_enable_rls.sql
```

### 3. Verify RLS is Enabled

Run this query in SQL Editor:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('calls', 'transcripts', 'embeddings');
```

Expected output:

```
tablename    | rowsecurity
-------------+-------------
calls        | t
transcripts  | t
embeddings   | t
```

All should show `t` (true).

### 4. Verify Policies are Created

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('calls', 'transcripts', 'embeddings')
ORDER BY tablename, cmd;
```

You should see policies for SELECT, INSERT, UPDATE, DELETE on each table.

---

## Testing Your Policies

### Test 1: Anonymous Access (Should Fail)

```sql
-- In SQL Editor, run as anonymous user
RESET request.jwt.claim.sub;

SELECT * FROM calls;
-- Expected: 0 rows (no access without auth)
```

### Test 2: Authenticated User Access

```sql
-- Create a test user_id
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

-- Insert test call
INSERT INTO calls (user_id, audio_path, metadata)
VALUES ('11111111-1111-1111-1111-111111111111', 'test/audio.mp3', '{}');

-- Query calls
SELECT * FROM calls;
-- Expected: 1 row (your test call)
```

### Test 3: User Isolation

```sql
-- Switch to a different user
SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

SELECT * FROM calls;
-- Expected: 0 rows (can't see other user's calls)

-- Try to access the first user's call (should fail)
UPDATE calls
SET metadata = '{"hacked": true}'
WHERE user_id = '11111111-1111-1111-1111-111111111111';
-- Expected: 0 rows updated (RLS prevents access)
```

### Test 4: Application-Level Testing

Create test users in your app:

1. **Sign up User A**

   ```javascript
   const { data, error } = await supabase.auth.signUp({
     email: 'usera@test.com',
     password: 'SecurePassword123!',
   })
   ```

2. **Upload a call as User A**
   - Should succeed
   - Note the call ID

3. **Sign out and sign up User B**

   ```javascript
   await supabase.auth.signOut()
   await supabase.auth.signUp({
     email: 'userb@test.com',
     password: 'SecurePassword123!',
   })
   ```

4. **Try to access User A's call**

   ```javascript
   const { data } = await supabase
     .from('calls')
     .select('*')
     .eq('id', 'user-a-call-id')

   console.log(data) // Should be empty array []
   ```

---

## Common Patterns

### Pattern 1: Getting Current User's Data

```typescript
// Frontend code - automatically filtered by RLS
const { data: calls } = await supabase
  .from('calls')
  .select('*')
  .order('created_at', { ascending: false })

// Only returns current user's calls due to RLS policy
```

### Pattern 2: Server-Side Admin Operations

```typescript
// Backend API route (use service role key)
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Bypasses RLS
)

// Admin can see all calls
const { data: allCalls } = await supabaseAdmin.from('calls').select('*')
```

### Pattern 3: Inserting with Correct user_id

```typescript
// Get current user
const {
  data: { user },
} = await supabase.auth.getUser()

// Insert call with current user's ID
const { data, error } = await supabase.from('calls').insert({
  user_id: user.id, // Must match auth.uid()
  audio_path: 'uploads/call.mp3',
  metadata: { patient_id: 'P001' },
})

// If user_id doesn't match auth.uid(), RLS will block the insert
```

### Pattern 4: Joining Tables with RLS

```typescript
// Fetch calls with their transcripts
// RLS automatically filters both tables
const { data } = await supabase
  .from('calls')
  .select(
    `
    *,
    transcripts (*)
  `
  )
  .order('created_at', { ascending: false })

// Only returns current user's calls and transcripts
```

---

## Security Checklist

Before going to production, ensure:

- ✅ RLS is enabled on all tables
- ✅ Policies are tested for all CRUD operations
- ✅ Service role key is NEVER exposed to client
- ✅ Service role key is in `.env.local` and `.gitignore`d
- ✅ Email confirmation is enabled (prevents fake signups)
- ✅ Password strength requirements are set
- ✅ Rate limiting is configured (Supabase dashboard → Auth → Rate Limits)
- ✅ Test with multiple users to verify isolation
- ✅ Audit logs are reviewed periodically

---

## Troubleshooting

### Problem: "new row violates row-level security policy"

**Cause:** Trying to insert a row that doesn't match the RLS policy.

**Fix:**

```typescript
// ❌ Wrong - user_id doesn't match current user
await supabase.from('calls').insert({
  user_id: 'some-other-user-id',
  audio_path: 'test.mp3',
})

// ✅ Correct - use current user's ID
const {
  data: { user },
} = await supabase.auth.getUser()
await supabase.from('calls').insert({
  user_id: user.id,
  audio_path: 'test.mp3',
})
```

### Problem: Can't access data after enabling RLS

**Cause:** Not authenticated or session expired.

**Fix:**

```typescript
// Check auth state
const {
  data: { session },
} = await supabase.auth.getSession()
if (!session) {
  // Redirect to login
  router.push('/login')
}
```

### Problem: Service role key not working in frontend

**Cause:** Service role key should NEVER be used in frontend.

**Fix:**

- Remove service role key from client-side code
- Use anon key for client operations
- Use service role key only in API routes (server-side)

### Problem: Search function returns no results

**Cause:** `search_embeddings` function needs to respect RLS.

**Fix:** The function already filters by `call_id`, which is protected by the calls RLS policy. Just ensure you're joining with calls table in your queries.

---

## Next Steps

1. ✅ Enable pgvector extension
2. ✅ Run migration 001_init.sql
3. ✅ Run migration 002_enable_rls.sql
4. ⬜ Implement authentication UI (login/signup pages)
5. ⬜ Add protected routes (redirect if not authenticated)
6. ⬜ Test with multiple users
7. ⬜ Configure email templates in Supabase
8. ⬜ Set up production rate limits

---

## Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

# Inngest Deployment Checklist for Insights Generation

## Critical Fix Applied

**ISSUE:** Insights functions were NOT registered in the Inngest API route!

**FIXED:** 
- ✅ Added `generateCallInsights` and `handleInsightsFailure` to `/app/api/inngest/route.ts`
- ✅ Added insights event types to `/lib/inngest.ts`
- ✅ Added insights helper functions for sending events

**What This Means:**
Before this fix, Inngest couldn't process insights because it didn't know the functions existed. After deploying this fix, insights should generate properly.

---

## Deployment Steps

### 1. Push Code to GitHub

```bash
git add .
git commit -m "fix: Register insights functions with Inngest"
git push origin main
```

### 2. Verify Vercel Auto-Deploy

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your **Dental Call Insights** project
3. Check **Deployments** tab
4. Wait for deployment to complete (usually 1-2 minutes)
5. Look for ✅ **Ready** status

### 3. Check Inngest Integration in Vercel

1. In Vercel project, go to **Settings** → **Integrations**
2. Verify **Inngest** is listed and active
3. Click on Inngest integration
4. Verify these environment variables are set:
   - `INNGEST_SIGNING_KEY` (auto-set by integration)
   - `INNGEST_EVENT_KEY` (auto-set by integration)

**If Inngest is NOT installed:**
1. Go to [Vercel Marketplace - Inngest](https://vercel.com/marketplace/inngest)
2. Click **Install**
3. Select your project
4. Complete installation
5. Redeploy your app

### 4. Verify in Inngest Dashboard

1. Go to [https://app.inngest.com](https://app.inngest.com)
2. Sign in (use same account as Vercel if possible)
3. Find your **dental-call-insights** app
4. Click on **Functions** tab
5. **You should see 5 functions:**
   - ✅ `transcribe-call`
   - ✅ `handle-transcription-error`
   - ✅ `track-transcription-progress`
   - ✅ **`generate-call-insights`** (NEW - should appear after deployment)
   - ✅ **`handle-insights-failure`** (NEW - should appear after deployment)

**If functions are missing:**
- They may take 1-2 minutes to register after deployment
- Click **Sync** in Inngest dashboard to force refresh
- Check Inngest app ID matches: `dental-call-insights`

### 5. Check Inngest Endpoint Registration

Visit your production URL to verify the endpoint is accessible:

```bash
# Replace with your actual Vercel URL
curl https://your-app.vercel.app/api/inngest
```

**Expected Response:**
```json
{
  "message": "Inngest endpoint",
  "hasEventKey": true,
  "hasSigningKey": true,
  "mode": "cloud"
}
```

**If you get errors:**
- 404: Route not deployed properly
- 500: Check Vercel function logs
- Missing keys: Inngest integration not configured

---

## Testing After Deployment

### Test 1: Single Call Insights

1. Open your production app
2. Navigate to any call with a completed transcript
3. Click **"AI Insights"** button
4. Watch for:
   - ✅ Job created in database (`insights_jobs` table)
   - ✅ Job status changes to "processing"
   - ✅ Insights appear within 10-30 seconds
   - ✅ Job status updates to "completed"

**If it fails:**
- Check browser console for errors
- Check Vercel function logs
- Check Inngest dashboard for failed events

### Test 2: Bulk Insights Generation

1. Go to Call Library
2. Select 3-5 calls with completed transcripts
3. Click **"Generate AI Insights"** (bulk action)
4. Progress modal should show:
   - ✅ Jobs queued
   - ✅ Progress updates
   - ✅ Completed count increases

### Test 3: Check Inngest Dashboard

1. Go to Inngest dashboard → **Events** tab
2. You should see events flowing:
   - `insights/start`
   - `insights/progress`
   - `insights/complete`
3. Click on any event to see details
4. Verify no failures

### Test 4: Check Database

In Supabase SQL Editor:

```sql
-- Check recent insights jobs
SELECT 
  ij.id,
  ij.status,
  ij.created_at,
  ij.completed_at,
  ij.error_message,
  c.filename
FROM insights_jobs ij
JOIN calls c ON c.id = ij.call_id
ORDER BY ij.created_at DESC
LIMIT 10;

-- Check if insights were saved
SELECT 
  i.id,
  i.call_id,
  i.overall_sentiment,
  array_length(i.action_items, 1) as action_item_count,
  i.created_at
FROM insights i
ORDER BY i.created_at DESC
LIMIT 10;
```

**Expected Results:**
- Jobs show "completed" status
- Insights exist with matching `call_id`
- `completed_at` timestamp is recent

---

## Troubleshooting

### Problem: Functions don't appear in Inngest dashboard

**Solution:**
1. Wait 2-3 minutes after deployment
2. Click **Sync** in Inngest dashboard
3. Verify Inngest integration is active in Vercel
4. Check that `/api/inngest/route.ts` exports the functions
5. Redeploy if needed

### Problem: Jobs stuck in "processing"

**Possible Causes:**
1. **Inngest functions not registered** → Deploy the fix above
2. **Inngest integration not configured** → Install from Vercel Marketplace
3. **OpenAI API key missing** → Check Vercel environment variables
4. **RLS policy blocking access** → Check Supabase RLS policies

**Check Inngest Logs:**
1. Go to Inngest dashboard → **Runs** tab
2. Look for failed runs
3. Click on any run to see error details
4. Common errors:
   - "OpenAI API key not found" → Set `OPENAI_API_KEY` in Vercel
   - "Failed to fetch transcript" → Check database access
   - "Timeout" → Transcript might be too long

### Problem: 406 errors in browser console

**This is normal!** The 406 error occurs when:
- Checking for existing insights (none found yet)
- Supabase returns PGRST116 when `.single()` finds no rows
- Code continues to generate new insights

**NOT normal if:**
- Error persists after insights are generated
- Error prevents insights from showing
- Error message is NOT "PGRST116"

### Problem: Insights not saving to database

**Check:**
1. Inngest function completed successfully
2. `user_id` matches the logged-in user
3. No RLS policy blocking insert
4. Schema matches (flat columns, not JSONB)

**Debug Query:**
```sql
-- Try inserting test data manually
INSERT INTO insights (
  call_id,
  user_id,
  overall_sentiment,
  key_points,
  action_items,
  red_flags,
  call_outcome
) VALUES (
  'your-call-id-here',
  'your-user-id-here',
  'positive',
  ARRAY['Test point'],
  ARRAY['Test action'],
  ARRAY[]::text[],
  'test'
);
```

---

## Environment Variables Checklist

Verify these are set in **Vercel** → **Settings** → **Environment Variables**:

- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `INNGEST_SIGNING_KEY` (auto-set by integration)
- ✅ `INNGEST_EVENT_KEY` (auto-set by integration)

**All should be set for:** Production, Preview, Development

---

## Success Criteria

After deployment, you should be able to:

1. ✅ Click "AI Insights" on any call
2. ✅ See job created in database
3. ✅ See Inngest event in dashboard
4. ✅ See insights appear in UI
5. ✅ See job marked "completed"
6. ✅ Reload page and see cached insights
7. ✅ Generate bulk insights for multiple calls
8. ✅ See progress updates in real-time
9. ✅ View jobs on `/jobs` page
10. ✅ No errors in browser console (except expected 406)

---

## Need Help?

If insights still don't work after deploying:

1. **Share Inngest dashboard screenshot** (Functions tab)
2. **Share Vercel function logs** (filter for "inngest" or "insights")
3. **Share browser console errors**
4. **Run the database queries above** and share results

The most common issue is Inngest functions not being registered, which this deployment should fix!


# Insights Generation Issue - Inngest Not Running

## The Problem

**Symptoms:**
- Clicking "AI Insights" shows a 406 error in console
- Jobs created in `insights_jobs` table but stuck in "processing" status
- Insights never get saved to `insights` table
- Jobs never complete

**Root Cause:**
The background job system uses **Inngest** to process insights generation asynchronously. However, **Inngest is not currently running** in your environment.

## Why Inngest Is Required

When you trigger insights generation:
1. API creates job in `insights_jobs` table (✅ Working)
2. API sends event to Inngest: `insights/start` (✅ Sent, but...)
3. **Inngest worker should process the event** (❌ NOT RUNNING)
4. Worker generates insights and saves to database (❌ Never happens)
5. Worker updates job status to "completed" (❌ Never happens)

Without Inngest running, steps 3-5 never execute!

## About the 406 Error

The 406 error you're seeing is **NOT the main problem**. It's expected behavior:
- Supabase returns 406 (error code `PGRST116`) when `.single()` finds no rows
- This happens the first time you request insights (before they're generated)
- I've added error handling to ignore this and continue to generation

**The real issue:** Jobs are stuck because Inngest isn't processing them.

## Solutions

### Option 1: Run Inngest Dev Server Locally (Recommended for Testing)

This lets you test the full insights flow on your local machine:

```bash
# Install Inngest CLI globally
npm install -g inngest-cli

# In a separate terminal, start the Inngest dev server
npx inngest-cli@latest dev

# In your main terminal, start your Next.js app
npm run dev
```

The Inngest dev server will:
- Listen for events from your app on `http://localhost:8288`
- Process background jobs immediately
- Show logs and progress in the terminal
- Display a dashboard at `http://localhost:8288`

**Then test:**
1. Open a call and click "AI Insights"
2. Check Inngest terminal - you should see the `insights/start` event
3. Watch it process through stages (fetching, analyzing, saving)
4. Insights should appear in the UI when complete

### Option 2: Deploy to Vercel (Recommended for Production)

The background job system is designed for production use:

```bash
# Push changes to GitHub
git add .
git commit -m "Your changes"
git push origin main

# Vercel will auto-deploy if connected
```

**Then in Vercel Dashboard:**
1. Go to [Vercel Marketplace](https://vercel.com/marketplace/inngest)
2. Install Inngest integration for your project
3. Integration automatically sets `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY`
4. Redeploy if needed

**Verify in Inngest Dashboard:**
1. Go to [https://app.inngest.com](https://app.inngest.com)
2. Check **Functions** tab - should see:
   - `transcribe-call`
   - `generate-call-insights`
   - Error handlers
3. Test insights generation - should see events flowing

### Option 3: Temporary Inline Processing (Quick Fix)

If you need insights NOW without setting up Inngest:

I can create a fallback that processes insights synchronously in the API route (like it worked before the background job refactor). This will:
- ✅ Work immediately without Inngest
- ✅ Save insights to database
- ❌ Have 60-second timeout limit
- ❌ No progress tracking
- ❌ Block the request (slower UX)

Let me know if you want this temporary fix.

## Checking Current Status

### 1. Check if Inngest is running locally:
```bash
# Look for Inngest process
ps aux | grep inngest

# Check if port 8288 is listening
lsof -i :8288
```

### 2. Check job status in database:
```sql
-- In Supabase SQL Editor
SELECT * FROM insights_jobs 
WHERE status = 'processing' 
ORDER BY created_at DESC 
LIMIT 10;

-- If stuck jobs exist, you can reset them:
UPDATE insights_jobs 
SET status = 'failed', 
    error_message = 'Inngest was not running', 
    completed_at = NOW()
WHERE status = 'processing' 
  AND created_at < NOW() - INTERVAL '10 minutes';
```

### 3. Check Inngest event sending:
```bash
# In your app terminal, you should see logs like:
# "Sending Inngest event: insights/start"
# "Inngest event sent successfully"

# If you see errors about connecting to Inngest, it's not running
```

## Recommended Next Steps

**For immediate testing:**
1. Run Option 1 (Inngest Dev Server locally)
2. Test insights generation
3. Verify jobs complete

**For production use:**
1. Deploy to Vercel (Option 2)
2. Install Inngest integration
3. Test on production

**If you need a quick workaround:**
1. Let me implement Option 3 (inline processing)
2. Test insights without Inngest
3. Later migrate to proper background processing

## Questions?

- Want me to implement the inline processing fallback?
- Need help running Inngest dev server?
- Ready to deploy to Vercel?

Let me know how you'd like to proceed!


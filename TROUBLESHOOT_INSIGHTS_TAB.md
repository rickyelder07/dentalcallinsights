# Troubleshooting: AI Insights Tab Not Showing

## The Issue
The AI Insights tab is not appearing on the call detail page.

## Why the Tab Might Not Show

The tab only appears when **BOTH** conditions are true:
1. ✅ A transcript exists for the call
2. ✅ The transcript status is `'completed'`

Check the code at line 330 in `app/calls/[id]/page.tsx`:
```tsx
{transcript && transcript.transcription_status === 'completed' && (
  <div className="border-b border-gray-200 mb-6">
    {/* Tabs here */}
  </div>
)}
```

## Diagnostic Steps

### Step 1: Check if You Have a Completed Transcription
1. Go to your Library page
2. Look for calls with "✓ Completed" status
3. Click on one of those calls
4. You should see the tabs

### Step 2: Check Browser Console
1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Look for any errors
4. Check what the transcript object contains

### Step 3: Verify Development Server is Running
```bash
# Kill any existing Next.js processes
pkill -f "next dev"

# Clear Next.js cache
rm -rf .next

# Restart development server
npm run dev
```

### Step 4: Hard Refresh Browser
- Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Safari: Cmd+Option+R (Mac)

### Step 5: Check the Call Detail Page URL
The URL should look like:
```
http://localhost:3000/calls/[some-uuid-here]
```

### Step 6: Add Debug Logging
Temporarily add this to `app/calls/[id]/page.tsx` right before the return statement (around line 268):

```tsx
// Debug logging - REMOVE AFTER TESTING
console.log('=== DEBUG INFO ===')
console.log('Transcript exists:', !!transcript)
console.log('Transcript status:', transcript?.transcription_status)
console.log('Should show tabs:', transcript && transcript.transcription_status === 'completed')
console.log('==================')
```

Then refresh the page and check the browser console.

## Common Issues & Solutions

### Issue 1: No Transcript Exists
**Symptom**: The page shows "No Transcript Yet" or transcription status indicator

**Solution**: 
1. Click "Start Transcription" button
2. Wait for transcription to complete (may take a few minutes)
3. Tabs will appear once status is 'completed'

### Issue 2: Transcription Still Processing
**Symptom**: Shows "Transcribing..." or progress indicator

**Solution**: 
- Wait for transcription to complete
- Check transcription_jobs table in Supabase for status
- Tabs only appear when fully completed

### Issue 3: Transcription Failed
**Symptom**: Shows "Transcription failed" error

**Solution**:
1. Click "Retry Transcription"
2. Check Supabase logs for errors
3. Verify OPENAI_API_KEY is set correctly
4. Ensure audio file is accessible

### Issue 4: Old Build Cache
**Symptom**: Code changes not reflected

**Solution**:
```bash
# Clear cache and rebuild
rm -rf .next
npm run dev
```

Then hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)

### Issue 5: Component Not Imported
**Symptom**: TypeScript or runtime error

**Solution**: Verify the import at the top of the file:
```tsx
import InsightsPanel from '@/app/components/InsightsPanel'
```

### Issue 6: Browser Extension Blocking
**Symptom**: Tab appears in code but not in browser

**Solution**:
- Try in incognito/private mode
- Disable ad blockers or other extensions
- Check browser console for blocked resources

## Quick Test

To quickly test if the tabs work:

1. **Find a call with completed transcription:**
```sql
-- Run in Supabase SQL Editor
SELECT c.id, c.filename, t.transcription_status
FROM calls c
LEFT JOIN transcripts t ON c.id = t.call_id
WHERE c.user_id = auth.uid()
AND t.transcription_status = 'completed'
LIMIT 5;
```

2. **Navigate to one of those call IDs:**
```
http://localhost:3000/calls/[copy-id-from-query-here]
```

3. **You should see two tabs:**
   - 📝 Transcript
   - 🤖 AI Insights

## Verify Installation

Check all required files exist:

```bash
# Check component exists
ls -la app/components/InsightsPanel.tsx

# Check page was updated
grep -n "AI Insights" app/calls/[id]/page.tsx

# Check for import
grep -n "InsightsPanel" app/calls/[id]/page.tsx

# Check for activeTab state
grep -n "activeTab" app/calls/[id]/page.tsx
```

All commands should return results.

## Database Check

Verify transcripts exist and are completed:

```sql
-- Check transcripts in database
SELECT 
  id,
  call_id,
  transcription_status,
  created_at
FROM transcripts
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
```

Look for status = 'completed'

## Expected Behavior

✅ **Correct**: Tabs appear ONLY when transcript is completed
- Before transcription: No tabs (shows "Start Transcription" button)
- During transcription: No tabs (shows progress indicator)
- After completion: Tabs appear

❌ **Incorrect**: Tabs always visible or never visible

## If Still Not Working

1. **Check your current call has a completed transcript:**
   - Status must be exactly 'completed'
   - Not 'processing', 'pending', or 'failed'

2. **Try a different call:**
   - Go to Library
   - Find a different completed call
   - Click to view it

3. **Create a new transcription:**
   - Upload a new audio file
   - Transcribe it
   - Once completed, tabs should appear

4. **Verify the build:**
```bash
# Stop dev server
# Clear everything
rm -rf .next node_modules/.cache
# Restart
npm run dev
```

## Still Having Issues?

If none of the above works, please provide:
1. Screenshot of the call detail page
2. Browser console output
3. Value of `transcript?.transcription_status` (from console)
4. SQL query result showing your transcript status

This will help diagnose the exact issue!


# Transcription Troubleshooting Guide

Quick fixes for common transcription errors.

---

## ❌ Error: "Failed to create signed URL for audio file"

### What This Means
The system can't generate a temporary URL to access your audio file in Supabase Storage.

### Quick Fixes

#### 1. Check Storage Bucket Exists
In Supabase Dashboard → Storage:
- Bucket `call-recordings` should exist
- It should be **private** (not public)

#### 2. Verify Storage Policies
Run this in Supabase SQL Editor:

```sql
-- Check if storage policies exist
SELECT * 
FROM storage.policies 
WHERE bucket_id = 'call-recordings';
```

**If no policies exist**, create them:

```sql
-- Policy: Users can read their own files
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT
USING (
    bucket_id = 'call-recordings' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Service role can read all files (for transcription)
CREATE POLICY "Service role can access all files" ON storage.objects
FOR SELECT
TO service_role
USING (bucket_id = 'call-recordings');
```

#### 3. Check Service Role Key
In `.env.local`:
```bash
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
```

Get from: Supabase Dashboard → Project Settings → API → `service_role` key (secret)

**Important:** Restart dev server after adding:
```bash
# Stop server (Ctrl+C)
npm run dev
```

#### 4. Verify Audio File Exists
Run this in Supabase SQL Editor:

```sql
-- Check if your audio files are in storage
SELECT 
  c.id,
  c.filename,
  c.audio_path,
  c.user_id
FROM calls c
WHERE c.user_id = auth.uid()
LIMIT 5;
```

Then check Storage:
1. Go to Supabase Dashboard → Storage → call-recordings
2. Navigate to your user_id folder
3. Verify audio files are there

---

## ❌ Error: "OpenAI API key not configured"

### Quick Fix
Add to `.env.local`:
```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

Get from: https://platform.openai.com/api-keys

Restart server:
```bash
npm run dev
```

---

## ❌ Error: "Invalid token" or "JWT expired"

### Quick Fix
1. Log out of the app
2. Clear browser cookies
3. Log back in
4. Try transcription again

---

## ❌ Error: "Rate limit exceeded"

### What This Means
Too many transcription requests to OpenAI API.

### Quick Fix
Wait a few minutes and try again. OpenAI has rate limits:
- Free tier: 3 requests/minute
- Pay-as-you-go: Higher limits

---

## 🔍 Debug Mode

### Enable Detailed Logging

In your browser console (F12), you should see:
```
Created signed URL for: <user-id>/<filename>
```

If you see an error instead, note the exact error message.

### Check Server Logs

In your terminal where `npm run dev` is running, look for:
```
Failed to create signed URL: <error details>
```

---

## ✅ Verification Checklist

Before transcribing, verify:

- [ ] Storage bucket `call-recordings` exists
- [ ] Storage policies allow service role to read files
- [ ] Audio files are uploaded to storage
- [ ] `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `.env.local` has `OPENAI_API_KEY`
- [ ] Dev server restarted after env changes
- [ ] User is logged in with valid session

---

## 🔧 Manual Test

Test if signed URLs work:

```sql
-- In Supabase SQL Editor, run as authenticated user:
SELECT 
  c.filename,
  c.audio_path
FROM calls c
WHERE c.user_id = auth.uid()
LIMIT 1;
```

Copy a filename, then in your browser console:
```javascript
const supabase = window.supabase; // or get your client
const { data, error } = await supabase.storage
  .from('call-recordings')
  .createSignedUrl('<user-id>/<filename>', 60);

console.log('Signed URL:', data);
console.log('Error:', error);
```

If this works, the issue is with the API route configuration.

---

## 🆘 Still Not Working?

### Collect This Info:

1. **Browser console error** (from /calls/[id] page)
2. **Server terminal output** (from `npm run dev`)
3. **Storage bucket screenshot** (Supabase Dashboard)
4. **SQL query results:**
   ```sql
   -- Do files exist?
   SELECT COUNT(*) FROM calls WHERE user_id = auth.uid();
   
   -- Storage policies?
   SELECT * FROM storage.policies WHERE bucket_id = 'call-recordings';
   ```

### Common Solutions:

**"No such object"**
→ File not in storage. Re-upload audio files.

**"Permission denied"**
→ Storage policies missing. Run policy creation SQL above.

**"Invalid bucket"**
→ Bucket doesn't exist. Create `call-recordings` bucket.

**"Service role not found"**
→ `SUPABASE_SERVICE_ROLE_KEY` not set or incorrect.

---

## 📝 Quick Reference

### Environment Variables Required
```bash
# Required for transcription
OPENAI_API_KEY=sk-...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Storage Bucket Setup
- Name: `call-recordings`
- Public: No (private)
- File size limit: 100MB
- Allowed MIME types: audio/mpeg, audio/mp3, audio/wav, audio/m4a, audio/aac

### Required Policies
1. Users can view own files (SELECT)
2. Users can upload own files (INSERT)
3. Service role can access all files (SELECT) ← **Important for transcription!**

---

**After fixing, try transcription again!** 🚀


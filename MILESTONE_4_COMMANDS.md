# Milestone 4: Quick Setup Commands

Fast-track guide to get transcription working in 5 minutes.

---

## 📋 Prerequisites

- ✅ Node.js and npm installed
- ✅ Supabase project created
- ✅ OpenAI account with billing enabled

---

## 🚀 Setup Commands

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create or update `.env.local`:

```bash
# Add this line to your .env.local
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

Get your key from: https://platform.openai.com/api-keys

### 3. Run Database Migration

Copy the entire contents of `migrations/005_transcription_schema.sql`:

```bash
# macOS/Linux
cat migrations/005_transcription_schema.sql | pbcopy

# Or open the file and copy manually
code migrations/005_transcription_schema.sql
```

Then:
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Paste the migration
4. Click "Run"

Wait for: `✅ Migration 005_transcription_schema.sql completed successfully`

### 4. Start Development Server

```bash
npm run dev
```

Server starts at: http://localhost:3000

---

## ✅ Test Transcription

### Quick Test (2 minutes)

1. **Upload a test call** (if you haven't already):
   ```
   Navigate to: http://localhost:3000/upload
   Upload: 1 CSV + 1 matching audio file
   ```

2. **Open call library**:
   ```
   Navigate to: http://localhost:3000/library
   Click any call
   ```

3. **Start transcription**:
   ```
   Click: "Start Transcription" button
   Wait: 2-3x the audio duration
   ```

4. **Verify transcript**:
   ```
   ✓ Transcript appears
   ✓ Audio player works
   ✓ Search works
   ✓ Edit mode works
   ```

---

## 🧪 Verify Database Migration

Check tables were created:

```sql
-- Run in Supabase SQL Editor

-- Check transcripts table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transcripts' 
ORDER BY ordinal_position;

-- Check transcription_jobs table exists
SELECT COUNT(*) 
FROM information_schema.tables 
WHERE table_name = 'transcription_jobs';

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('transcripts', 'transcription_jobs');
```

Expected:
- `transcripts` table has ~20 columns including `transcription_status`, `raw_transcript`, `timestamps`
- `transcription_jobs` table exists
- 4+ RLS policies exist on each table

---

## 🐛 Troubleshooting Commands

### Issue: Dependencies not installing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: OpenAI API key not working

```bash
# Test API key (in terminal)
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Should return list of models, not 401 error
```

### Issue: Dev server not starting

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>

# Restart
npm run dev
```

### Issue: Migration failed

```bash
# Check error message in Supabase
# Common issues:
# 1. Missing uuid extension
# 2. Missing previous migrations
# 3. Syntax error (check file encoding)

# Try running migrations in order:
# 001_init.sql
# 002_enable_rls.sql
# 003_simplified_call_storage.sql
# 005_transcription_schema.sql
```

### Issue: TypeScript errors

```bash
# Check types
npm run type-check

# Common fixes:
# 1. Restart TypeScript server in VSCode
# 2. Delete .next folder
rm -rf .next
npm run dev
```

---

## 🔍 Debug Commands

### Check environment variables

```bash
# Verify variables are set (doesn't show values)
echo "OpenAI Key set: $([ -n "$OPENAI_API_KEY" ] && echo 'Yes' || echo 'No')"
echo "Supabase URL set: $([ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && echo 'Yes' || echo 'No')"
```

### View logs

```bash
# Dev server logs (check terminal where npm run dev is running)

# Browser console (open DevTools)
# Check for errors in Console tab
# Check Network tab for failed API calls
```

### Database queries

```sql
-- Check if calls exist
SELECT COUNT(*) FROM calls WHERE user_id = auth.uid();

-- Check transcripts
SELECT 
  call_id, 
  transcription_status, 
  created_at 
FROM transcripts 
WHERE call_id IN (SELECT id FROM calls WHERE user_id = auth.uid());

-- Check jobs
SELECT 
  call_id, 
  status, 
  error_message 
FROM transcription_jobs 
WHERE user_id = auth.uid();
```

---

## 📊 Cost Monitoring Commands

### Calculate estimated costs

```sql
-- Total transcription costs
SELECT 
  COUNT(*) as total_jobs,
  SUM(audio_duration_seconds) / 60.0 as total_minutes,
  ROUND((SUM(audio_duration_seconds) / 60.0) * 0.006, 2) as cost_usd
FROM transcription_jobs
WHERE status = 'completed';
```

### Check API usage

OpenAI Dashboard: https://platform.openai.com/usage

---

## 🔧 Maintenance Commands

### Clean build files

```bash
# Remove Next.js cache
rm -rf .next

# Remove TypeScript cache
rm -rf .tsbuildinfo

# Rebuild
npm run dev
```

### Update dependencies

```bash
# Check for updates
npm outdated

# Update OpenAI SDK (if needed)
npm install openai@latest

# Update all dependencies
npm update
```

### Backup database

```bash
# In Supabase Dashboard:
# Settings → Database → Backups
# Or export via SQL:
```

```sql
-- Export transcripts
COPY (
  SELECT * FROM transcripts 
  WHERE call_id IN (SELECT id FROM calls WHERE user_id = auth.uid())
) TO '/tmp/transcripts_backup.csv' CSV HEADER;
```

---

## 🎯 Production Deployment Commands

### Build for production

```bash
# Test production build locally
npm run build
npm start
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add OPENAI_API_KEY production
```

---

## 📚 Useful URLs

- **Local Dev:** http://localhost:3000
- **Library:** http://localhost:3000/library
- **Upload:** http://localhost:3000/upload
- **Supabase Dashboard:** https://app.supabase.com
- **OpenAI Dashboard:** https://platform.openai.com
- **OpenAI API Keys:** https://platform.openai.com/api-keys
- **OpenAI Usage:** https://platform.openai.com/usage

---

## ⌨️ Keyboard Shortcuts

In audio player:
- `Space` - Play/Pause
- `←` - Skip backward 5s
- `→` - Skip forward 5s
- `M` - Mute/Unmute

---

## 🆘 Emergency Reset

If everything is broken:

```bash
# 1. Stop dev server (Ctrl+C)

# 2. Clean everything
rm -rf .next node_modules package-lock.json

# 3. Reinstall
npm install

# 4. Verify environment
cat .env.local | grep OPENAI_API_KEY

# 5. Restart
npm run dev
```

---

## ✅ Success Checklist

After running all commands:

- [ ] Dependencies installed (`node_modules/` exists)
- [ ] Environment variables set (`.env.local` has `OPENAI_API_KEY`)
- [ ] Database migration ran (check Supabase SQL Editor)
- [ ] Dev server running (`npm run dev` successful)
- [ ] Can access http://localhost:3000
- [ ] Can view library page
- [ ] Can start transcription
- [ ] Transcript appears after processing

**If all checked ✅ - You're ready to go!**

---

## 🎉 Quick Win

Test with a short audio file (30 seconds):
1. Upload → Library → Click call → Start Transcription
2. Wait ~90 seconds
3. Transcript appears!

Total time to first transcript: **~3 minutes** ⚡

---

**Need more help?** Check `TRANSCRIPTION_SETUP.md` for detailed guide.


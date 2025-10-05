# Transcription System Setup Guide

**Milestone 4: Transcription Pipeline**  
OpenAI Whisper Integration for Automated Audio Transcription

---

## 📋 Overview

This guide covers the setup and usage of the transcription system, which uses OpenAI's Whisper API to automatically transcribe call recordings into searchable text with timestamps and confidence scores.

### Key Features

- ✅ Automatic transcription using OpenAI Whisper API
- ✅ Real-time status tracking and progress updates
- ✅ Synchronized audio player with transcript highlighting
- ✅ Inline transcript editing with auto-save
- ✅ Search and filter across all transcripts
- ✅ Export options (TXT, SRT, VTT, JSON)
- ✅ Confidence scores and quality metrics
- ✅ Background processing for large files
- ✅ Error handling and retry logic

---

## 🚀 Quick Start

### 1. Prerequisites

Before setting up transcription, ensure you have completed:
- ✅ Milestones 1-3 (Authentication, User Management, Audio Upload)
- ✅ Supabase project configured
- ✅ Audio files uploaded and accessible

### 2. OpenAI API Key

Get your OpenAI API key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

**Important:** You need billing enabled on your OpenAI account. Whisper costs $0.006 per minute of audio.

### 3. Environment Variables

Add to your `.env.local`:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Security Note:** This key should ONLY be used server-side. Never expose it to the client.

### 4. Database Migration

Run the transcription schema migration in your Supabase SQL Editor:

```bash
# Copy the contents of migrations/005_transcription_schema.sql
# Paste into Supabase Dashboard > SQL Editor > New Query
# Run the migration
```

This migration creates:
- Enhanced `transcripts` table with transcription fields
- `transcription_jobs` table for background processing
- RLS policies for data security
- Utility functions and triggers 
- Indexes for performance

### 5. Install Dependencies

```bash
npm install openai@^4.20.1
```

### 6. Restart Development Server

```bash
npm run dev
```

---

## 🎯 Usage Guide

### Transcribing Your First Call

1. **Navigate to Library**
   - Go to `/library` to see all your uploaded calls
   - Calls show transcription status badges

2. **Open Call Detail Page**
   - Click on any call to open the detail page
   - You'll see the audio player and transcription options

3. **Start Transcription**
   - Click "Start Transcription" button
   - Processing typically takes 2-3x the audio duration
   - Real-time progress updates shown

4. **View Transcript**
   - Once complete, transcript appears automatically
   - Click timestamps to jump to that point in audio
   - Search within transcript using search bar

5. **Edit Transcript**
   - Click "Edit Mode" to enable inline editing
   - Changes auto-save after 2 seconds
   - Original AI transcript preserved separately

---

## 📁 File Structure

```
app/
├── api/
│   ├── transcribe/
│   │   ├── route.ts                   # Start transcription
│   │   └── status/route.ts            # Check status
│   └── transcripts/
│       └── [id]/route.ts              # CRUD operations
├── calls/
│   └── [id]/page.tsx                  # Call detail page
├── components/
│   ├── AudioPlayer.tsx                # HTML5 audio player
│   ├── TranscriptViewer.tsx           # Display transcript
│   ├── TranscriptEditor.tsx           # Edit transcript
│   └── TranscriptionStatus.tsx        # Status indicator
├── library/page.tsx                   # Enhanced library

lib/
├── openai.ts                          # OpenAI API client
├── transcription-utils.ts             # Transcript utilities
├── audio-utils.ts                     # Audio utilities
└── supabase-server.ts                 # Server-side Supabase client

types/
├── transcription.ts                   # Transcription types
├── audio.ts                           # Audio player types
└── transcript.ts                      # Transcript types

migrations/
└── 005_transcription_schema.sql       # Database schema
```

---

## 🔧 API Reference

### POST /api/transcribe

Start transcription for a call.

**Request:**
```typescript
{
  callId: string
  language?: string // ISO-639-1 code (default: 'en')
  prompt?: string   // Optional prompt to guide transcription
}
```

**Response:**
```typescript
{
  jobId: string
  callId: string
  status: 'processing'
  message: string
  estimatedDurationSeconds?: number
}
```

**Example:**
```typescript
const response = await fetch('/api/transcribe', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    callId: 'uuid-here',
    language: 'en'
  })
})
```

### GET /api/transcribe/status

Check transcription status.

**Query Parameters:**
- `callId`: UUID of the call
- OR `jobId`: UUID of the transcription job

**Response:**
```typescript
{
  jobId: string
  callId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number // 0-100
  transcript?: string
  confidenceScore?: number
  errorMessage?: string
  processingStartedAt?: string
  processingCompletedAt?: string
}
```

### PATCH /api/transcripts/[id]

Update a transcript (save edited version).

**Request:**
```typescript
{
  edited_transcript?: string
  speaker_segments?: SpeakerSegment[]
  metadata?: Record<string, any>
}
```

**Response:**
```typescript
{
  success: boolean
  data: Transcript
  message: string
}
```

---

## 🔒 Security

### API Key Protection

✅ **OpenAI API key is NEVER exposed to the client**
- Stored in server-side environment variables only
- Used exclusively in API routes (server-side)
- Never included in client bundles

### Row Level Security (RLS)

✅ **All transcripts are user-isolated**
- Users can only view their own transcripts
- RLS policies enforce data access control
- Verified on every database query

### Input Validation

✅ **All inputs are validated**
- File size limits (25MB for Whisper)
- Audio format validation
- User authentication required
- Call ownership verified

### Rate Limiting

Consider implementing rate limiting for the transcription API to prevent abuse:
```typescript
// Example: Limit to 10 transcriptions per hour per user
```

---

## 💰 Cost Management

### OpenAI Whisper Pricing

- **$0.006 per minute** of audio
- Examples:
  - 5-minute call = $0.03
  - 30-minute call = $0.18
  - 100 calls @ 10 min each = $6.00

### Cost Optimization

1. **Cache transcripts** - Never re-transcribe the same audio
2. **Quality check** - Validate audio before transcription
3. **Monitor usage** - Track API costs per user
4. **Set limits** - Implement per-user monthly quotas

### Monitoring

Track costs in the `transcription_jobs` table:
```sql
SELECT 
  user_id,
  COUNT(*) as total_transcriptions,
  SUM(audio_duration_seconds) / 60 as total_minutes,
  SUM(processing_cost_usd) as total_cost
FROM transcription_jobs
WHERE status = 'completed'
GROUP BY user_id
ORDER BY total_cost DESC;
```

---

## 📊 Database Schema

### transcripts Table (Enhanced)

```sql
ALTER TABLE transcripts ADD COLUMN transcription_status TEXT DEFAULT 'pending';
ALTER TABLE transcripts ADD COLUMN confidence_score NUMERIC(5,4);
ALTER TABLE transcripts ADD COLUMN processing_started_at TIMESTAMPTZ;
ALTER TABLE transcripts ADD COLUMN processing_completed_at TIMESTAMPTZ;
ALTER TABLE transcripts ADD COLUMN processing_duration_seconds INTEGER;
ALTER TABLE transcripts ADD COLUMN error_message TEXT;
ALTER TABLE transcripts ADD COLUMN raw_transcript TEXT;
ALTER TABLE transcripts ADD COLUMN edited_transcript TEXT;
ALTER TABLE transcripts ADD COLUMN language TEXT DEFAULT 'en';
ALTER TABLE transcripts ADD COLUMN speaker_segments JSONB DEFAULT '[]';
ALTER TABLE transcripts ADD COLUMN timestamps JSONB DEFAULT '[]';
ALTER TABLE transcripts ADD COLUMN last_edited_at TIMESTAMPTZ;
ALTER TABLE transcripts ADD COLUMN edit_count INTEGER DEFAULT 0;
```

### transcription_jobs Table (New)

```sql
CREATE TABLE transcription_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata JSONB DEFAULT '{}',
  audio_duration_seconds INTEGER,
  processing_cost_usd NUMERIC(10,4)
);
```

---

## 🧪 Testing

### Manual Testing Checklist

1. **Upload Test Audio**
   - [ ] Upload a short test audio file (1-2 minutes)
   - [ ] Verify file appears in library

2. **Start Transcription**
   - [ ] Click on call to open detail page
   - [ ] Click "Start Transcription"
   - [ ] Verify status shows "Processing"

3. **Monitor Progress**
   - [ ] Check status updates every few seconds
   - [ ] Verify progress bar updates (if shown)
   - [ ] Wait for completion (2-3x audio duration)

4. **View Transcript**
   - [ ] Verify transcript appears when complete
   - [ ] Check confidence score is displayed
   - [ ] Test search functionality
   - [ ] Click timestamps to test audio sync

5. **Edit Transcript**
   - [ ] Switch to Edit Mode
   - [ ] Make changes to text
   - [ ] Verify auto-save works
   - [ ] Check edit count increments

6. **Library Integration**
   - [ ] Return to library
   - [ ] Verify transcription status badge shows "Transcribed"
   - [ ] Test filtering by transcription status
   - [ ] Search for transcript content

### Test Audio Files

Use these free test resources:
- **Short clips:** [freesound.org](https://freesound.org)
- **Sample calls:** Record a test call or use text-to-speech
- **Multiple languages:** Test with different languages

---

## 🐛 Troubleshooting

### Common Issues

**1. "OpenAI API key not configured"**
- Check `.env.local` has `OPENAI_API_KEY`
- Restart development server after adding env vars
- Verify key starts with `sk-`

**2. "File size too large"**
- Whisper has 25MB limit
- Compress audio or trim length
- Use MP3 format for better compression

**3. "Transcription failed"**
- Check OpenAI API status
- Verify sufficient API credits
- Check audio file is not corrupted
- Review error message in status

**4. "Transcript not appearing"**
- Check browser console for errors
- Verify RLS policies are correct
- Check user_id matches between calls and transcripts
- Review database logs

**5. "Audio player not loading"**
- Verify signed URL is generated correctly
- Check storage bucket permissions
- Test audio file directly in browser
- Review CORS settings

### Debug Mode

Enable debug logging:
```typescript
// In lib/openai.ts
console.log('Transcription request:', { callId, filename })
console.log('Whisper response:', whisperResponse)
```

### Database Queries

Check transcription status:
```sql
SELECT 
  c.id,
  c.filename,
  t.transcription_status,
  t.confidence_score,
  tj.status as job_status,
  tj.error_message
FROM calls c
LEFT JOIN transcripts t ON c.id = t.call_id
LEFT JOIN transcription_jobs tj ON c.id = tj.call_id
WHERE c.user_id = 'your-user-id'
ORDER BY c.created_at DESC;
```

---

## 🚀 Production Deployment

### Environment Variables (Vercel)

Add these to your Vercel project settings:

```bash
OPENAI_API_KEY=sk-your-production-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Background Processing

For production, consider:
1. **Queue System** - Use BullMQ, Inngest, or similar for job processing
2. **Webhooks** - Set up webhooks for completion notifications
3. **Monitoring** - Use Sentry or similar for error tracking
4. **Scaling** - Consider multiple workers for concurrent processing

### Performance Optimization

1. **Caching** - Cache signed URLs and transcripts
2. **CDN** - Use CDN for audio file delivery
3. **Database** - Add indexes on frequently queried fields
4. **API** - Implement request batching where possible

---

## 📈 Next Steps (Milestone 5)

After completing transcription setup, you'll be ready for:
- **GPT-4 Integration** - Automatic summarization
- **Sentiment Analysis** - Detect call sentiment
- **Key Topic Extraction** - Identify important topics
- **Action Items** - Detect action items and follow-ups
- **Analytics Dashboard** - Visualize insights

---

## 📚 Additional Resources

- [OpenAI Whisper API Docs](https://platform.openai.com/docs/guides/speech-to-text)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Project README](./README.md)
- [Authentication Setup](./AUTHENTICATION_SETUP.md)

---

## 🆘 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review error messages in browser console
3. Check Supabase logs
4. Verify OpenAI API status
5. Review database query logs

---

**✅ You're now ready to transcribe call recordings!**

Start by uploading a test audio file and clicking "Start Transcription" in the call detail page.


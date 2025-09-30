# DentalCallInsights - Development Flow & Architecture

## Current Status: ✅ Milestone 1 Complete

**What's Done:**

- Next.js 14 + TypeScript scaffold with App Router
- TailwindCSS styling configured
- Supabase client setup
- Database schema with pgvector support
- Basic navigation and placeholder pages
- ESLint + Prettier configured
- Comprehensive README with setup instructions

## Architecture Overview

```
┌─────────────────┐
│   Next.js App   │
│  (Vercel Edge)  │
└────────┬────────┘
         │
         ├──→ Supabase Auth (User Management)
         │
         ├──→ Supabase Storage (MP3 files)
         │
         ├──→ Supabase Postgres + pgvector
         │     - calls table
         │     - transcripts table
         │     - embeddings table (vector search)
         │
         └──→ OpenAI API
               - Whisper (transcription)
               - GPT-4 (summarization)
               - Embeddings (semantic search)
```

## Data Flow

```
1. Upload Audio
   ┌─────────────────────────────────┐
   │ User uploads MP3 + metadata     │
   └─────────────┬───────────────────┘
                 ↓
   ┌─────────────────────────────────┐
   │ Store in Supabase Storage       │
   │ Create record in `calls` table  │
   └─────────────┬───────────────────┘
                 ↓
2. Process Audio
   ┌─────────────────────────────────┐
   │ Send to OpenAI Whisper API      │
   │ Get transcript back             │
   └─────────────┬───────────────────┘
                 ↓
   ┌─────────────────────────────────┐
   │ Store in `transcripts` table    │
   └─────────────┬───────────────────┘
                 ↓
3. Generate Insights
   ┌─────────────────────────────────┐
   │ Send transcript to GPT-4        │
   │ Get summary + sentiment         │
   └─────────────┬───────────────────┘
                 ↓
   ┌─────────────────────────────────┐
   │ Update `transcripts` table      │
   └─────────────┬───────────────────┘
                 ↓
4. Create Embeddings
   ┌─────────────────────────────────┐
   │ Chunk transcript into segments  │
   │ Generate embeddings per chunk   │
   └─────────────┬───────────────────┘
                 ↓
   ┌─────────────────────────────────┐
   │ Store in `embeddings` table     │
   │ (vector similarity search ready)│
   └─────────────────────────────────┘

5. Search & Analysis
   ┌─────────────────────────────────┐
   │ User searches: "appointment"    │
   └─────────────┬───────────────────┘
                 ↓
   ┌─────────────────────────────────┐
   │ Convert query to embedding      │
   │ Vector similarity search        │
   │ Return relevant call chunks     │
   └─────────────────────────────────┘
```

## Next Milestones (Priority Order)

### 🔐 Milestone 2: Authentication (Week 1)

**Why first:** Need to secure all other features

- [ ] Supabase Auth integration
  - Email/password signup and login
  - Password reset flow
  - OAuth providers (Google, optional)
- [ ] Protected routes with middleware
- [ ] User session management
- [ ] Profile page

**Files to create:**

- `app/api/auth/[...nextauth]/route.ts` (if using NextAuth)
- `middleware.ts` (route protection)
- `app/signup/page.tsx`
- `lib/auth.ts` (auth helpers)

**Database changes:**

- Enable RLS policies on all tables
- Link calls to auth.users via user_id

---

### 📤 Milestone 3: Upload & Storage (Week 2)

**Why next:** Foundation for all processing

- [ ] File upload component with drag-and-drop
- [ ] Supabase Storage bucket setup
- [ ] Upload progress indicator
- [ ] Metadata form (patient ID, call type, date, tags)
- [ ] Client-side validation (file type, size)

**Files to create:**

- `components/AudioUploader.tsx`
- `app/api/upload/route.ts` (server-side handler)
- `lib/storage.ts` (Supabase Storage helpers)

**Supabase setup:**

- Create storage bucket: `call-recordings`
- Set appropriate RLS policies

---

### 🎙️ Milestone 4: Transcription Pipeline (Week 3)

**Why next:** Core value proposition

- [ ] OpenAI Whisper API integration
- [ ] Background job processing (consider Vercel Cron or Supabase Edge Functions)
- [ ] Transcript display page
- [ ] Audio player with synchronized transcript
- [ ] Edit transcript capability

**Files to create:**

- `app/api/transcribe/route.ts`
- `app/calls/[id]/page.tsx` (call detail view)
- `components/TranscriptViewer.tsx`
- `components/AudioPlayer.tsx`
- `lib/openai.ts` (OpenAI API helpers)

**Optional enhancements:**

- Speaker diarization
- Timestamp alignment
- Confidence scores

---

### 🤖 Milestone 5: AI Insights (Week 4)

**Why next:** Adds intelligence layer

- [ ] GPT-4 summarization
- [ ] Sentiment analysis
- [ ] Key topic extraction
- [ ] Action item detection
- [ ] Batch processing for existing transcripts

**Files to create:**

- `app/api/analyze/route.ts`
- `lib/ai-analysis.ts`
- `components/InsightCards.tsx`

**Prompt engineering:**

- Design effective prompts for dental call context
- Test and iterate on summary quality

---

### 🔍 Milestone 6: Embeddings & Search (Week 5)

**Why next:** Enables discovery across all calls

- [ ] Chunk transcripts into segments
- [ ] Generate embeddings via OpenAI
- [ ] Vector similarity search function
- [ ] Search UI with filters
- [ ] Highlight matching segments

**Files to create:**

- `app/api/embed/route.ts`
- `app/api/search/route.ts`
- `components/SearchBar.tsx`
- `lib/embeddings.ts`

**Performance considerations:**

- Batch embedding generation
- Cache frequent searches
- Tune ivfflat index parameters

---

### 📚 Milestone 7: Library & Analytics (Week 6)

**Why next:** User needs to manage growing data

- [ ] Paginated call list
- [ ] Advanced filters (date, sentiment, duration, tags)
- [ ] Sorting options
- [ ] Bulk actions
- [ ] Basic analytics dashboard
  - Total calls
  - Average sentiment
  - Common topics
  - Trends over time

**Files to create:**

- `app/library/page.tsx` (replace placeholder)
- `components/CallCard.tsx`
- `components/Filters.tsx`
- `components/Analytics.tsx`
- `lib/analytics.ts`

---

### ✅ Milestone 8: QA & Compliance (Week 7-8)

**Why last:** Builds on all previous features

- [ ] QA checklist templates
- [ ] Scoring rubric
- [ ] Manual QA flow
- [ ] Compliance alerts
- [ ] Audit logs
- [ ] Export reports (PDF, CSV)

**Files to create:**

- `app/qa/page.tsx` (replace placeholder)
- `app/qa/[callId]/page.tsx`
- `components/QAChecklist.tsx`
- `components/ComplianceScorecard.tsx`

**Database changes:**

- New table: `qa_checklists`
- New table: `qa_scores`
- New table: `audit_logs`

---

## Technical Decisions & Rationale

### Why Next.js App Router?

- Server Components reduce client-side JS
- Built-in API routes
- Excellent Vercel integration
- File-based routing

### Why Supabase?

- Postgres + pgvector in one platform
- Built-in auth and storage
- Real-time subscriptions (future use)
- Generous free tier

### Why pgvector?

- Native Postgres extension
- No separate vector DB needed
- Proven at scale
- Cost-effective

### Why OpenAI?

- Industry-leading transcription (Whisper)
- Powerful summarization (GPT-4)
- High-quality embeddings
- Single API for all AI needs

### Why Vercel?

- Zero-config Next.js deployment
- Edge Functions for performance
- Automatic HTTPS and CDN
- Preview deployments for PRs

---

## Performance Considerations

### Current Bottlenecks (to address later)

1. **Transcription latency** (30s-2min per call)
   - Solution: Background jobs with progress updates
2. **Embedding generation** (1-2s per chunk)
   - Solution: Batch processing, async generation
3. **Vector search** (10-100ms for 10k calls)
   - Solution: Tune ivfflat index, add caching

### Optimization Strategies

- Use Server Components for data fetching
- Implement proper loading states
- Add caching layer (Redis or Vercel KV)
- Lazy load heavy components
- Optimize images and assets

---

## Security Checklist

- [x] `.env.local` in `.gitignore`
- [ ] Enable Supabase RLS policies
- [ ] Validate all user inputs
- [ ] Rate limit API routes
- [ ] Sanitize file uploads
- [ ] Encrypt sensitive metadata
- [ ] Implement CORS properly
- [ ] Add API key rotation strategy
- [ ] Set up monitoring and alerts

---

## Testing Strategy (Future)

1. **Unit Tests**
   - Utility functions
   - API route handlers
   - Component logic

2. **Integration Tests**
   - Database operations
   - API flows
   - Auth flows

3. **E2E Tests**
   - Critical user journeys
   - Upload → Transcribe → Search flow

**Tools to add:**

- Jest + React Testing Library
- Playwright (E2E)
- Supabase local development

---

## Monitoring & Observability (Future)

- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (Vercel Analytics)
- [ ] API usage tracking
- [ ] User analytics (PostHog or similar)
- [ ] Database query performance

---

## Cost Estimates (at scale)

**OpenAI:**

- Whisper: ~$0.006/minute
- GPT-4 Summaries: ~$0.03/call
- Embeddings: ~$0.0001/1k tokens

**Supabase:**

- Free tier: 500MB DB, 1GB storage
- Pro: $25/mo (8GB DB, 100GB storage)

**Vercel:**

- Free tier: 100GB bandwidth
- Pro: $20/mo (1TB bandwidth)

**Example:** 1000 calls/month (~15 min each)

- Transcription: $90
- Summaries: $30
- Embeddings: $5
- Infrastructure: $45
- **Total: ~$170/month**

---

## Open Questions & Decisions Needed

1. **Speaker diarization?**
   - Adds complexity but valuable for multi-party calls
   - Decision: Skip for MVP, add in v2

2. **Real-time transcription?**
   - WebSocket integration
   - Decision: Post-upload only for MVP

3. **Custom embedding model?**
   - Fine-tune for dental domain
   - Decision: Use OpenAI embeddings for now

4. **Multi-language support?**
   - Whisper supports 50+ languages
   - Decision: Add if user requests

---

## Git Workflow

```bash
# Feature branches
git checkout -b milestone/02-auth
# ... make changes ...
git commit -m "feat: implement Supabase Auth with email/password"
git push origin milestone/02-auth
# Create PR, review, merge to main
```

**Branch naming:**

- `milestone/XX-feature-name`
- `feat/feature-name`
- `fix/bug-description`
- `docs/update-description`

---

## Getting Help

- Next.js: [nextjs.org/docs](https://nextjs.org/docs)
- Supabase: [supabase.com/docs](https://supabase.com/docs)
- pgvector: [github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)
- OpenAI: [platform.openai.com/docs](https://platform.openai.com/docs)

---

**Last updated:** Milestone 1 completion
**Next review:** After Milestone 2 (Auth)

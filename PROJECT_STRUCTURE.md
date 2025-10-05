# DentalCallInsights - Project Structure

**Current Status:** ✅ Milestone 3 Complete, 🚧 Milestone 4 In Progress  
**Branch:** `milestone/04-transcription-pipeline`  
**Last Updated:** December 2024

```
dentalcallinsights/
│
├── 📱 APPLICATION (Next.js App Router)
│   └── app/
│       ├── auth/                   # ✅ Authentication routes
│       │   └── callback/
│       │       └── route.ts        # OAuth/email confirmation callback
│       ├── components/             # ✅ Reusable React components
│       │   ├── auth-error-boundary.tsx
│       │   ├── logout-button.tsx
│       │   ├── navigation.tsx
│       │   └── protected-route.tsx
│       ├── providers/              # ✅ Context providers
│       │   └── auth-provider.tsx   # Global auth state management
│       ├── login/                  # ✅ Complete authentication
│       │   └── page.tsx           # Login page with validation
│       ├── signup/                 # ✅ Complete authentication
│       │   └── page.tsx           # Sign up page with password strength
│       ├── profile/                # ✅ Complete user management
│       │   └── page.tsx           # User profile & password change
│       ├── reset-password/         # ✅ Complete password reset
│       │   └── page.tsx           # Password reset flow
│       ├── upload/                 # ✅ Complete (Milestone 3)
│       │   └── page.tsx           # Audio upload interface with progress
│       ├── library/                # 📅 Planned (Milestone 7)
│       │   └── page.tsx           # Call library with search
│       ├── qa/                     # 📅 Planned (Milestone 8)
│       │   └── page.tsx           # QA dashboard
│       ├── globals.css             # TailwindCSS styles + custom CSS
│       ├── layout.tsx              # Root layout with AuthProvider
│       └── page.tsx                # Landing page with hero + features
│
├── 📚 LIBRARIES
│   ├── lib/
│   │   ├── auth.ts                 # ✅ Authentication utilities
│   │   ├── supabase.ts             # Supabase client + TypeScript types
│   │   ├── csv-parser-simplified.ts # ✅ Simplified CSV parsing
│   │   ├── storage.ts              # ✅ Supabase Storage utilities
│   │   └── upload.ts               # ✅ Upload utilities
│   └── types/
│       ├── auth.ts                 # ✅ TypeScript auth types
│       ├── upload.ts               # ✅ Upload and CSV types
│       └── storage.ts              # ✅ Storage types
│
├── 🗄️ DATABASE
│   └── migrations/
│       ├── 001_init.sql            # Schema: calls, transcripts, embeddings
│       │                           # - pgvector extension
│       │                           # - Optimized indexes (GIN, FTS, ivfflat)
│       │                           # - search_embeddings() function
│       ├── 002_enable_rls.sql      # ✅ Row Level Security policies
│       │                           # - User data isolation
│       │                           # - Secure multi-tenant access
│       ├── 003_simplified_call_storage.sql # ✅ Unified calls table with CSV data
│       ├── 003_storage_setup.sql   # ✅ Supabase Storage setup
│       └── 004_prevent_duplicates.sql # ✅ Duplicate prevention
│
├── 🔐 SECURITY
│   └── middleware.ts               # ✅ Route protection middleware
│                                   # - Protected routes: /upload, /library, /qa, /profile
│                                   # - Session refresh on every request
│                                   # - Redirect logic for auth routes
│
├── ⚙️ CONFIGURATION
│   ├── package.json                # Dependencies + NPM scripts
│   │                               # - @supabase/ssr for auth helpers
│   │                               # - Next.js 14.2.33
│   │                               # - TypeScript strict mode
│   ├── tsconfig.json               # TypeScript strict mode config
│   ├── next.config.js              # Next.js config
│   ├── tailwind.config.ts          # TailwindCSS with custom colors
│   ├── postcss.config.js           # PostCSS for Tailwind
│   ├── .eslintrc.json              # ESLint + TypeScript rules
│   ├── .prettierrc                 # Prettier code formatting
│   └── .gitignore                  # Git ignore (.env.local, node_modules)
│
├── 🔑 ENVIRONMENT
│   └── env.example.txt             # Environment variables template
│                                   # - NEXT_PUBLIC_SUPABASE_URL
│                                   # - NEXT_PUBLIC_SUPABASE_ANON_KEY
│                                   # - SUPABASE_SERVICE_ROLE_KEY
│                                   # - OPENAI_API_KEY
│                                   # - Detailed security notes
│
└── 📝 DOCUMENTATION
    ├── README.md                   # Complete setup guide + current status
    ├── CODEFLOW.md                 # Architecture + 8-milestone roadmap
    ├── SETUP_INSTRUCTIONS.md       # Quick-start guide (5 min setup)
    ├── AUTHENTICATION_SETUP.md     # ✅ RLS testing & security guide
    ├── QUICK_START_AUTH.md         # ✅ Auth quick-start guide
    ├── MILESTONE_1_COMPLETE.md     # ✅ Milestone 1 completion summary
    ├── MILESTONE_2_COMPLETE.md     # ✅ Milestone 2 completion summary
    ├── CSV_UPLOAD_AND_MATCHING.md  # 🚧 CSV upload and matching guide
    ├── GIT_COMMIT_MESSAGE.md       # Git workflow guidance
    └── PROJECT_STRUCTURE.md        # This file
```

---

## 📊 File Statistics

| Category          | Files | Lines of Code | Status |
| ----------------- | ----- | ------------- | ------ |
| **Application**   | 15    | ~2,400        | ✅ Auth Complete, 🚧 Upload In Progress |
| **Components**    | 4     | ~800          | ✅ All Auth Components Complete |
| **Libraries**     | 2     | ~200          | ✅ Auth Utils + Supabase Client |
| **Database**      | 2     | ~400          | ✅ Schema + RLS Policies |
| **Security**      | 1     | ~130          | ✅ Middleware Complete |
| **Configuration** | 8     | ~150          | ✅ All Configured |
| **Documentation** | 9     | ~2,000        | ✅ Comprehensive Docs |
| **TOTAL**         | 41    | ~6,080        | 🚧 Milestone 3 In Progress |

---

## 🎨 Technology Stack

### Frontend

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5.3+
- **Styling:** TailwindCSS 3.4
- **Font:** Inter (Google Fonts)

### Backend

- **Database:** Supabase (PostgreSQL 15+)
- **Vector Search:** pgvector extension
- **Auth:** Supabase Auth (✅ Complete - email/password, RLS enabled)
- **Storage:** Supabase Storage (🚧 In Progress - Milestone 3)
- **API:** Next.js API Routes (📅 Planned - transcription, AI analysis)

### AI/ML (Planned)

- **Transcription:** OpenAI Whisper
- **Summarization:** OpenAI GPT-4
- **Embeddings:** OpenAI text-embedding-ada-002

### DevOps

- **Hosting:** Vercel
- **Version Control:** Git + GitHub
- **Linting:** ESLint 8.56+
- **Formatting:** Prettier 3.2+

---

## 🔗 Key Dependencies

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.0.10",        // ✅ Auth helpers for Next.js
    "@supabase/supabase-js": "^2.39.3",
    "next": "^14.2.33",                // ✅ Updated to latest
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.5",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@typescript-eslint/eslint-plugin": "^6.19.1",
    "@typescript-eslint/parser": "^6.19.1",
    "autoprefixer": "^10.4.17",
    "eslint": "^8.56.0",
    "eslint-config-next": "14.2.33",
    "eslint-config-prettier": "^9.1.0",
    "postcss": "^8.4.33",
    "prettier": "^3.2.4",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3"
  }
}
```

---

## 🗂️ Database Schema

### `calls` Table

Stores audio file metadata and references.

```sql
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    audio_path TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calls_user_id ON calls(user_id);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX idx_calls_metadata ON calls USING GIN (metadata jsonb_path_ops);
```

**Example metadata:**

```json
{
  "patient_id": "P001",
  "call_type": "appointment_booking",
  "duration": 180,
  "tags": ["new_patient", "insurance_inquiry"]
}
```

### `transcripts` Table

Stores transcription results and AI insights.

```sql
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    summary TEXT,
    sentiment TEXT,
    duration INTEGER,
    language TEXT DEFAULT 'en',
    confidence_score NUMERIC(3, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_transcripts_call_id ON transcripts(call_id);
CREATE INDEX idx_transcripts_fulltext ON transcripts
    USING GIN (to_tsvector('english', transcript));
CREATE INDEX idx_transcripts_sentiment ON transcripts(sentiment);
```

### `embeddings` Table

Stores vector embeddings for semantic search.

```sql
CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(call_id, chunk_index)
);

-- Indexes
CREATE INDEX idx_embeddings_call_id ON embeddings(call_id);
CREATE INDEX idx_embeddings_vector ON embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Vector dimensions:**

- `vector(1536)` - OpenAI text-embedding-ada-002
- `vector(3072)` - OpenAI text-embedding-3-large

---

## 🚀 Available Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run format           # Auto-format with Prettier
npm run format:check     # Check formatting without changes
npm run type-check       # TypeScript validation

# Database
npm run db:migrate       # Show migration instructions
```

---

## 📖 Documentation Guide

| Read This...                | When You Want To...               |
| --------------------------- | --------------------------------- |
| **README.md**               | Get complete setup instructions   |
| **SETUP_INSTRUCTIONS.md**   | Quick-start in 5 minutes          |
| **CODEFLOW.md**             | Understand architecture & roadmap |
| **MILESTONE_1_COMPLETE.md** | See what's been built             |
| **PROJECT_STRUCTURE.md**    | Understand file organization      |
| **GIT_COMMIT_MESSAGE.md**   | Follow Git workflow               |
| **migrations/001_init.sql** | Understand database schema        |
| **lib/supabase.ts**         | See TypeScript types              |

---

## 🔒 Security Notes

### ✅ Secure

- `.env.local` in `.gitignore`
- Environment template provided (`env.example.txt`)
- No secrets committed to repository
- Service role key documented as secret-only

### ⚠️ To Be Secured (Milestone 2+)

- Row Level Security (RLS) policies
- API rate limiting
- Input validation
- File upload restrictions
- CORS configuration

---

## 🎯 Next Steps

1. **Set up Supabase project** (5 min)
   - Create project at supabase.com
   - Enable pgvector extension
   - Run migration SQL

2. **Get API keys** (5 min)
   - Copy Supabase keys
   - Get OpenAI API key

3. **Configure environment** (2 min)
   - Copy `env.example.txt` to `.env.local`
   - Fill in actual keys

4. **Install & run** (3 min)

   ```bash
   npm install
   npm run dev
   ```

5. **Start Milestone 2** (Next week)
   - Implement Supabase Auth
   - Add protected routes
   - Enable RLS policies

---

## 📚 Additional Resources

- Next.js Docs: [nextjs.org/docs](https://nextjs.org/docs)
- Supabase Docs: [supabase.com/docs](https://supabase.com/docs)
- pgvector Guide: [github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)
- OpenAI API: [platform.openai.com/docs](https://platform.openai.com/docs)
- TailwindCSS: [tailwindcss.com/docs](https://tailwindcss.com/docs)

---

**Last Updated:** Milestone 1 Completion  
**Status:** ✅ Production-Ready Scaffold  
**Next:** Milestone 2 - Authentication

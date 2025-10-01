# DentalCallInsights - Project Structure

```
dentalcallinsights/
│
├── 📱 APPLICATION (Next.js App Router)
│   └── app/
│       ├── globals.css              # TailwindCSS styles + custom CSS
│       ├── layout.tsx               # Root layout with navigation header
│       ├── page.tsx                 # Landing page with hero + features
│       │
│       ├── upload/
│       │   └── page.tsx            # Upload page (placeholder)
│       │
│       ├── library/
│       │   └── page.tsx            # Call library (placeholder)
│       │
│       ├── qa/
│       │   └── page.tsx            # QA dashboard (placeholder)
│       │
│       └── login/
│           └── page.tsx            # Login page (placeholder)
│
├── 📚 LIBRARIES
│   └── lib/
│       └── supabase.ts             # Supabase client + TypeScript types
│
├── 🗄️ DATABASE
│   └── migrations/
│       └── 001_init.sql            # Schema: calls, transcripts, embeddings
│                                    # - pgvector extension
│                                    # - Optimized indexes (GIN, FTS, ivfflat)
│                                    # - search_embeddings() function
│                                    # - RLS policies (commented)
│
├── ⚙️ CONFIGURATION
│   ├── package.json                # Dependencies + NPM scripts
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
│                                    # - NEXT_PUBLIC_SUPABASE_URL
│                                    # - NEXT_PUBLIC_SUPABASE_ANON_KEY
│                                    # - SUPABASE_SERVICE_ROLE_KEY
│                                    # - OPENAI_API_KEY
│
└── 📝 DOCUMENTATION
    ├── README.md                   # Complete setup guide (350+ lines)
    ├── CODEFLOW.md                 # Architecture + 8-milestone roadmap
    ├── SETUP_INSTRUCTIONS.md       # Quick-start guide (5 min setup)
    ├── GIT_COMMIT_MESSAGE.md       # Git workflow guidance
    ├── MILESTONE_1_COMPLETE.md     # Completion summary
    └── PROJECT_STRUCTURE.md        # This file
```

---

## 📊 File Statistics

| Category          | Files | Lines of Code |
| ----------------- | ----- | ------------- |
| **Application**   | 7     | ~600          |
| **Libraries**     | 1     | ~60           |
| **Database**      | 1     | ~220          |
| **Configuration** | 8     | ~150          |
| **Documentation** | 6     | ~1,200        |
| **TOTAL**         | 23    | ~2,230        |

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
- **Auth:** Supabase Auth (not yet implemented)
- **Storage:** Supabase Storage (not yet implemented)
- **API:** Next.js API Routes (to be added)

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
    "@supabase/supabase-js": "^2.39.3",
    "next": "14.2.33",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
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

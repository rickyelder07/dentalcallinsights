# DentalCallInsights

Transform dental call recordings into actionable insights with AI-powered transcription, summarization, sentiment analysis, and semantic search.

## 🚀 Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** TailwindCSS
- **Backend:** Supabase (Auth, Postgres, Storage, pgvector)
- **AI/ML:** OpenAI (Whisper for transcription, GPT for summaries, embeddings for search)
- **Deployment:** Vercel
- **Code Quality:** ESLint, Prettier, TypeScript strict mode

## 📋 Features

### ✅ Completed (Milestones 1-2)
- ✅ User authentication and authorization (email/password)
- ✅ Row Level Security (RLS) for data isolation
- ✅ Protected routes with middleware
- ✅ User profile and account management
- ✅ Password reset flow
- ✅ Session persistence and auto-refresh

### 🚧 In Progress (Future Milestones)
- ⏳ Audio file upload and storage
- ⏳ Automatic transcription of call recordings
- ⏳ AI-generated summaries and sentiment analysis
- ⏳ Vector embeddings for semantic search
- ⏳ Searchable call library with filters
- ⏳ QA dashboard and analytics

## 🏗️ Project Structure

```
.
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with navigation
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles with Tailwind
│   ├── upload/            # Upload page (TODO)
│   ├── library/           # Call library page (TODO)
│   ├── qa/                # QA dashboard (TODO)
│   └── login/             # Auth pages (TODO)
├── lib/
│   └── supabase.ts        # Supabase client configuration
├── migrations/
│   └── 001_init.sql       # Initial database schema
├── components/            # Reusable React components (TODO)
├── .env.example.txt       # Environment variables template
└── README.md              # This file
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account ([supabase.com](https://supabase.com))
- An OpenAI API key ([platform.openai.com](https://platform.openai.com))

### Step 1: Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd dentalcallinsights
npm install
```

### Step 2: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish provisioning
3. Navigate to **Project Settings → API** to get your keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### Step 3: Enable pgvector Extension

1. In your Supabase dashboard, go to **Database → Extensions**
2. Search for `vector` and enable the **pgvector** extension
3. This is required for storing and searching embeddings

### Step 4: Enable Email Authentication

1. In your Supabase dashboard, go to **Authentication > Configuration > Sign In / Providers**
2. Enable the **Email** provider
3. Configure settings (optional but recommended):
   - ✅ Enable email confirmations
   - ✅ Enable password recovery
   - Set minimum password strength

### Step 5: Run Database Migrations

**Migration 001 - Initial Schema:**

1. In your Supabase dashboard, navigate to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `migrations/001_init.sql` and paste into the editor
4. Click **Run** to execute the migration
5. Verify that `calls`, `transcripts`, and `embeddings` tables were created

**Migration 002 - Row Level Security:**

1. In SQL Editor, click **New Query**
2. Copy the contents of `migrations/002_enable_rls.sql` and paste into the editor
3. Click **Run** to execute the migration
4. Verify RLS is enabled with this query:

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('calls', 'transcripts', 'embeddings');
```

All tables should show `t` (true) for `rowsecurity`.

**Alternative:** Use Supabase CLI (recommended for production)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Step 6: Set Up Environment Variables

1. Copy the environment template:

   ```bash
   cp env.example.txt .env.local
   ```

2. Fill in your actual values in `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
   OPENAI_API_KEY=sk-xxx...
   NEXT_PUBLIC_VERCEL_URL=http://localhost:3000
   ```

3. **⚠️ NEVER commit `.env.local` to git!** (It's already in `.gitignore`)

### Step 7: Install Dependencies

```bash
npm install
```

This will install all required packages including `@supabase/auth-helpers-nextjs`.

### Step 8: Start the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app running! ✅

### Step 9: Verify the Setup

- ✅ The home page loads without errors
- ✅ Navigation links are visible (Login/Sign Up when logged out)
- ✅ No console errors in browser dev tools
- ✅ Database tables exist in Supabase dashboard
- ✅ Can sign up a new account
- ✅ Can sign in and access protected routes
- ✅ Session persists on page refresh

### Step 10: Test Authentication (Optional)

1. Go to http://localhost:3000/signup
2. Create a test account with a valid email
3. Sign in at http://localhost:3000/login
4. Verify you can access /library, /upload, /qa, /profile
5. Sign out and verify redirect to login
6. Try accessing /library while logged out → should redirect to login

For detailed testing instructions, see `AUTHENTICATION_SETUP.md`.

## 📊 Database Schema

### `calls` Table

Stores audio file metadata and references.

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
audio_path TEXT NOT NULL
metadata JSONB DEFAULT '{}'
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**Indexes:**

- `user_id` - for user-specific queries
- `created_at` - for time-based sorting
- `metadata` (GIN) - for flexible JSONB queries

### `transcripts` Table

Stores transcription results and AI-generated insights.

```sql
id UUID PRIMARY KEY
call_id UUID NOT NULL (FK → calls)
transcript TEXT NOT NULL
summary TEXT
sentiment TEXT
duration INTEGER
language TEXT
confidence_score NUMERIC(3,2)
created_at TIMESTAMPTZ
```

**Indexes:**

- `call_id` - for call lookups
- `transcript` (full-text) - for text search
- `sentiment` - for filtering

### `embeddings` Table

Stores vector embeddings for semantic search.

```sql
id UUID PRIMARY KEY
call_id UUID NOT NULL (FK → calls)
chunk_index INTEGER NOT NULL
content TEXT NOT NULL
embedding vector(1536) NOT NULL
created_at TIMESTAMPTZ
```

**Indexes:**

- `call_id` - for call lookups
- `embedding` (ivfflat) - for vector similarity search

**⚠️ Vector Dimension Notes:**

- Default: `vector(1536)` for OpenAI's `text-embedding-ada-002`
- For `text-embedding-3-small`: use `vector(1536)`
- For `text-embedding-3-large`: use `vector(3072)`
- To change dimension, edit `migrations/001_init.sql` before running migration

### Utility Functions

**`search_embeddings(query_embedding, match_threshold, match_count)`**
Returns the most similar embeddings using cosine similarity.

## 🚢 Deployment to Vercel

### Quick Deploy

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
4. Deploy! 🎉

### Automatic Environment Variables

Vercel automatically sets `NEXT_PUBLIC_VERCEL_URL` for you.

## 🧪 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run format:check # Check if code is formatted
npm run type-check   # Run TypeScript type checking
npm run db:migrate   # Migration instructions (see output)
```

## 🔐 Security Best Practices

- ✅ Never commit `.env.local` or any secrets
- ✅ Use `SUPABASE_SERVICE_ROLE_KEY` only in server-side code (never expose to client)
- ✅ Environment variables template provided in `env.example.txt`
- ✅ `.gitignore` configured to exclude sensitive files
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ User data isolation enforced at database level
- ✅ Session tokens stored in httpOnly cookies (XSS protection)
- ✅ CSRF protection built into Supabase Auth
- ✅ Password strength validation
- ✅ Email/password format validation

**Testing RLS:**

See `AUTHENTICATION_SETUP.md` for detailed instructions on testing Row Level Security policies.

## 🗺️ Roadmap & Next Milestones

### ✅ Milestone 1: Project Scaffold (Complete)

- ✅ Next.js 14 + TypeScript setup
- ✅ TailwindCSS configuration
- ✅ Supabase client setup
- ✅ Database schema with pgvector
- ✅ Basic navigation and pages

### ✅ Milestone 2: Authentication & User Management (Complete)

- ✅ Implement Supabase Auth (email/password)
- ✅ Protected routes with Next.js middleware
- ✅ Row Level Security (RLS) on all tables
- ✅ User profile and password management
- ✅ Password reset flow
- ✅ Session management with auto-refresh

### Milestone 3: Audio Upload & Storage

- [ ] File upload component with drag-and-drop
- [ ] Supabase Storage integration
- [ ] Upload progress and validation
- [ ] Metadata form (patient ID, call type, etc.)

### Milestone 4: Transcription Pipeline

- [ ] OpenAI Whisper API integration
- [ ] Background job processing
- [ ] Transcript display and editing
- [ ] Speaker diarization (if needed)

### Milestone 5: AI Insights

- [ ] GPT-based summarization
- [ ] Sentiment analysis
- [ ] Key topic extraction
- [ ] Action item detection

### Milestone 6: Embeddings & Search

- [ ] OpenAI embeddings generation
- [ ] Vector storage in pgvector
- [ ] Semantic search UI
- [ ] Search result ranking

### Milestone 7: Library & Analytics

- [ ] Call library with filters and sorting
- [ ] Pagination and infinite scroll
- [ ] Basic analytics dashboard
- [ ] Export functionality

### Milestone 8: QA & Compliance

- [ ] QA checklist templates
- [ ] Compliance scoring
- [ ] Audit logs
- [ ] Reporting

## 🛠️ Development Notes

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier configured
- Functional React components with hooks
- Server/client boundaries explicit

### Key Design Decisions

**Why pgvector?**
Native Postgres extension for vector similarity search. No additional infrastructure needed.

**Why vector(1536)?**
OpenAI's `text-embedding-ada-002` produces 1536-dimensional vectors. Adjust if using different models.

**Why ivfflat index?**
Good balance between query speed and index size. Lists parameter (100) can be tuned based on dataset size.

**Why JSONB for metadata?**
Flexible schema for call metadata (patient ID, tags, custom fields) without rigid table structure.

## 🤝 Contributing

This is a solo project for now, but contributions welcome! Please:

1. Create a feature branch
2. Follow existing code style
3. Add tests where applicable
4. Update documentation

## 📄 License

[Your License Here]

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"

→ Make sure `.env.local` exists and contains valid Supabase keys

### Error: "relation 'calls' does not exist"

→ Run the migration SQL in Supabase SQL Editor

### Error: "type 'vector' does not exist"

→ Enable the pgvector extension in Supabase dashboard

### Build fails on Vercel

→ Check that all environment variables are set in Vercel project settings

## 📞 Support

For issues or questions, please open a GitHub issue or contact [your email].

---

Built with ❤️ using Next.js and Supabase

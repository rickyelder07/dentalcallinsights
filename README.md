# DentalCallInsights 🦷📞

<div align="center">

**AI-Powered Call Analytics Platform for Dental Practices**

Transform call recordings into actionable insights with automated transcription, sentiment analysis, and intelligent QA scoring.

[Live Demo](https://dentalcallinsights.vercel.app) • [Documentation](#-documentation) • [Report Bug](https://github.com/rickyelder07/dentalcallinsights/issues)

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-green)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-orange)](https://openai.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [Project Structure](#-project-structure)
- [Performance Considerations](#-performance-considerations)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**DentalCallInsights** is a comprehensive SaaS platform designed to help dental practices maximize the value of their patient phone calls. By leveraging cutting-edge AI technologies, the platform automatically transcribes call recordings, extracts actionable insights, identifies quality issues, and provides data-driven analytics to improve patient communication and operational efficiency.

### Why DentalCallInsights?

- **🤖 Automated Intelligence**: Eliminate manual call reviews with AI-powered transcription and analysis
- **📊 Data-Driven Decisions**: Comprehensive analytics dashboards reveal trends, performance metrics, and opportunities
- **⚡ Real-Time Processing**: Bulk operations support for processing hundreds of calls simultaneously
- **🔍 Semantic Search**: Find relevant calls instantly using natural language queries powered by vector embeddings
- **✅ Quality Assurance**: Automated and manual QA scoring with 15+ evaluation criteria
- **🔒 Enterprise Security**: Row-level security, encrypted storage, and HIPAA-compliant infrastructure

---

## ✨ Key Features

### 🎙️ **Transcription & AI Analysis**
- **Automated Transcription**: OpenAI Whisper integration with multi-language support (English/Spanish)
- **AI-Generated Summaries**: GPT-4 powered call summaries with key points and outcomes
- **Sentiment Analysis**: Multi-dimensional sentiment tracking (overall, patient satisfaction, staff performance)
- **Action Items**: Automatic detection and prioritization of follow-up tasks
- **Red Flag Detection**: Identify compliance issues, negative experiences, and quality concerns

### 📊 **Analytics & Reporting**
- **Caller Analytics**: Track individual extension performance with detailed metrics
- **Call Highlights**: Daily performance overview with best/worst calls and top performers
- **Trend Analysis**: Historical performance tracking with visual trend indicators
- **New Patient Tracking**: Dedicated analytics for new patient call quality
- **Custom Metrics**: Weighted scoring algorithms for performance evaluation

### 🔍 **Search & Discovery**
- **Semantic Search**: Vector-based similarity search across transcripts
- **Advanced Filtering**: Filter by sentiment, date range, duration, caller, and more
- **Full-Text Search**: Fast keyword-based search across all call data
- **Export Capabilities**: Export filtered results as CSV or JSON

### ✅ **Quality Assurance**
- **15-Criteria Scoring**: Comprehensive QA checklist covering greeting, empathy, compliance, and more
- **AI-Powered Scoring**: Automated evaluation using GPT-4o-mini
- **Manual Review**: Human-in-the-loop validation and override capability
- **Performance Dashboards**: Agent tracking, score trends, and benchmarking
- **Trend Analysis**: Identify patterns and areas for improvement

### 👥 **User Management**
- **Secure Authentication**: Email/password authentication via Supabase Auth
- **Row-Level Security**: Complete data isolation between users
- **Profile Management**: User settings, password resets, and account management
- **Session Persistence**: Automatic token refresh and seamless authentication

### 📁 **File Management**
- **Bulk Upload**: Drag-and-drop CSV + audio file uploads with progress tracking
- **Format Support**: MP3, WAV, M4A, AAC audio formats
- **Call-Only Mode**: Support for call data without recordings
- **Smart Matching**: Automatic filename-based audio-to-call matching
- **Duplicate Prevention**: Intelligent upsert logic to avoid redundant uploads

---

## 🛠️ Tech Stack

### **Frontend**
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React Server Components)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) (Utility-first CSS)
- **Components**: Custom React components with hooks
- **State Management**: React Context + Server State

### **Backend & Database**
- **BaaS Platform**: [Supabase](https://supabase.com/)
  - PostgreSQL 15+ database
  - Real-time subscriptions
  - Row-level security (RLS)
  - Storage buckets with CDN
  - Authentication service
- **Vector Search**: [pgvector](https://github.com/pgvector/pgvector) extension
- **Full-Text Search**: PostgreSQL native FTS

### **AI & ML Services**
- **OpenAI GPT-4**: Call summaries and insights generation
- **OpenAI GPT-4o-mini**: Automated QA scoring
- **OpenAI Whisper**: Audio transcription (English/Spanish)
- **OpenAI Embeddings**: `text-embedding-ada-002` for semantic search

### **Infrastructure & Deployment**
- **Hosting**: [Vercel](https://vercel.com/) (Serverless, Edge Functions)
- **CDN**: Vercel Edge Network
- **Storage**: Supabase Storage (S3-compatible)
- **CI/CD**: Vercel Git integration (automatic deployments)

### **Development Tools**
- **Code Quality**: ESLint, Prettier, TypeScript compiler
- **Version Control**: Git + GitHub
- **Package Manager**: npm
- **Environment**: Node.js 18+

---

## 🏗️ Architecture

### **System Design**

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                     │
│  Next.js 14 App Router | TailwindCSS | React Components │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                 Next.js API Routes                      │
│  /api/transcribe | /api/insights | /api/analytics      │
│  /api/search | /api/qa | /api/upload                   │
└─────┬──────────────────────────────────┬────────────────┘
      │                                  │
      ▼                                  ▼
┌─────────────────┐              ┌──────────────────────┐
│  Supabase BaaS  │              │    OpenAI APIs       │
│                 │              │                      │
│  • PostgreSQL   │              │  • GPT-4 (insights)  │
│  • Auth Service │              │  • Whisper (audio)   │
│  • Storage      │              │  • Embeddings        │
│  • pgvector     │              │  • GPT-4o-mini (QA)  │
└─────────────────┘              └──────────────────────┘
```

### **Data Flow**

1. **Upload**: User uploads CSV + audio files → Supabase Storage
2. **Transcription**: Audio → Whisper API → Transcript stored in DB
3. **AI Insights**: Transcript → GPT-4 → Summaries, sentiment, action items
4. **Embeddings**: Transcript chunks → OpenAI Embeddings → pgvector storage
5. **QA Scoring**: Transcript + metadata → GPT-4o-mini → Quality scores
6. **Analytics**: Aggregate data → Computed metrics → Dashboard visualization

### **Security Architecture**

- **Authentication**: Supabase Auth (JWT-based, httpOnly cookies)
- **Authorization**: Row-Level Security policies on all tables
- **Data Isolation**: `user_id` filtering enforced at database level
- **API Security**: Server-side token validation, rate limiting
- **Storage Security**: Bucket policies with user-specific paths

---

## 🚀 Getting Started

### **Prerequisites**

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Supabase Account** ([sign up free](https://supabase.com))
- **OpenAI API Key** ([get one here](https://platform.openai.com))

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/rickyelder07/dentalcallinsights.git
   cd dentalcallinsights
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase project**
   - Create a new project at [supabase.com](https://supabase.com)
   - Wait for provisioning (2-3 minutes)
   - Navigate to **Settings → API** and copy your keys

4. **Enable pgvector extension**
   - Go to **Database → Extensions**
   - Enable **pgvector**

5. **Configure Supabase API Settings**
   - Go to **Settings → API → API Settings**
   - Set **Max Rows** to `10000` (default is 1000)
   - This allows fetching larger datasets

6. **Run database migrations**
   - Navigate to **SQL Editor** in Supabase dashboard
   - Run each migration file in order:
     1. `migrations/01_core_schema.sql`
     2. `migrations/02_auth_security.sql`
     3. `migrations/03_features.sql`
     4. `migrations/04_qa_analytics.sql`

7. **Configure environment variables**
   ```bash
   cp env.example.txt .env.local
   ```

   Edit `.env.local` with your credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   OPENAI_API_KEY=sk-...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

8. **Start the development server**
   ```bash
   npm run dev
   ```

9. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### **First Steps**

1. Sign up for a new account at `/signup`
2. Upload a CSV file with call metadata
3. Upload corresponding audio files (optional)
4. Transcribe calls from the Library page
5. Generate AI insights
6. Explore analytics dashboards

---

## ⚙️ Configuration

### **Environment Variables**

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | ✅ |
| `NEXT_PUBLIC_APP_URL` | Application URL | ✅ |

### **Supabase Configuration**

**Important**: Set your Supabase API max rows limit to handle large datasets:

1. Navigate to **Settings → API → API Settings**
2. Increase **Max Rows** from `1000` to `10000`
3. Save changes

This prevents pagination issues when working with large call volumes.

### **OpenAI Configuration**

The platform uses multiple OpenAI models:
- **Whisper**: Audio transcription
- **GPT-4**: Insight generation (summaries, sentiment, action items)
- **GPT-4o-mini**: QA scoring (cost-effective for batch operations)
- **text-embedding-ada-002**: Vector embeddings for search

Ensure your OpenAI account has sufficient credits and API access enabled.

---

## 🚢 Deployment

### **Deploy to Vercel (Recommended)**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rickyelder07/dentalcallinsights)

1. **Connect your repository**
   - Push code to GitHub
   - Import project in Vercel dashboard

2. **Configure environment variables**
   - Add all variables from `.env.local` in Vercel settings
   - **Never commit `.env.local` to git!**

3. **Deploy**
   - Vercel auto-deploys on every push to `main`
   - Preview deployments for pull requests

4. **Post-deployment**
   - Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables
   - Configure custom domain (optional)

For detailed deployment instructions, see [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md).

---

## 📚 Documentation

### **User Guides**
- **[FEATURE_GUIDE.md](FEATURE_GUIDE.md)** - Comprehensive feature documentation
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Step-by-step setup instructions
- **[VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)** - Production deployment guide

### **Technical Documentation**
- **[CODE_STRUCTURE.md](CODE_STRUCTURE.md)** - Codebase architecture and patterns
- **[CODEFLOW.md](CODEFLOW.md)** - Development workflows and roadmap
- **[TRANSCRIPTION_SETUP.md](TRANSCRIPTION_SETUP.md)** - Transcription pipeline details
- **[AI_SCORING_GUIDE.md](AI_SCORING_GUIDE.md)** - QA scoring system overview

### **Database**
- **[migrations/](migrations/)** - SQL migration files with schema definitions

---

## 📁 Project Structure

```
dentalcallinsights/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (serverless functions)
│   │   ├── analytics/            # Analytics & reporting endpoints
│   │   │   ├── caller-stats/     # Caller performance metrics
│   │   │   ├── call-highlights/  # Daily highlights & top performers
│   │   │   ├── overview/         # Dashboard overview data
│   │   │   ├── trends/           # Historical trend analysis
│   │   │   └── performance/      # Performance metrics
│   │   ├── insights/             # AI insights generation
│   │   ├── qa/                   # Quality assurance endpoints
│   │   ├── search/               # Semantic & full-text search
│   │   ├── transcribe/           # Transcription pipeline
│   │   └── upload/               # File upload handling
│   ├── components/               # Reusable React components
│   │   ├── AudioPlayer.tsx       # Audio playback with waveform
│   │   ├── CallCard.tsx          # Call list item component
│   │   ├── CallScoringPanel.tsx  # QA scoring interface
│   │   ├── InsightsPanel.tsx     # AI insights display
│   │   ├── SearchBar.tsx         # Search with autocomplete
│   │   ├── SentimentPieChart.tsx # Sentiment visualization
│   │   └── [20+ more components]
│   ├── (routes)/                 # Application pages
│   │   ├── analytics/            # Analytics dashboard
│   │   ├── caller-analytics/     # Caller performance page
│   │   ├── call-highlights/      # Daily highlights page
│   │   ├── library-enhanced/     # Main call library
│   │   ├── qa/                   # QA dashboard
│   │   ├── upload/               # Upload interface
│   │   ├── login/                # Authentication pages
│   │   └── profile/              # User settings
│   └── providers/                # React context providers
├── lib/                          # Core utilities & services
│   ├── supabase.ts               # Supabase client configuration
│   ├── supabase-server.ts        # Server-side Supabase client
│   ├── openai.ts                 # OpenAI API integration
│   ├── openai-insights.ts        # Insights generation logic
│   ├── embeddings.ts             # Vector embedding utilities
│   ├── analytics.ts              # Analytics computation
│   ├── datetime.ts               # Timezone-aware date handling
│   ├── qa-ai-scoring.ts          # AI-powered QA scoring
│   ├── csv-parser-simplified.ts  # CSV parsing utilities
│   └── [15+ utility modules]
├── types/                        # TypeScript type definitions
│   ├── auth.ts                   # Authentication types
│   ├── upload.ts                 # Upload & call types
│   ├── insights.ts               # AI insights types
│   ├── analytics.ts              # Analytics data types
│   ├── qa.ts                     # QA scoring types
│   └── [10+ type definition files]
├── migrations/                   # Database schema migrations
│   ├── 01_core_schema.sql        # Core tables & indexes
│   ├── 02_auth_security.sql      # RLS policies & security
│   ├── 03_features.sql           # Feature-specific tables
│   └── 04_qa_analytics.sql       # QA & analytics tables
├── middleware.ts                 # Route protection & auth
├── tailwind.config.ts            # TailwindCSS configuration
├── tsconfig.json                 # TypeScript configuration
├── next.config.js                # Next.js configuration
├── .env.local                    # Environment variables (gitignored)
├── env.example.txt               # Environment template
└── README.md                     # This file
```

---

## ⚡ Performance Considerations

### **Query Optimization**
- **Indexed Queries**: All frequent queries use database indexes
- **Connection Pooling**: Supabase handles connection management
- **Caching**: API responses cached where appropriate
- **Pagination**: Large datasets use cursor-based pagination

### **AI Cost Management**
- **Smart Caching**: Insights cached to avoid redundant API calls
- **Bulk Operations**: Batch processing for transcription/insights
- **Model Selection**: GPT-4o-mini for cost-effective QA scoring
- **Minimum Duration**: Only transcribe calls >6 seconds

### **Frontend Performance**
- **Server Components**: Reduced client-side JavaScript
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js automatic image optimization
- **Edge Caching**: Static assets served from Vercel Edge Network

### **Scalability**
- **Serverless Architecture**: Auto-scales with traffic
- **Database Connection Pooling**: Handles concurrent requests
- **Row-Level Security**: Efficient user data isolation
- **Vector Indexing**: IVFFLAT index for fast similarity search

---

## 🧪 Available Scripts

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint checks
npm run format       # Format code with Prettier
npm run format:check # Check if code is formatted
npm run type-check   # Run TypeScript compiler checks
```

---

## 🔒 Security

### **Authentication & Authorization**
- ✅ Supabase Auth with JWT tokens
- ✅ httpOnly cookies (XSS protection)
- ✅ CSRF protection
- ✅ Row-Level Security on all tables
- ✅ User data isolation at database level

### **Data Protection**
- ✅ Encrypted data at rest and in transit
- ✅ Environment variables never committed
- ✅ Service role key only used server-side
- ✅ HIPAA-compliant infrastructure (Supabase)

### **Best Practices**
- ✅ Regular dependency updates
- ✅ Secure password requirements
- ✅ Email verification
- ✅ Session timeout and refresh
- ✅ API rate limiting

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Follow the existing code style** (TypeScript, ESLint, Prettier)
4. **Write meaningful commit messages**
5. **Test your changes thoroughly**
6. **Update documentation** if needed
7. **Submit a pull request**

### **Development Guidelines**
- Use TypeScript strict mode
- Follow functional React patterns
- Write self-documenting code
- Add JSDoc comments for complex functions
- Keep components small and focused

---

## 🐛 Troubleshooting

### **Common Issues**

**"Missing Supabase environment variables"**
- Ensure `.env.local` exists with all required variables

**"relation 'calls' does not exist"**
- Run database migrations in Supabase SQL Editor

**"type 'vector' does not exist"**
- Enable pgvector extension in Supabase dashboard

**"Only seeing 1000 calls in Library"**
- Increase Supabase API Settings → Max Rows to `10000`

**Build fails on Vercel**
- Verify all environment variables are set in Vercel project settings

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework for production
- [Supabase](https://supabase.com/) - Open-source Firebase alternative
- [OpenAI](https://openai.com/) - AI models for transcription and insights
- [Vercel](https://vercel.com/) - Deployment platform
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework

---

## 📞 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/rickyelder07/dentalcallinsights/issues)
- **Email**: [your-email@example.com]
- **Live Demo**: [dentalcallinsights.vercel.app](https://dentalcallinsights.vercel.app)

---

<div align="center">

**Built with ❤️ for dental practices everywhere**

⭐ Star this repo if you find it helpful!

</div>

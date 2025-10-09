# 🚀 DentalCallInsights - Complete Setup Guide

**A comprehensive dental practice call analytics platform with AI-powered insights, transcription, and quality assurance.**

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Authentication Setup](#authentication-setup)
5. [AI Services Setup](#ai-services-setup)
6. [Development Setup](#development-setup)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- OpenAI API key
- Git

### 5-Minute Setup
```bash
# 1. Clone and install
git clone <repository-url>
cd dentalcallinsights
npm install

# 2. Environment setup
cp env.example.txt .env.local
# Edit .env.local with your credentials

# 3. Database setup
# Run migrations in Supabase SQL editor (see Database Setup section)

# 4. Start development
npm run dev
```

---

## 🔧 Environment Setup

### Required Environment Variables

Create `.env.local` file with these variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Getting Your Credentials

#### Supabase Credentials
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role secret key → `SUPABASE_SERVICE_ROLE_KEY`

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new API key
3. Copy to `OPENAI_API_KEY`

---

## 🗄️ Database Setup

### Step 1: Enable Extensions
In Supabase SQL Editor, run:
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
```

### Step 2: Core Schema
Run the consolidated migration file: `migrations/01_core_schema.sql`

### Step 3: Authentication & Security
Run: `migrations/02_auth_security.sql`

### Step 4: Features Setup
Run: `migrations/03_features.sql`

### Step 5: QA & Analytics
Run: `migrations/04_qa_analytics.sql`

---

## 🔐 Authentication Setup

### Supabase Auth Configuration

1. **Enable Authentication Providers**
   - Go to Authentication → Providers
   - Enable Email provider
   - Configure email templates

2. **Configure Redirect URLs**
   - Add `http://localhost:3000/auth/callback` for development
   - Add your production domain for production

3. **Email Templates**
   - Customize signup confirmation email
   - Customize password reset email

### Testing Authentication

```bash
# Start the application
npm run dev

# Test signup flow
# 1. Go to http://localhost:3000/signup
# 2. Create test account
# 3. Check email for confirmation
# 4. Sign in at http://localhost:3000/login
```

---

## 🤖 AI Services Setup

### OpenAI Configuration

1. **Model Access**
   - Ensure access to GPT-4o-mini for cost-effective operations
   - Verify API key has sufficient credits

2. **Usage Monitoring**
   - Monitor API usage in OpenAI dashboard
   - Set up usage alerts if needed

### AI Features Available
- **Transcription**: Automatic speech-to-text
- **Insights Generation**: AI-powered call analysis
- **QA Scoring**: Automated call quality assessment
- **Semantic Search**: Vector-based call search

---

## 💻 Development Setup

### Project Structure
```
dentalcallinsights/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── providers/         # Context providers
│   └── [pages]/          # Application pages
├── lib/                   # Utility libraries
├── types/                 # TypeScript definitions
├── migrations/           # Database migrations
└── public/               # Static assets
```

### Key Directories

#### `/app/api/` - API Endpoints
- `upload/` - File upload handling
- `transcribe/` - Transcription processing
- `insights/` - AI insights generation
- `qa/` - Quality assurance scoring
- `search/` - Semantic search functionality

#### `/app/components/` - React Components
- `CallCard.tsx` - Individual call display
- `CallScoringPanel.tsx` - QA scoring interface
- `SearchBar.tsx` - Search functionality
- `InsightsPanel.tsx` - AI insights display

#### `/lib/` - Core Libraries
- `supabase.ts` - Database client
- `openai.ts` - AI service integration
- `embeddings.ts` - Vector search functionality
- `qa-ai-scoring.ts` - Automated scoring logic

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run type-check

# Lint code
npm run lint
```

---

## 🚀 Production Deployment

### Vercel Deployment (Recommended)

1. **Connect Repository**
   - Import project to Vercel
   - Connect GitHub repository

2. **Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Ensure production URLs are set correctly

3. **Domain Configuration**
   - Add custom domain if needed
   - Update Supabase redirect URLs

### Manual Deployment

```bash
# Build the application
npm run build

# Deploy to your hosting platform
# Ensure environment variables are set
```

---

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check Supabase URL and keys
# Verify RLS policies are enabled
# Check network connectivity
```

#### Authentication Problems
```bash
# Verify redirect URLs in Supabase
# Check email provider configuration
# Ensure service role key is correct
```

#### AI Service Issues
```bash
# Verify OpenAI API key
# Check API usage limits
# Monitor error logs
```

#### File Upload Issues
```bash
# Check Supabase Storage configuration
# Verify file size limits
# Check CORS settings
```

### Getting Help

1. **Check Logs**
   - Browser console for frontend issues
   - Supabase logs for database issues
   - OpenAI dashboard for AI service issues

2. **Common Solutions**
   - Clear browser cache
   - Restart development server
   - Check environment variables
   - Verify database migrations

3. **Support Resources**
   - Supabase documentation
   - OpenAI API documentation
   - Next.js documentation

---

## 📚 Additional Resources

- [Code Structure Guide](CODE_STRUCTURE.md) - Detailed codebase overview
- [API Documentation](API_DOCUMENTATION.md) - Complete API reference
- [Feature Guide](FEATURE_GUIDE.md) - User feature documentation

---

**Need help?** Check the troubleshooting section or review the detailed documentation files.

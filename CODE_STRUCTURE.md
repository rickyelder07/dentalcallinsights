# 🏗️ DentalCallInsights - Code Structure Guide

**A comprehensive guide to understanding the codebase architecture, components, and data flow.**

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Directory Structure](#directory-structure)
4. [Core Components](#core-components)
5. [API Endpoints](#api-endpoints)
6. [Data Flow](#data-flow)
7. [Key Libraries](#key-libraries)
8. [Type Definitions](#type-definitions)

---

## 🎯 Project Overview

**DentalCallInsights** is a Next.js 14 application built with TypeScript, Supabase, and OpenAI integration. It provides comprehensive call analytics, transcription, AI insights, and quality assurance for dental practices.

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Supabase (Postgres + Auth + Storage)
- **AI**: OpenAI GPT-4o-mini, Embeddings API
- **Database**: PostgreSQL with pgvector extension
- **Deployment**: Vercel

---

## 🏛️ Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer     │    │   Services      │
│   (Next.js)     │◄──►│   (Next.js)     │◄──►│   (Supabase)    │
│                 │    │                 │    │                 │
│ • React Pages   │    │ • API Routes    │    │ • PostgreSQL    │
│ • Components    │    │ • Middleware    │    │ • Auth          │
│ • State Mgmt    │    │ • Validation    │    │ • Storage       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   AI Services  │
                    │   (OpenAI)      │
                    │                 │
                    │ • GPT-4o-mini   │
                    │ • Embeddings    │
                    │ • Whisper       │
                    └─────────────────┘
```

### Data Flow
1. **Upload**: Audio files → Supabase Storage → Database metadata
2. **Transcription**: Audio → OpenAI Whisper → Transcripts table
3. **Insights**: Transcript → GPT-4o-mini → Insights table
4. **Embeddings**: Content → OpenAI Embeddings → Vector search
5. **QA Scoring**: Transcript → AI Analysis → Scoring system

---

## 📁 Directory Structure

```
dentalcallinsights/
├── app/                          # Next.js App Router
│   ├── api/                     # API endpoints
│   │   ├── analytics/           # Analytics & reporting
│   │   ├── insights/            # AI insights generation
│   │   ├── qa/                  # Quality assurance
│   │   ├── search/              # Search functionality
│   │   ├── transcribe/          # Transcription pipeline
│   │   └── upload/              # File upload handling
│   ├── components/              # Reusable React components
│   ├── library-enhanced/        # Call library page
│   ├── analytics/                # Analytics dashboard
│   ├── qa/                      # QA dashboard
│   └── [auth-pages]/           # Authentication pages
├── lib/                         # Core utility libraries
├── types/                       # TypeScript definitions
├── migrations/                  # Database migrations
└── public/                      # Static assets
```

---

## 🧩 Core Components

### Authentication Components
- **`auth-provider.tsx`**: Global authentication state management
- **`protected-route.tsx`**: Route protection wrapper
- **`logout-button.tsx`**: User logout functionality
- **`auth-error-boundary.tsx`**: Error handling for auth issues

### Call Management Components
- **`CallCard.tsx`**: Individual call display card
- **`CallList.tsx`**: List of calls with pagination
- **`CallScoringPanel.tsx`**: QA scoring interface
- **`TranscriptViewer.tsx`**: Transcript display and editing

### Search & Analytics Components
- **`SearchBar.tsx`**: Search input with filters
- **`SearchResults.tsx`**: Search results display
- **`VectorSearch.tsx`**: Semantic search interface
- **`InsightsPanel.tsx`**: AI insights display

### Upload & Processing Components
- **`audio-uploader.tsx`**: Audio file upload interface
- **`csv-uploader.tsx`**: CSV file upload for metadata
- **`upload-progress.tsx`**: Upload progress tracking
- **`TranscriptionStatus.tsx`**: Transcription progress

### QA & Scoring Components
- **`ScoringCriteria.tsx`**: Individual scoring criterion
- **`ScoreBreakdown.tsx`**: Score visualization
- **`RedFlagsList.tsx`**: Red flags display
- **`ActionItemsList.tsx`**: Action items management

---

## 🔌 API Endpoints

### Authentication (`/api/auth/`)
- **`callback/route.ts`**: OAuth callback handling

### File Management (`/api/upload/`)
- **`route.ts`**: File upload processing

### Transcription (`/api/transcribe/`)
- **`route.ts`**: Transcription job creation
- **`status/[jobId]/route.ts`**: Transcription status checking

### Insights (`/api/insights/`)
- **`generate/route.ts`**: AI insights generation
- **`regenerate/route.ts`**: Insights regeneration

### Search (`/api/search/`)
- **`semantic/route.ts`**: Semantic search
- **`embeddings/route.ts`**: Embedding generation
- **`batch-embeddings/route.ts`**: Batch embedding processing

### Analytics (`/api/analytics/`)
- **`overview/route.ts`**: Overview metrics
- **`sentiment/route.ts`**: Sentiment analysis
- **`performance/route.ts`**: Performance metrics
- **`export/route.ts`**: Data export

### QA System (`/api/qa/`)
- **`score/route.ts`**: Score submission
- **`scores/[callId]/route.ts`**: Score retrieval
- **`dashboard/route.ts`**: QA dashboard data
- **`ai-score/route.ts`**: AI-powered scoring
- **`criteria/route.ts`**: Scoring criteria

---

## 🔄 Data Flow

### 1. Call Upload Flow
```
User Upload → API Validation → Supabase Storage → Database Record → Processing Queue
```

### 2. Transcription Flow
```
Audio File → OpenAI Whisper → Transcript Storage → Status Update → UI Notification
```

### 3. Insights Generation Flow
```
Transcript → GPT-4o-mini → Structured Insights → Database Storage → UI Display
```

### 4. Search Flow
```
Query → Embedding Generation → Vector Search → Results Ranking → UI Display
```

### 5. QA Scoring Flow
```
Call Selection → Criteria Evaluation → Score Calculation → Database Storage → Analytics Update
```

---

## 📚 Key Libraries

### `/lib/` Directory

#### Core Libraries
- **`supabase.ts`**: Supabase client configuration
- **`supabase-server.ts`**: Server-side Supabase operations
- **`auth.ts`**: Authentication utilities
- **`openai.ts`**: OpenAI API integration

#### Feature Libraries
- **`embeddings.ts`**: Vector embedding operations
- **`vector-search.ts`**: Semantic search functionality
- **`qa-ai-scoring.ts`**: AI-powered scoring logic
- **`qa-criteria.ts`**: Scoring criteria definitions
- **`analytics.ts`**: Analytics computation
- **`insights-cache.ts`**: Insights caching

#### Utility Libraries
- **`file-validation.ts`**: File upload validation
- **`audio-utils.ts`**: Audio processing utilities
- **`transcription-utils.ts`**: Transcription helpers
- **`export.ts`**: Data export functionality
- **`filters.ts`**: Search and filter logic
- **`pagination.ts`**: Pagination utilities

---

## 🏷️ Type Definitions

### Core Types (`/types/`)

#### Authentication (`auth.ts`)
```typescript
interface User {
  id: string;
  email: string;
  // ... user properties
}
```

#### Call Data (`upload.ts`)
```typescript
interface Call {
  id: string;
  user_id: string;
  filename: string;
  call_time: string;
  // ... call properties
}
```

#### Transcript (`transcript.ts`)
```typescript
interface Transcript {
  id: string;
  call_id: string;
  content: string;
  transcription_status: string;
  // ... transcript properties
}
```

#### Insights (`insights.ts`)
```typescript
interface Insights {
  id: string;
  call_id: string;
  overall_sentiment: string;
  key_points: string[];
  // ... insights properties
}
```

#### QA System (`qa.ts`)
```typescript
interface CallScore {
  id: string;
  call_id: string;
  total_score: number;
  scorer_notes?: string;
  // ... scoring properties
}
```

#### Analytics (`analytics.ts`)
```typescript
interface AnalyticsData {
  overview: OverviewMetrics;
  sentiment: SentimentMetrics;
  performance: PerformanceMetrics;
  // ... analytics properties
}
```

---

## 🔧 Configuration Files

### Environment Variables
- **`.env.local`**: Local development configuration
- **`env.example.txt`**: Environment template

### Next.js Configuration
- **`next.config.js`**: Next.js configuration
- **`middleware.ts`**: Route middleware and protection

### TypeScript Configuration
- **`tsconfig.json`**: TypeScript compiler options
- **`next-env.d.ts`**: Next.js type definitions

### Styling Configuration
- **`tailwind.config.ts`**: TailwindCSS configuration
- **`postcss.config.js`**: PostCSS configuration

---

## 🚀 Development Workflow

### 1. Local Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run type-check   # TypeScript checking
npm run lint         # Code linting
```

### 2. Database Management
```bash
# Run migrations in Supabase SQL Editor
# 01_core_schema.sql
# 02_auth_security.sql
# 03_features.sql
# 04_qa_analytics.sql
```

### 3. Testing
- Manual testing through UI
- API endpoint testing via Postman/curl
- Database query testing in Supabase

---

## 📖 Additional Resources

- [Setup Guide](SETUP_GUIDE.md) - Complete setup instructions
- [API Documentation](API_DOCUMENTATION.md) - Detailed API reference
- [Feature Guide](FEATURE_GUIDE.md) - User feature documentation

---

**Need help understanding a specific component or feature?** Check the detailed documentation or explore the codebase using the file structure guide above.

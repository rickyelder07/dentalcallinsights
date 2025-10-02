# 🚀 DentalCallInsights - Quick Setup Guide

## ✅ Milestone 2: Complete Authentication & Security

**Current Status:** 🚧 Milestone 3 In Progress (Audio Upload & Storage)  
**Branch:** `milestone/03-audio-upload-and-storage`

### 📁 What's Included

```
dentalcallinsights/
├── app/                      # Next.js App Router
│   ├── auth/                # ✅ Authentication routes
│   ├── components/          # ✅ Reusable components
│   ├── providers/           # ✅ Context providers
│   ├── login/               # ✅ Complete login page
│   ├── signup/              # ✅ Complete signup page
│   ├── profile/             # ✅ Complete profile page
│   ├── reset-password/      # ✅ Complete password reset
│   ├── upload/              # 🚧 Upload page (in progress)
│   ├── library/             # 📅 Library page (planned)
│   ├── qa/                  # 📅 QA page (planned)
│   ├── globals.css          # Tailwind styles
│   ├── layout.tsx           # Root layout with AuthProvider
│   └── page.tsx             # Landing page
├── lib/
│   ├── auth.ts              # ✅ Authentication utilities
│   └── supabase.ts          # Supabase client config
├── types/
│   └── auth.ts              # ✅ TypeScript auth types
├── migrations/
│   ├── 001_init.sql         # Database schema
│   └── 002_enable_rls.sql   # ✅ Row Level Security
├── middleware.ts            # ✅ Route protection
├── .eslintrc.json           # ESLint config
├── .prettierrc              # Prettier config
├── .gitignore               # Git ignore rules
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript config
├── tailwind.config.ts       # Tailwind config
├── next.config.js           # Next.js config
├── postcss.config.js        # PostCSS config
├── env.example.txt          # Environment template
├── README.md                # Complete documentation
├── AUTHENTICATION_SETUP.md  # ✅ Auth setup guide
├── MILESTONE_2_COMPLETE.md  # ✅ Auth completion summary
└── CODEFLOW.md              # Architecture & roadmap
```

---

## 🏃 Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
# Copy the environment template
cp env.example.txt .env.local

# Then edit .env.local with your actual keys
# (see detailed setup below)
```

### 3. Start Development Server

```bash
npm run dev
```

Visit **http://localhost:3000** 🎉

---

## 🔧 Detailed Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Name:** DentalCallInsights
   - **Database Password:** (save this securely!)
   - **Region:** (choose closest to your users)
4. Wait 2-3 minutes for provisioning

### Step 2: Get Supabase Keys

1. In Supabase dashboard, go to **Settings → API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep secret!**

### Step 3: Enable pgvector Extension

1. In Supabase dashboard, go to **Database → Extensions**
2. Search for **"vector"**
3. Click **Enable** on the **pgvector** extension
4. Wait for confirmation (should be instant)

### Step 4: Run Database Migrations

**Migration 001 - Initial Schema:**

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Open `migrations/001_init.sql` from your project
4. Copy the entire file contents
5. Paste into the SQL Editor
6. Click **RUN**
7. Verify success (should see "Success. No rows returned")

**Migration 002 - Row Level Security:**

1. In SQL Editor, click **New Query**
2. Open `migrations/002_enable_rls.sql` from your project
3. Copy the entire file contents
4. Paste into the SQL Editor
5. Click **RUN**
6. Verify success (should see "Success. No rows returned")

**Verify Tables Created:**
Go to **Table Editor** and confirm you see:
   - `calls` table
   - `transcripts` table
   - `embeddings` table

**Option B: Using Supabase CLI (Advanced)**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migration
supabase db push
```

### Step 5: Get OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up/login
3. Go to **API Keys**
4. Click **Create new secret key**
5. Copy the key → `OPENAI_API_KEY`
6. ⚠️ **Save it now - you won't see it again!**

### Step 6: Configure `.env.local`

Edit your `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxx

# Vercel (for local dev)
NEXT_PUBLIC_VERCEL_URL=http://localhost:3000
```

---

## ✅ Verification Checklist

Run through this checklist to verify everything works:

- [ ] **Dependencies installed:** `npm install` runs without errors
- [ ] **Dev server starts:** `npm run dev` runs without errors
- [ ] **Home page loads:** Visit http://localhost:3000
- [ ] **Navigation works:** Click Upload, Library, QA, Login
- [ ] **No console errors:** Check browser DevTools console
- [ ] **Supabase connected:** No "Missing Supabase environment variables" error
- [ ] **Database tables exist:** Check Supabase Table Editor
- [ ] **pgvector enabled:** Check Supabase Extensions page

---

## 🧪 Test Scripts

```bash
# Run linter
npm run lint

# Check formatting
npm run format:check

# Auto-fix formatting
npm run format

# Type check
npm run type-check

# Build for production (test)
npm run build
```

---

## 🚨 Common Issues & Fixes

### Error: "Missing Supabase environment variables"

**Cause:** `.env.local` file missing or has wrong values

**Fix:**

1. Ensure `.env.local` exists in project root
2. Check that keys start with correct prefixes:
   - `https://` for URL
   - `eyJ...` for keys
3. Restart dev server after changing `.env.local`

### Error: "relation 'calls' does not exist"

**Cause:** Database migration not run

**Fix:**

1. Go to Supabase SQL Editor
2. Run `migrations/001_init.sql`
3. Check Table Editor to confirm tables exist

### Error: "type 'vector' does not exist"

**Cause:** pgvector extension not enabled

**Fix:**

1. Go to Supabase Database → Extensions
2. Enable **pgvector**
3. Re-run migration

### Error: "Module not found" or dependency issues

**Cause:** Dependencies not installed or corrupted

**Fix:**

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use

**Fix:**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

---

## 📦 Available NPM Scripts

| Script                 | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start development server (port 3000) |
| `npm run build`        | Build for production                 |
| `npm run start`        | Start production server              |
| `npm run lint`         | Run ESLint                           |
| `npm run format`       | Auto-format code with Prettier       |
| `npm run format:check` | Check if code is formatted           |
| `npm run type-check`   | Run TypeScript type checking         |
| `npm run db:migrate`   | Show migration instructions          |

---

## 🌐 Deploy to Vercel (Optional)

### Prerequisites

- GitHub account
- Code pushed to GitHub repo

### Steps

1. **Push to GitHub:**

```bash
git add .
git commit -m "feat: complete Milestone 1 scaffold"
git push origin milestone/01-scaffold
```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click **Import Project**
   - Select your GitHub repo
   - Vercel auto-detects Next.js

3. **Add Environment Variables:**
   - In Vercel project settings, go to **Environment Variables**
   - Add all variables from `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `OPENAI_API_KEY`
   - Don't add `NEXT_PUBLIC_VERCEL_URL` (auto-set by Vercel)

4. **Deploy:**
   - Click **Deploy**
   - Wait 1-2 minutes
   - Visit your production URL! 🎉

---

## 🎯 What's Next?

✅ **Milestone 1 Complete:** Project scaffold with working Next.js app

📍 **You are here**

⏭️ **Next: Milestone 2 - Authentication**

- Implement Supabase Auth
- Protected routes
- User sessions
- See `CODEFLOW.md` for details

---

## 📚 Documentation

- **README.md** - Complete project documentation
- **CODEFLOW.md** - Architecture and development roadmap
- **This file** - Quick setup instructions

---

## 🆘 Need Help?

1. Check **README.md** for detailed docs
2. Check **CODEFLOW.md** for architecture details
3. Review error messages in terminal
4. Check Supabase logs in dashboard
5. Open GitHub issue

---

## 🎉 Success Indicators

Your setup is successful when:

✅ Dev server runs at http://localhost:3000  
✅ Home page displays with navigation  
✅ All routes render (even if placeholder)  
✅ No console errors in browser DevTools  
✅ Supabase tables visible in dashboard  
✅ TypeScript compiles without errors  
✅ Linter passes with no errors

**Congratulations! You're ready to start Milestone 2! 🚀**

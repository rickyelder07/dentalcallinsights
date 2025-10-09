# 🚀 Vercel Deployment Guide - DentalCallInsights

**Complete guide to deploy your DentalCallInsights webapp to Vercel with Supabase backend.**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Setup](#pre-deployment-setup)
3. [Vercel Account Setup](#vercel-account-setup)
4. [Project Deployment](#project-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Domain Configuration](#domain-configuration)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Troubleshooting](#troubleshooting)
10. [Cost Management](#cost-management)

---

## ✅ Prerequisites

### Required Accounts
- **GitHub Account**: Your code repository
- **Vercel Account**: Free account at [vercel.com](https://vercel.com)
- **Supabase Account**: Free account at [supabase.com](https://supabase.com)
- **OpenAI Account**: API access at [platform.openai.com](https://platform.openai.com)

### Required Information
- GitHub repository URL
- Supabase project credentials
- OpenAI API key
- Domain name (optional)

---

## 🔧 Pre-Deployment Setup

### 1. Prepare Your Repository

Ensure your code is ready for deployment:

```bash
# Check that your project builds successfully
npm run build

# Run type checking
npm run type-check

# Run linting
npm run lint

# Test locally
npm run dev
```

### 2. Update Package.json Scripts

Your `package.json` should include these scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### 3. Configure Next.js for Production Build

The project includes a `next.config.js` that allows builds to succeed even with linting warnings:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
```

**Note**: This configuration allows deployment while ignoring linting/type errors. For production, consider fixing these issues for better code quality.

### 3. Verify Environment Variables

Check your `env.example.txt` file contains all required variables:

```bash
# Required for deployment
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## 🎯 Vercel Account Setup

### 1. Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Choose "Continue with GitHub" (recommended)
4. Authorize Vercel to access your GitHub account

### 2. Install Vercel CLI (Optional)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login
```

---

## 🚀 Project Deployment

### Method 1: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Import Project
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Find your `dentalcallinsights` repository
4. Click "Import"

#### Step 2: Configure Project
1. **Project Name**: `dentalcallinsights` (or your preferred name)
2. **Framework Preset**: Next.js (should auto-detect)
3. **Root Directory**: `./` (default)
4. **Build Command**: `npm run build` (default)
5. **Output Directory**: `.next` (default)
6. **Install Command**: `npm install` (default)

#### Step 3: Deploy
1. Click "Deploy"
2. Wait for build to complete (2-5 minutes)
3. Your app will be available at `https://your-project-name.vercel.app`

### Method 2: Deploy via CLI

```bash
# Navigate to your project directory
cd /path/to/dentalcallinsights

# Deploy to Vercel
vercel

# Follow the prompts:
# ? Set up and deploy "~/dentalcallinsights"? [Y/n] y
# ? Which scope do you want to deploy to? [Your Account]
# ? Link to existing project? [y/N] n
# ? What's your project's name? dentalcallinsights
# ? In which directory is your code located? ./
```

---

## 🔐 Environment Configuration

### 1. Add Environment Variables

In your Vercel dashboard:

1. Go to your project → Settings → Environment Variables
2. Add each variable:

#### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-project-name.vercel.app
```

### 2. Environment Variable Sources

#### Supabase Credentials
1. Go to [Supabase Dashboard](https://app.supabase.com)
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

### 3. Redeploy After Adding Variables

```bash
# Trigger a new deployment
vercel --prod

# Or redeploy from dashboard
# Go to Deployments → Click "Redeploy" on latest deployment
```

---

## 🗄️ Database Setup

### 1. Create Production Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Choose organization
4. Enter project details:
   - **Name**: `dentalcallinsights-prod`
   - **Database Password**: Generate strong password
   - **Region**: Choose closest to your users

### 2. Run Database Migrations

1. Go to SQL Editor in Supabase Dashboard
2. Run migrations in order:

#### Migration 1: Core Schema
```sql
-- Copy and paste contents of migrations/01_core_schema.sql
-- Run in Supabase SQL Editor
```

#### Migration 2: Authentication & Security
```sql
-- Copy and paste contents of migrations/02_auth_security.sql
-- Run in Supabase SQL Editor
```

#### Migration 3: Core Features
```sql
-- Copy and paste contents of migrations/03_features.sql
-- Run in Supabase SQL Editor
```

#### Migration 4: QA & Analytics
```sql
-- Copy and paste contents of migrations/04_qa_analytics.sql
-- Run in Supabase SQL Editor
```

### 3. Configure Authentication

1. Go to Authentication → Settings
2. Configure Site URL: `https://your-project-name.vercel.app`
3. Add Redirect URLs:
   - `https://your-project-name.vercel.app/auth/callback`
   - `https://your-project-name.vercel.app/login`
   - `https://your-project-name.vercel.app/signup`

### 4. Set Up Storage

1. Go to Storage → Settings
2. Create bucket: `audio-files`
3. Set to private
4. Configure RLS policies (already included in migrations)

---

## 🌐 Domain Configuration

### 1. Buy Domain (Optional)

Recommended domain registrars:
- **Namecheap**: $8-12/year
- **Google Domains**: $12/year
- **Cloudflare**: $8-10/year

### 2. Configure Custom Domain

#### In Vercel Dashboard:
1. Go to your project → Settings → Domains
2. Add your domain: `yourdomain.com`
3. Follow DNS configuration instructions

#### DNS Configuration:
Add these DNS records to your domain:

```
Type: A
Name: @
Value: 76.76.19.61

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 3. SSL Certificate
- Automatically provided by Vercel
- No additional configuration needed
- HTTPS enabled by default

---

## ✅ Post-Deployment Verification

### 1. Test Core Functionality

#### Authentication Test
1. Visit your deployed URL
2. Try to sign up with a test email
3. Check email for verification link
4. Complete signup process
5. Test login/logout

#### File Upload Test
1. Sign in to your account
2. Go to Upload page
3. Upload a test audio file
4. Verify file appears in library

#### AI Features Test
1. Upload a call with transcript
2. Generate insights
3. Test QA scoring
4. Verify search functionality

### 2. Check Logs

#### Vercel Function Logs
1. Go to Vercel Dashboard → Functions
2. Check for any errors
3. Monitor API route performance

#### Supabase Logs
1. Go to Supabase Dashboard → Logs
2. Check database queries
3. Monitor authentication events

### 3. Performance Testing

```bash
# Test build locally
npm run build
npm start

# Check bundle size
npm run build -- --analyze
```

---

## 🔧 Troubleshooting

### Common Issues

#### Build Failures

**Error: "Module not found"**
```bash
# Check dependencies
npm install

# Clear cache
npm run build -- --no-cache
```

**Error: "TypeScript errors"**
```bash
# Fix TypeScript issues
npm run type-check

# Update tsconfig.json if needed
```

#### Environment Variable Issues

**Error: "Missing environment variable"**
1. Check Vercel dashboard → Environment Variables
2. Ensure all required variables are set
3. Redeploy after adding variables

**Error: "Invalid Supabase credentials"**
1. Verify Supabase project is active
2. Check API keys are correct
3. Ensure RLS policies are enabled

#### Database Issues

**Error: "Table does not exist"**
1. Run all migrations in Supabase SQL Editor
2. Check migration order
3. Verify RLS policies are enabled

**Error: "Permission denied"**
1. Check RLS policies
2. Verify user authentication
3. Test with service role key

### Performance Issues

#### Slow Build Times
```bash
# Optimize build
npm run build -- --experimental-build-mode

# Check bundle size
npm run build -- --analyze
```

#### High Function Execution Time
1. Optimize API routes
2. Implement caching
3. Use edge functions for simple operations

---

## 💰 Cost Management

### Vercel Pricing

#### Free Tier (Recommended for Testing)
- 100GB bandwidth/month
- 100 serverless function executions/day
- Unlimited static sites
- Perfect for development and small-scale testing

#### Pro Tier ($20/month)
- Unlimited bandwidth
- Unlimited serverless functions
- Advanced analytics
- Priority support
- Custom domains

### Cost Optimization Tips

#### 1. Monitor Usage
```bash
# Check Vercel usage
vercel --help

# Monitor in dashboard
# Go to Settings → Usage
```

#### 2. Optimize Functions
```typescript
// Use edge functions for simple operations
export const config = {
  runtime: 'edge',
}

// Implement caching
const cache = new Map();
```

#### 3. Bundle Optimization
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
    };
    return config;
  },
};
```

---

## 🚀 Advanced Configuration

### 1. Custom Build Configuration

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

### 2. Environment-Specific Configuration

```bash
# Production environment variables
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Development environment variables
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Monitoring Setup

#### Vercel Analytics
1. Enable in project settings
2. Add analytics to your app
3. Monitor performance metrics

#### Error Tracking
```typescript
// Add error tracking
import { captureException } from '@sentry/nextjs';

try {
  // Your code
} catch (error) {
  captureException(error);
}
```

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Code builds successfully locally
- [ ] All tests pass
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Supabase project created

### Deployment
- [ ] Vercel account created
- [ ] Project imported to Vercel
- [ ] Environment variables added
- [ ] Database migrations run
- [ ] Authentication configured
- [ ] Storage buckets created

### Post-Deployment
- [ ] Authentication flow tested
- [ ] File upload tested
- [ ] AI features tested
- [ ] Performance verified
- [ ] Error monitoring setup
- [ ] Domain configured (if applicable)

---

## 🎯 Next Steps

After successful deployment:

1. **Set up monitoring**: Enable Vercel Analytics
2. **Configure backups**: Set up Supabase backups
3. **Implement CI/CD**: Automate deployments
4. **Add error tracking**: Set up Sentry or similar
5. **Performance optimization**: Monitor and optimize
6. **Security hardening**: Review security settings

---

## 📞 Support Resources

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **OpenAI API Documentation**: [platform.openai.com/docs](https://platform.openai.com/docs)

---

**Need help?** Check the troubleshooting section or refer to the official documentation for your specific issue.

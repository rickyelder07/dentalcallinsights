# Milestone 5: AI Insights - Quick Commands Reference

## 🚀 Setup Commands

### 1. Install Dependencies (if needed)
```bash
npm install
```

### 2. Configure Environment Variables
```bash
# Add to .env.local
echo "OPENAI_API_KEY=sk-your-key-here" >> .env.local
```

### 3. Run Database Migration
```bash
# In Supabase SQL Editor, execute:
# migrations/006_insights_schema.sql
```

Or via Supabase CLI:
```bash
supabase db push migrations/006_insights_schema.sql
```

### 4. Start Development Server
```bash
npm run dev
```

## 🧪 Testing Commands

### Run Linter
```bash
npm run lint
```

### Check TypeScript
```bash
npx tsc --noEmit
```

### Build for Production
```bash
npm run build
```

### Run Production Build Locally
```bash
npm run start
```

## 🗄️ Database Commands

### Verify Insights Table
```sql
-- Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'insights';

-- Check table structure
\d insights
```

### Verify RLS Policies
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'insights';

-- List all policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'insights';
```

### Check Insights Data
```sql
-- Count total insights
SELECT COUNT(*) FROM insights;

-- View recent insights
SELECT 
  call_id,
  summary_brief,
  overall_sentiment,
  generated_at
FROM insights
ORDER BY generated_at DESC
LIMIT 10;

-- Check sentiment distribution
SELECT 
  overall_sentiment, 
  COUNT(*) as count
FROM insights
GROUP BY overall_sentiment;

-- Check cache performance
SELECT 
  model_used,
  COUNT(*) as total_insights,
  AVG(EXTRACT(EPOCH FROM (NOW() - generated_at))/86400) as avg_age_days
FROM insights
GROUP BY model_used;
```

### Clean Up Test Data
```sql
-- Delete all insights (use with caution!)
DELETE FROM insights;

-- Delete insights for specific call
DELETE FROM insights WHERE call_id = 'your-call-id';

-- Delete old insights (older than 30 days)
DELETE FROM insights 
WHERE generated_at < NOW() - INTERVAL '30 days';
```

## 📊 Monitoring Commands

### Check OpenAI API Usage
```bash
# Visit OpenAI Dashboard
open https://platform.openai.com/usage
```

### Monitor Vercel Logs
```bash
# Install Vercel CLI
npm i -g vercel

# View logs
vercel logs
```

### Check Supabase Logs
```bash
# Via Supabase CLI
supabase logs

# Or visit dashboard
open https://app.supabase.com/project/_/logs
```

## 🔧 Troubleshooting Commands

### Clear Next.js Cache
```bash
rm -rf .next
npm run dev
```

### Reinstall Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Check Environment Variables
```bash
# Check if OpenAI key is set
echo $OPENAI_API_KEY

# Or in Node.js
node -e "console.log(process.env.OPENAI_API_KEY)"
```

### Test OpenAI Connection
```bash
# Create test script: test-openai.js
cat > test-openai.js << 'EOF'
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function test() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello!" }],
      max_tokens: 10
    });
    console.log('✅ OpenAI connection successful');
    console.log('Response:', completion.choices[0].message.content);
  } catch (error) {
    console.error('❌ OpenAI connection failed:', error.message);
  }
}

test();
EOF

# Run test
node test-openai.js

# Clean up
rm test-openai.js
```

### Verify API Routes
```bash
# Test generate endpoint (replace with actual auth token and call ID)
curl -X POST http://localhost:3000/api/insights/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{"callId": "YOUR_CALL_ID"}'
```

## 📝 Git Commands

### Commit Changes
```bash
# Stage all files
git add .

# Commit with message
git commit -m "feat: Implement Milestone 5 - AI Insights with GPT-4o

- Add GPT-4o integration for call insights
- Implement 4 core features: Summary, Sentiment, Actions, Red Flags
- Add smart caching (30-day TTL) to reduce API costs
- Add call length validation (6+ seconds)
- Create insights tab in call detail page
- Add export functionality (Text/JSON)
- Implement regenerate capability
- Add comprehensive documentation and tests
- Update README and CODEFLOW for Milestone 5"
```

### Push to Remote
```bash
# Push to milestone branch
git push origin milestone/05-ai-insights

# Or push to main (after review)
git push origin main
```

### Create Pull Request
```bash
# Via GitHub CLI
gh pr create --title "Milestone 5: AI Insights" \
  --body "Implements GPT-4o integration for call insights with summary, sentiment, actions, and red flags"

# Or visit GitHub
open https://github.com/YOUR_USERNAME/YOUR_REPO/compare/milestone/05-ai-insights
```

## 🚀 Deployment Commands

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Or via GitHub (automatic on push to main)
git push origin main
```

### Set Environment Variables on Vercel
```bash
# Via CLI
vercel env add OPENAI_API_KEY production

# Or via dashboard
open https://vercel.com/YOUR_PROJECT/settings/environment-variables
```

### Run Migrations on Production Supabase
```bash
# Via Supabase CLI
supabase db push --linked

# Or copy/paste SQL in Supabase dashboard
open https://app.supabase.com/project/YOUR_PROJECT/sql
```

## 📦 Package Management

### Add New Dependency
```bash
npm install package-name
```

### Update Dependencies
```bash
# Check for updates
npm outdated

# Update all
npm update

# Update specific package
npm update package-name
```

### Audit Security
```bash
npm audit
npm audit fix
```

## 🧹 Cleanup Commands

### Remove Build Artifacts
```bash
rm -rf .next
rm -rf out
rm -rf build
```

### Remove Temp Files
```bash
# Find and remove temp files
find . -name "*.log" -delete
find . -name ".DS_Store" -delete
```

### Clear Supabase Cache
```bash
# Reset Supabase migrations (use with caution!)
supabase db reset

# Or just clear cache
supabase db cache clear
```

## 📚 Documentation Commands

### Generate API Documentation
```bash
# If using TypeDoc
npx typedoc --out docs src
```

### View Documentation Locally
```bash
# Start simple HTTP server
npx serve docs

# Or use Python
python3 -m http.server 8000
```

## 🔍 Search Commands

### Find TODO Comments
```bash
grep -r "TODO" app/
grep -r "FIXME" lib/
```

### Find Console Logs
```bash
grep -r "console.log" app/
grep -r "console.error" lib/
```

### Find API Keys (Security Check)
```bash
# Check for accidentally committed secrets
grep -r "sk-" . --exclude-dir=node_modules
grep -r "OPENAI_API_KEY" . --exclude=.env.local --exclude-dir=node_modules
```

## 📊 Analytics Commands

### Count Lines of Code
```bash
# Total lines
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l

# By directory
wc -l app/**/*.tsx
wc -l lib/**/*.ts
wc -l types/**/*.ts
```

### Count Components
```bash
# Count React components
find app/components -name "*.tsx" | wc -l

# List all components
find app/components -name "*.tsx" -exec basename {} \;
```

### Count API Routes
```bash
# Count API routes
find app/api -name "route.ts" | wc -l

# List all routes
find app/api -name "route.ts"
```

## ⚡ Quick Start (Complete Setup)

```bash
# 1. Clone and setup
git clone YOUR_REPO
cd dentalcallinsights
npm install

# 2. Configure environment
cp env.example.txt .env.local
# Edit .env.local and add your keys

# 3. Run migrations
# Copy migrations/006_insights_schema.sql to Supabase SQL Editor and execute

# 4. Start dev server
npm run dev

# 5. Open browser
open http://localhost:3000
```

## 🎯 Testing Workflow

```bash
# 1. Run linter
npm run lint

# 2. Check TypeScript
npx tsc --noEmit

# 3. Build for production
npm run build

# 4. Test production build
npm run start

# 5. Run manual tests
# Follow MILESTONE_5_VERIFICATION.md checklist
```

## 📞 Support Commands

### Get Help
```bash
# Next.js help
npx next --help

# Supabase help
supabase --help

# Vercel help
vercel --help
```

### Check Versions
```bash
node --version
npm --version
npx next --version
```

### Generate System Info
```bash
npx envinfo --system --binaries --browsers
```

---

## 🔗 Useful Links

- **Local Dev**: http://localhost:3000
- **Supabase Dashboard**: https://app.supabase.com
- **OpenAI Dashboard**: https://platform.openai.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repo**: https://github.com/YOUR_USERNAME/YOUR_REPO

## 📝 Notes

- Always test locally before deploying
- Check OpenAI usage to monitor costs
- Back up database before running migrations
- Use environment variables for all secrets
- Never commit `.env.local` to version control


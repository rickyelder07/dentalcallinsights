# Milestone 7 Setup Guide

## Quick Start

Follow these steps to set up Milestone 7: Library & Analytics in your local environment.

## Prerequisites

- Completed Milestones 1-6
- Supabase project set up
- Node.js and npm installed
- Application running locally

## Setup Steps

### 1. Run Database Migrations

Open Supabase SQL Editor and run the following migrations in order:

#### Migration 010: Analytics Schema
```sql
-- Copy and paste contents of migrations/010_analytics_schema.sql
-- This creates:
-- - analytics_cache table
-- - call_tags table
-- - call_analytics_summary materialized view
-- - daily_call_trends materialized view
-- - Helper functions
```

#### Migration 011: Filter Presets Schema
```sql
-- Copy and paste contents of migrations/011_filter_presets_schema.sql
-- This creates:
-- - filter_presets table
-- - Related indexes and RLS policies
```

#### Migration 012: Export History Schema
```sql
-- Copy and paste contents of migrations/012_export_history_schema.sql
-- This creates:
-- - export_history table
-- - Helper functions for cleanup
```

### 2. Verify Database Setup

Run this verification query:

```sql
-- Check all tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'analytics_cache',
  'call_tags',
  'filter_presets',
  'export_history'
)
ORDER BY tablename;

-- Should return 4 rows
```

### 3. Refresh Materialized Views (First Time Only)

After you have some call data in your database:

```sql
-- Refresh analytics views
REFRESH MATERIALIZED VIEW call_analytics_summary;
REFRESH MATERIALIZED VIEW daily_call_trends;
```

### 4. Install Dependencies (if needed)

```bash
npm install
```

No new dependencies are required for Milestone 7.

### 5. Start Development Server

```bash
npm run dev
```

### 6. Test the Implementation

#### Test Analytics Dashboard
1. Navigate to `http://localhost:3000/analytics`
2. You should see the analytics dashboard
3. If you have calls with insights, you'll see statistics
4. If no calls, you'll see an empty state

#### Test Enhanced Library
1. Navigate to `http://localhost:3000/library` or `http://localhost:3000/library-enhanced`
2. You should see your calls in card format
3. Test filters (search, status, sentiment)
4. Select calls and test bulk actions
5. Test export functionality

### 7. Update Navigation (Optional)

Add analytics link to your navigation component:

**File:** `app/components/navigation.tsx` (if it exists)

```typescript
// Add to navigation links:
{
  name: 'Analytics',
  href: '/analytics',
  icon: BarChartIcon, // or your preferred icon
}
```

Or update the existing navigation/page to include the analytics dashboard link.

## Verification Checklist

### Database
- [ ] analytics_cache table exists
- [ ] call_tags table exists
- [ ] filter_presets table exists
- [ ] export_history table exists
- [ ] call_analytics_summary view exists
- [ ] daily_call_trends view exists
- [ ] RLS policies active on all new tables

### API Endpoints
- [ ] `/api/analytics/overview` responds
- [ ] `/api/analytics/trends` responds
- [ ] `/api/analytics/sentiment` responds
- [ ] `/api/analytics/performance` responds
- [ ] `/api/analytics/export` works

### UI Components
- [ ] Analytics dashboard loads
- [ ] Enhanced library displays calls
- [ ] Filters work correctly
- [ ] Bulk actions appear when selecting calls
- [ ] Export modal opens and works

## Common Setup Issues

### Issue: "Table does not exist" error
**Solution:** Run the database migrations in the correct order (010, 011, 012)

### Issue: Analytics shows all zeros
**Solution:** 
1. Ensure you have calls in the database
2. Ensure calls have transcripts
3. Ensure insights have been generated
4. Refresh materialized views:
```sql
REFRESH MATERIALIZED VIEW call_analytics_summary;
REFRESH MATERIALIZED VIEW daily_call_trends;
```

### Issue: RLS policy errors
**Solution:** Verify RLS is enabled:
```sql
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('analytics_cache', 'call_tags', 'filter_presets', 'export_history');
-- All should show rowsecurity = true
```

### Issue: "Unauthorized" errors in analytics
**Solution:** 
1. Ensure you're logged in
2. Check that Authorization header is being sent
3. Verify your session token is valid

### Issue: Materialized views not updating
**Solution:** Set up a periodic refresh (recommended: daily)
```sql
-- Run this daily (can be automated with a cron job or pg_cron)
SELECT refresh_analytics_views();
```

## Optional Enhancements

### 1. Add Navigation Link to Analytics

Update your main navigation to include the analytics dashboard:

```typescript
// In your navigation component
<Link href="/analytics" className="nav-link">
  <ChartBarIcon className="w-5 h-5" />
  <span>Analytics</span>
</Link>
```

### 2. Replace Original Library with Enhanced Version

If you want to use the enhanced library page:

```bash
# Backup original
mv app/library/page.tsx app/library/page-original.tsx

# Copy enhanced version
cp app/library-enhanced/page.tsx app/library/page.tsx
```

Or simply update references to use `/library-enhanced` instead of `/library`.

### 3. Schedule Materialized View Refresh

Set up a daily refresh using Supabase Functions or a cron job:

```sql
-- Using pg_cron (if available in your Supabase instance)
SELECT cron.schedule(
  'refresh-analytics-views',
  '0 2 * * *', -- Daily at 2 AM
  $$SELECT refresh_analytics_views()$$
);
```

### 4. Add Custom Filter Presets

Create some default filter presets for users:

```sql
-- Insert predefined filter presets
INSERT INTO filter_presets (user_id, name, description, filters, is_default)
VALUES 
  (auth.uid(), 'Recent Positive Calls', 'Positive calls from last 7 days', 
   '{"sentiment": ["positive"], "dateRange": {"start": "2025-10-01", "end": "2025-10-07"}}'::jsonb, 
   false),
  (auth.uid(), 'Needs Attention', 'Calls with red flags', 
   '{"hasRedFlags": true}'::jsonb, 
   false);
```

## Testing Your Setup

### 1. Basic Functionality Test
```bash
# 1. Start the dev server
npm run dev

# 2. Open browser to http://localhost:3000

# 3. Log in

# 4. Navigate to /analytics
# Should load without errors

# 5. Navigate to /library or /library-enhanced
# Should display calls

# 6. Select a call and try export
# Should open export modal
```

### 2. API Test
```bash
# Get your access token from browser console:
# supabase.auth.getSession().then(({data}) => console.log(data.session.access_token))

# Test analytics endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/analytics/overview

# Should return JSON with analytics data
```

## Deployment to Production

### Vercel Deployment
```bash
# Build and deploy
vercel --prod

# Or if using Vercel Git integration:
git push origin milestone/07-library-analytics
# Vercel will auto-deploy
```

### Post-Deployment Steps
1. Run database migrations in production Supabase
2. Refresh materialized views
3. Test analytics dashboard in production
4. Verify RLS policies are active
5. Test export functionality
6. Monitor for any errors in Vercel logs

## Maintenance

### Daily Tasks (Automated)
- Refresh materialized views
- Clean expired analytics cache
- Clean expired exports

```sql
-- Set up as a daily cron job or Supabase Function
SELECT refresh_analytics_views();
SELECT clean_expired_analytics_cache();
SELECT clean_expired_exports();
```

### Weekly Tasks
- Monitor analytics cache size
- Review export history
- Check for slow queries
- Verify RLS performance

### Monthly Tasks
- Review and optimize indexes
- Analyze query performance
- Check storage usage
- Review user feedback

## Support Resources

- **Database Schema**: See `migrations/010-012_*.sql`
- **API Documentation**: See `MILESTONE_7_COMPLETE.md`
- **Verification Guide**: See `MILESTONE_7_VERIFICATION.md`
- **TypeScript Types**: See `types/analytics.ts`, `types/filters.ts`, `types/export.ts`

## Next Steps

After setting up Milestone 7:

1. ✅ Test all features thoroughly
2. ✅ Add navigation links to analytics
3. ✅ Customize filter presets for your users
4. ✅ Set up automated view refresh
5. ✅ Deploy to production
6. ✅ Monitor analytics usage
7. ✅ Collect user feedback

---

**You're ready to use Milestone 7! 🎉**

For detailed verification, see `MILESTONE_7_VERIFICATION.md`.
For complete documentation, see `MILESTONE_7_COMPLETE.md`.


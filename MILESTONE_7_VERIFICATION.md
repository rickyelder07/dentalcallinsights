# Milestone 7: Library & Analytics - Verification Guide

## Quick Verification Checklist

Use this checklist to verify that Milestone 7 is properly implemented and working.

## ✅ Database Verification

### 1. Check Tables Exist
Run in Supabase SQL Editor:
```sql
-- Verify all new tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'analytics_cache',
  'call_tags',
  'filter_presets',
  'export_history'
)
ORDER BY tablename;

-- Expected: 4 rows
```

### 2. Check Materialized Views
```sql
-- Verify materialized views
SELECT matviewname FROM pg_matviews 
WHERE schemaname = 'public'
AND matviewname IN (
  'call_analytics_summary',
  'daily_call_trends'
)
ORDER BY matviewname;

-- Expected: 2 rows
```

### 3. Verify RLS Policies
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'analytics_cache',
  'call_tags',
  'filter_presets',
  'export_history'
);

-- All should show rowsecurity = true
```

### 4. Check Indexes
```sql
-- Verify indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
  'analytics_cache',
  'call_tags',
  'filter_presets',
  'export_history',
  'calls'
)
ORDER BY tablename, indexname;

-- Should show multiple indexes per table
```

### 5. Test Helper Functions
```sql
-- Test analytics cache cleanup function
SELECT clean_expired_analytics_cache();

-- Test export cleanup function
SELECT clean_expired_exports();

-- Test materialized view refresh
SELECT refresh_analytics_views();

-- All should execute without errors
```

## ✅ TypeScript Types Verification

### 1. Check Type Files Exist
```bash
ls -la types/analytics.ts
ls -la types/filters.ts
ls -la types/export.ts

# All files should exist
```

### 2. Verify Type Definitions
```bash
# Check for TypeScript errors
npm run type-check

# Should complete without errors
```

## ✅ Library Utilities Verification

### 1. Check Utility Files
```bash
ls -la lib/analytics.ts
ls -la lib/filters.ts
ls -la lib/export.ts
ls -la lib/pagination.ts

# All files should exist
```

### 2. Test Import Statements
Create a test file or check in existing components:
```typescript
import { computeOverviewAnalytics } from '@/lib/analytics'
import { applyFilters, applySorting } from '@/lib/filters'
import { convertToCSV, convertToJSON } from '@/lib/export'
import { paginateArray } from '@/lib/pagination'

// Should import without errors
```

## ✅ Component Verification

### 1. Check Component Files
```bash
ls -la app/components/CallCard.tsx
ls -la app/components/CallList.tsx
ls -la app/components/BulkActions.tsx
ls -la app/components/ExportModal.tsx

# All files should exist
```

### 2. Verify Component Props
Check that components accept proper props (TypeScript should validate):
- CallCard: call, selected, onSelect, showCheckbox
- CallList: calls, selectedCalls, onSelectCall, loading, etc.
- BulkActions: selectedCalls, calls, onClearSelection, etc.
- ExportModal: isOpen, onClose, selectedCallIds, totalCalls

## ✅ API Endpoints Verification

### 1. Check API Routes Exist
```bash
ls -la app/api/analytics/overview/route.ts
ls -la app/api/analytics/trends/route.ts
ls -la app/api/analytics/sentiment/route.ts
ls -la app/api/analytics/topics/route.ts
ls -la app/api/analytics/performance/route.ts
ls -la app/api/analytics/export/route.ts

# All files should exist
```

### 2. Test Analytics Overview Endpoint
```bash
# In browser console or using curl (replace with your token)
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3000/api/analytics/overview

# Should return JSON with analytics data
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalCalls": 10,
    "transcribedCalls": 8,
    "callsWithInsights": 5,
    ...
  },
  "cached": false
}
```

### 3. Test Trends Endpoint
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3000/api/analytics/trends?period=day

# Should return trend data
```

### 4. Test Sentiment Endpoint
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3000/api/analytics/sentiment

# Should return sentiment distribution
```

### 5. Test Performance Endpoint
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3000/api/analytics/performance

# Should return performance metrics
```

### 6. Test Export Endpoint
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format":"csv","callIds":["YOUR_CALL_ID"],"fields":{"filename":true,"callTime":true}}' \
  http://localhost:3000/api/analytics/export

# Should return CSV content or download file
```

## ✅ Page Verification

### 1. Analytics Dashboard
1. Navigate to `/analytics`
2. Verify page loads without errors
3. Check that overview stats display
4. Verify sentiment analysis shows
5. Check performance metrics render
6. Test refresh button
7. Verify empty state (if no calls)

**Expected Elements:**
- Overview statistics (4 cards)
- Sentiment distribution chart
- Patient satisfaction breakdown
- Performance metrics
- Trends visualization (if data exists)

### 2. Enhanced Library Page
1. Navigate to `/library-enhanced` or `/library`
2. Verify calls display in card format
3. Check that filters work (status, sentiment, search)
4. Test call selection (checkboxes)
5. Verify bulk actions bar appears when calls selected
6. Test bulk operations buttons
7. Test export modal opens

**Expected Elements:**
- Call stats (4 cards at top)
- Filter controls (search, status dropdown, sentiment dropdown)
- Call cards with status badges
- Bulk actions bar (when calls selected)
- Pagination or infinite scroll

## ✅ Functional Testing

### Test 1: View Analytics
**Steps:**
1. Log in to application
2. Navigate to `/analytics`
3. Verify overview data displays
4. Click "Refresh" button
5. Check that data updates

**Expected:**
- ✅ Analytics load without errors
- ✅ Overview stats show accurate numbers
- ✅ Sentiment distribution displays
- ✅ Refresh works and updates timestamp

### Test 2: Filter Calls
**Steps:**
1. Navigate to `/library` or `/library-enhanced`
2. Type search query (e.g., filename)
3. Select status filter (e.g., "Transcribed")
4. Select sentiment filter (e.g., "Positive")
5. Verify filtered results

**Expected:**
- ✅ Search filters calls in real-time
- ✅ Status filter works correctly
- ✅ Sentiment filter works correctly
- ✅ Filters can be combined
- ✅ Filtered count updates

### Test 3: Bulk Transcription
**Steps:**
1. Select 2-3 calls without transcripts
2. Click "Transcribe Selected"
3. Confirm the operation
4. Wait for completion

**Expected:**
- ✅ Cost estimation shows in confirmation
- ✅ Transcription starts for selected calls
- ✅ Success message appears
- ✅ Selection clears after operation
- ✅ Calls refresh to show new status

### Test 4: Bulk AI Insights
**Steps:**
1. Select 2-3 calls with completed transcripts
2. Click "AI Insights"
3. Confirm the operation
4. Wait for completion

**Expected:**
- ✅ Only calls with transcripts can be selected
- ✅ Insights generation starts
- ✅ Success message appears
- ✅ Insights show in call cards after refresh

### Test 5: Bulk Embeddings
**Steps:**
1. Select 2-3 calls with transcripts
2. Click "Generate Embeddings"
3. Confirm the operation
4. Wait for completion

**Expected:**
- ✅ Embeddings generation starts
- ✅ Success message appears
- ✅ "Searchable" badge appears on calls

### Test 6: Export CSV
**Steps:**
1. Select 3-5 calls
2. Click "Export"
3. Select "CSV" format
4. Choose fields to include
5. Click "Export CSV"
6. Verify file downloads

**Expected:**
- ✅ Export modal opens
- ✅ Format selection works
- ✅ Field checkboxes work
- ✅ File size estimate shows
- ✅ CSV file downloads
- ✅ CSV contains correct data

### Test 7: Export JSON
**Steps:**
1. Select 3-5 calls
2. Click "Export"
3. Select "JSON" format
4. Choose fields to include
5. Click "Export JSON"
6. Verify file downloads

**Expected:**
- ✅ JSON format selected
- ✅ File downloads
- ✅ JSON is valid and formatted
- ✅ Contains metadata and call data

### Test 8: Analytics Caching
**Steps:**
1. Navigate to `/analytics`
2. Open browser DevTools Network tab
3. Refresh page
4. Check API responses
5. Refresh again immediately

**Expected:**
- ✅ First load: `"cached": false`
- ✅ Second load: `"cached": true`
- ✅ Response time faster on cached load

## ✅ Security Verification

### 1. RLS Policy Test
**Steps:**
1. Log in as User A
2. Note your user ID (from browser console: `supabase.auth.getUser()`)
3. Try to access another user's analytics cache in database
4. Should be denied

**SQL Test:**
```sql
-- As logged-in user, try to access other user's data
SELECT * FROM analytics_cache WHERE user_id != auth.uid();

-- Should return 0 rows (even if other data exists)
```

### 2. API Authorization Test
**Steps:**
1. Try to access `/api/analytics/overview` without auth header
2. Should return 401 Unauthorized

```bash
curl http://localhost:3000/api/analytics/overview

# Expected: {"success":false,"error":"Unauthorized"}
```

### 3. Service Key Exposure Check
**Steps:**
1. Search all client-side code for service role key
2. Should only be in server-side files

```bash
# Should return 0 results in client components
grep -r "SUPABASE_SERVICE_ROLE_KEY" app/components/
grep -r "SUPABASE_SERVICE_ROLE_KEY" app/analytics/
grep -r "SUPABASE_SERVICE_ROLE_KEY" app/library/

# Should only appear in lib/supabase-server.ts
```

## ✅ Performance Verification

### 1. Analytics Load Time
**Target:** < 2 seconds

**Test:**
1. Open DevTools Network tab
2. Navigate to `/analytics`
3. Check total load time
4. Should be under 2 seconds

### 2. Filter Response Time
**Target:** < 500ms

**Test:**
1. Navigate to `/library`
2. Type in search box
3. Observe filter response time
4. Should be near-instant (< 500ms)

### 3. Bulk Operation Completion
**Target:** < 30 seconds for 100 calls

**Test:**
1. Select 10-20 calls
2. Start bulk operation
3. Time until completion
4. Should complete reasonably quickly

### 4. Export Generation
**Target:** < 10 seconds for 1,000 calls

**Test:**
1. Select many calls (10-50)
2. Start CSV export
3. Time until download
4. Should be under 10 seconds

## ✅ Error Handling Verification

### 1. No Calls Empty State
**Steps:**
1. Navigate to `/analytics` with no calls in database
2. Verify empty state shows
3. Check "Upload Calls" button works

### 2. Network Error Handling
**Steps:**
1. Block network in DevTools
2. Try to load analytics
3. Verify error message displays
4. Restore network and refresh

### 3. Invalid Export Format
**Steps:**
1. Try to export with no calls selected
2. Verify error message shows

## ✅ Mobile Responsiveness

### 1. Analytics Dashboard (Mobile)
**Steps:**
1. Open `/analytics` on mobile device or resize browser
2. Verify layout adjusts
3. Check all cards stack properly
4. Verify charts are readable

### 2. Library (Mobile)
**Steps:**
1. Open `/library` on mobile
2. Verify call cards stack
3. Check filters work
4. Verify bulk actions accessible

## 🎯 Final Verification Summary

Run through this quick checklist to ensure everything works:

- [ ] All 3 database migrations ran successfully
- [ ] Materialized views created and can be refreshed
- [ ] RLS policies are active on all new tables
- [ ] All TypeScript type files exist and compile
- [ ] All utility functions exist and can be imported
- [ ] All React components exist and render without errors
- [ ] All 6 analytics API endpoints respond correctly
- [ ] Analytics dashboard loads and displays data
- [ ] Enhanced library page works with new components
- [ ] Filtering works (search, status, sentiment)
- [ ] Bulk transcription works
- [ ] Bulk insights generation works
- [ ] Bulk embeddings generation works
- [ ] CSV export works
- [ ] JSON export works
- [ ] Caching works (check "cached" flag in responses)
- [ ] RLS prevents cross-user data access
- [ ] No service role key exposed to client
- [ ] Performance meets targets (< 2s analytics load)
- [ ] Mobile responsiveness works
- [ ] Error handling works (empty states, network errors)

## 📊 Success Metrics

After verification, confirm these metrics:

### Technical Performance
- ✅ Analytics load time: < 2 seconds
- ✅ Filter response time: < 500ms
- ✅ Export generation: < 10 seconds
- ✅ Bulk operations: Complete successfully

### User Experience
- ✅ Library navigation: Smooth and responsive
- ✅ Filter usability: Intuitive and fast
- ✅ Export success rate: > 95%
- ✅ Mobile experience: Fully functional

### Business Impact
- ✅ Analytics provide actionable insights
- ✅ Bulk operations save time
- ✅ Export enables external analysis
- ✅ Filters enable quick call discovery

## 🐛 Common Issues & Solutions

### Issue: Analytics showing "0" for all values
**Solution:** Ensure you have uploaded calls, transcribed them, and generated insights.

### Issue: "Unauthorized" error on analytics endpoints
**Solution:** Check that you're logged in and access token is being sent in Authorization header.

### Issue: Materialized views not updating
**Solution:** Manually refresh views:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY call_analytics_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_call_trends;
```

### Issue: Export modal not opening
**Solution:** Ensure calls are selected first. Check browser console for errors.

### Issue: Bulk operations not working
**Solution:** Check API endpoints are accessible. Verify calls meet criteria (e.g., transcribed for insights).

### Issue: Caching not working
**Solution:** Check analytics_cache table for records. Verify expires_at is in the future.

---

**If all checkmarks are complete, Milestone 7 is successfully implemented! 🎉**


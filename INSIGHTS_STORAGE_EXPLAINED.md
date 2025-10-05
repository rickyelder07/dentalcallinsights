# AI Insights: Storage & Generation Flow

## How It Works: "Generate Once, Store Forever"

The AI Insights system is designed to **generate insights only once** and store them permanently in your SQL database. This ensures:
- ✅ **Cost Efficiency**: No redundant OpenAI API calls
- ✅ **Fast Loading**: Instant retrieval from database
- ✅ **Data Permanence**: Insights are never lost
- ✅ **Predictable Costs**: Each call is analyzed only once (unless manually regenerated)

---

## 📊 The Complete Flow

### First Time Viewing (Cold Start)

```
User clicks "AI Insights" tab
         ↓
Component checks database
         ↓
   No insights found
         ↓
Makes ONE API call to GPT-4o (~$0.01-0.03)
         ↓
Saves insights to database
         ↓
Displays insights to user
```

### Subsequent Views (Hot Load)

```
User clicks "AI Insights" tab
         ↓
Component checks database
         ↓
   Insights found! ✓
         ↓
Loads from database (FREE, instant)
         ↓
Displays cached insights
         ↓
Shows "💾 Loaded from database"
```

### Manual Regeneration

```
User clicks "Regenerate" button
         ↓
Bypasses cache check
         ↓
Makes new API call to GPT-4o (~$0.01-0.03)
         ↓
Updates existing record in database (UPSERT)
         ↓
Displays fresh insights
         ↓
Shows "✨ Freshly generated and saved"
```

---

## 🔍 Technical Implementation

### 1. Frontend Component (`InsightsPanel.tsx`)

**On Mount:**
```tsx
// Step 1: Check database first
const { data: existingInsights } = await supabase
  .from('insights')
  .select('*')
  .eq('call_id', callId)
  .single()

// Step 2: If found, use it (no API call)
if (existingInsights && !fetchError) {
  setInsights(existingInsights)
  setCached(true)
  return // EXIT - No API call needed!
}

// Step 3: If not found, generate (ONE TIME ONLY)
const response = await fetch('/api/insights/generate', ...)
```

**Result:**
- Database hit: Instant load, $0.00 cost
- Database miss: Generate once, save forever

### 2. Backend API (`/api/insights/generate/route.ts`)

**Request Flow:**
```typescript
// Check if insights already exist
const { data: existingInsights } = await supabase
  .from('insights')
  .select('*')
  .eq('call_id', callId)
  .single()

// If found and valid, return immediately
if (existingInsights && cacheValid) {
  return existingInsights // No OpenAI call!
}

// If not found, generate with GPT-4o
const insights = await generateInsightsWithRetry(...)

// Save permanently to database
await supabase.from('insights').upsert({
  call_id: callId,
  ...insights,
  generated_at: NOW(),
}, { onConflict: 'call_id' })
```

**Result:**
- One insight record per call
- UPSERT ensures no duplicates
- Unique constraint on `call_id`

### 3. Database Schema

**Table: `insights`**
```sql
CREATE TABLE insights (
    id UUID PRIMARY KEY,
    call_id UUID NOT NULL REFERENCES calls(id),
    user_id UUID NOT NULL,
    
    -- Insight data stored permanently
    summary_brief TEXT NOT NULL,
    summary_key_points TEXT[] NOT NULL,
    call_outcome TEXT,
    overall_sentiment TEXT NOT NULL,
    patient_satisfaction TEXT,
    staff_performance TEXT,
    action_items JSONB NOT NULL DEFAULT '[]',
    red_flags JSONB NOT NULL DEFAULT '[]',
    
    -- Metadata
    model_used TEXT DEFAULT 'gpt-4o',
    transcript_hash TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- ONE record per call
    UNIQUE(call_id)
);
```

**Key Points:**
- `UNIQUE(call_id)` ensures one record per call
- UPSERT handles both insert and update
- RLS policies ensure user data isolation

---

## 💰 Cost Analysis

### Scenario 1: New Call (First View)
- **Database Query**: FREE
- **OpenAI API Call**: ~$0.01-0.03
- **Database Write**: FREE
- **Total**: ~$0.01-0.03

### Scenario 2: Existing Call (Re-view)
- **Database Query**: FREE
- **OpenAI API Call**: $0.00 (skipped!)
- **Total**: $0.00

### Scenario 3: Manual Regeneration
- **Database Query**: FREE
- **OpenAI API Call**: ~$0.01-0.03
- **Database Update**: FREE
- **Total**: ~$0.01-0.03

### Real-World Example

**100 calls, viewed 10 times each:**

**Without caching (naive approach):**
- 100 calls × 10 views × $0.02 = **$20.00**

**With our system:**
- 100 calls × 1 generation × $0.02 = **$2.00**
- 100 calls × 9 cached views × $0.00 = **$0.00**
- **Total: $2.00** (90% savings!)

---

## 🔄 When Insights Are Regenerated

Insights are **automatically regenerated** only when:

1. **Transcript Changed**
   - Hash comparison detects modification
   - Old insights may be inaccurate
   - Fresh analysis needed

2. **Cache Expired**
   - Insights older than 30 days
   - Ensures data stays fresh
   - Configurable TTL

3. **Manual Regeneration**
   - User clicks "Regenerate" button
   - Forces fresh analysis
   - Updates database record

**Insights are NEVER regenerated:**
- On page refresh
- On tab switch
- On browser reload
- On app restart
- When viewing from library

---

## 🎯 Verification

### Check Database Storage

```sql
-- View all stored insights
SELECT 
  call_id,
  summary_brief,
  overall_sentiment,
  generated_at,
  model_used
FROM insights
WHERE user_id = auth.uid()
ORDER BY generated_at DESC;

-- Count insights per user
SELECT user_id, COUNT(*) as total_insights
FROM insights
GROUP BY user_id;

-- Check for duplicates (should be 0)
SELECT call_id, COUNT(*) as count
FROM insights
GROUP BY call_id
HAVING COUNT(*) > 1;
```

### Monitor API Calls

**In browser console:**
```javascript
// First view - should see API call
// Network tab shows: POST /api/insights/generate

// Second view - should NOT see API call
// Loaded from database directly
```

**In Supabase logs:**
```sql
-- Check insights creation
SELECT * FROM insights 
WHERE call_id = 'YOUR_CALL_ID'
ORDER BY created_at DESC;

-- Verify only one record exists
SELECT COUNT(*) FROM insights 
WHERE call_id = 'YOUR_CALL_ID';
-- Should return: 1
```

---

## 📋 User Experience Indicators

### First Generation
```
✨ Freshly generated and saved
```
- Insights just created
- OpenAI API call was made
- Saved to database

### Loaded from Database
```
💾 Loaded from database (generated previously)
```
- Insights retrieved from database
- No API call made
- Instant load
- Zero cost

### Processing
```
Generating insights...
Usually takes 5-10 seconds
```
- OpenAI API call in progress
- First time only
- Loading skeletons shown

---

## 🔒 Data Integrity

### Unique Constraint
```sql
UNIQUE(call_id)
```
- Prevents duplicate insights
- Enforced at database level
- UPSERT updates existing record

### Row Level Security
```sql
-- Users can only see their own insights
CREATE POLICY "Users can view own insights" ON insights
FOR SELECT USING (user_id = auth.uid());
```
- User data isolation
- No cross-user access
- Secure by design

### Transcript Hash
```typescript
generateTranscriptHash(transcript) // SHA-256
```
- Detects transcript changes
- Triggers regeneration
- Ensures accuracy

---

## 🚀 Performance Benefits

### Database Load
- **First View**: 1 SELECT + 1 INSERT
- **Subsequent Views**: 1 SELECT only
- **Regenerate**: 1 SELECT + 1 UPDATE

### API Efficiency
- **First View**: 1 OpenAI API call
- **Subsequent Views**: 0 API calls
- **Regenerate**: 1 OpenAI API call

### User Experience
- **First Load**: 5-10 seconds (GPT-4o processing)
- **Cached Load**: <1 second (database query)
- **Smooth Experience**: Loading states, no delays

---

## 📊 Cache Statistics

You can track cache hit rates:

```sql
-- Cache hit rate (views without regeneration)
SELECT 
  COUNT(DISTINCT call_id) as total_calls,
  SUM(CASE WHEN updated_at > created_at + INTERVAL '1 minute' 
      THEN 1 ELSE 0 END) as regenerated_count,
  (COUNT(DISTINCT call_id) - SUM(CASE WHEN updated_at > created_at + INTERVAL '1 minute' 
      THEN 1 ELSE 0 END)) as cached_count
FROM insights
WHERE user_id = auth.uid();
```

---

## ✅ Summary

**The system ensures:**
1. ✅ Insights generated **once per call**
2. ✅ Stored **permanently in database**
3. ✅ Loaded **instantly on subsequent views**
4. ✅ Regenerated only when **necessary or requested**
5. ✅ **Zero redundant API calls**
6. ✅ **Predictable costs**
7. ✅ **Fast user experience**

**Cost Efficiency:**
- First view: ~$0.02
- All subsequent views: $0.00
- 90%+ cost savings from caching

**User Experience:**
- First view: 5-10 seconds (one-time)
- All subsequent views: <1 second (cached)
- Clear status indicators
- Manual regeneration available

This is the most cost-effective and performant approach for AI insights! 🎉


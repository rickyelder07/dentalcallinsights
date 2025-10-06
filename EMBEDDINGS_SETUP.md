# Embeddings and Search Setup Guide

## Overview

This guide walks through setting up vector embeddings and semantic search for the DentalCallInsights platform using pgvector and OpenAI's text-embedding-3-small model.

## Prerequisites

- Supabase project with Postgres database
- OpenAI API key
- Node.js 18+ environment
- Completed Milestones 1-5

## Step 1: Enable pgvector Extension

### Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Extensions**
3. Search for "vector"
4. Click **Enable** on the `vector` extension
5. Confirm the extension is enabled

### Via SQL (Alternative)

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Verification

```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
```

Expected output:
```
extname | extversion
--------|------------
vector  | 0.5.1 (or similar)
```

## Step 2: Run Database Migrations

### Migration 007: Embeddings Schema

Run the embeddings schema migration:

```bash
# Via Supabase CLI
supabase migration new embeddings_schema
# Copy contents of migrations/007_embeddings_schema.sql
supabase db push
```

Or via SQL Editor in Supabase Dashboard:
1. Navigate to **SQL Editor**
2. Create new query
3. Paste contents of `migrations/007_embeddings_schema.sql`
4. Click **Run**

### Migration 008: Search Analytics Schema

Run the search analytics migration:

```bash
# Via Supabase CLI
supabase migration new search_analytics_schema
# Copy contents of migrations/008_search_analytics_schema.sql
supabase db push
```

### Verify Migrations

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('embeddings', 'embedding_costs', 'search_queries', 'search_result_clicks');

-- Check vector column
SELECT column_name, udt_name FROM information_schema.columns 
WHERE table_name = 'embeddings' AND column_name = 'embedding';

-- Check HNSW index
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'embeddings' AND indexname = 'idx_embeddings_vector';
```

Expected: All 4 tables exist, embedding column has type `vector`, HNSW index exists.

## Step 3: Configure Environment Variables

### Required Variables

Add to your `.env.local`:

```bash
# OpenAI (required for embeddings)
OPENAI_API_KEY=sk-...

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
```

### Verify Configuration

```typescript
// Test in your API route or server component
import { validateEmbeddingConfig } from '@/lib/embeddings'

const validation = validateEmbeddingConfig()
console.log(validation) // Should be { valid: true }
```

## Step 4: Test Embedding Generation

### Via API (Recommended)

```bash
# Get auth token from your session
TOKEN="your_session_token_here"

# Test single embedding generation
curl -X POST http://localhost:3000/api/search/embeddings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"callId": "your-call-id-here"}'
```

Expected response:
```json
{
  "success": true,
  "embeddingId": "uuid-here",
  "cached": false,
  "tokenCount": 1234,
  "cost": 0.00002468
}
```

### Via UI (Easiest)

1. Go to **Library** page
2. Select calls with completed transcripts
3. Click **🔍 Generate Embeddings** button
4. Confirm the cost estimate
5. Wait for completion (progress shown inline)

### Via Database Query

After generating some embeddings:

```sql
SELECT 
  id, 
  call_id, 
  embedding_model, 
  token_count,
  content_hash,
  generated_at
FROM embeddings
ORDER BY generated_at DESC
LIMIT 5;
```

## Step 5: Test Semantic Search

### Via UI (Recommended)

1. Go to **Library** page
2. Click **Semantic Search** tab
3. Enter a natural language query:
   - "calls about billing issues"
   - "emergency dental situations"
   - "patients asking about appointment times"
4. Review results with similarity scores

### Via API

```bash
curl -X POST http://localhost:3000/api/search/semantic \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "billing problems",
    "limit": 10,
    "threshold": 0.7
  }'
```

Expected response:
```json
{
  "success": true,
  "query": "billing problems",
  "results": [
    {
      "callId": "uuid",
      "filename": "call_123.mp3",
      "similarity": 0.87,
      "transcriptPreview": "...",
      "sentiment": "negative",
      "hasRedFlags": true
    }
  ],
  "totalResults": 5,
  "searchTime": 127
}
```

## Step 6: Performance Optimization

### Index Tuning

The HNSW index is created with default parameters:
- `m = 16` (connections per layer)
- `ef_construction = 64` (construction quality)

For better performance with large datasets (>10,000 calls):

```sql
-- Drop existing index
DROP INDEX IF EXISTS idx_embeddings_vector;

-- Recreate with optimized parameters
CREATE INDEX idx_embeddings_vector ON embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 128);
```

Trade-offs:
- Higher values = Better accuracy, slower indexing, more memory
- Lower values = Faster indexing, less memory, slightly lower accuracy

### Search Performance

```sql
-- Measure search performance
EXPLAIN ANALYZE
SELECT 
  call_id,
  1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM embeddings
WHERE user_id = 'your-user-id'
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 20;
```

Target: <50ms for typical searches

## Step 7: Monitor Usage and Costs

### Check Embedding Coverage

```sql
SELECT * FROM user_embedding_stats WHERE user_id = 'your-user-id';
```

Returns:
- Total calls with embeddings
- Total tokens used
- Average tokens per call
- Last generation date

### Check Costs

```sql
SELECT 
  COUNT(*) as total_operations,
  SUM(token_count) as total_tokens,
  SUM(cost_usd) as total_cost,
  operation_type
FROM embedding_costs
WHERE user_id = 'your-user-id'
GROUP BY operation_type;
```

### Search Analytics

```sql
SELECT * FROM popular_search_queries LIMIT 10;
SELECT * FROM user_search_stats WHERE user_id = 'your-user-id';
```

## Troubleshooting

### Issue: pgvector extension not available

**Solution:**
- Upgrade Supabase plan (pgvector requires certain plans)
- Or contact Supabase support to enable

### Issue: "embedding" column type invalid

**Error:** `type "vector" does not exist`

**Solution:**
```sql
-- Check if extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- If not, enable it
CREATE EXTENSION vector;
```

### Issue: Embedding generation fails

**Error:** `OpenAI API error: ...`

**Solutions:**
1. Check API key is valid: `echo $OPENAI_API_KEY`
2. Verify key has credits: Check OpenAI dashboard
3. Check rate limits: Wait and retry
4. Review error message for specific issue

### Issue: Search returns no results

**Possible causes:**
1. **No embeddings generated**: Go to Library → Generate Embeddings
2. **Threshold too high**: Lower from 0.7 to 0.5 or 0.3
3. **RLS policy blocking**: Check user_id matches
4. **Query embedding failed**: Check API logs

**Debug:**
```sql
-- Check embedding count
SELECT COUNT(*) FROM embeddings WHERE user_id = 'your-user-id';

-- Test raw similarity
SELECT 
  call_id,
  1 - (embedding <=> (SELECT embedding FROM embeddings LIMIT 1)) as sim
FROM embeddings
WHERE user_id = 'your-user-id'
ORDER BY sim DESC
LIMIT 5;
```

### Issue: Slow search performance

**Solutions:**
1. **Check index exists:**
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'embeddings';
   ```
2. **Analyze query plan:**
   ```sql
   EXPLAIN ANALYZE [your search query];
   ```
3. **Rebuild index:**
   ```sql
   REINDEX INDEX idx_embeddings_vector;
   ```
4. **Increase work_mem** (if admin access):
   ```sql
   SET work_mem = '256MB';
   ```

## Best Practices

### 1. Generate Embeddings in Batches
- Use the batch API endpoint for multiple calls
- Process during off-peak hours
- Monitor costs before large batches

### 2. Cache Embeddings
- Embeddings are stored permanently in database
- In-memory cache for frequently accessed vectors
- Content hash prevents redundant generation

### 3. Query Optimization
- Use appropriate similarity threshold (0.7 default)
- Combine with filters for better results
- Limit results to reasonable numbers (20-50)

### 4. Cost Management
- text-embedding-3-small: $0.00002 per 1K tokens
- Average call: ~2,000 tokens = $0.00004
- 1,000 calls: ~$0.04 one-time cost
- Searches are FREE (use cached embeddings)

### 5. Regular Maintenance
- Monitor embedding coverage
- Review search analytics
- Update embeddings if transcripts change
- Clean old search logs (90-day retention)

## Next Steps

1. Generate embeddings for your call library
2. Test semantic search with various queries
3. Review search analytics to understand user behavior
4. Optimize index parameters for your dataset size
5. Set up automated embedding generation for new calls

## Support

- Check `SEARCH_GUIDE.md` for user-facing documentation
- Review `MILESTONE_6_VERIFICATION.md` for testing checklist
- See API route files for detailed endpoint documentation
- Check Supabase logs for database issues
- Review OpenAI dashboard for API issues


# Milestone 6: Embeddings and Search - Verification Checklist

## Pre-Deployment Verification

### Database Setup ✓

- [ ] pgvector extension enabled
  ```sql
  SELECT extname FROM pg_extension WHERE extname = 'vector';
  -- Expected: 'vector'
  ```

- [ ] Embeddings table created
  ```sql
  SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_name = 'embeddings';
  -- Expected: 1
  ```

- [ ] Vector column configured correctly
  ```sql
  SELECT column_name, udt_name, character_maximum_length 
  FROM information_schema.columns 
  WHERE table_name = 'embeddings' AND column_name = 'embedding';
  -- Expected: column exists, type vector(1536)
  ```

- [ ] HNSW index created
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename = 'embeddings' AND indexname = 'idx_embeddings_vector';
  -- Expected: 'idx_embeddings_vector'
  ```

- [ ] RLS policies active
  ```sql
  SELECT COUNT(*) FROM pg_policies WHERE tablename = 'embeddings';
  -- Expected: 4 (SELECT, INSERT, UPDATE, DELETE)
  ```

- [ ] Search analytics tables created
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_name IN ('search_queries', 'search_result_clicks', 'search_preferences');
  -- Expected: All 3 tables
  ```

### Environment Configuration ✓

- [ ] `OPENAI_API_KEY` set and valid
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured (server-side only)

### API Endpoints ✓

- [ ] `/api/search/semantic` responds (POST)
- [ ] `/api/search/embeddings` responds (POST)
- [ ] `/api/search/batch-embeddings` responds (POST)
- [ ] `/api/search/analytics` responds (GET)
- [ ] All endpoints return proper error messages for missing auth

### Frontend Components ✓

- [ ] SearchBar component renders
- [ ] SearchFilters component renders
- [ ] SearchResults component renders
- [ ] VectorSearch container renders
- [ ] Library page tabs work (Browse/Search)
- [ ] "Generate Embeddings" button appears in Library

## Functional Testing

### Embedding Generation

**Test 1: Single Embedding**
- [ ] Navigate to Library page
- [ ] Select a call with completed transcript
- [ ] Click "Generate Embeddings"
- [ ] Verify cost estimate appears
- [ ] Confirm and wait for completion
- [ ] Check progress indicator updates
- [ ] Verify success message

**Verification:**
```sql
SELECT 
  call_id, 
  embedding_model, 
  token_count,
  array_length(embedding, 1) as dimensions,
  content_hash
FROM embeddings 
WHERE call_id = '[test-call-id]';
-- Expected: 1 row, 1536 dimensions, model = 'text-embedding-3-small'
```

**Test 2: Batch Embedding**
- [ ] Select 5-10 calls with transcripts
- [ ] Click "Generate Embeddings"
- [ ] Verify batch cost estimate
- [ ] Monitor progress for all calls
- [ ] Verify all complete or show errors

**Verification:**
```sql
SELECT COUNT(*) FROM embeddings WHERE user_id = '[test-user-id]';
-- Expected: Matches number of processed calls
```

**Test 3: Cached Embedding**
- [ ] Generate embedding for a call
- [ ] Try generating again for same call
- [ ] Verify "cached" response
- [ ] Confirm no duplicate entries in database

**Verification:**
```sql
SELECT COUNT(*) FROM embeddings WHERE call_id = '[test-call-id]';
-- Expected: 1 (not duplicated)
```

### Semantic Search

**Test 4: Basic Search**
- [ ] Navigate to Library → Semantic Search tab
- [ ] Enter query: "billing issues"
- [ ] Verify search executes (loading indicator)
- [ ] Verify results appear with similarity scores
- [ ] Check results are ranked by similarity (highest first)
- [ ] Verify result cards show complete information

**Test 5: Search with Filters**
- [ ] Enter query: "patient complaints"
- [ ] Apply filter: Sentiment = Negative
- [ ] Verify filtered results
- [ ] Add filter: Date Range = Last 30 days
- [ ] Verify results match all filters
- [ ] Clear filters
- [ ] Verify results reset

**Test 6: Empty Search Results**
- [ ] Enter nonsensical query: "xyzabc12345"
- [ ] Verify "No results found" message
- [ ] Verify suggestion to try different keywords

**Test 7: Search Performance**
- [ ] Perform search query
- [ ] Note search time in results
- [ ] Target: <500ms for typical searches
- [ ] Verify results appear smoothly

**Verification:**
```sql
SELECT 
  query_text,
  result_count,
  search_time_ms,
  created_at
FROM search_queries 
WHERE user_id = '[test-user-id]'
ORDER BY created_at DESC 
LIMIT 5;
-- Expected: Recent searches logged with proper metrics
```

### Result Interaction

**Test 8: View Call from Results**
- [ ] Perform search
- [ ] Click a result card
- [ ] Verify redirected to call detail page
- [ ] Verify full transcript displayed
- [ ] Verify AI insights available

**Test 9: Result Metadata**
- [ ] Verify similarity scores displayed (0-100%)
- [ ] Verify sentiment badges show correct colors
- [ ] Verify outcome badges display
- [ ] Verify red flag indicator when present
- [ ] Verify action items indicator when present

### Search Analytics

**Test 10: Analytics Tracking**
- [ ] Perform several searches
- [ ] Call `/api/search/analytics` endpoint

**Verification:**
```sql
SELECT * FROM popular_search_queries LIMIT 5;
SELECT * FROM user_search_stats WHERE user_id = '[test-user-id]';
-- Expected: Search queries tracked, stats calculated
```

## Security Testing

### Authentication

**Test 11: Unauthenticated Access**
- [ ] Call `/api/search/semantic` without auth token
- [ ] Verify 401 Unauthorized response
- [ ] Call `/api/search/embeddings` without auth token
- [ ] Verify 401 Unauthorized response

**Test 12: Invalid Token**
- [ ] Call endpoints with invalid token
- [ ] Verify 401 Unauthorized response

### Row Level Security (RLS)

**Test 13: User Data Isolation**
- [ ] User A generates embeddings
- [ ] User B attempts to search
- [ ] Verify User B only sees their own calls in results
- [ ] Verify embeddings table respects RLS

**Verification:**
```sql
-- As User A
SELECT COUNT(*) FROM embeddings WHERE user_id = '[user-a-id]';
-- Expected: User A's embeddings

-- As User B (via RLS)
SELECT COUNT(*) FROM embeddings WHERE user_id = '[user-a-id]';
-- Expected: 0 (cannot access other user's data)
```

### API Key Protection

**Test 14: OpenAI Key Security**
- [ ] Inspect network requests in browser DevTools
- [ ] Verify OpenAI API key never sent to client
- [ ] Verify all OpenAI calls are server-side only
- [ ] Check `OPENAI_API_KEY` not in any client-side code

## Performance Testing

### Embedding Generation Speed

**Test 15: Single Call Timing**
- [ ] Generate embedding for one call
- [ ] Note time to complete
- [ ] Target: 1-3 seconds per call

**Test 16: Batch Processing**
- [ ] Generate embeddings for 10 calls
- [ ] Monitor progress and timing
- [ ] Verify no timeouts
- [ ] Target: ~2-4 seconds per call in batch

### Search Speed

**Test 17: Small Dataset (<100 calls)**
- [ ] Perform search
- [ ] Target: <200ms

**Test 18: Medium Dataset (100-1000 calls)**
- [ ] Perform search
- [ ] Target: <500ms

**Test 19: Large Dataset (>1000 calls)**
- [ ] Perform search
- [ ] Target: <1000ms

**Verification:**
```sql
SELECT 
  AVG(search_time_ms) as avg_time,
  MAX(search_time_ms) as max_time,
  MIN(search_time_ms) as min_time
FROM search_queries
WHERE user_id = '[test-user-id]';
-- Expected: Average <500ms
```

### Database Performance

**Test 20: Index Usage**
```sql
EXPLAIN ANALYZE
SELECT 
  call_id,
  1 - (embedding <=> '[test-vector]'::vector) as similarity
FROM embeddings
WHERE user_id = '[test-user-id]'
ORDER BY embedding <=> '[test-vector]'::vector
LIMIT 20;
-- Expected: Uses idx_embeddings_vector (HNSW index)
-- Execution time: <50ms
```

## Cost Verification

**Test 21: Embedding Costs**
- [ ] Generate embeddings for known number of calls
- [ ] Check `embedding_costs` table

**Verification:**
```sql
SELECT 
  COUNT(*) as operations,
  SUM(token_count) as total_tokens,
  SUM(cost_usd) as total_cost,
  AVG(token_count) as avg_tokens
FROM embedding_costs
WHERE user_id = '[test-user-id]';
-- Expected: Costs match ~$0.00004 per call
```

**Test 22: Search Costs**
- [ ] Perform 100 searches
- [ ] Verify NO additional OpenAI charges
- [ ] Confirm searches use cached embeddings

## Edge Cases

**Test 23: Short Transcript**
- [ ] Attempt to generate embedding for call with "Call too short to transcribe"
- [ ] Verify graceful error handling

**Test 24: Missing Transcript**
- [ ] Attempt to generate embedding for call without transcript
- [ ] Verify error message: "Transcript not found"

**Test 25: Very Long Transcript**
- [ ] Generate embedding for call with very long transcript (>8000 tokens)
- [ ] Verify truncation happens gracefully
- [ ] Verify embedding still generated

**Test 26: Special Characters**
- [ ] Search with special characters: "@#$%"
- [ ] Verify no errors
- [ ] Verify graceful no-results handling

**Test 27: Multiple Languages**
- [ ] Generate embeddings for English calls
- [ ] Generate embeddings for Spanish calls
- [ ] Search across both languages
- [ ] Verify cross-language similarity works

## UI/UX Testing

**Test 28: Loading States**
- [ ] Verify loading indicators during embedding generation
- [ ] Verify loading indicators during search
- [ ] Verify progress indicators update in real-time

**Test 29: Error Messages**
- [ ] Trigger various errors (invalid call ID, missing transcript, etc.)
- [ ] Verify user-friendly error messages
- [ ] Verify errors don't break UI

**Test 30: Responsive Design**
- [ ] Test search interface on desktop
- [ ] Test on tablet
- [ ] Test on mobile
- [ ] Verify layouts adjust properly

**Test 31: Tab Navigation**
- [ ] Switch between Browse and Search tabs
- [ ] Verify state persists when switching
- [ ] Verify no errors when switching

## Integration Testing

**Test 32: End-to-End Flow**
- [ ] Upload a call with CSV
- [ ] Transcribe the call
- [ ] Generate AI insights
- [ ] Generate embedding
- [ ] Search for the call
- [ ] Click result to view details
- [ ] Verify complete flow works seamlessly

**Test 33: Bulk Operations**
- [ ] Select 20 calls
- [ ] Transcribe all
- [ ] Generate insights for all
- [ ] Generate embeddings for all
- [ ] Search and find the calls
- [ ] Verify all operations complete successfully

## Cleanup and Maintenance

**Test 34: Old Search Log Cleanup**
```sql
SELECT cleanup_old_search_queries();
-- Expected: Returns count of deleted old queries
```

**Test 35: Cache Stats**
- [ ] Generate multiple embeddings
- [ ] Verify in-memory cache working
- [ ] Check cache hit rate
- [ ] Target: >50% hit rate after warmup

## Documentation Verification

- [ ] `EMBEDDINGS_SETUP.md` complete and accurate
- [ ] `SEARCH_GUIDE.md` complete and user-friendly
- [ ] All code files have proper comments
- [ ] API endpoints documented
- [ ] TypeScript types documented

## Final Checklist

### Core Functionality
- [ ] Embeddings generate successfully
- [ ] Semantic search returns relevant results
- [ ] Filters work correctly
- [ ] Result clicks navigate properly
- [ ] Cost tracking works

### Performance
- [ ] Searches complete in <500ms
- [ ] HNSW index used for vector queries
- [ ] No N+1 query problems
- [ ] Batch operations efficient

### Security
- [ ] RLS policies active and tested
- [ ] API keys protected
- [ ] User data isolated
- [ ] Input validation working

### User Experience
- [ ] UI is intuitive
- [ ] Loading states clear
- [ ] Error messages helpful
- [ ] Mobile-responsive

### Reliability
- [ ] No console errors
- [ ] Graceful error handling
- [ ] No memory leaks
- [ ] Stable under load

## Post-Deployment Monitoring

### Week 1
- [ ] Monitor error rates in API logs
- [ ] Check embedding generation success rate
- [ ] Review search performance metrics
- [ ] Gather user feedback

### Month 1
- [ ] Review search analytics
- [ ] Identify popular queries
- [ ] Optimize slow queries
- [ ] Adjust similarity thresholds if needed

### Ongoing
- [ ] Monitor OpenAI API costs
- [ ] Track database growth (embeddings table)
- [ ] Review search result quality
- [ ] Collect feature requests

## Success Criteria

✅ Milestone 6 is complete when:
1. All embeddings generate successfully
2. Semantic search returns relevant results with >70% user satisfaction
3. Search performance <500ms average
4. Zero security vulnerabilities
5. All tests passing
6. Documentation complete
7. Production deployment stable

## Known Limitations

- pgvector requires specific Supabase plans
- OpenAI API has rate limits (tier-dependent)
- HNSW index rebuilds can be slow for large datasets
- Cross-language search quality varies
- Similarity scores are relative, not absolute

## Next Steps After Verification

1. Deploy to production
2. Monitor initial usage
3. Gather user feedback
4. Optimize based on real-world usage
5. Plan Milestone 7: Analytics Dashboard


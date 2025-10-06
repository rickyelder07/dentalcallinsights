# Fix: Run Embeddings Migration

## Issue
The error `Could not find the 'content_hash' column of 'embeddings' in the schema cache` indicates that the embeddings table hasn't been created in your Supabase database yet.

## Solution
Run the migration file `007_embeddings_schema.sql` in your Supabase database.

## Steps

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Run Migration**
   - Open the file: `migrations/007_embeddings_schema.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press `Cmd/Ctrl + Enter`

4. **Verify Success**
   - You should see "Success. No rows returned"
   - Check the "Table Editor" to confirm the `embeddings` table exists

5. **Repeat for Search Analytics** (if needed)
   - Also run `migrations/008_search_analytics_schema.sql`
   - And `migrations/009_transcription_corrections.sql`

### Option 2: Via Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or run specific migration
supabase db push migrations/007_embeddings_schema.sql
```

### Option 3: Via psql (Direct Connection)

If you have direct database access:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT].supabase.co:5432/postgres" \
  -f migrations/007_embeddings_schema.sql
```

## What This Migration Does

The migration will:
- ✅ Enable the `pgvector` extension for vector storage
- ✅ Create the `embeddings` table with vector column
- ✅ Set up indexes for fast similarity search (HNSW algorithm)
- ✅ Configure Row Level Security (RLS) policies
- ✅ Create helper functions for similarity search

## Verify Installation

After running the migration, verify in Supabase Dashboard:

1. **Check Extension**
   - SQL Editor: `SELECT * FROM pg_extension WHERE extname = 'vector';`
   - Should return 1 row

2. **Check Table**
   - SQL Editor: `SELECT * FROM embeddings LIMIT 1;`
   - Should return "Success. No rows returned" (not an error)

3. **Check Functions**
   - SQL Editor: `SELECT * FROM pg_proc WHERE proname LIKE 'search%';`
   - Should show the `search_calls_by_similarity` function

## After Migration

Once the migration is complete:
1. Go back to your app
2. Navigate to Library > Semantic Search tab
3. Select calls and click "🔍 Generate Embeddings"
4. The embeddings should generate successfully!

## Troubleshooting

### "Extension 'vector' already exists"
- This is OK - the migration uses `CREATE EXTENSION IF NOT EXISTS`
- Continue with the rest of the migration

### "Table 'embeddings' already exists"
- Check if the table has the correct columns
- You may need to drop and recreate: `DROP TABLE IF EXISTS embeddings CASCADE;`
- Then run the migration again

### "Permission denied"
- Make sure you're connected as the `postgres` superuser
- Or use the Supabase Dashboard (which has full permissions)

---

**Next Steps**: After running this migration, also ensure migrations 008 and 009 are run for full functionality.


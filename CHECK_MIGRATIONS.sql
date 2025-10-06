-- ===================================================================
-- Check Which Migrations Have Been Applied
-- Run this in Supabase SQL Editor to see what tables exist
-- ===================================================================

-- Check if pgvector extension is enabled
SELECT 
    'pgvector extension' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
        THEN '✅ Installed' 
        ELSE '❌ Not installed' 
    END as status;

-- Check if embeddings table exists
SELECT 
    'embeddings table' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'embeddings') 
        THEN '✅ Exists' 
        ELSE '❌ Does not exist' 
    END as status;

-- Check if call_embeddings table exists (in case of naming confusion)
SELECT 
    'call_embeddings table' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_embeddings') 
        THEN '✅ Exists' 
        ELSE '❌ Does not exist' 
    END as status;

-- Check if search_logs table exists
SELECT 
    'search_logs table' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'search_logs') 
        THEN '✅ Exists' 
        ELSE '❌ Does not exist' 
    END as status;

-- Check if transcription_corrections table exists
SELECT 
    'transcription_corrections table' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transcription_corrections') 
        THEN '✅ Exists' 
        ELSE '❌ Does not exist' 
    END as status;

-- List all custom tables in your database
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY 
    table_name;

-- If embeddings table exists, show its columns
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'embeddings'
ORDER BY 
    ordinal_position;


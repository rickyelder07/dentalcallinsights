# Upload Setup Guide - Simplified CSV + Audio

## Quick Start

### 1. Run Database Migration

In Supabase Dashboard → SQL Editor:
```sql
-- Copy and run: migrations/003_simplified_call_storage.sql
```

### 2. Create Storage Bucket

Supabase Dashboard → Storage → New Bucket:
- Name: `call-recordings`
- Public: No
- File size: 100MB
- Types: audio/mpeg, audio/mp3, audio/wav, audio/m4a, audio/aac

### 3. Apply Storage Policies

```sql
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (bucket_id = 'call-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'call-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (bucket_id = 'call-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## CSV Format

Required columns:
- **Call Time**: "September 6th 2025 5:45 pm"
- **Direction**: "Inbound" or "Outbound"
- **Call**: Audio filename (e.g., "recording.mp3")

## How It Works

1. User uploads CSV with "Call" column containing audio filenames
2. System validates CSV has required columns
3. User uploads audio files matching CSV filenames
4. System validates all filenames match
5. Files uploaded to Supabase Storage
6. Records created in database

## Testing

1. Sign in
2. Go to `/upload`
3. Select CSV file
4. Select audio files
5. Click Upload
6. Check `/library` for results


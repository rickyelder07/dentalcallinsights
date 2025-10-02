# Upload System Setup Guide

Complete guide for setting up and using the DentalCallInsights upload system with Supabase Storage and CSV integration.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup Instructions](#setup-instructions)
4. [Usage Guide](#usage-guide)
5. [Security Considerations](#security-considerations)
6. [Troubleshooting](#troubleshooting)
7. [API Reference](#api-reference)

## Overview

The upload system enables dental office managers to:
- Upload call recordings (MP3, WAV, M4A, AAC)
- Import call metadata via CSV files
- Automatically match recordings with CSV data
- Track upload progress in real-time
- Securely store files with user isolation

### Key Features

- ✅ Drag-and-drop file upload
- ✅ Real-time progress tracking
- ✅ File validation (type, size, format)
- ✅ CSV parsing and validation
- ✅ Intelligent call matching
- ✅ User data isolation (RLS policies)
- ✅ Error recovery and retry logic

## Prerequisites

Before setting up the upload system, ensure you have:

1. **Supabase Project** with:
   - PostgreSQL database
   - Storage enabled
   - RLS policies enabled
   - pgvector extension (for future transcription features)

2. **Environment Variables** (`.env.local`):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Migrations Completed**:
   - `001_init.sql` - Core database schema
   - `002_enable_rls.sql` - RLS policies
   - `003_storage_setup.sql` - Storage configuration
   - `004_csv_call_data.sql` - CSV data tables

## Setup Instructions

### Step 1: Run Database Migrations

Execute the migrations in order via Supabase SQL Editor:

```sql
-- 1. Run 003_storage_setup.sql
-- This adds storage-related columns to calls table

-- 2. Run 004_csv_call_data.sql (if not already done)
-- This creates the csv_call_data table and matching functions
```

### Step 2: Create Storage Bucket

1. Navigate to **Storage** in Supabase Dashboard
2. Click **Create Bucket**
3. Configure bucket settings:
   - **Name**: `call-recordings`
   - **Public**: ❌ OFF (private bucket)
   - **File Size Limit**: `104857600` (100MB)
   - **Allowed MIME Types**: 
     - `audio/mpeg`
     - `audio/wav`
     - `audio/x-m4a`
     - `audio/mp4`
     - `audio/aac`

### Step 3: Verify RLS Policies

Ensure the following RLS policies are active on `storage.objects`:

```sql
-- View own files
SELECT bucket_id = 'call-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]

-- Upload own files
INSERT WITH CHECK (
  bucket_id = 'call-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
)

-- Update own files
UPDATE USING (
  bucket_id = 'call-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
)

-- Delete own files
DELETE USING (
  bucket_id = 'call-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
```

### Step 4: Test the System

1. **Test Audio Upload**:
   - Navigate to `/upload`
   - Select an MP3 file
   - Fill in metadata
   - Upload and verify success

2. **Test CSV Upload**:
   - Upload a sample CSV file
   - Verify parsing and validation
   - Check database for inserted records

3. **Test Call Matching**:
   - Upload audio with matching timestamp
   - Verify potential matches appear
   - Link a match and confirm in database

## Usage Guide

### Uploading Audio Files

1. **Navigate to Upload Page**:
   ```
   https://your-app.com/upload
   ```

2. **Select Audio File**:
   - Drag & drop file or click to browse
   - Supported formats: MP3, WAV, M4A, AAC
   - Maximum size: 100MB

3. **Add Metadata** (optional but recommended):
   - Patient ID
   - Call type (Appointment, Follow-up, etc.)
   - Call date and time
   - Phone number
   - Duration
   - Tags
   - Notes

4. **Upload**:
   - Click "Upload File"
   - Monitor progress
   - Review potential CSV matches (if available)

### Uploading CSV Data

1. **Prepare CSV File**:
   Required columns:
   - `CALL TIME` (e.g., "September 23rd 2025 4:49 pm")
   - `CALL DIRECTION` (Inbound/Outbound)
   - `SOURCE NUMBER`
   - `DESTINATION NUMBER`
   - `CALL DURATION SECONDS`
   - `DISPOSITION`

2. **Upload CSV**:
   - Use CSV uploader in right sidebar
   - System validates format automatically
   - View validation results
   - Data imported to database

### Call Matching

The system automatically matches audio recordings with CSV data using:

1. **Time Proximity**: Matches within 5 minutes (configurable)
2. **Phone Number**: Exact or partial match
3. **Duration**: Within 30 seconds tolerance
4. **Match Score**: Weighted algorithm (0-1)

**Match Quality Levels**:
- **High** (≥0.9): Strong confidence, minimal manual review
- **Medium** (0.7-0.9): Good confidence, recommended review
- **Low** (0.5-0.7): Weak confidence, requires manual verification

## Security Considerations

### Data Protection

1. **User Isolation**:
   - RLS policies enforce user-level access
   - Users can only see/modify their own data
   - Storage paths include user_id prefix

2. **File Validation**:
   - Server-side type checking
   - Size limit enforcement
   - Content validation
   - Filename sanitization

3. **Input Sanitization**:
   - All CSV data validated
   - SQL injection prevention
   - XSS protection
   - Path traversal prevention

### Best Practices

1. **Never expose service role keys** to client
2. **Always validate inputs** on server side
3. **Use anon key** for client operations
4. **Implement rate limiting** for upload endpoints
5. **Monitor storage usage** per user
6. **Regularly audit** RLS policies

## Troubleshooting

### Upload Fails

**Problem**: File upload fails with error

**Solutions**:
1. Check file size (< 100MB)
2. Verify file format is supported
3. Ensure user is authenticated
4. Check storage bucket exists
5. Verify RLS policies are active

### CSV Validation Errors

**Problem**: CSV file rejected with validation errors

**Solutions**:
1. Check CSV format matches expected schema
2. Verify date format (use examples provided)
3. Ensure required columns are present
4. Check for special characters in data
5. Validate phone number formats

### No Matches Found

**Problem**: Audio recording doesn't match any CSV data

**Solutions**:
1. Ensure CSV data is uploaded first
2. Check call time is within tolerance window
3. Verify phone numbers match
4. Adjust matching tolerance in options
5. Use manual matching if needed

### Storage Permission Errors

**Problem**: "Permission denied" errors on upload

**Solutions**:
1. Verify RLS policies are created
2. Check user is authenticated
3. Ensure bucket name is correct
4. Verify storage path format
5. Check auth token validity

## API Reference

### POST /api/upload

Upload audio file with metadata.

**Request**:
```typescript
FormData {
  file: File,
  metadata: string // JSON-encoded CallMetadata
}
```

**Response**:
```typescript
{
  success: boolean,
  callId: string,
  storagePath: string,
  potentialMatches?: CallMatch[]
}
```

### POST /api/csv-upload

Upload and process CSV call data.

**Request**:
```typescript
FormData {
  file: File // CSV file
}
```

**Response**:
```typescript
{
  success: boolean,
  rowsProcessed: number,
  rowsInserted: number,
  warnings: CsvValidationWarning[]
}
```

### POST /api/match-calls

Find potential matches for a call recording.

**Request**:
```typescript
{
  callId: string,
  callTime: string, // ISO 8601
  phoneNumber?: string,
  duration?: number,
  options?: CallMatchingOptions
}
```

**Response**:
```typescript
{
  success: boolean,
  matches: CallMatch[],
  count: number
}
```

### PUT /api/match-calls

Link a call with a CSV record.

**Request**:
```typescript
{
  callId: string,
  csvCallId: string
}
```

**Response**:
```typescript
{
  success: boolean,
  call: Call
}
```

## File Size Limits

| Type | Limit | Reason |
|------|-------|--------|
| Audio files | 100MB | Balance between quality and storage |
| CSV files | 10MB | Reasonable for call metadata |
| Total per user | TBD | Set based on pricing tier |

## Supported File Formats

### Audio Formats

| Format | Extension | MIME Type | Recommended |
|--------|-----------|-----------|-------------|
| MP3 | `.mp3` | `audio/mpeg` | ✅ Yes |
| WAV | `.wav` | `audio/wav` | ✅ Yes |
| M4A | `.m4a` | `audio/x-m4a` | ✅ Yes |
| AAC | `.aac` | `audio/aac` | ⚠️ Supported |

### CSV Format

- **Encoding**: UTF-8
- **Delimiter**: Comma (`,`)
- **Header Row**: Required
- **Escape Character**: Double quote (`"`)

## Next Steps

After successful upload setup:

1. **Test with real data** from your phone system
2. **Configure matching tolerances** based on results
3. **Set up transcription pipeline** (Milestone 4)
4. **Implement batch upload** for multiple files
5. **Add analytics dashboard** for insights

## Support

For issues or questions:
1. Check this documentation
2. Review error logs in browser console
3. Check Supabase logs in dashboard
4. Verify RLS policies are active
5. Test with sample files provided

---

**Last Updated**: October 2025  
**Version**: 1.0.0 (Milestone 3)


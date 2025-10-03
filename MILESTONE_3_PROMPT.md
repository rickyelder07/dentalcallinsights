# Milestone 3 Prompt: Simplified Audio Upload & Storage

## Project Context

You are an expert full-stack engineer working on **DentalCallInsights** — a Next.js + Supabase web app for turning dental call recordings (MP3s) + call metadata (CSV) into actionable insights.

**Current Status:**
- ✅ Milestone 1: Project scaffold complete
- ✅ Milestone 2: Authentication & RLS complete
- 🎯 Milestone 3: Simplified audio upload & storage (THIS MILESTONE)

**Problem:** Dental office managers need to upload existing call recordings along with call metadata from their phone system. The metadata is exported as CSV with a "Call" column containing the audio filename for each row.

**Core User Action:** Upload CSV with call data → Upload matching audio files → System validates filenames match → Store securely with user isolation

## 📋 Requirements Summary

### Simplified Approach
**Key Insight:** No complex matching algorithms needed! Each CSV row has a "Call" column with the exact audio filename, creating a simple 1:1 mapping.

### Tech Stack
- Next.js 14 (App Router), TypeScript, TailwindCSS
- Supabase (Auth, Postgres, Storage)
- Existing auth system (milestone 2)

### CSV Format
Standardized format with 12 columns:
```csv
Call Time,Direction,Source Number,Source Name,Source Ext,Destination Number,Destination Ext,Duration,Disposition,Call Flow,Time to Answer,Call
September 6th 2025 5:45 pm,Inbound,(323) 677-3831,MENDEZ ZOILAMAR,,(323) 325-5641,,4 mins. 5 secs,External,DID:3233255641...,13 secs,filename.mp3
```

**Critical Column:** "Call" contains the audio filename that must match uploaded files

### Validation Requirements
1. CSV must have "Call" column (reject if missing)
2. All uploaded audio files must match a filename in CSV "Call" column
3. Reject any extra files not listed in CSV
4. File size limit: 100MB per file
5. Supported formats: MP3, WAV, M4A, AAC

## 🎯 Deliverables

### 1. Database Migration (`migrations/003_simplified_call_storage.sql`)
- Add columns to existing `calls` table for CSV data
- No separate csv_call_data table needed (simplified!)
- Add indexes for efficient querying
- Include utility function for parsing duration strings

### 2. TypeScript Types (`types/upload.ts`)
- CSV data structure matching standardized format
- Upload validation types
- Error/warning types
- Storage path types

### 3. CSV Parser (`lib/csv-parser-simplified.ts`)
- Parse date format: "September 6th 2025 5:45 pm"
- Parse duration: "4 mins. 5 secs" → seconds
- Validate required columns exist
- Extract audio filenames from "Call" column
- Validate uploaded files match CSV filenames

### 4. Storage Utilities (`lib/storage.ts`)
- Upload files to Supabase Storage
- Build storage paths: `{userId}/{filename}`
- Validate file size and type
- Handle upload errors with cleanup
- Generate signed URLs for playback

### 5. Upload API (`app/api/upload/route.ts`)
- POST endpoint for file uploads
- Authenticate user (use existing auth)
- Parse multipart/form-data (CSV + audio files)
- Validate CSV has "Call" column
- Validate all audio filenames match CSV
- Upload to storage bucket `call-recordings`
- Create database records in `calls` table
- Return detailed success/error results

### 6. Upload UI (`app/upload/page.tsx`)
- Replace placeholder with full implementation
- Two-step upload: CSV first, then audio files
- File validation before upload
- Show validation errors clearly
- Display upload progress
- Redirect to library on success

### 7. Storage Setup
- Create Supabase Storage bucket: `call-recordings`
- Apply RLS policies for user isolation
- Configure file size and type limits

## 🔧 Technical Specifications

### Database Schema
Enhanced `calls` table (add columns):
```sql
-- Storage tracking
filename TEXT NOT NULL
file_size BIGINT
file_type TEXT
upload_status TEXT DEFAULT 'completed'

-- CSV data (no separate table needed!)
call_time TIMESTAMPTZ
call_direction TEXT CHECK (call_direction IN ('Inbound', 'Outbound'))
source_number TEXT
source_name TEXT
source_extension TEXT
destination_number TEXT
destination_extension TEXT
call_duration_seconds INTEGER
disposition TEXT
time_to_answer_seconds INTEGER
call_flow TEXT
```

### Storage Structure
```
call-recordings/
  {user_id}/
    filename1.mp3
    filename2.mp3
    ...
```

### Security
- ✅ RLS on storage (users can only access own folder)
- ✅ RLS on database (users can only see own calls)
- ✅ Server-side validation of all files
- ✅ File size limits enforced (100MB)
- ✅ File type restrictions enforced
- ❌ Never expose service role key to client

### Workflow
```
1. User uploads CSV
   ↓ Validate: Has "Call" column?
2. User uploads audio files
   ↓ Validate: All filenames in CSV?
3. Submit to API
   ↓ Server validates everything again
4. Upload each file to storage
   ↓ On error: cleanup uploaded files
5. Create database records
   ↓ Link CSV data to audio file
6. Return success/errors
   ↓ Redirect to library
```

## ✅ Success Criteria

**Must work:**
- ✅ CSV without "Call" column is rejected with clear message
- ✅ Audio files not in CSV are rejected with clear message
- ✅ Files in CSV but not uploaded show as "missing"
- ✅ All validation happens before any uploads start
- ✅ On error, no partial data is saved
- ✅ Users cannot see other users' files
- ✅ Upload success redirects to library page

## 🚀 Testing Checklist

### Validation Tests
- [ ] CSV without "Call" column → rejected
- [ ] CSV with "Call" column → accepted
- [ ] Audio file not in CSV → rejected
- [ ] All files match CSV → accepted
- [ ] File over 100MB → rejected
- [ ] Non-audio file → rejected

### Security Tests
- [ ] Unauthenticated request → 401 error
- [ ] User A cannot access User B's files
- [ ] Storage RLS prevents cross-user access
- [ ] Database RLS prevents data leakage

### Integration Tests
- [ ] Upload CSV + audio → success
- [ ] Files appear in library
- [ ] CSV data correctly stored
- [ ] File can be played back (signed URL)

## 📚 Key Simplifications vs Original Plan

**Original Complex Approach (Avoided):**
- ❌ Separate csv_call_data table
- ❌ Time-based matching algorithms
- ❌ Phone number matching
- ❌ Duration matching
- ❌ Match confidence scoring
- ❌ Manual match review

**New Simplified Approach (Implemented):**
- ✅ Direct filename matching (CSV "Call" column)
- ✅ Single calls table with all data
- ✅ No matching algorithms needed
- ✅ 100% accuracy (filename = match)
- ✅ Simpler code, fewer bugs
- ✅ Faster uploads, lower latency

## 🔒 Security Best Practices

- Use server-side Supabase client for auth checks
- Validate ALL inputs on server (never trust client)
- Enforce file size limits on server
- Use RLS for both storage and database
- Store files in user-specific paths
- Clean up files on error
- Log errors without exposing sensitive data

## 📖 File Structure

```
migrations/
└── 003_simplified_call_storage.sql

types/
└── upload.ts

lib/
├── csv-parser-simplified.ts
└── storage.ts

app/
├── api/upload/route.ts
└── upload/page.tsx

UPLOAD_SETUP_GUIDE.md (setup instructions)
```

## 🎯 Git Commit Message

```
feat: implement simplified audio upload with CSV metadata

- Add enhanced calls table schema with CSV data fields
- Create simplified CSV parser with direct filename matching
- Implement Supabase Storage integration with RLS
- Build upload API with comprehensive validation
- Create intuitive upload UI with two-step workflow
- Remove complex matching algorithms (not needed!)
- Add storage utilities for file management
- Document setup process and testing procedures

BREAKING CHANGE: Requires migration 003 and storage bucket setup

Closes #3 (Milestone 3 - Audio Upload & Storage)
```

**Branch:** `milestone/03-audio-upload-and-storage`

---

## Notes

This prompt reflects the **simplified** implementation that eliminates complexity while achieving the same goal: storing call recordings with metadata. The key insight is using the "Call" column for direct filename matching instead of complex algorithms.


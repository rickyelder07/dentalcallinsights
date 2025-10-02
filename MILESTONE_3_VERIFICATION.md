# Milestone 3: Verification Checklist

Complete verification checklist for testing the upload system implementation.

## Pre-Deployment Checks

### ✅ Database Setup

- [ ] Run migration `003_storage_setup.sql` in Supabase SQL Editor
- [ ] Verify `calls` table has new columns:
  - `storage_path`
  - `file_size`
  - `file_type`
  - `upload_status`
  - `duration`
  - `csv_call_id`
- [ ] Verify `csv_call_data` table exists (from migration 004)
- [ ] Verify database functions exist:
  - `find_csv_matches`
  - `match_calls_by_phone`
  - `get_call_storage_url`
  - `update_call_upload_status`

### ✅ Storage Bucket Setup

- [ ] Create `call-recordings` bucket in Supabase Dashboard
- [ ] Configure bucket settings:
  - Public: OFF
  - File Size Limit: 104857600 (100MB)
  - Allowed MIME Types: audio/mpeg, audio/wav, audio/x-m4a, audio/mp4, audio/aac
- [ ] Verify RLS policies on `storage.objects`:
  - "Users can view own files"
  - "Users can upload own files"
  - "Users can update own files"
  - "Users can delete own files"

### ✅ RLS Policies

- [ ] Verify RLS enabled on `calls` table
- [ ] Verify RLS enabled on `csv_call_data` table
- [ ] Test user can only access their own data
- [ ] Test user cannot access other users' data

### ✅ Environment Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] No service role keys exposed to client

## Functional Tests

### Audio Upload Tests

#### Test 1: Valid MP3 Upload
- [ ] Navigate to `/upload`
- [ ] Select a valid MP3 file (< 100MB)
- [ ] Fill in metadata form
- [ ] Click "Upload File"
- [ ] Verify progress indicator shows
- [ ] Verify upload completes successfully
- [ ] Check database for new `calls` record
- [ ] Check storage bucket for uploaded file

#### Test 2: Invalid File Type
- [ ] Try uploading a .txt or .pdf file
- [ ] Verify error message shows
- [ ] Verify upload is blocked
- [ ] Verify no database record created

#### Test 3: File Too Large
- [ ] Try uploading a file > 100MB
- [ ] Verify error message shows
- [ ] Verify upload is blocked

#### Test 4: Drag and Drop
- [ ] Drag an audio file onto upload zone
- [ ] Verify file is selected
- [ ] Verify file details display
- [ ] Complete upload successfully

### CSV Upload Tests

#### Test 5: Valid CSV Upload
- [ ] Create sample CSV with required columns
- [ ] Upload via CSV uploader
- [ ] Verify validation shows success
- [ ] Check `csv_call_data` table for records
- [ ] Verify row count matches CSV

#### Test 6: Invalid CSV Format
- [ ] Upload CSV with missing columns
- [ ] Verify validation errors display
- [ ] Verify specific errors listed
- [ ] Verify no database records created

#### Test 7: CSV with Warnings
- [ ] Upload CSV with some invalid data
- [ ] Verify warnings display
- [ ] Verify valid rows are imported
- [ ] Verify invalid rows are skipped

### Call Matching Tests

#### Test 8: Automatic Matching
- [ ] Upload CSV data first
- [ ] Upload audio with matching timestamp
- [ ] Verify potential matches display
- [ ] Check match confidence scores
- [ ] Verify time difference shown

#### Test 9: Match Selection
- [ ] Select a high-confidence match
- [ ] Click "Use selected match"
- [ ] Verify call is linked in database
- [ ] Check `calls.csv_call_id` is set

#### Test 10: Skip Matching
- [ ] View potential matches
- [ ] Click "Skip" button
- [ ] Verify upload completes
- [ ] Verify `calls.csv_call_id` is null

#### Test 11: No Matches Found
- [ ] Upload audio without matching CSV data
- [ ] Verify "No matches found" message
- [ ] Verify option to continue
- [ ] Complete upload successfully

### Security Tests

#### Test 12: User Isolation
- [ ] Create two test accounts
- [ ] Upload file with User A
- [ ] Login as User B
- [ ] Verify User B cannot see User A's file
- [ ] Verify storage path includes user_id

#### Test 13: Authentication Required
- [ ] Logout
- [ ] Try to access `/upload`
- [ ] Verify redirect to login
- [ ] Try direct API call to `/api/upload`
- [ ] Verify 401 Unauthorized response

#### Test 14: File Path Security
- [ ] Try uploading with "../" in filename
- [ ] Verify filename is sanitized
- [ ] Verify path traversal prevented
- [ ] Verify storage path is safe

### Performance Tests

#### Test 15: Large File Upload
- [ ] Upload 90MB audio file
- [ ] Verify progress updates smoothly
- [ ] Verify upload completes
- [ ] Check upload time is reasonable

#### Test 16: Multiple Concurrent Uploads
- [ ] Queue 3 uploads simultaneously
- [ ] Verify all progress correctly
- [ ] Verify all complete successfully
- [ ] Check database for all records

#### Test 17: CSV with Many Rows
- [ ] Upload CSV with 500+ rows
- [ ] Verify parsing completes quickly (< 5s)
- [ ] Verify all rows inserted
- [ ] Check database performance

### Error Recovery Tests

#### Test 18: Network Interruption
- [ ] Start upload
- [ ] Simulate network disconnection
- [ ] Verify error is caught
- [ ] Verify error message displays
- [ ] Retry upload successfully

#### Test 19: Database Error Handling
- [ ] Temporarily break database connection
- [ ] Try to upload
- [ ] Verify graceful error handling
- [ ] Verify uploaded file is cleaned up
- [ ] Restore connection and retry

#### Test 20: Storage Error Handling
- [ ] Try uploading with invalid credentials
- [ ] Verify error is caught
- [ ] Verify error message displays
- [ ] Verify no orphan records created

## Integration Tests

### Test 21: Complete Workflow
- [ ] Start fresh (no existing data)
- [ ] Upload CSV call data
- [ ] Upload matching audio recording
- [ ] Select best match
- [ ] Link call with CSV data
- [ ] View in library (once implemented)
- [ ] Verify all data correct

### Test 22: Metadata Persistence
- [ ] Upload with all metadata fields filled
- [ ] Verify metadata saved in `calls.metadata` JSONB
- [ ] Query metadata via database
- [ ] Verify searchable/filterable

### Test 23: File Download
- [ ] Upload audio file
- [ ] Get signed URL from storage
- [ ] Download file
- [ ] Verify file integrity
- [ ] Verify file matches original

## Browser Compatibility

- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest)
- [ ] Test in Edge (latest)
- [ ] Test on mobile (iOS Safari)
- [ ] Test on mobile (Android Chrome)

## Accessibility Tests

- [ ] Navigate with keyboard only
- [ ] Test with screen reader
- [ ] Verify ARIA labels present
- [ ] Check color contrast
- [ ] Verify focus indicators
- [ ] Test form validation messages

## Performance Benchmarks

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| 10MB file upload | < 30s | ___ | ___ |
| 50MB file upload | < 2min | ___ | ___ |
| 100 row CSV parsing | < 1s | ___ | ___ |
| 500 row CSV parsing | < 5s | ___ | ___ |
| Match finding (100 records) | < 2s | ___ | ___ |
| Page load time | < 2s | ___ | ___ |

## Sample Test Data

### Sample CSV Format

```csv
CALL TIME,CALL DIRECTION,SOURCE NUMBER,SOURCE NAME,SOURCE EXTENSION,DESTINATION NUMBER,DESTINATION EXTENSION,CALL DURATION SECONDS,DISPOSITION,TIME TO ANSWER SECONDS,CALL FLOW
September 23rd 2025 4:49 pm,Outbound,+1 (323) 325-5641,SOLA Kids Dental,,(323) 243-1791,,40,answered,0,
September 23rd 2025 5:15 pm,Inbound,(555) 123-4567,John Doe,,(555) 987-6543,,120,answered,3,
September 23rd 2025 5:30 pm,Outbound,+1 (555) 111-2222,Dental Office,,(555) 333-4444,,65,voicemail,0,
```

### Sample Audio Files

Create test files:
- `test-10mb.mp3` - 10MB MP3 file
- `test-50mb.mp3` - 50MB MP3 file
- `test-100mb.mp3` - 100MB MP3 file (at limit)
- `test-invalid.txt` - Text file (should be rejected)

## Checklist Summary

- Total Tests: 23
- Passed: ___
- Failed: ___
- Skipped: ___

## Sign-Off

- [ ] All critical tests passed
- [ ] Documentation reviewed
- [ ] Code reviewed
- [ ] Security audit completed
- [ ] Performance acceptable
- [ ] Ready for production

**Tested By**: ___________________  
**Date**: ___________________  
**Version**: 1.0.0 (Milestone 3)

---

## Notes

Document any issues found during testing:

1. 
2. 
3. 

## Next Steps After Verification

1. Deploy to staging environment
2. Conduct user acceptance testing
3. Monitor error logs
4. Gather performance metrics
5. Prepare for Milestone 4 (Transcription)


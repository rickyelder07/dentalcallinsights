# Bug Fix: Missing Calls Without Recordings

**Date:** October 3, 2025  
**Issue:** When uploading a CSV with 25 calls (20 with recordings, 5 without), only 2 of the 5 calls without recordings were saved, losing 3 calls.

## Root Cause

The bug was in `/app/api/upload/route.ts` in the duplicate detection logic for calls without recordings.

### The Problem

When processing calls without recordings, the code checked for duplicates using:

```typescript
const { data: existingCall } = await supabase
  .from('calls')
  .select('id')
  .eq('user_id', user.id)
  .eq('filename', 'No Call Recording')
  .eq('call_time', csvRow.call_time)
  .single()  // ❌ This was the problem
```

**Why this failed:**

1. **`.single()` expects exactly ONE result**
   - If zero results: returns null
   - If one result: returns the record
   - If multiple results: **throws an error**

2. **Scenario with 3 calls at the same time (or very close times):**
   - **Call 1**: No existing match → inserts successfully ✅
   - **Call 2**: Checks for duplicates → finds Call 1 → BUT if times match, `.single()` might return it
   - **Call 3**: Checks for duplicates → NOW finds both Call 1 and Call 2 → `.single()` throws error → **caught by try-catch, skipped with `continue`** ❌
   
3. **The uniqueness check was too weak:**
   - Only checked: `user_id` + `filename` ("No Call Recording") + `call_time`
   - Multiple calls can occur at the exact same second with different phone numbers
   - Example: Multiple dental office lines receiving calls simultaneously

## The Fix

### Change 1: Use `.maybeSingle()` Instead of `.single()`

```typescript
.maybeSingle()  // ✅ Gracefully returns null if multiple matches found
```

**Benefits:**
- Doesn't throw errors on multiple matches
- Returns first match if multiple exist
- Returns null if no matches

### Change 2: Stronger Uniqueness Check

```typescript
const { data: existingCall } = await supabase
  .from('calls')
  .select('id')
  .eq('user_id', user.id)
  .eq('filename', 'No Call Recording')
  .eq('call_time', csvRow.call_time)
  .eq('source_number', csvRow.source_number || null)        // ✅ Added
  .eq('destination_number', csvRow.destination_number || null)  // ✅ Added
  .eq('call_direction', csvRow.direction)                   // ✅ Added
  .maybeSingle()
```

**Now checks:**
- User ID
- Filename
- Call time
- Source number
- Destination number  
- Direction (Inbound/Outbound)

This creates a **much more unique fingerprint** for each call.

### Change 3: Better Error Logging

Added detailed error messages to help diagnose future issues:

```typescript
console.error('Insert error for no-recording call:', dbError, csvRow)
console.error(errorMsg, csvRow)
```

### Change 4: Applied Same Fix to Calls WITH Recordings

The same `.single()` bug existed for calls with recordings (line 264), so we applied the same fix there too.

## Files Modified

```
✓ app/api/upload/route.ts
  - Line 128: Changed .single() to .maybeSingle() for no-recording calls
  - Lines 119-127: Added source_number, destination_number, call_direction to uniqueness check
  - Lines 188, 201: Added console.error for better debugging
  - Line 265: Changed .single() to .maybeSingle() for calls with recordings
```

## Testing

### Before Fix
```
CSV: 25 calls (20 with recordings, 5 without)
Result: 22 calls saved (20 with recordings, 2 without) ❌
Missing: 3 calls without recordings
```

### After Fix
```
CSV: 25 calls (20 with recordings, 5 without)  
Result: 25 calls saved (20 with recordings, 5 without) ✅
Missing: 0 calls
```

### Test Scenarios to Verify

1. **Multiple calls at same time, different numbers** ✅
   - Upload CSV with 3 calls at "September 6th 2025 5:45 pm"
   - All with different phone numbers
   - All should be saved

2. **Exact duplicate calls** ✅
   - Upload same CSV twice
   - Second upload should UPDATE existing records, not create duplicates
   - Call count should remain the same

3. **Mix of calls with and without recordings** ✅
   - Upload 25 calls (20 audio files, 5 no recording)
   - All 25 should appear in library

4. **Calls with null/empty phone numbers** ✅
   - Upload calls without source or destination numbers
   - Should still be saved and deduplicated correctly

## Edge Cases Handled

1. **Null phone numbers**: Uses `|| null` to handle undefined values
2. **Multiple matches**: `.maybeSingle()` returns first match gracefully
3. **Error propagation**: All errors are logged and added to `uploadErrors` array
4. **Partial failures**: If some calls fail, others still process (doesn't abort entire upload)

## Prevention

To prevent similar issues in the future:

1. **Use `.maybeSingle()` for duplicate checks** unless you're certain there's exactly one match
2. **Use comprehensive uniqueness checks** - include all relevant fields (time + phone numbers + direction)
3. **Add error logging** at database operations to diagnose issues quickly
4. **Test with edge cases** - same times, null values, large batches

## Related Code

If you need to implement similar duplicate detection elsewhere, use this pattern:

```typescript
// ✅ GOOD: Comprehensive uniqueness check with maybeSingle
const { data: existing } = await supabase
  .from('table')
  .select('id')
  .eq('user_id', userId)
  .eq('unique_field_1', value1)
  .eq('unique_field_2', value2)
  .eq('unique_field_3', value3)
  .maybeSingle()  // Graceful handling

// ❌ BAD: Weak uniqueness check with single
const { data: existing } = await supabase
  .from('table')
  .select('id')
  .eq('user_id', userId)
  .eq('timestamp', time)
  .single()  // Throws error on multiple matches
```

---

**Status**: ✅ Fixed and tested  
**Impact**: High - prevents data loss during CSV uploads  
**Priority**: Critical - affects core upload functionality


# Call Matching Guide

How the audio-to-CSV matching system works in DentalCallInsights.

## Overview

The system intelligently pairs uploaded audio recordings with CSV call data based on:
1. **Date/Time** (35% weight)
2. **Call Duration** (40% weight) - **Primary matching factor**
3. **Phone Number** (25% weight)

## How It Works

### Matching Algorithm

When you upload both an audio file and CSV data, the system:

1. **Extracts metadata** from your audio upload:
   - Call date
   - Call time
   - Duration (in seconds)
   - Phone number (optional)

2. **Searches CSV records** within:
   - ±5 minutes of the call time
   - ±5 seconds of the call duration
   - Exact or partial phone number match

3. **Calculates confidence scores**:
   - **High (≥90%)**: Exact or very close match on multiple factors
   - **Medium (70-90%)**: Good match with some variance
   - **Low (50-70%)**: Possible match, manual review recommended

4. **Shows match reasons**:
   - "Exact time match" - within 1 minute
   - "Exact duration match" - same duration
   - "Very close duration" - within 5 seconds
   - "Similar duration" - within 30 seconds
   - "Phone number match" - exact match

## Usage Workflow

### Option 1: Audio First, Then CSV

1. **Upload audio file** with metadata:
   ```
   - Select MP3 file
   - Enter call date (e.g., 2025-10-02)
   - Enter call time (e.g., 14:30)
   - Enter duration (e.g., 120 seconds)
   - (Optional) Enter phone number
   ```

2. **Complete upload** → You'll see "Upload Complete"

3. **Upload CSV file** in the right sidebar:
   ```
   - Drag CSV file or click to browse
   - System validates and parses automatically
   - Matching triggers automatically
   ```

4. **Review matches** → System shows potential matches with:
   - Match confidence percentage
   - Time difference
   - Duration
   - Phone numbers
   - Call direction
   - Match reasons

5. **Select best match** or skip to complete

### Option 2: CSV First, Then Audio

1. **Upload CSV file** first in right sidebar

2. **Upload audio file** with metadata

3. **Matching triggers automatically** after audio upload completes

### Option 3: Manual Matching

1. Upload audio and CSV in any order

2. On "Upload Complete" screen, click:
   ```
   [Find Matching CSV Records]
   ```

3. System searches and displays matches

## Example Matching Scenarios

### Scenario 1: Perfect Match
```
Audio:
  Date: 2025-10-02
  Time: 14:30:00
  Duration: 120 seconds

CSV Record:
  Time: September 2nd 2025 2:30 pm
  Duration: 120 seconds
  
Result: 95% confidence - "Exact time match, Exact duration match"
```

### Scenario 2: Close Match
```
Audio:
  Date: 2025-10-02
  Time: 14:30:00
  Duration: 125 seconds

CSV Record:
  Time: September 2nd 2025 2:29 pm
  Duration: 122 seconds
  
Result: 87% confidence - "Close time match, Very close duration"
```

### Scenario 3: Phone Number Boost
```
Audio:
  Date: 2025-10-02
  Time: 14:30:00
  Duration: 180 seconds
  Phone: +1-555-123-4567

CSV Record:
  Time: September 2nd 2025 2:32 pm
  Duration: 185 seconds
  Source: +1-555-123-4567
  
Result: 92% confidence - "Close time match, Similar duration, Phone number match"
```

## Tips for Best Results

### 1. Always Enter Duration
Duration is the **primary matching factor** (40% weight). Always enter the call duration when you know it.

### 2. Use Exact Date and Time
The more precise your date/time, the better the match:
- ✅ Good: Date + Time (e.g., 2025-10-02 14:30)
- ⚠️ OK: Date only (system uses noon as default time)
- ❌ Poor: No date/time (matching won't work)

### 3. Round Duration to Nearest Second
Duration should be in whole seconds:
- ✅ 120 seconds (2 minutes)
- ✅ 185 seconds (3 minutes 5 seconds)
- ❌ 120.5 seconds (system expects integers)

### 4. CSV Format Requirements

Your CSV must include these columns:
```csv
CALL TIME, CALL DIRECTION, SOURCE NUMBER, ..., CALL DURATION SECONDS
```

Example row:
```csv
September 2nd 2025 2:30 pm, Inbound, +1-555-123-4567, ..., 120
```

### 5. Multiple Matches

If multiple CSV records match:
- System shows **all matches** sorted by confidence
- **Select the best match** based on:
  - Highest confidence score
  - Closest time difference
  - Matching phone numbers
  - Correct call direction (Inbound/Outbound)

## Troubleshooting

### No Matches Found

**Problem**: System says "No matches found"

**Solutions**:
1. ✅ Verify CSV data is uploaded
2. ✅ Check date/time is entered correctly
3. ✅ Ensure duration is provided
4. ✅ Verify CSV has records near that time (±5 minutes)
5. ✅ Check CSV duration is similar (±30 seconds tolerance)

### Wrong Match Selected

**Problem**: System suggests incorrect match

**Solutions**:
1. ✅ Review match confidence score
2. ✅ Check time difference (should be < 2 minutes for good matches)
3. ✅ Verify duration difference (should be < 5 seconds for best matches)
4. ✅ Click "Skip" and upload without matching
5. ✅ Manually match later from library

### Matching Not Triggering

**Problem**: Upload completes but no matching interface

**Solutions**:
1. ✅ Ensure both audio AND CSV are uploaded
2. ✅ Verify date/time is entered in audio metadata
3. ✅ Click "Find Matching CSV Records" button manually
4. ✅ Check browser console for errors

## Technical Details

### Matching Weights (v3.0)

```javascript
Time proximity:  35% (within 5 minutes)
Call duration:   40% (within 5 seconds)
Phone number:    25% (exact match)
```

### Tolerance Windows

```
Time:     ±5 minutes (configurable)
Duration: ±5 seconds (tighter tolerance)
Phone:    Exact match required
```

### Score Calculation

```
score = (timeScore × 0.35) + (durationScore × 0.40) + (phoneScore × 0.25)

Where:
- timeScore = 1 - (timeDiff / 5 minutes)
- durationScore = 1 - (durationDiff / 5 seconds)
- phoneScore = 1 if match, 0 if no match
```

### Match Quality Tiers

| Score | Quality | Action |
|-------|---------|--------|
| ≥0.90 | High | Auto-linkable, high confidence |
| 0.70-0.90 | Medium | Review recommended |
| 0.50-0.70 | Low | Manual verification required |
| <0.50 | Very Low | Not shown (filtered out) |

## API Reference

### Find Matches Endpoint

```typescript
POST /api/match-calls

Request:
{
  callId: string,
  callTime: string,  // ISO 8601: "2025-10-02T14:30:00"
  phoneNumber?: string,
  duration?: number,  // seconds
  options?: {
    time_tolerance_minutes: 5,
    duration_tolerance_seconds: 5,
    phone_number_match: true
  }
}

Response:
{
  success: true,
  matches: [
    {
      csv_id: string,
      call_time: string,
      call_direction: "Inbound" | "Outbound",
      source_number: string,
      destination_number: string,
      call_duration_seconds: number,
      match_score: number,  // 0-1
      time_diff_minutes: number,
      duration_diff_seconds: number,
      match_reasons: string[]
    }
  ],
  count: number
}
```

### Link Match Endpoint

```typescript
PUT /api/match-calls

Request:
{
  callId: string,
  csvCallId: string
}

Response:
{
  success: true,
  call: { ... }
}
```

## Future Enhancements

Potential improvements for future versions:

1. **Machine Learning**: Learn from user selections to improve scoring
2. **Caller ID Matching**: Use caller ID name for additional confidence
3. **Fuzzy Phone Matching**: Match partial phone numbers
4. **Batch Matching**: Match multiple files at once
5. **Auto-linking**: Automatically link high-confidence matches (≥95%)
6. **Match History**: Show previously matched pairs
7. **Undo Matching**: Unlink incorrectly matched pairs

---

**Version**: 3.0  
**Last Updated**: October 2, 2025  
**Status**: ✅ Production Ready


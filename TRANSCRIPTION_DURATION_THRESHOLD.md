# Transcription Duration Threshold

## Overview
Calls shorter than 6 seconds are automatically skipped for transcription to save API costs and avoid processing meaningless audio.

## Implementation

### Minimum Duration: 6 seconds

When a transcription is requested:
1. Check `call_duration_seconds` from the `calls` table
2. If duration < 6 seconds:
   - Skip Whisper API call (no cost)
   - Create transcript record immediately
   - Store: "Call too short to transcribe."
   - Mark status as `completed`
3. If duration ≥ 6 seconds:
   - Proceed with normal Whisper transcription

### Database Record

For calls < 6 seconds, the system creates:

```sql
INSERT INTO transcripts (
  call_id,
  transcript,
  raw_transcript,
  transcription_status,
  confidence_score,
  processing_started_at,
  processing_completed_at,
  edit_count
) VALUES (
  'call-id',
  'Call too short to transcribe.',
  'Call too short to transcribe.',
  'completed',
  0,
  NOW(),
  NOW(),
  0
);
```

### Response

API returns:
```json
{
  "message": "Call too short to transcribe (< 6 seconds)",
  "callDuration": 3,
  "status": "completed"
}
```

## Benefits

### Cost Savings
- **Whisper API**: $0.006 per minute
- **Short calls**: Often 1-5 seconds (hangups, disconnects)
- **Typical savings**: ~$0.001 per skipped call
- **At scale**: 100 short calls/day = ~$3/month saved

### User Experience
- Instant "completion" for short calls
- Clear message in transcript viewer
- No waiting for meaningless transcription
- Prevents confusing partial transcripts

### AI Insights
- Insights generation also checks 6-second minimum
- Consistent behavior across transcription and insights
- Short calls show "Too short for insights" in both places

## Edge Cases

### Null Duration
If `call_duration_seconds` is null or undefined:
- Proceed with normal transcription
- Better to attempt than skip
- User can manually skip if needed

### Exactly 6 Seconds
- 6 seconds or more: Transcribe ✓
- Less than 6 seconds: Skip ✗

### Manual Override
Currently no manual override. If needed in future:
- Add `force_transcribe` flag
- Allow users to transcribe short calls manually

## Monitoring

### Check Short Calls
```sql
-- Count calls that were too short
SELECT COUNT(*) 
FROM transcripts 
WHERE transcript = 'Call too short to transcribe.';

-- See duration distribution of short calls
SELECT 
  c.call_duration_seconds,
  COUNT(*) as call_count
FROM calls c
JOIN transcripts t ON c.id = t.call_id
WHERE t.transcript = 'Call too short to transcribe.'
GROUP BY c.call_duration_seconds
ORDER BY c.call_duration_seconds;
```

### Cost Impact
```sql
-- Estimate savings from skipped transcriptions
SELECT 
  COUNT(*) as short_calls,
  COUNT(*) * 0.001 as estimated_savings_usd
FROM transcripts 
WHERE transcript = 'Call too short to transcribe.';
```

## UI Display

### Library Page
- Shows "✓ Transcribed" status
- Same as normal completed transcripts
- No special indicator needed

### Call Detail Page
- Displays: "Call too short to transcribe."
- No audio player confusion
- Clear message to user

### Bulk Actions
- Short calls included in "Transcribe Selected"
- Complete instantly
- Don't block batch processing

## Configuration

### Current Threshold
```typescript
const MIN_CALL_DURATION = 6 // seconds
```

### To Change Threshold
Update in `/app/api/transcribe/route.ts`:
```typescript
const MIN_CALL_DURATION = 10 // Change to 10 seconds
```

Also update in insights generation (`/lib/openai-insights.ts`):
```typescript
const MIN_CALL_DURATION_SECONDS = 10 // Keep consistent
```

## Testing

### Test Short Call
1. Find call with duration < 6 seconds
2. Click "Transcribe"
3. Should complete instantly
4. Transcript shows: "Call too short to transcribe."
5. No Whisper API call made

### Test Boundary (6 seconds)
1. Find call with exactly 6 seconds
2. Should transcribe normally
3. Uses Whisper API

### Test Null Duration
1. Call with no duration data
2. Should attempt transcription
3. Fails gracefully if no audio

## Related Features

### AI Insights
- Also has 6-second minimum
- Short transcripts skip insights
- Consistent threshold across features

### Batch Processing
- Short calls process instantly
- Don't slow down batch operations
- Clear in progress indicators

## Future Enhancements

### Configurable Threshold
- User/org setting for minimum duration
- Different thresholds for different call types
- Admin override capability

### Analytics
- Dashboard showing short call stats
- Cost savings metrics
- Duration distribution charts

### Smart Detection
- Detect disconnects/hangups
- Different message for different scenarios
- "Hangup before answer" vs "Connection issue"

## Summary

**Threshold**: 6 seconds minimum for transcription

**Behavior**:
- < 6 seconds: Skip API, store "Call too short to transcribe."
- ≥ 6 seconds: Normal Whisper transcription

**Benefits**:
- Cost savings (~$3/month for 100 short calls)
- Instant completion for short calls
- Consistent with insights threshold
- Clear user messaging

**Status**: ✅ Implemented and active


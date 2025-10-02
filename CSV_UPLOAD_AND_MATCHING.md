# CSV Upload and Call Matching System

**Status:** 🚧 **IN DEVELOPMENT**  
**Milestone:** 3 - Audio Upload & Storage  
**Last Updated:** December 2024

---

## 📋 Overview

The CSV Upload and Call Matching system allows users to upload existing call data in CSV format and automatically match it with uploaded call recordings. This enables comprehensive call analysis by combining structured call metadata with audio recordings.

---

## 🎯 Features

### CSV Upload
- **Supported Format:** Standard CSV with headers matching call data format
- **File Validation:** Automatic validation of CSV structure and data types
- **Error Handling:** Detailed error reporting with row-level feedback
- **Batch Processing:** Upload multiple call records at once

### Call Matching
- **Time-based Matching:** Match recordings to CSV data by call time
- **Phone Number Matching:** Match by source/destination phone numbers
- **Duration Matching:** Match by call duration similarity
- **Fuzzy Matching:** Handle slight variations in data
- **Manual Review:** Suggest matches for manual confirmation

### Data Correlation
- **Automatic Linking:** Link call recordings to CSV metadata
- **Match Scoring:** Calculate confidence scores for matches
- **Quality Validation:** Validate match quality and suggest improvements
- **Conflict Resolution:** Handle multiple potential matches

---

## 📊 CSV Data Format

### Required Headers

The CSV file must contain these headers (case-insensitive):

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `CALL TIME` | DateTime | ✅ | Date and time of the call |
| `CALL DIRECTION` | Text | ✅ | "Inbound" or "Outbound" |
| `SOURCE NUMBER` | Text | ❌ | Originating phone number |
| `SOURCE NAME` | Text | ❌ | Contact/organization name |
| `SOURCE EXTENSION` | Text | ❌ | Extension number |
| `DESTINATION NUMBER` | Text | ❌ | Destination phone number |
| `DESTINATION EXTENSION` | Text | ❌ | Destination extension |
| `CALL DURATION SECONDS` | Number | ❌ | Call length in seconds |
| `DISPOSITION` | Text | ❌ | Call outcome (answered, voicemail, etc.) |
| `TIME TO ANSWER SECONDS` | Number | ❌ | Answer time in seconds |
| `CALL FLOW` | Text | ❌ | Final routing destination |

### Example CSV Format

```csv
CALL TIME,CALL DIRECTION,SOURCE NUMBER,SOURCE NAME,SOURCE EXTENSION,DESTINATION NUMBER,DESTINATION EXTENSION,CALL DURATION SECONDS,DISPOSITION,TIME TO ANSWER SECONDS,CALL FLOW
"September 23rd 2025 4:49 pm",Outbound,"+1 (323) 325-5641","SOLA Kids Dental",907,"(323) 243-1791",,40,answered,0,"(323) 243-1791"
```

### Supported Date Formats

- `September 23rd 2025 4:49 pm` (with ordinal suffixes)
- `2024-09-23 16:49:00` (ISO format)
- `09/23/2024 4:49 PM` (US format)
- `23/09/2024 16:49` (EU format)
- `2024-09-23T16:49:00` (ISO with T separator)

---

## 🔧 Technical Implementation

### Database Schema

#### `csv_call_data` Table

```sql
CREATE TABLE csv_call_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    call_time TIMESTAMPTZ NOT NULL,
    call_direction TEXT NOT NULL CHECK (call_direction IN ('Inbound', 'Outbound')),
    source_number TEXT,
    source_name TEXT,
    source_extension TEXT,
    destination_number TEXT,
    destination_extension TEXT,
    call_duration_seconds INTEGER CHECK (call_duration_seconds >= 0),
    disposition TEXT,
    time_to_answer_seconds INTEGER CHECK (time_to_answer_seconds >= 0),
    call_flow TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Updated `calls` Table

```sql
ALTER TABLE calls ADD COLUMN csv_call_id UUID REFERENCES csv_call_data(id);
```

### Matching Algorithms

#### 1. Time-based Matching

```typescript
// Find calls within time tolerance
const timeMatches = CallMatcher.matchByTime(
  csvData, 
  callTime, 
  toleranceMinutes: 5
);
```

**Scoring:**
- Exact time match: 1.0
- Within 1 minute: 0.9
- Within 2 minutes: 0.8
- Within 5 minutes: 0.6

#### 2. Phone Number Matching

```typescript
// Match by phone numbers
const phoneMatches = CallMatcher.matchByPhone(
  csvData, 
  phoneNumber
);
```

**Scoring:**
- Exact phone match: 1.0
- Partial match: 0.7
- No match: 0.0

#### 3. Duration Matching

```typescript
// Match by call duration
const durationMatches = CallMatcher.matchByDuration(
  csvData, 
  duration, 
  toleranceSeconds: 30
);
```

**Scoring:**
- Exact duration: 1.0
- Within 10 seconds: 0.9
- Within 30 seconds: 0.7
- Within 60 seconds: 0.5

#### 4. Combined Scoring

```typescript
const matchScore = CallMatcher.calculateMatchScore(
  recordingTime,
  csvTime,
  recordingPhone,
  csvSourcePhone,
  csvDestinationPhone,
  recordingDuration,
  csvDuration,
  options
);
```

**Weight Distribution:**
- Time proximity: 40%
- Phone number match: 40%
- Duration match: 20%

---

## 🚀 Usage Guide

### 1. Upload CSV Data

```typescript
// Upload CSV file
const formData = new FormData();
formData.append('csv', csvFile);

const response = await fetch('/api/csv-upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
// { success: true, total_rows: 100, processed_rows: 98, errors: [...] }
```

### 2. Match Call Recordings

```typescript
// Find matches for a call recording
const matches = await CallMatcher.findMatches(
  userId,
  callTime,
  phoneNumber,
  duration,
  {
    time_tolerance_minutes: 5,
    phone_number_match: true,
    duration_tolerance_seconds: 30,
    require_disposition_match: false
  }
);
```

### 3. Link Recording to CSV Data

```typescript
// Link a call recording to CSV data
const linkResult = await fetch('/api/match-calls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    call_id: 'recording-uuid',
    csv_call_id: 'csv-data-uuid',
    match_confidence: 0.95
  })
});
```

---

## 🔍 Matching Strategies

### Automatic Matching

1. **High Confidence Matches** (Score ≥ 0.9)
   - Time difference ≤ 2 minutes
   - Phone number exact match
   - Duration within 10 seconds
   - Automatically linked

2. **Medium Confidence Matches** (Score 0.7-0.9)
   - Time difference ≤ 5 minutes
   - Phone number partial match
   - Duration within 30 seconds
   - Requires manual review

3. **Low Confidence Matches** (Score 0.5-0.7)
   - Time difference ≤ 10 minutes
   - No phone number match
   - Duration within 60 seconds
   - Manual review required

### Manual Matching

For cases where automatic matching fails:

1. **Time-based Suggestions**
   - Show CSV records within 30 minutes
   - Sort by time proximity

2. **Phone Number Suggestions**
   - Show records with matching phone numbers
   - Include partial matches

3. **Duration Suggestions**
   - Show records with similar duration
   - Within 2-minute tolerance

---

## 📈 Quality Assurance

### Match Validation

```typescript
const validation = CallMatcher.validateMatch(match);

if (validation.isHighQuality) {
  // Auto-approve match
} else if (validation.isMediumQuality) {
  // Flag for review
} else {
  // Require manual review
}
```

### Quality Metrics

- **Match Accuracy:** Percentage of correctly matched calls
- **False Positives:** Incorrect matches that were auto-approved
- **False Negatives:** Missed matches that required manual review
- **Processing Time:** Time to process and match calls

### Continuous Improvement

- **Learning Algorithm:** Improve matching based on user corrections
- **Feedback Loop:** Use manual corrections to refine algorithms
- **A/B Testing:** Test different matching strategies
- **Performance Monitoring:** Track matching accuracy over time

---

## 🛠️ API Endpoints

### Upload CSV Data

```http
POST /api/csv-upload
Content-Type: multipart/form-data

{
  "csv": File,
  "validate_only": boolean (optional)
}
```

**Response:**
```json
{
  "success": true,
  "total_rows": 100,
  "processed_rows": 98,
  "errors": [
    {
      "row": 5,
      "field": "CALL TIME",
      "message": "Invalid date format",
      "value": "invalid-date"
    }
  ],
  "matched_calls": 15
}
```

### Find Matches

```http
POST /api/match-calls/find
Content-Type: application/json

{
  "call_time": "2024-09-23T16:49:00Z",
  "phone_number": "+1 (323) 325-5641",
  "duration": 240,
  "options": {
    "time_tolerance_minutes": 5,
    "phone_number_match": true,
    "duration_tolerance_seconds": 30
  }
}
```

**Response:**
```json
{
  "matches": [
    {
      "csv_id": "uuid",
      "call_time": "2024-09-23T16:49:00Z",
      "call_direction": "Outbound",
      "source_number": "+1 (323) 325-5641",
      "destination_number": "(323) 243-1791",
      "match_score": 0.95,
      "time_diff_minutes": 0.5
    }
  ]
}
```

### Link Call to CSV

```http
POST /api/match-calls/link
Content-Type: application/json

{
  "call_id": "recording-uuid",
  "csv_call_id": "csv-data-uuid",
  "match_confidence": 0.95
}
```

---

## 🔒 Security Considerations

### Data Privacy
- **User Isolation:** RLS policies ensure users only see their own data
- **Data Encryption:** Sensitive data encrypted at rest and in transit
- **Access Logging:** All data access logged for audit purposes

### Input Validation
- **File Size Limits:** Maximum CSV file size (10MB)
- **Row Limits:** Maximum number of rows per upload (10,000)
- **Data Sanitization:** All input data sanitized before processing
- **SQL Injection Prevention:** Parameterized queries only

### Error Handling
- **Graceful Degradation:** System continues working if CSV upload fails
- **Error Logging:** All errors logged for debugging
- **User Feedback:** Clear error messages for users
- **Recovery:** Ability to retry failed uploads

---

## 📊 Performance Considerations

### Optimization Strategies

1. **Batch Processing**
   - Process CSV data in batches of 100 rows
   - Use database transactions for consistency
   - Implement progress tracking

2. **Caching**
   - Cache frequently accessed CSV data
   - Use Redis for session storage
   - Implement query result caching

3. **Database Optimization**
   - Proper indexing on matching fields
   - Use database functions for complex matching
   - Optimize query performance

### Scalability

- **Horizontal Scaling:** Support multiple server instances
- **Database Sharding:** Partition data by user or time
- **CDN Integration:** Serve static assets from CDN
- **Load Balancing:** Distribute load across servers

---

## 🧪 Testing Strategy

### Unit Tests
- CSV parsing functions
- Matching algorithm accuracy
- Data validation logic
- Error handling scenarios

### Integration Tests
- End-to-end upload flow
- Database transaction handling
- API endpoint functionality
- RLS policy enforcement

### Performance Tests
- Large CSV file processing
- Concurrent upload handling
- Database query performance
- Memory usage optimization

### User Acceptance Tests
- Upload various CSV formats
- Test matching accuracy
- Verify error handling
- Validate user experience

---

## 🚀 Future Enhancements

### Planned Features
- **Machine Learning:** Improve matching accuracy with ML models
- **Real-time Processing:** Process CSV data as it's uploaded
- **Advanced Analytics:** Call pattern analysis and insights
- **Export Functionality:** Export matched data to various formats

### Integration Opportunities
- **CRM Integration:** Connect with existing CRM systems
- **Phone System Integration:** Direct integration with phone systems
- **API Webhooks:** Real-time notifications for matches
- **Third-party Analytics:** Integration with analytics platforms

---

## 📚 Resources

### Documentation
- [CSV Format Specification](./CSV_FORMAT_SPEC.md)
- [Matching Algorithm Details](./MATCHING_ALGORITHMS.md)
- [API Reference](./API_REFERENCE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### Tools & Libraries
- [Papa Parse](https://www.papaparse.com/) - CSV parsing library
- [Moment.js](https://momentjs.com/) - Date/time parsing
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security) - Row Level Security
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/functions.html) - Database functions

---

**Last Updated:** December 2024  
**Next Review:** Weekly during development  
**Completion Target:** End of December 2024

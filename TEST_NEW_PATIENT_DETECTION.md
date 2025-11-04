# Test New Patient Detection

## Test the Function Directly

Run this in your browser console or create a test file:

```javascript
// Test the detection logic
const testCases = [
  {
    callFlow: 'DID:3233255641 switchboard:1003 auto_attendant:3757216720079:dialed:1 auto_attendant:2468421977197:dialed:1 schedule [open] ring_group:999',
    direction: 'Inbound',
    expected: true,
    description: 'English + New Patient'
  },
  {
    callFlow: 'DID:3233255641 switchboard:1003 auto_attendant:3757216720079:dialed:1 auto_attendant:2468421977197:dialed:2 schedule [open] ring_group:999',
    direction: 'Inbound',
    expected: false,
    description: 'English + Existing Patient'
  },
  {
    callFlow: 'DID:3233255641 switchboard:1003 auto_attendant:3757216720079:dialed:2 auto_attendant:6294453340942:dialed:1 schedule [open] ring_group:999',
    direction: 'Inbound',
    expected: true,
    description: 'Spanish + New Patient'
  },
  {
    callFlow: 'DID:3233255641 switchboard:1003 auto_attendant:3757216720079',
    direction: 'Inbound',
    expected: false,
    description: 'No dialed entries'
  },
  {
    callFlow: 'DID:3233255641 switchboard:1003 auto_attendant:3757216720079:dialed:1 auto_attendant:2468421977197:dialed:1 schedule [open] ring_group:999',
    direction: 'Outbound',
    expected: false,
    description: 'Outbound call (should always be false)'
  }
];

function parseNewPatientStatus(callFlow, direction) {
  if (!direction || direction.toLowerCase() !== 'inbound') {
    return false;
  }
  if (!callFlow) {
    return false;
  }
  const dialedPattern = /dialed:(\d+)/g;
  const matches = Array.from(callFlow.matchAll(dialedPattern));
  if (matches.length < 2) {
    return false;
  }
  const secondDialedValue = matches[1][1];
  return secondDialedValue === '1';
}

console.log('Testing New Patient Detection Logic:\n');
testCases.forEach((test, i) => {
  const result = parseNewPatientStatus(test.callFlow, test.direction);
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
  console.log(`Test ${i + 1}: ${status} - ${test.description}`);
  console.log(`  Expected: ${test.expected}, Got: ${result}`);
  if (result !== test.expected) {
    console.log(`  Call Flow: ${test.callFlow}`);
  }
});
```

## Check Database After Upload

Run this SQL query in Supabase to see what's actually being saved:

```sql
-- Check recent uploads
SELECT 
    id,
    filename,
    call_time,
    call_direction,
    is_new_patient,
    call_flow,
    created_at
FROM calls
ORDER BY created_at DESC
LIMIT 20;
```

## Check if the Insert is Actually Using the Value

Run this SQL to see if the column accepts TRUE values:

```sql
-- Manual test insert
INSERT INTO calls (
    user_id,
    filename,
    call_direction,
    is_new_patient,
    upload_status
) VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    'TEST_NEW_PATIENT',
    'Inbound',
    TRUE,
    'completed'
) RETURNING id, is_new_patient;
```

If this returns `TRUE`, the database column works fine.

## Possible Issues to Check

### 1. TypeScript Type Mismatch
The database might be expecting a specific format. Check if Supabase client is converting the boolean correctly.

### 2. RLS (Row Level Security) Policy
Check if there's an RLS policy that might be modifying the data on insert.

```sql
-- Check RLS policies on calls table
SELECT * FROM pg_policies WHERE tablename = 'calls';
```

### 3. Database Trigger
Check if there's a trigger that might be overwriting the value:

```sql
-- Check for triggers on calls table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'calls';
```

### 4. Supabase Client Issue
The issue might be with how the Supabase client is serializing the data. Try logging the exact object being sent:

Add this to the upload route before the insert:

```typescript
const insertData = {
  user_id: user.id,
  filename: file.name,
  // ... other fields ...
  is_new_patient: isNewPatient,
};

console.log('📦 Data being inserted:', JSON.stringify(insertData, null, 2));
```

## Debug Checklist

- [ ] Did you run migration 16? (`ALTER TABLE calls ADD COLUMN is_new_patient`)
- [ ] Does the column exist in Supabase? (Check table structure)
- [ ] Is the function being called? (Check server logs for debug output)
- [ ] What does the function return? (Check server logs for `is_new_patient will be set to:`)
- [ ] Is the data being sent to Supabase? (Check the insert payload in logs)
- [ ] Is Supabase receiving TRUE but storing FALSE? (Database trigger/policy issue)
- [ ] Are you checking the right records? (Make sure you're looking at newly uploaded calls)

## Expected Server Log Output

When uploading, you should see:

```
📝 Creating new call record WITH audio: call_file.mp3
🔍 parseNewPatientStatus called: { direction: 'Inbound', hasCallFlow: true, ... }
  📊 Dialed values found: [ '1', '1' ]
  ✅ Result: NEW PATIENT (second dialed: 1)
   is_new_patient will be set to: true
```

If you're NOT seeing this output, the code might not be deployed or you're hitting a different code path.


# Filename Migration Guide

## Overview

This guide explains how to deploy the filename migration (`24_update_existing_filenames.sql`) to update all existing call filenames in your Supabase database to the new standardized format.

## New Filename Format

The new filename format follows this pattern: `A_B_C_D_E`

- **A**: Extension name or number (prioritizes name if mapped)
  - Examples: `Natalie`, `Yaslin`, `902`, `Unknown`
- **B**: Call direction (inbound/outbound)
  - Examples: `inbound`, `outbound`, `unknown`
- **C**: Call time (MM-DD-YY_HH:MM AM/PM format in UTC)
  - Example: `01-14-25_02:30-PM` (January 14, 2025 at 14:30 UTC / 2:30 PM)
- **D**: Call flow (phone numbers formatted as ###-###-#### to ###-###-####)
  - Example: `323-325-5641-to-618-801-5113`
  - Fallback: `unknown-to-unknown` if call flow cannot be parsed
- **E**: Call duration (Xsecs)
  - Example: `180secs`, `0secs`

### Example Filename
```
Natalie_inbound_01-14-25_02:30-PM_323-325-5641-to-618-801-5113_180secs.mp3
```

## Prerequisites

- Access to Supabase Dashboard
- SQL Editor permissions
- Backup of your database (recommended)

## Deployment Steps

### Step 1: Backup Your Database (Recommended)

Before running any migration, it's highly recommended to create a backup:

1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **Database**
3. Click **Backup** or use the Supabase CLI:
   ```bash
   supabase db dump -f backup.sql
   ```

### Step 2: Review the Migration

1. Open the migration file: `migrations/24_update_existing_filenames.sql`
2. Review the SQL code to understand what it does
3. Note that it:
   - Creates helper functions for filename generation
   - Updates all existing call records
   - Preserves file extensions
   - Only updates filenames that have changed

### Step 3: Run the Migration in Supabase

#### Option A: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Navigate to SQL Editor**
   - Click on **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy the Migration SQL**
   - Open `migrations/24_update_existing_filenames.sql`
   - Copy the entire contents

4. **Paste and Run**
   - Paste the SQL into the SQL Editor
   - Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

5. **Check Results**
   - Look for the completion message in the output
   - You should see: `✅ Updated X call filenames`
   - Check the `calls` table to verify filenames have been updated

#### Option B: Using Supabase CLI

1. **Install Supabase CLI** (if not already installed)
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link Your Project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Run the Migration**
   ```bash
   supabase db push migrations/24_update_existing_filenames.sql
   ```

   Or manually:
   ```bash
   psql -h db.your-project.supabase.co -U postgres -d postgres -f migrations/24_update_existing_filenames.sql
   ```

### Step 4: Verify the Migration

After running the migration, verify that filenames have been updated:

```sql
-- Check a sample of updated filenames
SELECT 
    id,
    filename,
    source_extension,
    call_direction,
    call_time,
    call_duration_seconds,
    updated_at
FROM calls
ORDER BY updated_at DESC
LIMIT 10;
```

Expected results:
- Filenames should follow the new format: `Extension_Direction_Date_Time_CallFlow_Duration.ext`
- Extension names should be used when available (e.g., `Natalie` instead of `902`)
- Call times should be in `MM-DD-YY_HH:MM-AM/PM` format (e.g., `01-14-25_02:30-PM`)
- Call flows should show phone numbers in `###-###-####-to-###-###-####` format

### Step 5: Test the Application

1. **Check Call List Page**
   - Navigate to the Library/Call List page
   - Verify that call filenames display correctly

2. **Check Call Detail Page**
   - Click on a call to view details
   - Verify the filename is shown correctly in the header

3. **Check Search/Filter**
   - Test searching by filename
   - Verify filters still work correctly

## What Gets Updated

- ✅ **Database `filename` field**: Updated to new format
- ✅ **File extensions**: Preserved (e.g., `.mp3`, `.wav`)
- ❌ **Storage files**: NOT modified (original files remain unchanged)
- ❌ **Audio files**: NOT renamed in storage

## Important Notes

### Storage Files Are Not Renamed

The migration only updates the `filename` field in the database. The actual audio files stored in Supabase Storage are **NOT renamed**. This is intentional because:

1. The storage path uses the original filename: `{user_id}/{original_filename}`
2. Renaming files in storage would require additional operations
3. The database filename is what's displayed to users

### Extension Name Mapping

The following extensions are mapped to names:
- `902` → `Natalie`
- `903` → `Yaslin`
- `904` → `Carla`
- `905` → `Adineli`
- `906` → `Roselyn`
- `907` → `Yesica`
- `997` → `Amy`

All other extensions will use the extension number itself.

### Call Flow Parsing

The migration attempts to extract phone numbers from the `call_flow` field. If it cannot find two phone numbers, it will:
- Sanitize the call flow text
- Use `unknown-to-unknown` as a fallback

### Timezone Handling

Call times are formatted using UTC to avoid timezone issues. The format is `MM-DD-YY_HH:MM-AM/PM` where:
- `MM` = Month (01-12)
- `DD` = Day (01-31)
- `YY` = Year (last 2 digits)
- `HH` = Hour (01-12, 12-hour format)
- `MM` = Minutes (00-59)
- `AM/PM` = AM or PM indicator

Example: `01-14-25_02:30-PM` represents January 14, 2025 at 2:30 PM UTC

## Troubleshooting

### Migration Fails with Function Already Exists

If you see errors about functions already existing:
```sql
-- Drop existing functions first
DROP FUNCTION IF EXISTS get_extension_display_name(TEXT);
DROP FUNCTION IF EXISTS format_call_time_for_filename(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS format_phone_number(TEXT);
DROP FUNCTION IF EXISTS extract_call_flow_numbers(TEXT);
DROP FUNCTION IF EXISTS sanitize_filename(TEXT);
DROP FUNCTION IF EXISTS generate_call_filename(TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TEXT, INTEGER, TEXT);
```

Then re-run the migration.

### No Filenames Updated

If the migration completes but shows `Updated 0 call filenames`:
1. Check if you have calls in the database:
   ```sql
   SELECT COUNT(*) FROM calls WHERE filename IS NOT NULL AND filename != '';
   ```
2. Verify the helper functions were created:
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE '%filename%';
   ```

### Filenames Look Incorrect

If filenames don't match the expected format:
1. Check if call data is complete:
   ```sql
   SELECT 
       source_extension,
       call_direction,
       call_time,
       call_flow,
       call_duration_seconds
   FROM calls
   WHERE filename LIKE '%Unknown%'
   LIMIT 5;
   ```
2. Verify the helper functions are working:
   ```sql
   SELECT generate_call_filename(
       '902',
       'inbound',
       NOW(),
       '323-325-5641 to 618-801-5113',
       180,
       'mp3'
   );
   ```

## Rollback (If Needed)

If you need to rollback the migration:

1. **Restore from Backup**
   ```bash
   psql -h db.your-project.supabase.co -U postgres -d postgres < backup.sql
   ```

2. **Or Manually Update Filenames**
   - If you have a backup of the original filenames, you can restore them
   - Note: The migration doesn't store original filenames, so you'll need a backup

## Cleanup (Optional)

After verifying the migration worked correctly, you can optionally remove the helper functions:

```sql
DROP FUNCTION IF EXISTS get_extension_display_name(TEXT);
DROP FUNCTION IF EXISTS format_call_time_for_filename(TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS format_phone_number(TEXT);
DROP FUNCTION IF EXISTS extract_call_flow_numbers(TEXT);
DROP FUNCTION IF EXISTS sanitize_filename(TEXT);
DROP FUNCTION IF EXISTS generate_call_filename(TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TEXT, INTEGER, TEXT);
```

**Note**: These functions are kept by default in case you need to regenerate filenames in the future. You can uncomment the cleanup section in the migration file if you want them removed automatically.

## Support

If you encounter any issues:
1. Check the Supabase logs in the Dashboard
2. Review the migration output for error messages
3. Verify your database schema matches the expected structure
4. Check that all required columns exist in the `calls` table

## Related Files

- Migration file: `migrations/24_update_existing_filenames.sql`
- Filename generator: `lib/filename-generator.ts`
- Extension names: `lib/extension-names.ts`


-- ============================================
-- Update Existing Call Filenames
-- Migration 24: Update all existing call filenames to new standardized format
-- ============================================
-- This migration updates all existing call filenames to follow the format:
-- A_B_C_D_E
-- A: extension name or number (prioritize name if available)
-- B: call direction (inbound/outbound)
-- C: call time (MM-DD-YY_HH:MM AM/PM)
-- D: call flow (###-###-#### to ###-###-####)
-- E: call duration (Xsecs)
-- ============================================

-- ============================================
-- HELPER FUNCTION: Get Extension Display Name
-- ============================================
CREATE OR REPLACE FUNCTION get_extension_display_name(ext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Map extension numbers to names
    CASE ext
        WHEN '902' THEN RETURN 'Natalie';
        WHEN '903' THEN RETURN 'Yaslin';
        WHEN '904' THEN RETURN 'Carla';
        WHEN '905' THEN RETURN 'Adineli';
        WHEN '906' THEN RETURN 'Roselyn';
        WHEN '907' THEN RETURN 'Yesica';
        WHEN '997' THEN RETURN 'Amy';
        ELSE RETURN COALESCE(ext, 'Unknown');
    END CASE;
END;
$$;

-- ============================================
-- HELPER FUNCTION: Format Call Time as MM-DD-YY_HH:MM AM/PM
-- ============================================
CREATE OR REPLACE FUNCTION format_call_time_for_filename(call_time TIMESTAMP WITH TIME ZONE)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF call_time IS NULL THEN
        RETURN '00-00-00_00:00-AM';
    END IF;
    
    RETURN TO_CHAR(call_time AT TIME ZONE 'UTC', 'MM-DD-YY_HH12:MI-AM');
END;
$$;

-- ============================================
-- HELPER FUNCTION: Format Phone Number
-- ============================================
CREATE OR REPLACE FUNCTION format_phone_number(phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    digits TEXT;
BEGIN
    IF phone IS NULL THEN
        RETURN '';
    END IF;
    
    -- Extract only digits
    digits := regexp_replace(phone, '[^0-9]', '', 'g');
    
    -- Format as ###-###-#### if 10 digits
    IF LENGTH(digits) = 10 THEN
        RETURN SUBSTRING(digits, 1, 3) || '-' || 
               SUBSTRING(digits, 4, 3) || '-' || 
               SUBSTRING(digits, 7, 4);
    END IF;
    
    RETURN digits;
END;
$$;

-- ============================================
-- HELPER FUNCTION: Extract Call Flow Numbers
-- ============================================
CREATE OR REPLACE FUNCTION extract_call_flow_numbers(call_flow TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    phone_pattern TEXT := '(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})';
    matches TEXT[];
    phone1 TEXT;
    phone2 TEXT;
    formatted1 TEXT;
    formatted2 TEXT;
BEGIN
    IF call_flow IS NULL OR call_flow = '' THEN
        RETURN 'unknown-to-unknown';
    END IF;
    
    -- Extract phone numbers using regex
    SELECT ARRAY(
        SELECT (regexp_matches(call_flow, phone_pattern, 'g'))[1]
        LIMIT 2
    ) INTO matches;
    
    -- If we found at least 2 phone numbers
    IF array_length(matches, 1) >= 2 THEN
        phone1 := matches[1];
        phone2 := matches[2];
        formatted1 := format_phone_number(phone1);
        formatted2 := format_phone_number(phone2);
        
        IF formatted1 != '' AND formatted2 != '' THEN
            RETURN formatted1 || '-to-' || formatted2;
        END IF;
    END IF;
    
    -- Fallback: sanitize the call flow string
    RETURN LOWER(
        regexp_replace(
            regexp_replace(call_flow, '[^a-zA-Z0-9\s-]', '', 'g'),
            '\s+', '-', 'g'
        )
    );
END;
$$;

-- ============================================
-- HELPER FUNCTION: Sanitize Filename
-- ============================================
CREATE OR REPLACE FUNCTION sanitize_filename(filename TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN regexp_replace(
        regexp_replace(
            regexp_replace(
                regexp_replace(
                    regexp_replace(filename, '[<>:"/\\|?*]', '_', 'g'),
                    '\s+', '_', 'g'
                ),
                '_{2,}', '_', 'g'
            ),
            '^_+|_+$', '', 'g'
        ),
        '^(.{255}).*$', '\1', 'g'
    );
END;
$$;

-- ============================================
-- MAIN FUNCTION: Generate Call Filename
-- ============================================
CREATE OR REPLACE FUNCTION generate_call_filename(
    p_extension TEXT,
    p_direction TEXT,
    p_call_time TIMESTAMP WITH TIME ZONE,
    p_call_flow TEXT,
    p_duration_seconds INTEGER,
    p_file_extension TEXT DEFAULT 'mp3'
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    extension_part TEXT;
    direction_part TEXT;
    call_time_part TEXT;
    call_flow_part TEXT;
    duration_part TEXT;
    filename TEXT;
BEGIN
    -- A: Extension name or number
    extension_part := REPLACE(get_extension_display_name(p_extension), ' ', '_');
    IF extension_part IS NULL OR extension_part = '' THEN
        extension_part := 'Unknown';
    END IF;
    
    -- B: Call direction
    direction_part := LOWER(COALESCE(p_direction, 'unknown'));
    direction_part := REPLACE(direction_part, ' ', '_');
    
    -- C: Call time
    call_time_part := format_call_time_for_filename(p_call_time);
    
    -- D: Call flow
    call_flow_part := extract_call_flow_numbers(p_call_flow);
    
    -- E: Call duration
    duration_part := COALESCE(p_duration_seconds::TEXT, '0') || 'secs';
    
    -- Combine all parts
    filename := extension_part || '_' || 
                direction_part || '_' || 
                call_time_part || '_' || 
                call_flow_part || '_' || 
                duration_part || '.' || 
                COALESCE(p_file_extension, 'mp3');
    
    -- Sanitize and return
    RETURN sanitize_filename(filename);
END;
$$;

-- ============================================
-- UPDATE EXISTING CALLS
-- ============================================
DO $$
DECLARE
    call_record RECORD;
    new_filename TEXT;
    file_ext TEXT;
    updated_count INTEGER := 0;
BEGIN
    -- Loop through all calls and update filenames
    FOR call_record IN 
        SELECT 
            id,
            filename,
            source_extension,
            call_direction,
            call_time,
            call_flow,
            call_duration_seconds
        FROM calls
        WHERE filename IS NOT NULL 
          AND filename != ''
    LOOP
        -- Extract file extension from current filename
        file_ext := LOWER(
            COALESCE(
                NULLIF(SPLIT_PART(call_record.filename, '.', -1), call_record.filename),
                'mp3'
            )
        );
        
        -- Generate new filename
        new_filename := generate_call_filename(
            call_record.source_extension,
            call_record.call_direction,
            call_record.call_time,
            call_record.call_flow,
            call_record.call_duration_seconds,
            file_ext
        );
        
        -- Update the filename if it's different
        IF new_filename != call_record.filename THEN
            UPDATE calls
            SET filename = new_filename,
                updated_at = NOW()
            WHERE id = call_record.id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Updated % call filenames', updated_count;
END $$;

-- ============================================
-- CLEANUP: Drop helper functions (optional)
-- ============================================
-- Uncomment these if you want to remove the helper functions after migration
-- DROP FUNCTION IF EXISTS get_extension_display_name(TEXT);
-- DROP FUNCTION IF EXISTS format_call_time_for_filename(TIMESTAMP WITH TIME ZONE);
-- DROP FUNCTION IF EXISTS format_phone_number(TEXT);
-- DROP FUNCTION IF EXISTS extract_call_flow_numbers(TEXT);
-- DROP FUNCTION IF EXISTS sanitize_filename(TEXT);
-- DROP FUNCTION IF EXISTS generate_call_filename(TEXT, TEXT, TIMESTAMP WITH TIME ZONE, TEXT, INTEGER, TEXT);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Filename update migration completed successfully!';
    RAISE NOTICE '📋 All existing call filenames have been updated to the new format.';
END $$;


/**
 * Server-side Supabase Client
 * For use in API routes with service role key for admin operations
 * IMPORTANT: Never expose service role key to client!
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

/**
 * Create Supabase admin client with service role key
 * This client bypasses RLS and should only be used server-side
 * Use with caution and always validate user permissions manually
 */
export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Create Supabase client for API routes with user context
 * Uses anon key and respects RLS policies
 */
export function createAPIClient(accessToken?: string) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
    },
  })

  return client
}


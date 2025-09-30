/**
 * Supabase client configuration
 * Provides browser and server-side Supabase clients with auth support
 */

import { createBrowserClient as createBrowserSupabaseClient, createServerClient as createServerSupabaseClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check .env.local'
  )
}

/**
 * Create a Supabase client for browser/client components
 * Automatically handles auth state and cookie management
 */
export function createBrowserClient() {
  return createBrowserSupabaseClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Create a Supabase client for server components
 * Handles cookie reading/writing for SSR
 */
export function createServerClient() {
  const cookieStore = cookies()
  
  return createServerSupabaseClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use createBrowserClient() instead
 */
export const supabase = createBrowserClient()

/**
 * Type definitions for database tables
 * Update these as your schema evolves
 */
export type Call = {
  id: string
  user_id: string
  audio_path: string
  metadata: Record<string, any>
  created_at: string
}

export type Transcript = {
  id: string
  call_id: string
  transcript: string
  summary: string | null
  sentiment: string | null
  duration: number | null
  created_at: string
}

export type Embedding = {
  id: string
  call_id: string
  chunk_index: number
  content: string
  embedding: number[] // Will be stored as vector in DB
  created_at: string
}

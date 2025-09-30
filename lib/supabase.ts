/**
 * Supabase client configuration
 * Provides browser and server-side Supabase clients
 */

import { createClient } from '@supabase/supabase-js'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check .env.local'
  )
}

/**
 * Browser-side Supabase client
 * Safe to use in client components and API routes
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

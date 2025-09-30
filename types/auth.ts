/**
 * Authentication Type Definitions
 * Centralized TypeScript types for auth state, users, sessions, and forms
 */

import { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js'

// Re-export Supabase types for convenience
export type User = SupabaseUser
export type Session = SupabaseSession

/**
 * Auth state managed by AuthProvider
 */
export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: AuthError | null
}

/**
 * Custom auth error with user-friendly messages
 */
export interface AuthError {
  message: string
  code?: string
  details?: string
}

/**
 * User profile data (extends Supabase User)
 */
export interface UserProfile {
  id: string
  email: string
  created_at: string
  updated_at?: string
  email_confirmed_at?: string
}

/**
 * Sign up form data
 */
export interface SignUpFormData {
  email: string
  password: string
  confirmPassword: string
}

/**
 * Sign in form data
 */
export interface SignInFormData {
  email: string
  password: string
}

/**
 * Password reset request form data
 */
export interface PasswordResetFormData {
  email: string
}

/**
 * Password update form data
 */
export interface PasswordUpdateFormData {
  currentPassword?: string
  newPassword: string
  confirmPassword: string
}

/**
 * Form validation error
 */
export interface FormError {
  field: string
  message: string
}

/**
 * Auth response with success/error handling
 */
export interface AuthResponse<T = any> {
  data?: T
  error?: AuthError
}

/**
 * Password strength levels
 */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong'

/**
 * Password strength result
 */
export interface PasswordStrengthResult {
  strength: PasswordStrength
  score: number // 0-100
  feedback: string[]
}


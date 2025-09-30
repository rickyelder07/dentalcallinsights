/**
 * Authentication Utilities
 * Wrapper functions for Supabase Auth with error handling and type safety
 */

import { createBrowserClient, createServerClient } from '@/lib/supabase'
import type { AuthResponse, AuthError, PasswordStrength, PasswordStrengthResult } from '@/types/auth'

/**
 * Get Supabase client for client components
 */
export function getSupabaseClient() {
  return createBrowserClient()
}

/**
 * Get Supabase client for server components
 */
export function getSupabaseServer() {
  return createServerClient()
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        error: formatAuthError(error),
      }
    }

    return { data }
  } catch (error) {
    return {
      error: {
        message: 'An unexpected error occurred during sign in',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<AuthResponse> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      return {
        error: formatAuthError(error),
      }
    }

    return { data }
  } catch (error) {
    return {
      error: {
        message: 'An unexpected error occurred during sign up',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<AuthResponse> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        error: formatAuthError(error),
      }
    }

    return { data: { success: true } }
  } catch (error) {
    return {
      error: {
        message: 'An unexpected error occurred during sign out',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<AuthResponse> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      return {
        error: formatAuthError(error),
      }
    }

    return { data: { success: true } }
  } catch (error) {
    return {
      error: {
        message: 'An unexpected error occurred during password reset',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<AuthResponse> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      return {
        error: formatAuthError(error),
      }
    }

    return { data: { success: true } }
  } catch (error) {
    return {
      error: {
        message: 'An unexpected error occurred during password update',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Get current user (server-side)
 */
export async function getUser() {
  try {
    const supabase = getSupabaseServer()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      return { user: null, error: formatAuthError(error) }
    }

    return { user, error: null }
  } catch (error) {
    return {
      user: null,
      error: {
        message: 'Failed to get user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Get current session (server-side)
 */
export async function getSession() {
  try {
    const supabase = getSupabaseServer()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      return { session: null, error: formatAuthError(error) }
    }

    return { session, error: null }
  } catch (error) {
    return {
      session: null,
      error: {
        message: 'Failed to get session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * Format Supabase auth errors into user-friendly messages
 */
function formatAuthError(error: any): AuthError {
  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password',
    'Email not confirmed': 'Please confirm your email before signing in',
    'User already registered': 'An account with this email already exists',
    'Password should be at least 6 characters': 'Password must be at least 6 characters long',
  }

  const message = errorMessages[error.message] || error.message || 'An authentication error occurred'

  return {
    message,
    code: error.code,
    details: error.message,
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email) {
    return { valid: false, error: 'Email is required' }
  }
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }
  
  return { valid: true }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): PasswordStrengthResult {
  const feedback: string[] = []
  let score = 0

  // Length check
  if (password.length >= 8) {
    score += 25
  } else {
    feedback.push('Password should be at least 8 characters')
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 25
  } else {
    feedback.push('Add uppercase letters')
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 25
  } else {
    feedback.push('Add lowercase letters')
  }

  // Number or special character check
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) {
    score += 25
  } else {
    feedback.push('Add numbers or special characters')
  }

  // Determine strength level
  let strength: PasswordStrength
  if (score < 50) {
    strength = 'weak'
  } else if (score < 75) {
    strength = 'fair'
  } else if (score < 100) {
    strength = 'good'
  } else {
    strength = 'strong'
  }

  return {
    strength,
    score,
    feedback: feedback.length > 0 ? feedback : ['Strong password!'],
  }
}

/**
 * Validate passwords match
 */
export function validatePasswordsMatch(password: string, confirmPassword: string): { valid: boolean; error?: string } {
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' }
  }
  return { valid: true }
}


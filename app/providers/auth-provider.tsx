/**
 * Auth Context Provider
 * Manages global authentication state and provides auth hooks
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { signOut as authSignOut } from '@/lib/auth'
import type { User, Session, AuthState } from '@/types/auth'

// Create auth context
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * AuthProvider component
 * Wraps the app and provides auth state to all children
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  const supabase = createBrowserClient()

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setError({ message: error.message })
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
        setError({ message: 'Failed to initialize authentication' })
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)
      
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Handle specific auth events
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully')
      } else if (event === 'USER_UPDATED') {
        console.log('User updated')
      }
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  // Refresh session manually
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Error refreshing session:', error)
        setError({ message: error.message })
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
    } catch (err) {
      console.error('Error refreshing session:', err)
      setError({ message: 'Failed to refresh session' })
    }
  }, [supabase.auth])

  // Sign out helper
  const handleSignOut = useCallback(async () => {
    try {
      const result = await authSignOut()
      
      if (result.error) {
        console.error('Error signing out:', result.error)
        // Even if Supabase logout fails, clear local state
        setUser(null)
        setSession(null)
        return // Don't throw error, just clear local state
      }
      
      // Clear local state
      setUser(null)
      setSession(null)
      
      // Force a page refresh to clear any cached session data
      window.location.href = '/login'
    } catch (err) {
      console.error('Error signing out:', err)
      // Even if there's an error, clear local state
      setUser(null)
      setSession(null)
      // Force redirect to login to clear any cached data
      window.location.href = '/login'
    }
  }, [])

  const value: AuthContextValue = {
    user,
    session,
    loading,
    error,
    signOut: handleSignOut,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth hook
 * Access auth state and methods from any component
 * 
 * @example
 * ```tsx
 * const { user, loading, signOut } = useAuth()
 * 
 * if (loading) return <div>Loading...</div>
 * if (!user) return <div>Not logged in</div>
 * 
 * return <button onClick={signOut}>Sign out</button>
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

/**
 * useRequireAuth hook
 * Ensures user is authenticated, redirects to login if not
 * 
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { user, loading } = useRequireAuth()
 *   
 *   if (loading) return <div>Loading...</div>
 *   
 *   return <div>Welcome {user.email}</div>
 * }
 * ```
 */
export function useRequireAuth() {
  const auth = useAuth()
  
  useEffect(() => {
    if (!auth.loading && !auth.user) {
      // Redirect to login if not authenticated
      const currentPath = window.location.pathname
      const redirectUrl = `/login?redirectTo=${encodeURIComponent(currentPath)}`
      window.location.href = redirectUrl
    }
  }, [auth.loading, auth.user])
  
  return auth
}


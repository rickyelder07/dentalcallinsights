/**
 * Protected Route Wrapper Component
 * Ensures user is authenticated before rendering children
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers/auth-provider'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Custom loading component */
  loadingComponent?: React.ReactNode
  /** Redirect path if not authenticated (default: /login) */
  redirectTo?: string
}

/**
 * ProtectedRoute Component
 * Wrap any page content with this to require authentication
 * 
 * @example
 * ```tsx
 * export default function MyProtectedPage() {
 *   return (
 *     <ProtectedRoute>
 *       <div>Protected content here</div>
 *     </ProtectedRoute>
 *   )
 * }
 * ```
 */
export default function ProtectedRoute({
  children,
  loadingComponent,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      // Get current path for redirect after login
      const currentPath = window.location.pathname
      const redirectUrl = `${redirectTo}?redirectTo=${encodeURIComponent(currentPath)}`
      router.push(redirectUrl)
    }
  }, [loading, user, router, redirectTo])

  // Show loading state
  if (loading) {
    return (
      loadingComponent || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      )
    )
  }

  // Don't render children until authenticated
  if (!user) {
    return null
  }

  // User is authenticated, render children
  return <>{children}</>
}


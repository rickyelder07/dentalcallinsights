/**
 * Next.js Middleware for Route Protection
 * Protects authenticated routes and handles session refresh
 */

import { createServerClient as createMiddlewareSupabaseClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = ['/upload', '/library-enhanced', '/qa', '/profile', '/calls', '/analytics']

/**
 * Public routes that redirect to /library-enhanced if user is authenticated
 */
const AUTH_ROUTES = ['/login', '/signup']

/**
 * Middleware function
 * Runs on every request to check auth state and protect routes
 */
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createMiddlewareSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )
  
  try {
    // Refresh session if expired - required for Server Components
    // This will automatically refresh the session cookie
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const { pathname } = req.nextUrl

    // Redirect old /library route to /library-enhanced
    if (pathname === '/library' || pathname.startsWith('/library/')) {
      return NextResponse.redirect(new URL(pathname.replace('/library', '/library-enhanced'), req.url))
    }

    // Check if current route is protected
    const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
      pathname.startsWith(route)
    )

    // Check if current route is an auth route (login/signup)
    const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

    // Redirect to login if accessing protected route without session
    if (isProtectedRoute && !session) {
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Redirect to library-enhanced if accessing auth routes with active session
    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL('/library-enhanced', req.url))
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    
    // On error, allow request to continue but log the issue
    // This prevents the entire app from breaking due to auth issues
    return res
  }
}

/**
 * Matcher configuration
 * Specifies which routes this middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}


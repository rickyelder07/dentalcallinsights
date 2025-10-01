/**
 * Auth Callback Route
 * Handles OAuth and email confirmation redirects from Supabase
 */

import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')

  if (code) {
    const supabase = createServerClient()
    
    try {
      await supabase.auth.exchangeCodeForSession(code)
    } catch (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(
        new URL('/login?error=auth_callback_error', requestUrl.origin)
      )
    }
  }

  // Handle different authentication flows
  if (type === 'recovery') {
    // Password reset flow - redirect to reset password page
    return NextResponse.redirect(new URL('/reset-password?type=recovery', requestUrl.origin))
  } else if (type === 'signup') {
    // Email confirmation flow - redirect to login with success message
    return NextResponse.redirect(new URL('/login?message=email_confirmed', requestUrl.origin))
  } else {
    // Default OAuth flow - redirect to library
    return NextResponse.redirect(new URL('/library', requestUrl.origin))
  }
}


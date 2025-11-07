/**
 * Navigation Component
 * Main header navigation with conditional auth state
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/providers/auth-provider'
import LogoutButton from './logout-button'

export default function Navigation() {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  return (
    <header className="bg-white shadow-sm border-b">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl font-bold text-primary-600 hover:text-primary-700 transition"
            >
              Dental Call Insights
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {user && (
              <>
                <Link
                  href="/upload"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    pathname === '/upload'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  Upload
                </Link>
                <Link
                  href="/library-enhanced"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    pathname === '/library-enhanced' || pathname === '/library'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  Library
                </Link>
                <Link
                  href="/analytics"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    pathname === '/analytics'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analytics
                  </span>
                </Link>
                <Link
                  href="/caller-analytics"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    pathname === '/caller-analytics'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Caller Analytics
                  </span>
                </Link>
                <Link
                  href="/call-highlights"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    pathname === '/call-highlights'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Call Highlights
                  </span>
                </Link>
                <Link
                  href="/qa"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    pathname === '/qa'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  QA
                </Link>
              </>
            )}

            {/* Auth State UI */}
            {loading ? (
              <div className="px-4 py-2">
                <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
              </div>
            ) : user ? (
              <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-200">
                <Link
                  href="/profile"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    pathname === '/profile'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="hidden lg:inline">{user.email}</span>
                  <span className="lg:hidden">Profile</span>
                </Link>
                <LogoutButton />
              </div>
            ) : (
              <div className="flex items-center space-x-2 ml-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-md text-sm font-medium transition"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            {!loading && !user && (
              <Link
                href="/login"
                className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-md text-sm font-medium transition"
              >
                Login
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu (Simple Version) */}
        {user && (
          <div className="md:hidden pb-4 space-y-1">
            <Link
              href="/upload"
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/upload'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Upload
            </Link>
            <Link
              href="/library-enhanced"
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/library-enhanced' || pathname === '/library'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Library
            </Link>
            <Link
              href="/analytics"
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/analytics'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </span>
            </Link>
            <Link
              href="/caller-analytics"
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/caller-analytics'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Caller Analytics
              </span>
            </Link>
            <Link
              href="/call-highlights"
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/call-highlights'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Call Highlights
              </span>
            </Link>
            <Link
              href="/qa"
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/qa'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              QA
            </Link>
            <Link
              href="/profile"
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/profile'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Profile
            </Link>
            <div className="pt-2 border-t border-gray-200">
              <LogoutButton className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50" />
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}


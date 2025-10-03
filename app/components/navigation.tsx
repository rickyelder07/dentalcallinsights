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
                  href="/library"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                    pathname === '/library'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  Library
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
              href="/library"
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                pathname === '/library'
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Library
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


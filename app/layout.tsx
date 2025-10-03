/**
 * Root layout for DentalCallInsights
 * Provides global styles, metadata, navigation structure, and auth context
 */

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from './providers/auth-provider'
import AuthErrorBoundary from './components/auth-error-boundary'
import Navigation from './components/navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dental Call Insights',
  description: 'Transform dental call recordings into actionable insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthErrorBoundary>
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              {/* Header with Navigation */}
              <Navigation />

              {/* Main Content */}
              <main className="flex-1">{children}</main>

              {/* Footer */}
              <footer className="bg-gray-50 border-t mt-auto">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                  <p className="text-center text-gray-500 text-sm">
                    © 2025 Dental Call Insights. Built with Next.js and Supabase.
                  </p>
                </div>
              </footer>
            </div>
          </AuthProvider>
        </AuthErrorBoundary>
      </body>
    </html>
  )
}

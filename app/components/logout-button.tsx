/**
 * Logout Button Component
 * Reusable button for signing out with loading state
 */

'use client'

import { useState } from 'react'
import { useAuth } from '@/app/providers/auth-provider'

interface LogoutButtonProps {
  /** Custom className for styling */
  className?: string
  /** Show confirmation modal before logout */
  confirmBeforeLogout?: boolean
}

export default function LogoutButton({
  className = '',
  confirmBeforeLogout = false,
}: LogoutButtonProps) {
  const { signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleLogout = async () => {
    if (confirmBeforeLogout && !showConfirm) {
      setShowConfirm(true)
      return
    }

    setLoading(true)
    setShowConfirm(false)

    try {
      await signOut()
      // AuthProvider will handle the redirect automatically
    } catch (error) {
      console.error('Logout error:', error)
      // The AuthProvider handles redirects, so this shouldn't happen
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowConfirm(false)
  }

  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Confirm Logout
          </h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to sign out?
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={
        className ||
        'text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition'
      }
    >
      {loading ? 'Signing out...' : 'Sign Out'}
    </button>
  )
}


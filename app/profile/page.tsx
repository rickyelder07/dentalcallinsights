/**
 * Profile Page
 * User account management and settings
 */

'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/app/components/protected-route'
import { useAuth } from '@/app/providers/auth-provider'
import { updatePassword, validatePassword, validatePasswordsMatch } from '@/lib/auth'
import { createBrowserClient } from '@/lib/supabase'

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}

function ProfileContent() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])
  
  const [passwordFormData, setPasswordFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Corrections state
  const [corrections, setCorrections] = useState<Array<{
    id: string
    find_text: string
    replace_text: string
    is_regex: boolean
    case_sensitive: boolean
    priority: number
  }>>([])
  const [isLoadingCorrections, setIsLoadingCorrections] = useState(false)
  const [corrError, setCorrError] = useState<string>('')
  const [form, setForm] = useState({
    find_text: '',
    replace_text: '',
    is_regex: false,
    case_sensitive: false,
    priority: 100,
  })
  const [isBulkUploading, setIsBulkUploading] = useState(false)
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null)

  const loadCorrections = useCallback(async () => {
    if (!user) return
    setIsLoadingCorrections(true)
    setCorrError('')
    try {
      const { data, error } = await supabase
        .from('transcription_corrections')
        .select('id, find_text, replace_text, is_regex, case_sensitive, priority')
        .order('priority', { ascending: true })
      if (error) throw error
      setCorrections(data || [])
    } catch (e: any) {
      setCorrError(e.message || 'Failed to load corrections')
    } finally {
      setIsLoadingCorrections(false)
    }
  }, [supabase, user])

  useEffect(() => {
    loadCorrections()
  }, [loadCorrections])

  const addCorrection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setCorrError('')
    try {
      const payload = { ...form, user_id: user.id }
      const { error } = await supabase.from('transcription_corrections').insert(payload)
      if (error) throw error
      setForm({ find_text: '', replace_text: '', is_regex: false, case_sensitive: false, priority: 100 })
      await loadCorrections()
    } catch (e: any) {
      setCorrError(e.message || 'Failed to add correction')
    }
  }

  const updateCorrection = async (id: string, patch: Partial<typeof form>) => {
    setCorrError('')
    try {
      const { error } = await supabase
        .from('transcription_corrections')
        .update(patch)
        .eq('id', id)
      if (error) throw error
      await loadCorrections()
    } catch (e: any) {
      setCorrError(e.message || 'Failed to update correction')
    }
  }

  const deleteCorrection = async (id: string) => {
    if (!confirm('Delete this correction?')) return
    setCorrError('')
    try {
      const { error } = await supabase
        .from('transcription_corrections')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadCorrections()
    } catch (e: any) {
      setCorrError(e.message || 'Failed to delete correction')
    }
  }

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bulkUploadFile || !user) return
    
    setIsBulkUploading(true)
    setCorrError('')
    
    try {
      const text = await bulkUploadFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      // Skip header if present
      const dataLines = lines[0].toLowerCase().includes('find') ? lines.slice(1) : lines
      
      const corrections: Array<{
        user_id: string
        find_text: string
        replace_text: string
        is_regex: boolean
        case_sensitive: boolean
        priority: number
      }> = []
      
      for (const line of dataLines) {
        const parts = line.split(',').map(p => p.trim())
        if (parts.length < 2) continue // Skip invalid lines
        
        corrections.push({
          user_id: user.id,
          find_text: parts[0],
          replace_text: parts[1],
          is_regex: parts[2]?.toLowerCase() === 'true' || false,
          case_sensitive: parts[3]?.toLowerCase() === 'true' || false,
          priority: parseInt(parts[4]) || 100,
        })
      }
      
      if (corrections.length === 0) {
        setCorrError('No valid corrections found in file')
        return
      }
      
      const { error } = await supabase
        .from('transcription_corrections')
        .insert(corrections)
      
      if (error) throw error
      
      setBulkUploadFile(null)
      await loadCorrections()
      alert(`Successfully uploaded ${corrections.length} correction(s)`)
    } catch (e: any) {
      setCorrError(e.message || 'Failed to upload corrections')
    } finally {
      setIsBulkUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csv = 'find_text,replace_text,is_regex,case_sensitive,priority\nSolar Dental,Sola Dental,false,false,100\nSolo Dental,Sola Dental,false,false,100'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'corrections_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCorrections = () => {
    if (corrections.length === 0) {
      alert('No corrections to export')
      return
    }
    
    const headers = 'find_text,replace_text,is_regex,case_sensitive,priority\n'
    const rows = corrections.map(c => 
      `${c.find_text},${c.replace_text},${c.is_regex},${c.case_sensitive},${c.priority}`
    ).join('\n')
    
    const csv = headers + rows
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transcription_corrections.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    const passwordValidation = validatePassword(passwordFormData.newPassword)
    if (passwordValidation.strength === 'weak') {
      setError('Password is too weak. ' + passwordValidation.feedback.join('. '))
      return
    }

    const passwordsMatch = validatePasswordsMatch(
      passwordFormData.newPassword,
      passwordFormData.confirmPassword
    )
    if (!passwordsMatch.valid) {
      setError(passwordsMatch.error || 'Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await updatePassword(
        passwordFormData.newPassword
      )

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setSuccess('Password updated successfully!')
      setPasswordFormData({ newPassword: '', confirmPassword: '' })
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    // In a real app, you would implement account deletion
    // For now, just sign out
    alert('Account deletion is not yet implemented. Contact support to delete your account.')
    setShowDeleteConfirm(false)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

      <div className="space-y-6">
        {/* Transcription Corrections */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900">Transcription Corrections</h2>
            <div className="flex gap-2">
              <button
                onClick={downloadTemplate}
                className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                📥 Download Template
              </button>
              <button
                onClick={exportCorrections}
                disabled={corrections.length === 0}
                className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📤 Export All
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">Automatically fix common mis-transcriptions (e.g., brand names like "Sola Dental"). Rules are applied after transcription completes.</p>

          {corrError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700">{corrError}</p>
            </div>
          )}

          {/* Bulk Upload */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Bulk Upload (CSV)</h3>
            <p className="text-xs text-gray-600 mb-3">
              Upload a CSV file with columns: find_text, replace_text, is_regex, case_sensitive, priority
            </p>
            <form onSubmit={handleBulkUpload} className="flex items-end gap-3">
              <div className="flex-1">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={!bulkUploadFile || isBulkUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isBulkUploading ? 'Uploading...' : 'Upload CSV'}
              </button>
            </form>
          </div>

          {/* Add new rule */}
          <form onSubmit={addCorrection} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Find</label>
              <input
                value={form.find_text}
                onChange={(e) => setForm({ ...form, find_text: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Solar Dental"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Replace</label>
              <input
                value={form.replace_text}
                onChange={(e) => setForm({ ...form, replace_text: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Sola Dental"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 100 })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                min={1}
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_regex} onChange={(e) => setForm({ ...form, is_regex: e.target.checked })} />
                Regex
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.case_sensitive} onChange={(e) => setForm({ ...form, case_sensitive: e.target.checked })} />
                Case sensitive
              </label>
              <button type="submit" className="ml-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add</button>
            </div>
          </form>

          {/* List rules */}
          <div className="border rounded overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
              <div className="col-span-3">Find</div>
              <div className="col-span-3">Replace</div>
              <div className="col-span-2">Options</div>
              <div className="col-span-2">Priority</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="divide-y">
              {isLoadingCorrections ? (
                <div className="p-4 text-sm text-gray-500">Loading...</div>
              ) : corrections.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No corrections yet.</div>
              ) : (
                corrections.map((r) => (
                  <div key={r.id} className="grid grid-cols-12 px-3 py-2 items-center text-sm">
                    <div className="col-span-3 break-words">{r.find_text}</div>
                    <div className="col-span-3 break-words">{r.replace_text}</div>
                    <div className="col-span-2">
                      <span className="inline-block mr-2 px-2 py-0.5 rounded bg-gray-100 text-gray-700">{r.is_regex ? 'Regex' : 'Literal'}</span>
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700">{r.case_sensitive ? 'Case' : 'Insensitive'}</span>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        className="w-24 px-2 py-1 border rounded"
                        value={r.priority}
                        onChange={(e) => updateCorrection(r.id, { priority: Number(e.target.value) || r.priority })}
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <button
                        onClick={() => deleteCorrection(r.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* Account Information */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Account Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <p className="mt-1 text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                User ID
              </label>
              <p className="mt-1 text-gray-500 text-sm font-mono">{user.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Account Created
              </label>
              <p className="mt-1 text-gray-900">
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            {user.email_confirmed_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email Confirmed
                </label>
                <p className="mt-1 text-green-600 text-sm">
                  ✓ Verified on{' '}
                  {new Date(user.email_confirmed_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Change Password
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                value={passwordFormData.newPassword}
                onChange={(e) =>
                  setPasswordFormData((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={passwordFormData.confirmPassword}
                onChange={(e) =>
                  setPasswordFormData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                placeholder="Re-enter new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-white shadow-lg rounded-lg p-6 border-2 border-red-200">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Danger Zone
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Sign Out</h3>
              <p className="text-sm text-gray-600 mb-3">
                Sign out of your account on this device.
              </p>
              <button
                onClick={handleSignOut}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 font-medium transition"
              >
                Sign Out
              </button>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                Delete Account
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Delete Account?
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete your account? This will
              permanently delete all your calls, transcripts, and data. This
              action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
              >
                Yes, Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


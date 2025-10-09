/**
 * Sign Up Page
 * User registration with email/password and validation
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp, validateEmail, validatePassword, validatePasswordsMatch } from '@/lib/auth'
import { useAuth } from '@/app/providers/auth-provider'
import type { PasswordStrength } from '@/types/auth'

export default function SignUpPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordStrength, setPasswordStrength] = useState<{
    strength: PasswordStrength
    feedback: string[]
  } | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/library-enhanced')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    // Validation
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Invalid email')
      return
    }

    const passwordValidation = validatePassword(formData.password)
    if (passwordValidation.strength === 'weak') {
      setError('Password is too weak. ' + passwordValidation.feedback.join('. '))
      return
    }

    const passwordsMatch = validatePasswordsMatch(
      formData.password,
      formData.confirmPassword
    )
    if (!passwordsMatch.valid) {
      setError(passwordsMatch.error || 'Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await signUp(
        formData.email,
        formData.password
      )

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (data) {
        setSuccess(
          'Account created successfully! Please check your email to confirm your account.'
        )
        
        // Clear form
        setFormData({ email: '', password: '', confirmPassword: '' })
        setPasswordStrength(null)
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    
    // Update password strength indicator
    if (name === 'password') {
      if (value) {
        const strength = validatePassword(value)
        setPasswordStrength({
          strength: strength.strength,
          feedback: strength.feedback,
        })
      } else {
        setPasswordStrength(null)
      }
    }
    
    // Clear errors on input change
    setError('')
  }

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Don't show signup form if already logged in
  if (user) {
    return null
  }

  // Password strength color mapping
  const strengthColors = {
    weak: 'bg-red-500',
    fair: 'bg-yellow-500',
    good: 'bg-blue-500',
    strong: 'bg-green-500',
  }

  const strengthWidths = {
    weak: 'w-1/4',
    fair: 'w-1/2',
    good: 'w-3/4',
    strong: 'w-full',
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-lg rounded-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create Account
            </h1>
            <p className="text-gray-600">
              Sign up to start analyzing your dental call recordings
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                placeholder="Create a strong password"
              />
              
              {/* Password Strength Indicator */}
              {passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">
                      Password strength:
                    </span>
                    <span className="text-xs font-medium capitalize">
                      {passwordStrength.strength}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        strengthColors[passwordStrength.strength]
                      } ${strengthWidths[passwordStrength.strength]}`}
                    ></div>
                  </div>
                  <ul className="mt-2 text-xs text-gray-600 space-y-1">
                    {passwordStrength.feedback.map((feedback, idx) => (
                      <li key={idx}>• {feedback}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                placeholder="Re-enter your password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full bg-primary-600 text-white px-4 py-3 rounded-md hover:bg-primary-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


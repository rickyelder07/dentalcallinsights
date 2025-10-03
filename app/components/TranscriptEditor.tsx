'use client'

/**
 * Transcript Editor Component
 * Inline editing of transcript with auto-save
 */

import { useState, useEffect, useCallback } from 'react'
import type { Transcript } from '@/types/transcript'
import { getDisplayTranscript } from '@/lib/transcription-utils'

interface TranscriptEditorProps {
  transcript: Transcript
  onSave: (editedText: string) => Promise<void>
  className?: string
}

export default function TranscriptEditor({
  transcript,
  onSave,
  className = '',
}: TranscriptEditorProps) {
  const [editedText, setEditedText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize with current transcript
  useEffect(() => {
    setEditedText(getDisplayTranscript(transcript))
  }, [transcript])

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!isDirty) return

    const timeoutId = setTimeout(async () => {
      await handleSave()
    }, 2000)

    return () => clearTimeout(timeoutId)
  }, [editedText, isDirty])

  // Handle save
  const handleSave = useCallback(async () => {
    if (!isDirty) return

    setIsSaving(true)
    setError(null)

    try {
      await onSave(editedText)
      setLastSaved(new Date())
      setIsDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transcript')
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }, [editedText, isDirty, onSave])

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedText(e.target.value)
    setIsDirty(true)
  }

  // Manual save
  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleSave()
  }

  // Reset to original
  const handleReset = () => {
    const original = transcript.raw_transcript || transcript.transcript
    if (original) {
      setEditedText(original)
      setIsDirty(true)
    }
  }

  // Word count
  const wordCount = editedText.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Edit Transcript</h3>
          <div className="flex items-center space-x-2">
            {/* Status indicator */}
            {isSaving && (
              <span className="text-sm text-gray-600 flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </span>
            )}
            {!isSaving && lastSaved && (
              <span className="text-sm text-green-600">
                ✓ Saved {formatRelativeTime(lastSaved)}
              </span>
            )}
            {!isSaving && isDirty && (
              <span className="text-sm text-yellow-600">• Unsaved changes</span>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <form onSubmit={handleManualSave} className="p-4">
        <textarea
          value={editedText}
          onChange={handleChange}
          className="w-full min-h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="Start editing the transcript..."
          spellCheck="true"
        />

        {/* Error message */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {wordCount} words
          </div>

          <div className="flex items-center space-x-2">
            {/* Reset button */}
            {transcript.raw_transcript && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reset to original AI-generated transcript"
              >
                Reset to Original
              </button>
            )}

            {/* Save button */}
            <button
              type="submit"
              disabled={!isDirty || isSaving}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                isDirty && !isSaving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Now'}
            </button>
          </div>
        </div>

        {/* Auto-save notice */}
        <div className="mt-3 text-xs text-gray-500">
          Changes are automatically saved after 2 seconds of inactivity
        </div>
      </form>
    </div>
  )
}

/**
 * Format relative time
 */
function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  return date.toLocaleDateString()
}


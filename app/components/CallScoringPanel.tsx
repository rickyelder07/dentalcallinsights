'use client'

/**
 * CallScoringPanel Component
 * Main scoring interface with transcript viewer and scoring form
 */

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import ScoringCriteria from './ScoringCriteria'
import ScoreBreakdown from './ScoreBreakdown'
import TranscriptViewer from './TranscriptViewer'
import type { Call } from '@/types/upload'
import type { Transcript } from '@/types/transcript'
import type { CriterionFormValue, CallScoreWithCriteria } from '@/types/qa'
import { getAllCriteria, calculateTotalScore, calculateScoreBreakdown, CATEGORY_METADATA } from '@/lib/qa-criteria'

interface CallScoringPanelProps {
  call: Call & {
    transcript?: Transcript | null
  }
  onClose: () => void
  onSaved?: () => void
}

export default function CallScoringPanel({
  call,
  onClose,
  onSaved
}: CallScoringPanelProps) {
  const supabase = createBrowserClient()
  
  const [criteria, setCriteria] = useState<CriterionFormValue[]>([])
  const [scorerNotes, setScorerNotes] = useState('')
  const [agentName, setAgentName] = useState('')
  const [reviewStatus, setReviewStatus] = useState<'draft' | 'completed'>('completed')
  
  const [existingScore, setExistingScore] = useState<CallScoreWithCriteria | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [activeCategory, setActiveCategory] = useState<string>('starting_call')
  const [showTranscript, setShowTranscript] = useState(true)
  
  // AI Scoring State
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiConfidence, setAiConfidence] = useState<number | null>(null)
  const [aiReasoning, setAiReasoning] = useState<string | null>(null)
  const [showAIInfo, setShowAIInfo] = useState(false)

  useEffect(() => {
    loadExistingScore()
    initializeCriteria()
  }, [call.id])

  const loadExistingScore = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/qa/scores/${call.id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()
      if (result.success && result.scores && result.scores.length > 0) {
        const latestScore = result.scores[0]
        setExistingScore(latestScore)
        
        // Populate form with existing data
        if (latestScore.criteria && latestScore.criteria.length > 0) {
          setCriteria(latestScore.criteria.map((c: any) => ({
            criterion_name: c.criterion_name,
            criterion_category: c.criterion_category,
            criterion_weight: c.criterion_weight,
            score: c.score,
            applicable: c.applicable,
            notes: c.notes || '',
            transcript_excerpt: c.transcript_excerpt || ''
          })))
        }
        
        setScorerNotes(latestScore.scorer_notes || '')
        setAgentName(latestScore.agent_name || '')
        setReviewStatus(latestScore.review_status as 'draft' | 'completed')
      }
    } catch (error) {
      console.error('Error loading existing score:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const initializeCriteria = () => {
    const allCriteria = getAllCriteria()
    const defaultCriteria: CriterionFormValue[] = allCriteria.map(c => ({
      criterion_name: c.name,
      criterion_category: c.category,
      criterion_weight: c.weight,
      score: 0,
      applicable: true,
      notes: '',
      transcript_excerpt: ''
    }))
    
    // Only set if we don't have existing criteria
    setCriteria(prev => prev.length > 0 ? prev : defaultCriteria)
  }

  const handleCriterionChange = (index: number, value: CriterionFormValue) => {
    const newCriteria = [...criteria]
    newCriteria[index] = value
    setCriteria(newCriteria)
  }

  const handleSave = async (isDraft: boolean = false) => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/qa/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          call_id: call.id,
          criteria,
          scorer_notes: scorerNotes,
          agent_name: agentName || undefined,
          review_status: isDraft ? 'draft' : reviewStatus
        })
      })

      const result = await response.json()
      
      if (!result.success) {
        setError(result.error || 'Failed to save score')
        return
      }

      setSuccessMessage(result.message || 'Score saved successfully!')
      
      // Reload the score to update UI
      await loadExistingScore()
      
      if (onSaved) {
        onSaved()
      }

      // Close after short delay if not a draft
      if (!isDraft) {
        setTimeout(() => {
          onClose()
        }, 1500)
      }

    } catch (error) {
      console.error('Error saving score:', error)
      setError('Failed to save score')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateAIScore = async () => {
    try {
      setIsGeneratingAI(true)
      setError(null)
      setSuccessMessage(null)
      setAiConfidence(null)
      setAiReasoning(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/qa/ai-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          call_id: call.id
        })
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Failed to generate AI suggestions')
        return
      }

      // Populate form with AI suggestions
      setCriteria(result.suggestions)
      setAiConfidence(result.confidence)
      setAiReasoning(result.reasoning)
      setShowAIInfo(true)

      setSuccessMessage(`AI scoring complete! Confidence: ${result.confidence}%. Please review and adjust as needed.`)

    } catch (error) {
      console.error('Error generating AI score:', error)
      setError('Failed to generate AI scoring suggestions')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleDeleteScore = async () => {
    if (!existingScore) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this QA score? This action cannot be undone.'
    )

    if (!confirmed) return

    try {
      setIsDeleting(true)
      setError(null)
      setSuccessMessage(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await fetch(`/api/qa/scores/${existingScore.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Failed to delete score')
        return
      }

      setSuccessMessage('Score deleted successfully!')
      setExistingScore(null)
      
      // Reset form
      setCriteria([])
      setScorerNotes('')
      setAgentName('')
      setReviewStatus('completed')
      setAiConfidence(null)
      setAiReasoning(null)
      setShowAIInfo(false)
      
      // Reload criteria
      await initializeCriteria()

      if (onSaved) {
        onSaved()
      }

    } catch (error) {
      console.error('Error deleting score:', error)
      setError('Failed to delete score')
    } finally {
      setIsDeleting(false)
    }
  }

  const totalScore = calculateTotalScore(criteria)
  const categoryScores = calculateScoreBreakdown(criteria)

  const categorizedCriteria = {
    starting_call: criteria.filter(c => c.criterion_category === 'starting_call'),
    upselling: criteria.filter(c => c.criterion_category === 'upselling'),
    rebuttals: criteria.filter(c => c.criterion_category === 'rebuttals'),
    qualitative: criteria.filter(c => c.criterion_category === 'qualitative')
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">Loading scoring panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto z-50">
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">QA Call Scoring</h2>
                  <p className="text-sm text-blue-100 mt-1">{call.filename}</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-blue-700 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            {successMessage && (
              <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Transcript */}
                <div className="lg:col-span-1">
                  <div className="sticky top-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Transcript</h3>
                      <button
                        onClick={() => setShowTranscript(!showTranscript)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {showTranscript ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    
                    {showTranscript && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {call.transcript ? (
                          <TranscriptViewer
                            transcript={call.transcript}
                          />
                        ) : (
                          <div className="p-6 text-center text-gray-500">
                            <p>No transcript available</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Current Score Summary */}
                    {existingScore && (
                      <div className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Score</h3>
                        <ScoreBreakdown score={existingScore} showDetails={false} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Scoring Form */}
                <div className="lg:col-span-2">
            {/* AI Scoring Button */}
            <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-purple-900 mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI-Powered Scoring
                  </h3>
                  <p className="text-xs text-purple-700">
                    Let AI analyze the transcript and suggest scores for all criteria. You can review and adjust before saving.
                  </p>
                </div>
                <button
                  onClick={handleGenerateAIScore}
                  disabled={isGeneratingAI || isSaving}
                  className="ml-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                  {isGeneratingAI ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate AI Score
                    </>
                  )}
                </button>
              </div>

              {/* AI Info Display */}
              {showAIInfo && aiConfidence !== null && (
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-purple-900">AI Confidence:</span>
                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                          aiConfidence >= 80 ? 'bg-green-100 text-green-800' :
                          aiConfidence >= 60 ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {aiConfidence}%
                        </span>
                      </div>
                      {aiReasoning && (
                        <p className="text-xs text-purple-700 italic">{aiReasoning}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowAIInfo(false)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Form */}
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="Enter agent name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Status
                  </label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as 'draft' | 'completed')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

                  {/* Score Summary */}
                  <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">Current Total Score</h3>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-blue-600">{totalScore}</span>
                          <span className="text-xl text-gray-500">/100</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {Object.entries(CATEGORY_METADATA).map(([key, meta]) => {
                          const categoryKey = key as keyof typeof categoryScores
                          return (
                            <div key={key} className="text-right">
                              <div className="text-gray-600">{meta.label}</div>
                              <div className="font-semibold text-gray-900">
                                {categoryScores[categoryKey].score}/{meta.maxPoints}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Category Tabs */}
                  <div className="mb-6 border-b border-gray-200">
                    <div className="flex gap-2">
                      {Object.entries(CATEGORY_METADATA).map(([key, meta]) => (
                        <button
                          key={key}
                          onClick={() => setActiveCategory(key)}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeCategory === key
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {meta.label}
                          <span className="ml-2 text-xs">
                            ({categoryScores[key as keyof typeof categoryScores].score}/{meta.maxPoints})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scoring Criteria */}
                  <div className="space-y-4 mb-6">
                    {categorizedCriteria[activeCategory as keyof typeof categorizedCriteria].map((criterion, index) => {
                      const globalIndex = criteria.findIndex(
                        c => c.criterion_name === criterion.criterion_name
                      )
                      const definition = getAllCriteria().find(c => c.name === criterion.criterion_name)
                      
                      return definition ? (
                        <ScoringCriteria
                          key={criterion.criterion_name}
                          criterion={definition}
                          value={criterion}
                          onChange={(value) => handleCriterionChange(globalIndex, value)}
                          disabled={isSaving}
                        />
                      ) : null
                    })}
                  </div>

                  {/* Scorer Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Overall Notes (Optional)
                    </label>
                    <textarea
                      value={scorerNotes}
                      onChange={(e) => setScorerNotes(e.target.value)}
                      placeholder="Add overall notes about this call scoring..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                    {/* Delete Button - Only show if there's an existing score */}
                    {existingScore && (
                      <button
                        onClick={handleDeleteScore}
                        disabled={isSaving || isDeleting}
                        className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isDeleting ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete Score
                          </>
                        )}
                      </button>
                    )}
                    
                    {/* Right side buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        disabled={isSaving || isDeleting}
                        className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(true)}
                        disabled={isSaving || isDeleting}
                        className="px-6 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        Save as Draft
                      </button>
                      <button
                        onClick={() => handleSave(false)}
                        disabled={isSaving || isDeleting}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            Saving...
                          </>
                        ) : (
                          <>Save Score</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


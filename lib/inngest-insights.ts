/**
 * Inngest Insights Functions
 * Handles long-running insights generation jobs without timeout limits
 */

import { inngest } from './inngest'
import { createAdminClient } from './supabase-server'
import { generateInsights } from './openai-insights'
import { updateInsightsProgress, markInsightsComplete, markInsightsFailed } from './inngest'

/**
 * Main insights generation function
 * Handles the complete insights pipeline with progress tracking
 */
export const generateCallInsights = inngest.createFunction(
  {
    id: 'generate-call-insights',
    name: 'Generate AI Insights for Call',
    retries: 3, // Retry up to 3 times on failure
    cancelOn: [
      { event: 'insights/cancel', match: 'data.callId' }
    ],
  },
  { event: 'insights/start' },
  async ({ event, step }) => {
    const { callId, userId, transcriptId, callDuration, forceRegenerate = false } = event.data

    const supabase = createAdminClient()

    console.log(`Starting insights generation for call ${callId}, job ${event.id}, forceRegenerate: ${forceRegenerate}`)

    try {
      // Step 1: Fetch call details (to get team_id)
      const callDetails = await step.run('fetch-call', async () => {
        const { data: call, error } = await supabase
          .from('calls')
          .select('team_id')
          .eq('id', callId)
          .single()

        if (error || !call) {
          console.warn(`Could not fetch call details: ${error?.message}`)
          return { team_id: null }
        }

        return call
      })

      // Step 2: Fetch transcript
      const transcript = await step.run('fetch-transcript', async () => {
        await updateInsightsProgress(callId, event.id, 10, 'fetching', 'Fetching transcript...')

        console.log(`Fetching transcript ${transcriptId} for call ${callId}`)
        
        const { data, error } = await supabase
          .from('transcripts')
          .select('transcript, edited_transcript, raw_transcript, transcription_status')
          .eq('id', transcriptId)
          .single()

        if (error || !data) {
          console.error(`Failed to fetch transcript ${transcriptId}:`, error)
          throw new Error(`Failed to fetch transcript: ${error?.message || 'Not found'}`)
        }

        // Check transcription status
        if (data.transcription_status !== 'completed') {
          console.error(`Transcript ${transcriptId} not completed. Status: ${data.transcription_status}`)
          throw new Error(`Transcript not completed. Status: ${data.transcription_status}`)
        }

        // Try edited_transcript first, then transcript (legacy), then raw_transcript
        const transcriptText = data.edited_transcript || data.transcript || data.raw_transcript
        
        if (!transcriptText || transcriptText.trim().length === 0) {
          // Handle empty transcript gracefully - create placeholder insights
          console.log(`Empty transcript for call ${callId} - creating placeholder insights`)
          throw new Error('EMPTY_TRANSCRIPT')
        }

        console.log(`Transcript fetched for call ${callId}, length: ${transcriptText.length} chars`)
        return transcriptText
      })

      // Step 3: Check for cached insights (skip if forcing regeneration)
      let cachedInsights = null
      
      if (!forceRegenerate) {
        cachedInsights = await step.run('check-cache', async () => {
          await updateInsightsProgress(callId, event.id, 20, 'analyzing', 'Checking cache...')

          const { data, error } = await supabase
            .from('insights')
            .select('*')
            .eq('call_id', callId)
            .maybeSingle() // Use maybeSingle() instead of single() to avoid PGRST116 error

          // PGRST116 means no rows found, which is expected for new insights
          if (error && error.code !== 'PGRST116') {
            console.warn(`Error checking cache for call ${callId}:`, error)
            // Continue anyway - we'll generate new insights
            return null
          }

          return data
        })

        if (cachedInsights) {
          // Use cached insights
          await step.run('use-cached', async () => {
            console.log(`Using cached insights for call ${callId}`)
            await updateInsightsProgress(callId, event.id, 100, 'saving', 'Using cached insights')

            // Update job status
            await supabase
              .from('insights_jobs')
              .update({
                status: 'completed',
                cached: true,
                completed_at: new Date().toISOString(),
                metadata: { progress: 100, stage: 'saving', message: 'Used cached insights' },
              })
              .eq('call_id', callId)
              .eq('user_id', userId)

            await markInsightsComplete(callId, event.id, cachedInsights, true)
          })

          return { success: true, cached: true, insights: cachedInsights }
        }
      } else {
        console.log(`Force regenerate enabled - skipping cache check for call ${callId}`)
        await updateInsightsProgress(callId, event.id, 20, 'analyzing', 'Force regenerating...')
      }

      // Step 4: Generate insights with GPT
      const insights = await step.run('generate-insights', async () => {
        await updateInsightsProgress(callId, event.id, 40, 'analyzing', 'Analyzing with AI...')

        console.log(`Generating insights for call ${callId} with GPT-4o-mini`)
        const result = await generateInsights(transcript, callDuration)

        if (!result.success) {
          // If it's a "too short" case, we still want to save the placeholder insights
          if (result.tooShort && result.insights) {
            console.log(`Call ${callId} is too short - using placeholder insights`)
            await updateInsightsProgress(callId, event.id, 80, 'analyzing', 'Call too short for detailed insights')
            return result.insights
          }
          throw new Error(result.error || 'Failed to generate insights')
        }

        await updateInsightsProgress(callId, event.id, 80, 'analyzing', 'Insights generated')
        console.log(`Insights generated successfully for call ${callId}`)

        return result.insights
      })

      // Step 5: Save insights to database
      await step.run('save-insights', async () => {
        await updateInsightsProgress(callId, event.id, 90, 'saving', 'Saving insights...')

        // Map new format to old insights table schema
        const { error } = await supabase
          .from('insights')
          .upsert(
            {
              call_id: callId,
              user_id: userId,
              team_id: callDetails.team_id || null, // Include team_id from call
              overall_sentiment: insights.sentiment?.overall || 'neutral',
              key_points: insights.summary?.key_points || [],
              action_items: insights.action_items || [],
              red_flags: insights.red_flags || [],
              call_outcome: insights.summary?.outcome || '',
              staff_performance: insights.sentiment?.staff_performance || 'professional',
              patient_satisfaction_score: null, // Not in new format
              appointment_scheduled: false, // Not in new format
              appointment_cancelled: false, // Not in new format
              model_used: 'gpt-4o-mini',
            },
            {
              onConflict: 'call_id', // Use call_id for conflict resolution (unique constraint)
            }
          )

        if (error) {
          throw new Error(`Failed to save insights: ${error.message}`)
        }

        // Update job status
        await supabase
          .from('insights_jobs')
          .update({
            status: 'completed',
            cached: false,
            completed_at: new Date().toISOString(),
            metadata: { progress: 100, stage: 'saving', message: 'Complete!' },
          })
          .eq('call_id', callId)
          .eq('user_id', userId)

        await updateInsightsProgress(callId, event.id, 100, 'saving', 'Complete!')
        await markInsightsComplete(callId, event.id, insights, false)
        
        console.log(`Insights saved successfully for call ${callId}`)
      })

      return { success: true, cached: false, insights }
    } catch (error) {
      // Handle errors and mark job as failed
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStage = errorMessage.includes('transcript') ? 'fetch' : 
                        errorMessage.includes('generate') ? 'analysis' : 'save'
      
      console.error(`Insights generation failed for call ${callId}:`, errorMessage)

      // Handle empty transcript case - create placeholder insights
      if (errorMessage === 'EMPTY_TRANSCRIPT') {
        console.log(`Creating placeholder insights for empty transcript: ${callId}`)
        const placeholderResult = await step.run('save-placeholder-insights', async () => {
          // Fetch call details if not already available
          const { data: call } = await supabase
            .from('calls')
            .select('team_id')
            .eq('id', callId)
            .single()
          
          const placeholderInsights = {
            call_id: callId,
            user_id: userId,
            team_id: call?.team_id || null, // Include team_id from call
              overall_sentiment: 'neutral',
            key_points: ['Transcript is empty or too short for analysis'],
            action_items: [],
            red_flags: [],
            call_outcome: 'insufficient_data',
            staff_performance: 'professional',
            patient_satisfaction_score: null,
            appointment_scheduled: false,
            appointment_cancelled: false,
            model_used: 'placeholder',
          }

          const { error: upsertError } = await supabase
            .from('insights')
            .upsert(placeholderInsights, { onConflict: 'call_id' })

          if (upsertError) {
            throw new Error(`Failed to save placeholder insights: ${upsertError.message}`)
          }

          // Mark job as completed (not failed) since we handled it gracefully
          await supabase
            .from('insights_jobs')
            .update({
              status: 'completed',
              cached: false,
              completed_at: new Date().toISOString(),
              metadata: { progress: 100, stage: 'saving', message: 'Placeholder insights saved (empty transcript)' },
            })
            .eq('call_id', callId)
            .eq('user_id', userId)
          
          return { success: true, insights: placeholderInsights }
        })
        
        // Return success for empty transcript case - don't re-throw
        return placeholderResult
      }

      // For all other errors, mark job as failed
      await step.run('mark-failed', async () => {
        await supabase
          .from('insights_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
            metadata: { 
              failed_stage: errorStage,
              error: errorMessage,
              progress: errorStage === 'fetch' ? 10 : errorStage === 'analysis' ? 50 : 90
            },
          })
          .eq('call_id', callId)
          .eq('user_id', userId)

        // Send failure event
        await markInsightsFailed(callId, event.id, errorMessage, errorStage as 'fetch' | 'analysis' | 'save')
      })

      // Re-throw the error so Inngest knows it failed
      throw error
    }
  }
)

/**
 * Handle insights generation failures
 * Updates job status and logs errors
 */
export const handleInsightsFailure = inngest.createFunction(
  { 
    id: 'handle-insights-failure', 
    name: 'Handle Insights Generation Failure' 
  },
  { event: 'insights/failed' },
  async ({ event }) => {
    const { callId, jobId, error, stage } = event.data
    const supabase = createAdminClient()

    console.error(`Insights generation failed for call ${callId} at stage ${stage}:`, error)

    // Update job with failure info
    await supabase
      .from('insights_jobs')
      .update({
        status: 'failed',
        error_message: error,
        completed_at: new Date().toISOString(),
        metadata: { failed_stage: stage },
      })
      .eq('call_id', callId)

    return { success: false, error }
  }
)


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
    const { callId, userId, transcriptId, callDuration } = event.data

    const supabase = createAdminClient()

    console.log(`Starting insights generation for call ${callId}, job ${event.id}`)

    // Step 1: Fetch transcript
    const transcript = await step.run('fetch-transcript', async () => {
      await updateInsightsProgress(callId, event.id, 10, 'fetching', 'Fetching transcript...')

      const { data, error } = await supabase
        .from('transcripts')
        .select('transcript, edited_transcript')
        .eq('id', transcriptId)
        .single()

      if (error || !data) {
        throw new Error(`Failed to fetch transcript: ${error?.message || 'Not found'}`)
      }

      const transcriptText = data.edited_transcript || data.transcript
      if (!transcriptText) {
        throw new Error('Transcript is empty')
      }

      console.log(`Transcript fetched for call ${callId}`)
      return transcriptText
    })

    // Step 2: Check for cached insights
    const cachedInsights = await step.run('check-cache', async () => {
      await updateInsightsProgress(callId, event.id, 20, 'analyzing', 'Checking cache...')

      const { data } = await supabase
        .from('insights')
        .select('*')
        .eq('call_id', callId)
        .single()

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

    // Step 3: Generate insights with GPT
    const insights = await step.run('generate-insights', async () => {
      await updateInsightsProgress(callId, event.id, 40, 'analyzing', 'Analyzing with AI...')

      console.log(`Generating insights for call ${callId} with GPT-4o-mini`)
      const result = await generateInsights(transcript, callDuration)

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate insights')
      }

      await updateInsightsProgress(callId, event.id, 80, 'analyzing', 'Insights generated')
      console.log(`Insights generated successfully for call ${callId}`)

      return result.insights
    })

    // Step 4: Save insights to database
    await step.run('save-insights', async () => {
      await updateInsightsProgress(callId, event.id, 90, 'saving', 'Saving insights...')

      // Map new format to old insights table schema
      const { error } = await supabase
        .from('insights')
        .upsert(
          {
            call_id: callId,
            user_id: userId,
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


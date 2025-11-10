/**
 * Inngest API Route
 * Handles Inngest webhooks and function execution
 */

import { serve } from 'inngest/next'
import { 
  transcribeCall, 
  handleTranscriptionError, 
  trackTranscriptionProgress 
} from '@/lib/inngest-transcription'
import { 
  generateCallInsights, 
  handleInsightsFailure 
} from '@/lib/inngest-insights'
import { inngest } from '@/lib/inngest'

// Export the Inngest serve handler
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Transcription functions
    transcribeCall,
    handleTranscriptionError,
    trackTranscriptionProgress,
    // Insights functions
    generateCallInsights,
    handleInsightsFailure,
  ],
})

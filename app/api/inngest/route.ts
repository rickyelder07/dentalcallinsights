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

// Export the Inngest serve handler
export const { GET, POST, PUT } = serve({
  client: { id: 'dental-call-insights' },
  functions: [
    transcribeCall,
    handleTranscriptionError,
    trackTranscriptionProgress,
  ],
})

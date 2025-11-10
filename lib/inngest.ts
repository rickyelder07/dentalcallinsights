/**
 * Inngest Configuration
 * Event-driven transcription system for handling long-running jobs
 */

import { Inngest } from 'inngest'

// Define event types for type safety
export interface TranscriptionEvents {
  'transcription/start': {
    data: {
      callId: string
      userId: string
      filename: string
      audioPath: string
      language?: string
      prompt?: string
    }
  }
  'transcription/progress': {
    data: {
      callId: string
      jobId: string
      progress: number
      stage: 'downloading' | 'transcribing' | 'processing' | 'saving'
      message?: string
    }
  }
  'transcription/complete': {
    data: {
      callId: string
      jobId: string
      transcript: string
      rawTranscript: string
      confidenceScore: number
      processingDuration: number
      language: string
      timestamps?: any[]
    }
  }
  'transcription/failed': {
    data: {
      callId: string
      jobId: string
      error: string
      stage: 'download' | 'transcription' | 'processing' | 'save'
    }
  }
  'transcription/cancel': {
    data: {
      callId: string
    }
  }
}

export interface InsightsEvents {
  'insights/start': {
    data: {
      callId: string
      userId: string
      transcriptId: string
      callDuration?: number
      forceRegenerate?: boolean
    }
  }
  'insights/progress': {
    data: {
      callId: string
      jobId: string
      progress: number
      stage: 'fetching' | 'analyzing' | 'saving'
      message?: string
    }
  }
  'insights/complete': {
    data: {
      callId: string
      jobId: string
      insights: any
      cached: boolean
    }
  }
  'insights/failed': {
    data: {
      callId: string
      jobId: string
      error: string
      stage: 'fetch' | 'analysis' | 'save'
    }
  }
  'insights/cancel': {
    data: {
      callId: string
    }
  }
}

export type AllEvents = TranscriptionEvents & InsightsEvents

// Create Inngest client
export const inngest = new Inngest({
  id: 'dental-call-insights',
  name: 'Dental Call Insights',
})

// Helper function to send events
export async function sendEvent<T extends keyof TranscriptionEvents>(
  eventName: T,
  data: TranscriptionEvents[T]['data']
) {
  try {
    await inngest.send({
      name: eventName,
      data,
    })
    console.log(`Event sent: ${eventName}`, data)
  } catch (error) {
    console.error(`Failed to send event ${eventName}:`, error)
    throw error
  }
}

// Helper function to send progress updates
export async function updateTranscriptionProgress(
  callId: string,
  jobId: string,
  progress: number,
  stage: 'downloading' | 'transcribing' | 'processing' | 'saving',
  message?: string
) {
  await sendEvent('transcription/progress', {
    callId,
    jobId,
    progress,
    stage,
    message,
  })
}

// Helper function to mark transcription complete
export async function markTranscriptionComplete(
  callId: string,
  jobId: string,
  transcript: string,
  rawTranscript: string,
  confidenceScore: number,
  processingDuration: number,
  language: string,
  timestamps?: any[]
) {
  await sendEvent('transcription/complete', {
    callId,
    jobId,
    transcript,
    rawTranscript,
    confidenceScore,
    processingDuration,
    language,
    timestamps,
  })
}

// Helper function to mark transcription failed
export async function markTranscriptionFailed(
  callId: string,
  jobId: string,
  error: string,
  stage: 'download' | 'transcription' | 'processing' | 'save'
) {
  await sendEvent('transcription/failed', {
    callId,
    jobId,
    error,
    stage,
  })
}

// ============================================
// INSIGHTS EVENT HELPERS
// ============================================

// Helper function to send insights progress updates
export async function updateInsightsProgress(
  callId: string,
  jobId: string,
  progress: number,
  stage: 'fetching' | 'analyzing' | 'saving',
  message?: string
) {
  await inngest.send({
    name: 'insights/progress',
    data: {
      callId,
      jobId,
      progress,
      stage,
      message,
    },
  })
}

// Helper function to mark insights complete
export async function markInsightsComplete(
  callId: string,
  jobId: string,
  insights: any,
  cached: boolean
) {
  await inngest.send({
    name: 'insights/complete',
    data: {
      callId,
      jobId,
      insights,
      cached,
    },
  })
}

// Helper function to mark insights failed
export async function markInsightsFailed(
  callId: string,
  jobId: string,
  error: string,
  stage: 'fetch' | 'analysis' | 'save'
) {
  await inngest.send({
    name: 'insights/failed',
    data: {
      callId,
      jobId,
      error,
      stage,
    },
  })
}

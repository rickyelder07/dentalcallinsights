/**
 * OpenAI Insights Client
 * GPT-4o integration for call insights generation
 * 
 * Security: API key only used server-side
 */

import OpenAI from 'openai'
import {
  INSIGHTS_SYSTEM_PROMPT,
  createInsightsPrompt,
  createTooShortResponse,
  parseInsightsResponse,
  truncateTranscript,
} from './prompt-templates'
import type { CallInsights, GPTInsightsResponse } from '@/types/insights'

// ============================================
// CONFIGURATION
// ============================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const GPT_MODEL = 'gpt-4o-mini'
const MAX_TOKENS = 800
const TEMPERATURE = 0.3
const MIN_CALL_DURATION_SECONDS = 6

/**
 * Validate OpenAI configuration
 */
export function validateOpenAIInsightsConfig(): {
  valid: boolean
  error?: string
} {
  if (!OPENAI_API_KEY) {
    return {
      valid: false,
      error: 'OpenAI API key not configured. Set OPENAI_API_KEY in environment variables.',
    }
  }
  
  return { valid: true }
}

/**
 * Create OpenAI client
 */
function createOpenAIClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }
  
  return new OpenAI({
    apiKey: OPENAI_API_KEY,
  })
}

// ============================================
// INSIGHTS GENERATION
// ============================================

/**
 * Generate insights for a call transcript
 * @param transcript - Call transcript text
 * @param callDuration - Duration in seconds (optional)
 * @returns Insights or error
 */
export async function generateInsights(
  transcript: string,
  callDuration?: number
): Promise<{
  success: boolean
  insights?: CallInsights
  error?: string
  tooShort?: boolean
}> {
  try {
    // Validate configuration
    const configValidation = validateOpenAIInsightsConfig()
    if (!configValidation.valid) {
      return {
        success: false,
        error: configValidation.error,
      }
    }
    
    // Check if call is too short
    if (callDuration !== undefined && callDuration < MIN_CALL_DURATION_SECONDS) {
      return {
        success: true,
        insights: createTooShortResponse() as unknown as CallInsights,
        tooShort: true,
      }
    }
    
    // Validate transcript
    if (!transcript || transcript.trim().length === 0) {
      return {
        success: false,
        error: 'Transcript is empty',
      }
    }
    
    // Truncate if necessary
    const truncatedTranscript = truncateTranscript(transcript)
    
    // Create OpenAI client
    const openai = createOpenAIClient()
    
    // Generate insights with GPT-4o
    const completion = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        {
          role: 'system',
          content: INSIGHTS_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: createInsightsPrompt(truncatedTranscript, callDuration),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
    })
    
    // Extract response
    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      return {
        success: false,
        error: 'No response from OpenAI',
      }
    }
    
    // Parse and validate response
    const parseResult = parseInsightsResponse(responseText)
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error,
      }
    }
    
    // Convert to CallInsights format
    const insights: CallInsights = {
      summary: {
        brief: parseResult.data.summary.brief,
        key_points: parseResult.data.summary.key_points,
        outcome: parseResult.data.summary.outcome,
      },
      sentiment: {
        overall: parseResult.data.sentiment.overall,
        patient_satisfaction: parseResult.data.sentiment.patient_satisfaction,
        staff_performance: parseResult.data.sentiment.staff_performance,
      },
      action_items: parseResult.data.action_items || [],
      red_flags: parseResult.data.red_flags || [],
    }
    
    return {
      success: true,
      insights,
    }
  } catch (error) {
    console.error('Error generating insights:', error)
    
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        error: `OpenAI API error: ${error.message}`,
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate insights with retry logic
 * @param transcript - Call transcript
 * @param callDuration - Duration in seconds
 * @param maxRetries - Maximum retry attempts (default 3)
 */
export async function generateInsightsWithRetry(
  transcript: string,
  callDuration?: number,
  maxRetries: number = 3
): Promise<{
  success: boolean
  insights?: CallInsights
  error?: string
  tooShort?: boolean
}> {
  let lastError: string | undefined
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await generateInsights(transcript, callDuration)
    
    if (result.success) {
      return result
    }
    
    lastError = result.error
    
    // Don't retry for certain errors
    if (
      result.error?.includes('API key not configured') ||
      result.error?.includes('empty')
    ) {
      return result
    }
    
    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
    }
  }
  
  return {
    success: false,
    error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
  }
}

// ============================================
// EXPORT AND FORMATTING
// ============================================

/**
 * Format insights as readable text
 */
export function formatInsightsAsText(insights: CallInsights): string {
  let text = '=== CALL INSIGHTS ===\n\n'
  
  // Summary
  text += '📝 SUMMARY\n'
  text += `${insights.summary.brief}\n\n`
  text += 'Key Points:\n'
  insights.summary.key_points.forEach((point, i) => {
    text += `${i + 1}. ${point}\n`
  })
  text += `\nOutcome: ${insights.summary.outcome.toUpperCase()}\n\n`
  
  // Sentiment
  text += '💭 SENTIMENT\n'
  text += `Overall: ${insights.sentiment.overall.toUpperCase()}\n`
  text += `Patient Satisfaction: ${insights.sentiment.patient_satisfaction.toUpperCase()}\n`
  text += `Staff Performance: ${insights.sentiment.staff_performance.toUpperCase()}\n\n`
  
  // Action Items
  text += '✅ ACTION ITEMS\n'
  if (insights.action_items.length === 0) {
    text += 'No action items identified.\n\n'
  } else {
    insights.action_items.forEach((item, i) => {
      text += `${i + 1}. [${item.priority.toUpperCase()}] ${item.action} - ${item.assignee}\n`
    })
    text += '\n'
  }
  
  // Red Flags
  text += '⚠️ RED FLAGS & CONCERNS\n'
  if (insights.red_flags.length === 0) {
    text += 'No concerns identified.\n'
  } else {
    insights.red_flags.forEach((flag, i) => {
      text += `${i + 1}. [${flag.severity.toUpperCase()}] ${flag.concern} (${flag.category})\n`
    })
  }
  
  return text
}

/**
 * Format insights as JSON string
 */
export function formatInsightsAsJSON(insights: CallInsights): string {
  return JSON.stringify(insights, null, 2)
}


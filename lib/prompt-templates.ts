/**
 * GPT-4o Prompt Templates for AI Insights
 * Optimized prompts for generating call summaries, sentiment, actions, and red flags
 */

/**
 * System prompt for GPT-4o insights generation
 * Sets the context and role for the AI
 */
export const INSIGHTS_SYSTEM_PROMPT = `You are an AI assistant that analyzes dental office call transcripts to extract actionable insights.

Your role is to help dental office managers quickly understand:
1. What the call was about (summary)
2. How the call went (sentiment)
3. What needs to be done next (action items)
4. Any concerns or issues (red flags)

Guidelines:
- Be concise and actionable
- Focus on what managers need to know
- Identify specific follow-up actions
- Flag potential issues or concerns
- Use professional, clear language
- Be objective in your analysis

Output Format:
You must respond with VALID JSON only. No markdown, no code blocks, just raw JSON.`

/**
 * User prompt template for insights generation
 * @param transcript - The call transcript to analyze
 * @param callDuration - Duration in seconds (optional)
 */
export function createInsightsPrompt(
  transcript: string,
  callDuration?: number
): string {
  return `Analyze this dental office call transcript and provide insights in the following JSON format:

{
  "summary": {
    "brief": "A concise 2-3 sentence summary of the entire call",
    "key_points": ["Key point 1", "Key point 2", "Key point 3"],
    "outcome": "resolved" | "pending" | "escalated" | "no_resolution"
  },
  "sentiment": {
    "overall": "positive" | "neutral" | "negative" | "mixed",
    "patient_satisfaction": "happy" | "satisfied" | "neutral" | "frustrated" | "angry",
    "staff_performance": "professional" | "needs_improvement"
  },
  "action_items": [
    {
      "action": "Specific action to take",
      "priority": "urgent" | "high" | "normal" | "low",
      "assignee": "staff" | "patient" | "dentist" | "billing" | "front_desk"
    }
  ],
  "red_flags": [
    {
      "concern": "Specific concern or issue",
      "severity": "high" | "medium" | "low",
      "category": "compliance" | "dissatisfaction" | "missed_opportunity" | "billing" | "emergency"
    }
  ]
}

Call Duration: ${callDuration ? `${callDuration} seconds` : 'Unknown'}

Transcript:
${transcript}

Important:
- Provide 2-3 sentences for the summary brief
- Include 3-5 key points (most important discussion points)
- List 3-5 action items maximum (only the most important ones)
- Only include red_flags if actual concerns exist (empty array if none)
- If no action items are needed, use an empty array
- Be specific and actionable in action items
- Respond with VALID JSON only, no markdown formatting`
}

/**
 * Prompt for "too short" calls (< 8 seconds)
 * Returns a standardized response without calling GPT-4o
 */
export function createTooShortResponse() {
  return {
    summary: {
      brief: 'Too short for insights',
      key_points: ['Too short for insights'],
      outcome: 'too_short',
    },
    sentiment: {
      overall: 'too_short',
      patient_satisfaction: 'too_short',
      staff_performance: 'too_short',
    },
    action_items: [],
    red_flags: [],
  }
}

/**
 * Validate GPT-4o response structure
 * Ensures the response matches our expected format
 */
export function validateInsightsResponse(response: any): {
  valid: boolean
  error?: string
} {
  // Check top-level structure
  if (!response || typeof response !== 'object') {
    return { valid: false, error: 'Response is not an object' }
  }

  // Check summary
  if (!response.summary || typeof response.summary !== 'object') {
    return { valid: false, error: 'Missing or invalid summary' }
  }
  if (typeof response.summary.brief !== 'string') {
    return { valid: false, error: 'Missing or invalid summary.brief' }
  }
  if (!Array.isArray(response.summary.key_points)) {
    return { valid: false, error: 'Missing or invalid summary.key_points' }
  }
  if (typeof response.summary.outcome !== 'string') {
    return { valid: false, error: 'Missing or invalid summary.outcome' }
  }

  // Check sentiment
  if (!response.sentiment || typeof response.sentiment !== 'object') {
    return { valid: false, error: 'Missing or invalid sentiment' }
  }
  if (typeof response.sentiment.overall !== 'string') {
    return { valid: false, error: 'Missing or invalid sentiment.overall' }
  }
  if (typeof response.sentiment.patient_satisfaction !== 'string') {
    return { valid: false, error: 'Missing or invalid sentiment.patient_satisfaction' }
  }
  if (typeof response.sentiment.staff_performance !== 'string') {
    return { valid: false, error: 'Missing or invalid sentiment.staff_performance' }
  }

  // Check action_items
  if (!Array.isArray(response.action_items)) {
    return { valid: false, error: 'Missing or invalid action_items' }
  }
  for (const item of response.action_items) {
    if (
      typeof item.action !== 'string' ||
      typeof item.priority !== 'string' ||
      typeof item.assignee !== 'string'
    ) {
      return { valid: false, error: 'Invalid action item structure' }
    }
  }

  // Check red_flags
  if (!Array.isArray(response.red_flags)) {
    return { valid: false, error: 'Missing or invalid red_flags' }
  }
  for (const flag of response.red_flags) {
    if (
      typeof flag.concern !== 'string' ||
      typeof flag.severity !== 'string' ||
      typeof flag.category !== 'string'
    ) {
      return { valid: false, error: 'Invalid red flag structure' }
    }
  }

  return { valid: true }
}

/**
 * Parse GPT-4o JSON response
 * Handles potential JSON parsing errors
 */
export function parseInsightsResponse(responseText: string): {
  success: boolean
  data?: any
  error?: string
} {
  try {
    // Remove markdown code blocks if present
    let cleanedText = responseText.trim()
    
    // Remove ```json and ``` if present
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```json?\s*\n/, '').replace(/\n```\s*$/, '')
    }
    
    // Parse JSON
    const parsed = JSON.parse(cleanedText)
    
    // Validate structure
    const validation = validateInsightsResponse(parsed)
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid response structure: ${validation.error}`,
      }
    }
    
    return {
      success: true,
      data: parsed,
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Truncate transcript if too long
 * GPT-4o has 128K token context window, but we want to be safe
 * Roughly 1 token = 4 characters, so 100K characters = ~25K tokens
 */
export function truncateTranscript(
  transcript: string,
  maxLength: number = 100000
): string {
  if (transcript.length <= maxLength) {
    return transcript
  }
  
  // Truncate and add notice
  return (
    transcript.substring(0, maxLength) +
    '\n\n[Transcript truncated for length. Analysis based on first portion.]'
  )
}


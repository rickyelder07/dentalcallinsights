/**
 * AI-Powered QA Scoring
 * Uses GPT-4o-mini to automatically score calls based on transcript analysis
 */

import OpenAI from 'openai'
import type { CriterionFormValue } from '@/types/qa'
import { getAllCriteria } from './qa-criteria'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Generate AI scoring suggestions for a call transcript
 */
export async function generateAIScoringSuggestions(
  transcript: string,
  callDirection?: string,
  callMetadata?: {
    duration?: number
    source_number?: string
    destination_number?: string
  }
): Promise<{
  success: boolean
  suggestions: CriterionFormValue[]
  reasoning: string
  confidence: number
  error?: string
}> {
  try {
    const criteria = getAllCriteria()
    
    // Build the scoring prompt
    const prompt = buildScoringPrompt(transcript, criteria, callDirection, callMetadata)
    
    // Call GPT-4o-mini
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert dental office call quality analyst. Your job is to score calls based on specific criteria. Be objective, fair, and provide evidence-based scoring.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent scoring
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    // Parse the AI response
    const aiResponse = JSON.parse(content)
    
    // Validate and format the suggestions
    const suggestions: CriterionFormValue[] = criteria.map(criterion => {
      const aiScore = aiResponse.scores?.[criterion.name] || {
        score: 0,
        applicable: true,
        notes: '',
        confidence: 50
      }

      return {
        criterion_name: criterion.name,
        criterion_category: criterion.category,
        criterion_weight: criterion.weight,
        score: Math.min(Math.max(0, aiScore.score), criterion.weight), // Clamp to valid range
        applicable: aiScore.applicable !== false, // Default to true
        notes: aiScore.notes || '',
        transcript_excerpt: aiScore.evidence || ''
      }
    })

    return {
      success: true,
      suggestions,
      reasoning: aiResponse.overall_reasoning || 'AI analysis completed',
      confidence: aiResponse.overall_confidence || 70,
    }

  } catch (error) {
    console.error('Error generating AI scoring suggestions:', error)
    return {
      success: false,
      suggestions: [],
      reasoning: '',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Build the scoring prompt for GPT-4o-mini
 */
function buildScoringPrompt(
  transcript: string,
  criteria: any[],
  callDirection?: string,
  callMetadata?: any
): string {
  const criteriaDescription = criteria.map(c => {
    return `
**${c.name}** (${c.weight} points)
- Category: ${c.category}
- Definition: ${c.definition}
- Applicability: ${c.applicability === 'all' ? 'All calls' : c.applicabilityConditions || 'Conditional'}
${c.examples ? `- Examples: ${c.examples.join('; ')}` : ''}
`
  }).join('\n')

  return `
# Call Transcript Analysis and Scoring

## Call Information
- Direction: ${callDirection || 'Unknown'}
- Duration: ${callMetadata?.duration ? `${Math.floor(callMetadata.duration / 60)} minutes` : 'Unknown'}

## Transcript
\`\`\`
${transcript}
\`\`\`

## Scoring Criteria (Total: 100 points)
${criteriaDescription}

## Your Task
Analyze the transcript and score the call on each criterion. For each criterion:

1. **Determine Applicability**: Based on the call type and content, is this criterion applicable?
2. **Assign Score**: Give a score from 0 to the maximum points for that criterion
3. **Provide Evidence**: Quote specific parts of the transcript that support your score
4. **Add Notes**: Explain your reasoning

## Important Considerations

### Conditional Criteria
Some criteria only apply to specific call types:
- **Next 2 Day Appointment**: Only for appointment scheduling (not confirmations/inquiries)
- **Specific Appointment Time**: Most calls except non-appointment inquiries
- **Confirm Appointment**: Most calls except non-appointment inquiries
- **Rebuttals 1 & 2**: Only if there are actual scheduling objections

If a criterion doesn't apply, mark it as not applicable.

### Scoring Guidelines
- **Full Points**: Criterion completely met with clear evidence
- **Partial Points**: Criterion partially met or could be improved
- **Zero Points**: Criterion not met or significant issues
- **Not Applicable**: Criterion doesn't apply to this call type

### Quality Indicators
**Good Signs:**
- Professional greeting with practice name
- Patient verification
- Clear communication
- Empathy and positivity
- Specific appointment suggestions
- Handling objections well
- No long pauses

**Red Flags:**
- Unprofessional behavior
- Confusion or miscommunication
- Missing verification steps
- Caller frustration
- Unanswered questions
- Poor call handling

## Response Format
Respond with ONLY valid JSON in this exact format:

\`\`\`json
{
  "scores": {
    "Agent Introduction": {
      "score": 8,
      "applicable": true,
      "notes": "Agent introduced themselves and practice name clearly",
      "evidence": "Thank you for calling Sola Kids Dental, my name is Sarah",
      "confidence": 90
    },
    "Patient Verification": {
      "score": 10,
      "applicable": true,
      "notes": "Quickly verified patient identity with date of birth",
      "evidence": "Can I have the patient's date of birth please?",
      "confidence": 95
    },
    ... (continue for all 15 criteria)
  },
  "overall_reasoning": "The agent demonstrated strong opening procedures with clear introduction and verification. Some areas for improvement in appointment scheduling urgency and rebuttal handling.",
  "overall_confidence": 85,
  "total_score": 72,
  "grade": "C",
  "strengths": ["Professional greeting", "Good verification", "Friendly tone"],
  "areas_for_improvement": ["Appointment urgency", "Rebuttal handling"],
  "call_type_detected": "appointment_scheduling"
}
\`\`\`

Be thorough, objective, and provide specific evidence from the transcript for each score.
`
}

/**
 * Calculate confidence score based on AI analysis quality
 */
export function calculateConfidenceScore(suggestions: CriterionFormValue[]): number {
  // Check for evidence and notes
  const withEvidence = suggestions.filter(s => s.transcript_excerpt).length
  const withNotes = suggestions.filter(s => s.notes).length
  
  const evidenceScore = (withEvidence / suggestions.length) * 50
  const notesScore = (withNotes / suggestions.length) * 30
  const completionScore = 20 // Base score for completion
  
  return Math.round(evidenceScore + notesScore + completionScore)
}

/**
 * Validate AI scoring suggestions
 */
export function validateAISuggestions(suggestions: CriterionFormValue[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  suggestions.forEach(suggestion => {
    // Check score is within valid range
    if (suggestion.score < 0 || suggestion.score > suggestion.criterion_weight) {
      errors.push(`${suggestion.criterion_name}: Score ${suggestion.score} is out of range (0-${suggestion.criterion_weight})`)
    }
    
    // Check required fields
    if (!suggestion.criterion_name) {
      errors.push('Missing criterion name')
    }
    
    if (suggestion.applicable && suggestion.score === 0 && !suggestion.notes) {
      errors.push(`${suggestion.criterion_name}: Zero score without explanation`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}


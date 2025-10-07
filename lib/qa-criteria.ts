/**
 * QA Scoring Criteria Definitions
 * Based on Scoring Guide.csv - 15 criteria totaling 100 points
 */

import type { CriterionDefinition, ScoringCriteriaConfig } from '@/types/qa'

// ============================================
// CATEGORY 1: STARTING THE CALL RIGHT (30 points)
// ============================================

export const STARTING_CALL_CRITERIA: CriterionDefinition[] = [
  {
    name: 'Agent Introduction',
    category: 'starting_call',
    weight: 10,
    definition: 'Did the agent introduce themselves properly?',
    applicability: 'all',
    examples: [
      'Inbound: "Thank you for calling Sola Kids Dental, my name is [Name], how can I help you?"',
      'Outbound: "Hello this is [Name] from Sola Kids Dental, am I speaking to [patient/the parents of...]"'
    ]
  },
  {
    name: 'Patient Verification',
    category: 'starting_call',
    weight: 10,
    definition: 'Did the agent quickly verify that they were speaking to either the patient or the parent of the patient?',
    applicability: 'all',
    examples: [
      'Outbound: "Am I speaking with [patient name]?"',
      'Inbound: "Can I have the patient\'s date of birth..."'
    ]
  },
  {
    name: 'Call Purpose Clarification',
    category: 'starting_call',
    weight: 10,
    definition: 'Did the Agent clarify reason for the call?',
    applicability: 'all',
    examples: [
      'Inbound: Did the agent properly identify the caller\'s needs on the first try?',
      'Outbound: Immediately and clearly articulate the reason for the call'
    ]
  }
]

// ============================================
// CATEGORY 2: UPSELLING & CLOSING (25 points)
// ============================================

export const UPSELLING_CRITERIA: CriterionDefinition[] = [
  {
    name: 'Next 2 Day Appointment',
    category: 'upselling',
    weight: 10,
    definition: 'Did the agent suggest a date today, tomorrow, or the day after tomorrow?',
    applicability: 'conditional',
    applicabilityConditions: 'Only on general appointment scheduling calls - not on confirmations, inquiries, or calls related to specialty dental services (i.e., Oral Surgery, Endo, Ortho)'
  },
  {
    name: 'Specific Appointment Time',
    category: 'upselling',
    weight: 5,
    definition: 'Did the agent suggest a specific appointment time?',
    applicability: 'conditional',
    applicabilityConditions: 'Not on inquiries that are not related to appointment setting (but it is relevant on almost every call)',
    examples: [
      'Good: "The doctor has availability tomorrow at 12:00p or 2:00p"',
      'Poor: "What time do you want tomorrow?"'
    ]
  },
  {
    name: 'Offer to Schedule Family Members',
    category: 'upselling',
    weight: 5,
    definition: 'Did the agent identify any family members with upcoming appointments or broken appointments and offer to schedule?',
    applicability: 'all',
    examples: [
      '"I see [name]\'s brother is also overdue for a cleaning, would you like to bring him in too?"',
      '"Are there any other family members you\'d like to bring to this appointment or schedule for another day?"'
    ]
  },
  {
    name: 'Confirm Appointment',
    category: 'upselling',
    weight: 5,
    definition: 'Did the agent clearly confirm the date and location?',
    applicability: 'conditional',
    applicabilityConditions: 'Not on inquiries that are not related to appointment setting (but it is relevant on almost every call)',
    examples: [
      'Proper structure: "Day of Week, Day of month at our [Location] office"',
      'Example: "Tuesday the 14th at our Main location"'
    ]
  }
]

// ============================================
// CATEGORY 3: HANDLING REBUTTALS (10 points)
// ============================================

export const REBUTTALS_CRITERIA: CriterionDefinition[] = [
  {
    name: 'Rebuttal 1',
    category: 'rebuttals',
    weight: 5,
    definition: 'Did the agent address first rebuttal to scheduling the appointment?',
    applicability: 'conditional',
    applicabilityConditions: 'Only on appointment scheduling calls - not on confirmations or inquiries. Only if there is a rebuttal.',
    examples: [
      'Typical rebuttals: "need to talk to other parent", "child is in school", "too busy", "need to figure out insurance", "too expensive"'
    ]
  },
  {
    name: 'Rebuttal 2',
    category: 'rebuttals',
    weight: 5,
    definition: 'Did the agent address second rebuttal to scheduling the appointment?',
    applicability: 'conditional',
    applicabilityConditions: 'Only on appointment scheduling calls - not on confirmations or inquiries. Only if there is a second rebuttal.',
    examples: [
      'Typical rebuttals: "need to talk to other parent", "child is in school", "too busy", "need to figure out insurance", "too expensive"'
    ]
  }
]

// ============================================
// CATEGORY 4: QUALITATIVE ASSESSMENTS (35 points)
// ============================================

export const QUALITATIVE_CRITERIA: CriterionDefinition[] = [
  {
    name: 'Agent Empathy',
    category: 'qualitative',
    weight: 5,
    definition: 'Did the agent demonstrate empathy? Did the agent ask if the patient was experiencing any discomfort?',
    applicability: 'all'
  },
  {
    name: 'Agent Positivity',
    category: 'qualitative',
    weight: 5,
    definition: 'Was the agent friendly, upbeat, and confident throughout the call?',
    applicability: 'all'
  },
  {
    name: 'Caller Confusion',
    category: 'qualitative',
    weight: 5,
    definition: 'Did the caller have confusion? Were there any moments in which the patient was confused because the agent did not speak clearly, did not speak correctly, or was accidentally on mute?',
    applicability: 'all'
  },
  {
    name: 'Caller Frustration',
    category: 'qualitative',
    weight: 5,
    definition: 'Did the caller have frustration?',
    applicability: 'all'
  },
  {
    name: 'Questions Answered',
    category: 'qualitative',
    weight: 5,
    definition: 'Were there any questions that the agent was unable to answer?',
    applicability: 'all'
  },
  {
    name: 'Long Pauses',
    category: 'qualitative',
    weight: 5,
    definition: 'Were there any long pauses? Longer than 5 seconds without a preface or longer than 15 seconds even with a preface.',
    applicability: 'all'
  },
  {
    name: 'CSAT Estimation',
    category: 'qualitative',
    weight: 5,
    definition: 'What was the caller\'s estimated CSAT (Customer Satisfaction)?',
    applicability: 'all'
  }
]

// ============================================
// COMPLETE SCORING CRITERIA CONFIG
// ============================================

export const SCORING_CRITERIA_CONFIG: ScoringCriteriaConfig = {
  categories: {
    starting_call: STARTING_CALL_CRITERIA,
    upselling: UPSELLING_CRITERIA,
    rebuttals: REBUTTALS_CRITERIA,
    qualitative: QUALITATIVE_CRITERIA
  },
  totalPoints: 100
}

// ============================================
// CATEGORY METADATA
// ============================================

export const CATEGORY_METADATA = {
  starting_call: {
    label: 'Starting The Call Right',
    maxPoints: 30,
    description: 'Professional introduction, patient verification, and purpose clarification',
    color: 'blue'
  },
  upselling: {
    label: 'Upselling & Closing',
    maxPoints: 25,
    description: 'Appointment scheduling techniques and closing strategies',
    color: 'green'
  },
  rebuttals: {
    label: 'Handling Rebuttals',
    maxPoints: 10,
    description: 'Addressing scheduling objections and concerns',
    color: 'orange'
  },
  qualitative: {
    label: 'Qualitative Assessments',
    maxPoints: 35,
    description: 'Communication quality, empathy, and customer satisfaction',
    color: 'purple'
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all criteria definitions as a flat array
 */
export function getAllCriteria(): CriterionDefinition[] {
  return [
    ...STARTING_CALL_CRITERIA,
    ...UPSELLING_CRITERIA,
    ...REBUTTALS_CRITERIA,
    ...QUALITATIVE_CRITERIA
  ]
}

/**
 * Get criteria by category
 */
export function getCriteriaByCategory(category: string): CriterionDefinition[] {
  switch (category) {
    case 'starting_call':
      return STARTING_CALL_CRITERIA
    case 'upselling':
      return UPSELLING_CRITERIA
    case 'rebuttals':
      return REBUTTALS_CRITERIA
    case 'qualitative':
      return QUALITATIVE_CRITERIA
    default:
      return []
  }
}

/**
 * Get criterion by name
 */
export function getCriterionByName(name: string): CriterionDefinition | undefined {
  return getAllCriteria().find(c => c.name === name)
}

/**
 * Calculate total possible score
 */
export function getTotalPossibleScore(): number {
  return getAllCriteria().reduce((sum, criterion) => sum + criterion.weight, 0)
}

/**
 * Calculate category max score
 */
export function getCategoryMaxScore(category: string): number {
  return getCriteriaByCategory(category).reduce((sum, criterion) => sum + criterion.weight, 0)
}

/**
 * Validate score for criterion
 */
export function isValidScore(criterionName: string, score: number): boolean {
  const criterion = getCriterionByName(criterionName)
  if (!criterion) return false
  return score >= 0 && score <= criterion.weight
}

/**
 * Get default criteria form values
 */
export function getDefaultCriteriaValues() {
  return getAllCriteria().map(criterion => ({
    criterion_name: criterion.name,
    criterion_category: criterion.category,
    criterion_weight: criterion.weight,
    score: 0,
    applicable: true,
    notes: '',
    transcript_excerpt: ''
  }))
}

/**
 * Calculate score breakdown by category
 */
export function calculateScoreBreakdown(criteria: Array<{
  criterion_category: string
  score: number
  applicable: boolean
}>) {
  const breakdown = {
    starting_call: { score: 0, max: 30 },
    upselling: { score: 0, max: 25 },
    rebuttals: { score: 0, max: 10 },
    qualitative: { score: 0, max: 35 }
  }

  criteria.forEach(criterion => {
    if (criterion.applicable) {
      const category = criterion.criterion_category as keyof typeof breakdown
      if (breakdown[category]) {
        breakdown[category].score += criterion.score
      }
    }
  })

  return breakdown
}

/**
 * Calculate total score from criteria
 */
export function calculateTotalScore(criteria: Array<{
  score: number
  applicable: boolean
}>) {
  return criteria
    .filter(c => c.applicable)
    .reduce((sum, c) => sum + c.score, 0)
}

/**
 * Get grade from score
 */
export function getScoreGrade(score: number): {
  grade: string
  color: string
  label: string
} {
  if (score >= 90) {
    return { grade: 'A', color: 'green', label: 'Excellent' }
  } else if (score >= 80) {
    return { grade: 'B', color: 'blue', label: 'Good' }
  } else if (score >= 70) {
    return { grade: 'C', color: 'yellow', label: 'Satisfactory' }
  } else if (score >= 60) {
    return { grade: 'D', color: 'orange', label: 'Needs Improvement' }
  } else {
    return { grade: 'F', color: 'red', label: 'Poor' }
  }
}

/**
 * Check if criterion is applicable for call type
 */
export function isCriterionApplicable(
  criterionName: string,
  callDirection?: string,
  callType?: string
): boolean {
  const criterion = getCriterionByName(criterionName)
  if (!criterion) return false

  // All criteria with 'all' applicability are always applicable
  if (criterion.applicability === 'all') {
    return true
  }

  // Conditional criteria - check specific conditions
  // This is a simplified version - you may want to make this more sophisticated
  const name = criterion.name
  
  // Next 2 Day Appointment - only for scheduling calls
  if (name === 'Next 2 Day Appointment') {
    return callType !== 'confirmation' && callType !== 'inquiry'
  }

  // Specific Appointment Time - almost all calls
  if (name === 'Specific Appointment Time') {
    return callType !== 'inquiry'
  }

  // Confirm Appointment - almost all calls
  if (name === 'Confirm Appointment') {
    return callType !== 'inquiry'
  }

  // Rebuttals - only if there are rebuttals
  if (name === 'Rebuttal 1' || name === 'Rebuttal 2') {
    return callType !== 'confirmation' && callType !== 'inquiry'
  }

  return true
}

/**
 * Get scoring guidance for criterion
 */
export function getScoringGuidance(criterionName: string) {
  const criterion = getCriterionByName(criterionName)
  if (!criterion) return null

  return {
    criterion_name: criterion.name,
    definition: criterion.definition,
    scoring_tips: criterion.examples || [],
    applicability: criterion.applicability,
    conditions: criterion.applicabilityConditions
  }
}


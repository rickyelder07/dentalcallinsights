/**
 * Call Flow Parser Library
 * Utilities for parsing call flow data to extract information
 * like new patient status, language selection, etc.
 */

/**
 * Parse call flow to determine if caller is a new patient
 * 
 * A call is considered "new patient" when:
 * 1. It is an inbound call
 * 2. The second "dialed:" value in call_flow is "1"
 * 
 * Example call flow:
 * "DID:3233255641 switchboard:1003 auto_attendant:3757216720079:dialed:1 auto_attendant:2468421977197:dialed:1 schedule [open] ring_group:999"
 * 
 * First "dialed:1" = English selection
 * Second "dialed:1" = New patient
 * Second "dialed:2" = Existing patient
 * 
 * @param callFlow - The call flow string from CSV
 * @param direction - Call direction ('inbound' or 'outbound')
 * @returns true if new patient, false otherwise
 */
export function parseNewPatientStatus(
  callFlow: string | null | undefined,
  direction: string | null | undefined
): boolean {
  // Debug logging to troubleshoot new patient detection
  console.log('🔍 parseNewPatientStatus called:', {
    direction,
    hasCallFlow: !!callFlow,
    callFlowPreview: callFlow ? callFlow.substring(0, 100) : 'null',
  })

  // Only inbound calls can be new patients
  if (!direction || direction.toLowerCase() !== 'inbound') {
    console.log('  ❌ Not inbound - direction:', direction)
    return false
  }

  // Need call flow data
  if (!callFlow) {
    console.log('  ❌ No call flow data')
    return false
  }

  try {
    // Extract all "dialed:X" patterns
    const dialedPattern = /dialed:(\d+)/g
    const matches = Array.from(callFlow.matchAll(dialedPattern))
    const dialedValues = matches.map(m => m[1])

    console.log('  📊 Dialed values found:', dialedValues)

    // Need at least 2 dialed entries
    if (matches.length < 2) {
      console.log('  ❌ Not enough dialed entries (need 2, found', matches.length, ')')
      return false
    }

    // Check the second "dialed:" value
    const secondDialedValue = matches[1][1]
    const isNewPatient = secondDialedValue === '1'
    
    console.log('  ✅ Result:', isNewPatient ? 'NEW PATIENT' : 'EXISTING PATIENT', '(second dialed:', secondDialedValue, ')')
    
    return isNewPatient
  } catch (error) {
    console.error('  ⚠️ Error parsing call flow for new patient status:', error)
    return false
  }
}

/**
 * Parse call flow to extract language selection
 * 
 * The first "dialed:" value typically indicates language:
 * - dialed:1 = English
 * - dialed:2 = Spanish
 * 
 * @param callFlow - The call flow string from CSV
 * @returns 'english', 'spanish', or null
 */
export function parseLanguageSelection(
  callFlow: string | null | undefined
): 'english' | 'spanish' | null {
  if (!callFlow) {
    return null
  }

  try {
    // Extract first "dialed:X" pattern
    const dialedPattern = /dialed:(\d+)/
    const match = callFlow.match(dialedPattern)

    if (!match) {
      return null
    }

    const firstDialedValue = match[1]
    if (firstDialedValue === '1') {
      return 'english'
    } else if (firstDialedValue === '2') {
      return 'spanish'
    }

    return null
  } catch (error) {
    console.error('Error parsing call flow for language selection:', error)
    return null
  }
}

/**
 * Get all dialed values from call flow
 * 
 * @param callFlow - The call flow string from CSV
 * @returns Array of dialed values
 */
export function getAllDialedValues(
  callFlow: string | null | undefined
): string[] {
  if (!callFlow) {
    return []
  }

  try {
    const dialedPattern = /dialed:(\d+)/g
    const matches = Array.from(callFlow.matchAll(dialedPattern))
    return matches.map(match => match[1])
  } catch (error) {
    console.error('Error parsing call flow for dialed values:', error)
    return []
  }
}

/**
 * Check if call reached a specific stage
 * 
 * @param callFlow - The call flow string from CSV
 * @param stage - Stage to check for (e.g., 'ring_group', 'queue', 'voicemail')
 * @returns true if stage is present
 */
export function callReachedStage(
  callFlow: string | null | undefined,
  stage: string
): boolean {
  if (!callFlow || !stage) {
    return false
  }

  return callFlow.toLowerCase().includes(stage.toLowerCase())
}

/**
 * Extract DID (Direct Inward Dialing) number from call flow
 * 
 * @param callFlow - The call flow string from CSV
 * @returns DID number or null
 */
export function extractDID(
  callFlow: string | null | undefined
): string | null {
  if (!callFlow) {
    return null
  }

  try {
    const didPattern = /DID:(\d+)/
    const match = callFlow.match(didPattern)
    return match ? match[1] : null
  } catch (error) {
    console.error('Error extracting DID from call flow:', error)
    return null
  }
}

export default {
  parseNewPatientStatus,
  parseLanguageSelection,
  getAllDialedValues,
  callReachedStage,
  extractDID,
}


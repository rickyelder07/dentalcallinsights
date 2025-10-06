/**
 * Transcription Corrections (Server-side only)
 * User-managed dictionary for automatic post-processing fixes
 * 
 * IMPORTANT: This file must only be imported in server-side code (API routes)
 */

import { createAdminClient } from '@/lib/supabase-server'

export interface CorrectionRule {
  find_text: string
  replace_text: string
  is_regex: boolean
  case_sensitive: boolean
  priority: number
}

/**
 * Fetch user corrections ordered by priority
 */
export async function fetchUserCorrections(userId: string): Promise<CorrectionRule[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('transcription_corrections')
    .select('find_text, replace_text, is_regex, case_sensitive, priority')
    .eq('user_id', userId)
    .order('priority', { ascending: true })

  if (error || !data) {
    return []
  }
  return data as CorrectionRule[]
}

/**
 * Apply user-managed corrections to transcript text
 * - Runs in priority order
 * - Supports regex and case sensitivity options
 * - Server-side only
 */
export async function applyUserCorrections(text: string, userId: string): Promise<string> {
  if (!text || !userId) return text
  
  const rules = await fetchUserCorrections(userId)
  if (!rules || rules.length === 0) return text

  let result = text
  for (const rule of rules) {
    try {
      if (rule.is_regex) {
        const flags = rule.case_sensitive ? 'g' : 'gi'
        const pattern = new RegExp(rule.find_text, flags)
        result = result.replace(pattern, rule.replace_text)
      } else {
        // Escape special regex characters if not regex
        const escaped = rule.find_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const flags = rule.case_sensitive ? 'g' : 'gi'
        const pattern = new RegExp(escaped, flags)
        result = result.replace(pattern, rule.replace_text)
      }
    } catch (error) {
      // Ignore invalid patterns; continue with others
      console.warn('Invalid correction rule:', rule, error)
      continue
    }
  }
  
  return result
}


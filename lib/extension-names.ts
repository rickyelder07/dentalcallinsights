/**
 * Extension Name Mapping
 * Maps extension numbers to staff names for display purposes
 */

/**
 * Extension to name mapping
 */
export const EXTENSION_NAMES: Record<string, string> = {
  '902': 'Natalie',
  '903': 'Yaslin',
  '904': 'Carla',
  '905': 'Adineli',
  '906': 'Roselyn',
  '907': 'Yesica',
  '997': 'Amy',
}

/**
 * List of extensions that should be considered for Top Performer and Needs Attention
 */
export const PERFORMANCE_TRACKED_EXTENSIONS = ['902', '903', '904', '905', '906', '907', '997']

/**
 * Get the display name for an extension
 * Returns the name if mapped, otherwise returns the extension number
 */
export function getExtensionDisplayName(extension: string | null | undefined): string {
  if (!extension) return ''
  
  // Convert to string and check if it's in our mapping
  const extStr = String(extension)
  return EXTENSION_NAMES[extStr] || extStr
}

/**
 * Check if an extension is in the performance tracking list
 */
export function isPerformanceTrackedExtension(extension: string | null | undefined): boolean {
  if (!extension) return false
  return PERFORMANCE_TRACKED_EXTENSIONS.includes(String(extension))
}

/**
 * Format extension for display (name or number)
 * @param extension - Extension number
 * @param showPrefix - Whether to show "Ext " prefix (default: true)
 */
export function formatExtension(extension: string | null | undefined, showPrefix: boolean = true): string {
  if (!extension) return ''
  
  const displayName = getExtensionDisplayName(extension)
  return showPrefix ? `Ext ${displayName}` : displayName
}


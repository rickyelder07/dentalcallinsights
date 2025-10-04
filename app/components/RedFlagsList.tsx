/**
 * Red Flags List Component
 * Displays concerns and red flags with severity indicators
 */

'use client'

import type { RedFlag } from '@/types/insights'
import { getSeverityColor } from '@/types/insights'

interface RedFlagsListProps {
  redFlags: RedFlag[]
}

export default function RedFlagsList({ redFlags }: RedFlagsListProps) {
  // Capitalize first letter
  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
  
  // If no red flags, show success state
  if (!redFlags || redFlags.length === 0) {
    return (
      <div className="bg-white border border-green-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-2">✅</span>
          <h3 className="text-lg font-semibold text-green-700">No Concerns Identified</h3>
        </div>
        <p className="text-gray-600 text-sm">
          No red flags or concerns detected in this call.
        </p>
      </div>
    )
  }
  
  return (
    <div className="bg-white border border-red-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-2">⚠️</span>
        <h3 className="text-lg font-semibold text-red-700">Red Flags & Concerns</h3>
      </div>
      
      <ul className="space-y-3">
        {redFlags.map((flag, index) => (
          <li key={index} className="flex items-start">
            {/* Warning icon */}
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className={`w-5 h-5 mr-3 ${
                  flag.severity === 'high'
                    ? 'text-red-600'
                    : flag.severity === 'medium'
                    ? 'text-orange-600'
                    : 'text-yellow-600'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            
            {/* Flag content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start flex-wrap gap-2 mb-1">
                {/* Severity badge */}
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(
                    flag.severity
                  )}`}
                >
                  {capitalize(flag.severity)} Severity
                </span>
                
                {/* Category badge */}
                <span className="inline-flex px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                  {capitalize(flag.category)}
                </span>
              </div>
              
              {/* Concern text */}
              <p className="text-gray-700 text-sm">{flag.concern}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}


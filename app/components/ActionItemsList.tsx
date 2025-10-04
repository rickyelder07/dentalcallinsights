/**
 * Action Items List Component
 * Displays action items with priority and assignee
 */

'use client'

import type { ActionItem } from '@/types/insights'
import { getPriorityColor } from '@/types/insights'

interface ActionItemsListProps {
  actionItems: ActionItem[]
}

export default function ActionItemsList({ actionItems }: ActionItemsListProps) {
  // Capitalize first letter
  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-2">✅</span>
        <h3 className="text-lg font-semibold text-gray-900">Action Items</h3>
      </div>
      
      {!actionItems || actionItems.length === 0 ? (
        <div className="text-center py-8">
          <span className="text-4xl mb-2 block">✓</span>
          <p className="text-gray-600 font-medium">No action items identified</p>
          <p className="text-sm text-gray-500 mt-1">
            All issues resolved or no follow-up needed
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {actionItems.slice(0, 5).map((item, index) => (
            <li key={index} className="flex items-start">
              {/* Checkbox (non-functional) */}
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-5 h-5 border-2 border-gray-300 rounded mr-3"></div>
              </div>
              
              {/* Action content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start flex-wrap gap-2">
                  {/* Priority badge */}
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(
                      item.priority
                    )}`}
                  >
                    {capitalize(item.priority)}
                  </span>
                  
                  {/* Assignee badge */}
                  <span className="inline-flex px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                    {capitalize(item.assignee)}
                  </span>
                </div>
                
                {/* Action text */}
                <p className="text-gray-700 text-sm mt-1">{item.action}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      
      {actionItems && actionItems.length > 5 && (
        <p className="text-sm text-gray-500 mt-4">
          +{actionItems.length - 5} more action items
        </p>
      )}
    </div>
  )
}


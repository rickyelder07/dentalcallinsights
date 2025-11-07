'use client'

/**
 * Horizontal Bar Component
 * Displays a horizontal percentage bar with label and value
 */

interface HorizontalBarProps {
  label: string
  value: number // 0-100 percentage
  count?: number // Optional count to display
  color?: string
  className?: string
}

export default function HorizontalBar({
  label,
  value,
  count,
  color = '#3b82f6', // blue-500 default
  className = '',
}: HorizontalBarProps) {
  // Clamp value between 0 and 100
  const percentage = Math.max(0, Math.min(100, value))

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 capitalize">{label}</span>
        <div className="flex items-center gap-2">
          {count !== undefined && (
            <span className="text-gray-500">({count})</span>
          )}
          <span className="font-semibold text-gray-900">{percentage.toFixed(0)}%</span>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}

/**
 * Multiple Horizontal Bars Component
 * Displays multiple bars with preset sentiment colors
 */
interface HorizontalBarsProps {
  data: {
    label: string
    value: number
    count?: number
  }[]
  className?: string
}

export function HorizontalBars({ data, className = '' }: HorizontalBarsProps) {
  const getColor = (label: string): string => {
    const lowerLabel = label.toLowerCase()
    if (lowerLabel.includes('positive')) return '#22c55e' // green-500
    if (lowerLabel.includes('negative')) return '#ef4444' // red-500
    if (lowerLabel.includes('neutral')) return '#6b7280' // gray-500
    if (lowerLabel.includes('mixed')) return '#f97316' // orange-500
    return '#3b82f6' // blue-500 default
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {data.map((item, index) => (
        <HorizontalBar
          key={index}
          label={item.label}
          value={item.value}
          count={item.count}
          color={getColor(item.label)}
        />
      ))}
    </div>
  )
}


'use client'

/**
 * Satisfaction Gauge Component
 * Displays a satisfaction score as a circular gauge (0-100)
 */

interface SatisfactionGaugeProps {
  score: number // 0-100
  size?: number // Diameter in pixels
  label?: string
  className?: string
}

export default function SatisfactionGauge({
  score,
  size = 150,
  label = 'Satisfaction',
  className = '',
}: SatisfactionGaugeProps) {
  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, score))
  
  // Calculate color based on score
  const getColor = (score: number): string => {
    if (score >= 80) return '#22c55e' // green-500
    if (score >= 60) return '#84cc16' // lime-500
    if (score >= 40) return '#eab308' // yellow-500
    if (score >= 20) return '#f97316' // orange-500
    return '#ef4444' // red-500
  }

  const color = getColor(clampedScore)
  
  // Calculate arc for gauge
  // Gauge goes from -120 degrees to 120 degrees (240 degrees total)
  const startAngle = -120
  const endAngle = 120
  const totalAngle = endAngle - startAngle
  const scoreAngle = startAngle + (clampedScore / 100) * totalAngle

  const radius = (size / 2) - 15
  const centerX = size / 2
  const centerY = size / 2
  const strokeWidth = 12

  // Create the background arc (full gauge)
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    }
  }

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle)
    const end = polarToCartesian(x, y, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    ].join(' ')
  }

  const backgroundPath = describeArc(centerX, centerY, radius, startAngle, endAngle)
  const scorePath = describeArc(centerX, centerY, radius, startAngle, scoreAngle)

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path
          d={backgroundPath}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Score arc */}
        <path
          d={scorePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="transition-all duration-500"
        />

        {/* Center text - score */}
        <text
          x={centerX}
          y={centerY - 5}
          textAnchor="middle"
          className="text-3xl font-bold fill-gray-900"
        >
          {Math.round(clampedScore)}
        </text>
        
        {/* Center text - out of 100 */}
        <text
          x={centerX}
          y={centerY + 15}
          textAnchor="middle"
          className="text-xs fill-gray-600"
        >
          / 100
        </text>
      </svg>

      {/* Label */}
      <p className="mt-2 text-sm font-medium text-gray-700">{label}</p>
      
      {/* Score category */}
      <div className="mt-1 flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-gray-600">
          {clampedScore >= 80 ? 'Excellent' :
           clampedScore >= 60 ? 'Good' :
           clampedScore >= 40 ? 'Fair' :
           clampedScore >= 20 ? 'Poor' : 'Very Poor'}
        </span>
      </div>
    </div>
  )
}


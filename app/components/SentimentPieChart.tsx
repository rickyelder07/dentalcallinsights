'use client'

/**
 * Sentiment Pie Chart Component
 * Displays sentiment distribution as a pie chart
 */

interface SentimentPieChartProps {
  data: {
    positive: number
    negative: number
    neutral: number
    mixed: number
  }
  size?: number // Diameter in pixels
  showLegend?: boolean
  className?: string
}

export default function SentimentPieChart({
  data,
  size = 200,
  showLegend = true,
  className = '',
}: SentimentPieChartProps) {
  const total = data.positive + data.negative + data.neutral + data.mixed

  if (total === 0) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="text-center text-gray-400">
          <p className="text-sm">No data</p>
        </div>
      </div>
    )
  }

  // Calculate percentages
  const percentages = {
    positive: (data.positive / total) * 100,
    negative: (data.negative / total) * 100,
    neutral: (data.neutral / total) * 100,
    mixed: (data.mixed / total) * 100,
  }

  // Colors
  const colors = {
    positive: '#22c55e', // green-500
    negative: '#ef4444', // red-500
    neutral: '#6b7280', // gray-500
    mixed: '#f97316', // orange-500
  }

  // Calculate arc positions for SVG
  const segments = []
  let currentAngle = 0

  const sentimentOrder: Array<keyof typeof data> = ['positive', 'neutral', 'negative', 'mixed']
  
  sentimentOrder.forEach((sentiment) => {
    if (data[sentiment] > 0) {
      const percentage = percentages[sentiment]
      const angle = (percentage / 100) * 360
      const endAngle = currentAngle + angle
      
      segments.push({
        sentiment,
        color: colors[sentiment],
        startAngle: currentAngle,
        endAngle,
        percentage,
        count: data[sentiment],
      })
      
      currentAngle = endAngle
    }
  })

  // Create SVG path for each segment
  const createArc = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(radius, radius, radius - 10, endAngle)
    const end = polarToCartesian(radius, radius, radius - 10, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

    return [
      'M', radius, radius,
      'L', start.x, start.y,
      'A', radius - 10, radius - 10, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ')
  }

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    }
  }

  const radius = size / 2

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((segment, index) => (
          <g key={index}>
            <path
              d={createArc(segment.startAngle, segment.endAngle, radius)}
              fill={segment.color}
              className="transition-opacity hover:opacity-80"
            />
          </g>
        ))}
        {/* Center circle for donut chart effect */}
        <circle
          cx={radius}
          cy={radius}
          r={radius - 60}
          fill="white"
        />
        {/* Center text */}
        <text
          x={radius}
          y={radius - 5}
          textAnchor="middle"
          className="text-2xl font-bold fill-gray-900"
        >
          {total}
        </text>
        <text
          x={radius}
          y={radius + 15}
          textAnchor="middle"
          className="text-xs fill-gray-600"
        >
          calls
        </text>
      </svg>

      {showLegend && (
        <div className="mt-4 grid grid-cols-2 gap-2 w-full">
          {sentimentOrder.map((sentiment) => {
            if (data[sentiment] === 0) return null
            return (
              <div key={sentiment} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[sentiment] }}
                />
                <span className="text-xs text-gray-700 capitalize">
                  {sentiment}: {data[sentiment]} ({percentages[sentiment].toFixed(1)}%)
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


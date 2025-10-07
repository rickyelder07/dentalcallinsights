/**
 * Analytics Library
 * Functions for processing and computing analytics data
 */

import type {
  AnalyticsOverview,
  AnalyticsTrends,
  SentimentAnalytics,
  TopicsAnalytics,
  PerformanceMetrics,
  TrendDataPoint,
  DateRange,
} from '@/types/analytics'
import type { Call } from '@/types/upload'
import type { Transcript } from '@/types/transcript'
import type { InsightsRecord } from '@/types/insights'

// ============================================
// OVERVIEW ANALYTICS
// ============================================

/**
 * Compute overview analytics from calls data
 */
export function computeOverviewAnalytics(
  calls: any[],
  transcripts: any[],
  insights: any[],
  embeddings: any[]
): AnalyticsOverview {
  const transcriptIds = new Set(
    transcripts
      .filter((t) => t.transcription_status === 'completed')
      .map((t) => t.call_id)
  )
  
  const insightsCallIds = new Set(insights.map((i) => i.call_id))
  const embeddingsCallIds = new Set(embeddings.map((e) => e.call_id))
  
  // Calculate sentiment distribution
  const sentimentCounts = {
    positive: 0,
    negative: 0,
    neutral: 0,
    mixed: 0,
  }
  
  insights.forEach((insight) => {
    const sentiment = insight.overall_sentiment
    if (sentiment in sentimentCounts) {
      sentimentCounts[sentiment as keyof typeof sentimentCounts]++
    }
  })
  
  // Calculate duration statistics
  const durations = calls
    .map((c) => c.call_duration_seconds)
    .filter((d) => d != null && d > 0)
  
  const totalDuration = durations.reduce((sum, d) => sum + d, 0)
  const avgDuration = durations.length > 0 ? totalDuration / durations.length : 0
  
  // Calculate action items and red flags
  const callsWithActionItems = insights.filter(
    (i) => i.action_items && Array.isArray(i.action_items) && i.action_items.length > 0
  ).length
  
  const callsWithRedFlags = insights.filter(
    (i) => i.red_flags && Array.isArray(i.red_flags) && i.red_flags.length > 0
  ).length
  
  // Get date range
  const callTimes = calls
    .map((c) => c.call_time)
    .filter((t) => t != null)
    .sort()
  
  return {
    totalCalls: calls.length,
    transcribedCalls: transcriptIds.size,
    callsWithInsights: insightsCallIds.size,
    callsWithEmbeddings: embeddingsCallIds.size,
    avgCallDuration: Math.round(avgDuration),
    totalCallDuration: totalDuration,
    positiveCalls: sentimentCounts.positive,
    negativeCalls: sentimentCounts.negative,
    neutralCalls: sentimentCounts.neutral,
    mixedCalls: sentimentCounts.mixed,
    callsWithActionItems,
    callsWithRedFlags,
    earliestCall: callTimes[0],
    latestCall: callTimes[callTimes.length - 1],
    computedAt: new Date().toISOString(),
  }
}

// ============================================
// TRENDS ANALYTICS
// ============================================

/**
 * Compute trends analytics from calls data
 */
export function computeTrendsAnalytics(
  calls: any[],
  insights: any[],
  period: 'day' | 'week' | 'month' = 'day'
): AnalyticsTrends {
  // Group calls by date
  const callsByDate = new Map<string, any[]>()
  
  calls.forEach((call) => {
    if (!call.call_time) return
    
    const date = new Date(call.call_time)
    const dateKey = formatDateKey(date, period)
    
    if (!callsByDate.has(dateKey)) {
      callsByDate.set(dateKey, [])
    }
    callsByDate.get(dateKey)!.push(call)
  })
  
  // Create insights lookup
  const insightsByCallId = new Map(insights.map((i) => [i.call_id, i]))
  
  // Generate data points
  const dataPoints: TrendDataPoint[] = []
  const sortedDates = Array.from(callsByDate.keys()).sort()
  
  sortedDates.forEach((dateKey) => {
    const dateCalls = callsByDate.get(dateKey)!
    
    let positiveCount = 0
    let negativeCount = 0
    let neutralCount = 0
    let inboundCount = 0
    let outboundCount = 0
    let totalDuration = 0
    
    dateCalls.forEach((call) => {
      const insight = insightsByCallId.get(call.id)
      
      if (insight) {
        if (insight.overall_sentiment === 'positive') positiveCount++
        if (insight.overall_sentiment === 'negative') negativeCount++
        if (insight.overall_sentiment === 'neutral') neutralCount++
      }
      
      if (call.call_direction === 'Inbound') inboundCount++
      if (call.call_direction === 'Outbound') outboundCount++
      
      totalDuration += call.call_duration_seconds || 0
    })
    
    dataPoints.push({
      date: dateKey,
      callCount: dateCalls.length,
      avgDuration: dateCalls.length > 0 ? totalDuration / dateCalls.length : 0,
      positiveCount,
      negativeCount,
      neutralCount,
      inboundCount,
      outboundCount,
    })
  })
  
  // Calculate summary
  const totalCalls = dataPoints.reduce((sum, dp) => sum + dp.callCount, 0)
  const avgCallsPerDay = dataPoints.length > 0 ? totalCalls / dataPoints.length : 0
  
  // Calculate trend direction
  const recentCalls = dataPoints.slice(-7).reduce((sum, dp) => sum + dp.callCount, 0) / 7
  const olderCalls = dataPoints.slice(-14, -7).reduce((sum, dp) => sum + dp.callCount, 0) / 7
  
  let trendDirection: 'up' | 'down' | 'stable' = 'stable'
  let percentChange = 0
  
  if (olderCalls > 0) {
    percentChange = ((recentCalls - olderCalls) / olderCalls) * 100
    if (percentChange > 10) trendDirection = 'up'
    else if (percentChange < -10) trendDirection = 'down'
  }
  
  return {
    period,
    dataPoints,
    summary: {
      totalCalls,
      avgCallsPerDay: Math.round(avgCallsPerDay * 10) / 10,
      trendDirection,
      percentChange: Math.round(percentChange * 10) / 10,
    },
  }
}

/**
 * Format date key based on period
 */
function formatDateKey(date: Date, period: 'day' | 'week' | 'month'): string {
  if (period === 'day') {
    return date.toISOString().split('T')[0]
  } else if (period === 'week') {
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    return weekStart.toISOString().split('T')[0]
  } else {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
}

// ============================================
// SENTIMENT ANALYTICS
// ============================================

/**
 * Compute sentiment analytics from insights data
 */
export function computeSentimentAnalytics(insights: any[]): SentimentAnalytics {
  // Calculate sentiment distribution
  const sentimentCounts: Record<string, number> = {}
  const patientSatisfactionCounts = {
    happy: 0,
    satisfied: 0,
    neutral: 0,
    frustrated: 0,
    angry: 0,
    tooShort: 0,
  }
  
  insights.forEach((insight) => {
    const sentiment = insight.overall_sentiment
    sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1
    
    const satisfaction = insight.patient_satisfaction
    if (satisfaction === 'happy') patientSatisfactionCounts.happy++
    else if (satisfaction === 'satisfied') patientSatisfactionCounts.satisfied++
    else if (satisfaction === 'neutral') patientSatisfactionCounts.neutral++
    else if (satisfaction === 'frustrated') patientSatisfactionCounts.frustrated++
    else if (satisfaction === 'angry') patientSatisfactionCounts.angry++
    else if (satisfaction === 'too_short') patientSatisfactionCounts.tooShort++
  })
  
  const totalInsights = insights.length || 1
  
  const distribution = Object.entries(sentimentCounts).map(([sentiment, count]) => ({
    sentiment: sentiment as any,
    count,
    percentage: Math.round((count / totalInsights) * 100),
  }))
  
  // Calculate satisfaction score (0-100)
  const satisfactionWeights = {
    happy: 100,
    satisfied: 75,
    neutral: 50,
    frustrated: 25,
    angry: 0,
    tooShort: 50,
  }
  
  const totalWeight = Object.entries(patientSatisfactionCounts).reduce(
    (sum, [key, count]) => sum + (satisfactionWeights[key as keyof typeof satisfactionWeights] * count),
    0
  )
  
  const avgSatisfactionScore = insights.length > 0 ? totalWeight / insights.length : 50
  
  // Calculate sentiment trend (simplified)
  const positivePercentage = Math.round(
    ((sentimentCounts.positive || 0) / totalInsights) * 100
  )
  const negativePercentage = Math.round(
    ((sentimentCounts.negative || 0) / totalInsights) * 100
  )
  
  return {
    distribution,
    patientSatisfaction: patientSatisfactionCounts,
    sentimentTrend: {
      period: 'current',
      positivePercentage,
      negativePercentage,
      change: 0, // Would need historical data for actual change
    },
    avgSatisfactionScore: Math.round(avgSatisfactionScore),
  }
}

// ============================================
// TOPICS ANALYTICS
// ============================================

/**
 * Extract topics from insights and transcripts
 */
export function computeTopicsAnalytics(
  insights: any[],
  transcripts: any[]
): TopicsAnalytics {
  // Extract topics from summaries and key points
  const topicCounts = new Map<string, number>()
  
  insights.forEach((insight) => {
    // Extract from key points
    if (insight.summary_key_points && Array.isArray(insight.summary_key_points)) {
      insight.summary_key_points.forEach((point: string) => {
        // Simple keyword extraction (in production, use NLP)
        const keywords = extractKeywords(point)
        keywords.forEach((keyword) => {
          topicCounts.set(keyword, (topicCounts.get(keyword) || 0) + 1)
        })
      })
    }
  })
  
  // Convert to array and sort
  const commonTopics = Array.from(topicCounts.entries())
    .map(([topic, count]) => ({
      topic,
      count,
      percentage: Math.round((count / insights.length) * 100),
      trend: 'stable' as const, // Would need historical data
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  // Extract keywords from transcripts (simplified)
  const keywords = extractTopKeywords(transcripts, insights)
  
  return {
    commonTopics,
    keywords,
    categories: [], // Would need category classification
  }
}

/**
 * Simple keyword extraction (production should use NLP)
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
  ])
  
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 5)
}

/**
 * Extract top keywords from transcripts
 */
function extractTopKeywords(transcripts: any[], insights: any[]): any[] {
  // Simplified keyword extraction
  // In production, use proper NLP/text analysis
  return []
}

// ============================================
// PERFORMANCE METRICS
// ============================================

/**
 * Compute performance metrics
 */
export function computePerformanceMetrics(
  calls: any[],
  insights: any[]
): PerformanceMetrics {
  // Outcome distribution
  const outcomeCounts: Record<string, number> = {}
  
  insights.forEach((insight) => {
    const outcome = insight.call_outcome
    outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1
  })
  
  const totalInsights = insights.length || 1
  
  const outcomes = Object.entries(outcomeCounts).map(([outcome, count]) => ({
    outcome: outcome as any,
    count,
    percentage: Math.round((count / totalInsights) * 100),
  }))
  
  // Staff performance
  const professionalCalls = insights.filter(
    (i) => i.staff_performance === 'professional'
  ).length
  const needsImprovementCalls = insights.filter(
    (i) => i.staff_performance === 'needs_improvement'
  ).length
  
  const durations = calls
    .map((c) => c.call_duration_seconds)
    .filter((d) => d != null && d > 0)
  const avgCallDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0
  
  const resolvedCount = outcomeCounts.resolved || 0
  const resolutionRate = totalInsights > 0 ? (resolvedCount / totalInsights) * 100 : 0
  
  // Calculate average patient satisfaction
  const satisfactionScores = insights
    .map((i) => {
      const sat = i.patient_satisfaction
      if (sat === 'happy') return 5
      if (sat === 'satisfied') return 4
      if (sat === 'neutral') return 3
      if (sat === 'frustrated') return 2
      if (sat === 'angry') return 1
      return 3
    })
  
  const avgPatientSatisfaction = satisfactionScores.length > 0
    ? satisfactionScores.reduce((sum, s) => sum + s, 0) / satisfactionScores.length
    : 3
  
  const staffPerformance = {
    totalCalls: insights.length,
    professionalCalls,
    needsImprovementCalls,
    avgCallDuration: Math.round(avgCallDuration),
    avgPatientSatisfaction: Math.round(avgPatientSatisfaction * 10) / 10,
    resolutionRate: Math.round(resolutionRate),
  }
  
  // Call volume patterns (simplified)
  const callVolumePatterns = {
    peakHours: [] as { hour: number; count: number }[],
    peakDays: [] as { day: string; count: number }[],
  }
  
  return {
    outcomes,
    staffPerformance,
    revenueImpact: {
      appointmentsScheduled: 0, // Would need to extract from insights
      appointmentsCancelled: 0,
      missedOpportunities: 0,
      estimatedRevenue: 0,
    },
    callVolumePatterns,
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Filter calls by date range
 */
export function filterCallsByDateRange(calls: any[], dateRange?: DateRange): any[] {
  if (!dateRange || (!dateRange.start && !dateRange.end)) {
    return calls
  }
  
  return calls.filter((call) => {
    if (!call.call_time) return false
    
    const callDate = new Date(call.call_time)
    
    if (dateRange.start && callDate < new Date(dateRange.start)) {
      return false
    }
    
    if (dateRange.end && callDate > new Date(dateRange.end)) {
      return false
    }
    
    return true
  })
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): { change: number; percentage: number; direction: 'up' | 'down' | 'stable' } {
  if (previous === 0) {
    return {
      change: current,
      percentage: current > 0 ? 100 : 0,
      direction: current > 0 ? 'up' : 'stable',
    }
  }
  
  const change = current - previous
  const percentage = (change / previous) * 100
  
  let direction: 'up' | 'down' | 'stable' = 'stable'
  if (Math.abs(percentage) > 5) {
    direction = percentage > 0 ? 'up' : 'down'
  }
  
  return {
    change,
    percentage: Math.round(percentage * 10) / 10,
    direction,
  }
}


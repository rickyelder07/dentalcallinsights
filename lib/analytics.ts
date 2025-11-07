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

// ============================================
// CALLER ANALYTICS
// ============================================

/**
 * Compute caller overview analytics for all extensions
 */
export function computeCallerOverviewAnalytics(
  calls: any[],
  insights: any[]
): any[] {
  // Create insights lookup by call_id
  const insightsByCallId = new Map(insights.map((i) => [i.call_id, i]))
  
  // Group calls by source extension
  const callsByExtension = new Map<string, any[]>()
  
  calls.forEach((call) => {
    const extension = call.source_extension
    if (!extension) return
    
    if (!callsByExtension.has(extension)) {
      callsByExtension.set(extension, [])
    }
    callsByExtension.get(extension)!.push(call)
  })
  
  // Compute metrics for each extension
  const overviews: any[] = []
  
  callsByExtension.forEach((extensionCalls, extension) => {
    const sentimentDistribution = {
      positive: 0,
      negative: 0,
      neutral: 0,
      mixed: 0,
    }
    
    let totalSatisfactionScore = 0
    let satisfactionCount = 0
    
    extensionCalls.forEach((call) => {
      const insight = insightsByCallId.get(call.id)
      if (!insight) return
      
      // Count sentiments
      const sentiment = insight.overall_sentiment
      if (sentiment in sentimentDistribution) {
        sentimentDistribution[sentiment as keyof typeof sentimentDistribution]++
      }
      
      // Calculate satisfaction score
      const satisfaction = insight.patient_satisfaction
      let score = 50 // default neutral
      if (satisfaction === 'happy') score = 100
      else if (satisfaction === 'satisfied') score = 75
      else if (satisfaction === 'neutral') score = 50
      else if (satisfaction === 'frustrated') score = 25
      else if (satisfaction === 'angry') score = 0
      
      totalSatisfactionScore += score
      satisfactionCount++
    })
    
    const avgSatisfactionScore = satisfactionCount > 0 
      ? Math.round(totalSatisfactionScore / satisfactionCount) 
      : 50
    
    overviews.push({
      extension,
      totalCalls: extensionCalls.length,
      sentimentDistribution,
      satisfactionScore: avgSatisfactionScore,
    })
  })
  
  // Sort by extension number (numerically)
  overviews.sort((a, b) => {
    const numA = parseInt(a.extension) || 0
    const numB = parseInt(b.extension) || 0
    return numA - numB
  })
  
  return overviews
}

/**
 * Compute detailed performance metrics for a specific caller/extension
 */
export function computeCallerPerformanceMetrics(
  extension: string,
  calls: any[],
  insights: any[],
  dateRange?: { start?: string; end?: string }
): any {
  // Filter calls by extension
  let extensionCalls = calls.filter((c) => c.source_extension === extension)
  
  // Apply date filtering if provided
  if (dateRange?.start || dateRange?.end) {
    extensionCalls = extensionCalls.filter((call) => {
      if (!call.call_time) return false
      const callDate = new Date(call.call_time)
      
      if (dateRange.start && callDate < new Date(dateRange.start)) return false
      if (dateRange.end) {
        const endDate = new Date(dateRange.end)
        endDate.setHours(23, 59, 59, 999)
        if (callDate > endDate) return false
      }
      
      return true
    })
  }
  
  // Create insights lookup
  const insightsByCallId = new Map(insights.map((i) => [i.call_id, i]))
  
  // Calculate date range for avg calls per day
  const callTimes = extensionCalls
    .map((c) => c.call_time)
    .filter((t) => t)
    .map((t) => new Date(t))
    .sort((a, b) => a.getTime() - b.getTime())
  
  let avgCallsPerDay = 0
  if (callTimes.length > 1) {
    const daysDiff = Math.max(
      1,
      Math.ceil((callTimes[callTimes.length - 1].getTime() - callTimes[0].getTime()) / (1000 * 60 * 60 * 24))
    )
    avgCallsPerDay = Math.round((extensionCalls.length / daysDiff) * 10) / 10
  }
  
  // Call Volume
  const inboundCount = extensionCalls.filter((c) => c.call_direction === 'Inbound').length
  const outboundCount = extensionCalls.filter((c) => c.call_direction === 'Outbound').length
  
  // Sentiment Analysis
  const sentimentCounts = {
    positive: 0,
    negative: 0,
    neutral: 0,
    mixed: 0,
  }
  
  const satisfactionCounts = {
    happy: 0,
    satisfied: 0,
    neutral: 0,
    frustrated: 0,
    angry: 0,
    tooShort: 0,
  }
  
  let totalSatisfactionScore = 0
  let satisfactionCount = 0
  
  // Quality Metrics
  let professionalCalls = 0
  let needsImprovementCalls = 0
  const outcomeCounts: Record<string, number> = {}
  
  // Performance Indicators
  let callsWithRedFlags = 0
  const redFlagCategories: Record<string, number> = {}
  let callsWithActionItems = 0
  const actionPriorities: Record<string, number> = {}
  
  // Patient Impact
  let newPatientCalls = 0
  let appointmentsScheduled = 0
  let appointmentsCancelled = 0
  
  // Topics
  const topicCounts = new Map<string, number>()
  
  extensionCalls.forEach((call) => {
    const insight = insightsByCallId.get(call.id)
    
    // New patient flag
    if (call.is_new_patient) newPatientCalls++
    
    if (!insight) return
    
    // Sentiment
    const sentiment = insight.overall_sentiment
    if (sentiment in sentimentCounts) {
      sentimentCounts[sentiment as keyof typeof sentimentCounts]++
    }
    
    // Satisfaction
    const satisfaction = insight.patient_satisfaction
    if (satisfaction in satisfactionCounts) {
      satisfactionCounts[satisfaction as keyof typeof satisfactionCounts]++
    }
    
    let score = 50
    if (satisfaction === 'happy') score = 100
    else if (satisfaction === 'satisfied') score = 75
    else if (satisfaction === 'neutral') score = 50
    else if (satisfaction === 'frustrated') score = 25
    else if (satisfaction === 'angry') score = 0
    
    totalSatisfactionScore += score
    satisfactionCount++
    
    // Staff Performance
    if (insight.staff_performance === 'professional') professionalCalls++
    if (insight.staff_performance === 'needs_improvement') needsImprovementCalls++
    
    // Outcomes
    if (insight.call_outcome) {
      outcomeCounts[insight.call_outcome] = (outcomeCounts[insight.call_outcome] || 0) + 1
    }
    
    // Red Flags
    if (insight.red_flags && Array.isArray(insight.red_flags) && insight.red_flags.length > 0) {
      callsWithRedFlags++
      insight.red_flags.forEach((flag: any) => {
        if (flag.category) {
          redFlagCategories[flag.category] = (redFlagCategories[flag.category] || 0) + 1
        }
      })
    }
    
    // Action Items
    if (insight.action_items && Array.isArray(insight.action_items) && insight.action_items.length > 0) {
      callsWithActionItems++
      insight.action_items.forEach((item: any) => {
        if (item.priority) {
          actionPriorities[item.priority] = (actionPriorities[item.priority] || 0) + 1
        }
      })
    }
    
    // Appointments
    if (insight.appointment_scheduled) appointmentsScheduled++
    if (insight.appointment_cancelled) appointmentsCancelled++
    
    // Topics - extract from key points
    if (insight.summary_key_points && Array.isArray(insight.summary_key_points)) {
      insight.summary_key_points.forEach((point: string) => {
        // Simple topic extraction - first few words
        const topic = point.split(' ').slice(0, 4).join(' ')
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
      })
    }
  })
  
  // Calculate metrics
  const totalCalls = extensionCalls.length
  const totalWithSentiment = Object.values(sentimentCounts).reduce((sum, count) => sum + count, 0)
  const positivePercentage = totalWithSentiment > 0 
    ? Math.round((sentimentCounts.positive / totalWithSentiment) * 100) 
    : 0
  
  const avgSatisfactionScore = satisfactionCount > 0 
    ? Math.round(totalSatisfactionScore / satisfactionCount) 
    : 50
  
  // Calculate overall average duration from all calls
  const allDurations = calls
    .map((c) => c.call_duration_seconds)
    .filter((d) => d != null && d > 0)
  const overallAvgDuration = allDurations.length > 0
    ? Math.round(allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length)
    : 0
  
  const extensionDurations = extensionCalls
    .map((c) => c.call_duration_seconds)
    .filter((d) => d != null && d > 0)
  const avgCallDuration = extensionDurations.length > 0
    ? Math.round(extensionDurations.reduce((sum, d) => sum + d, 0) / extensionDurations.length)
    : 0
  
  const resolvedCount = outcomeCounts.resolved || 0
  const resolutionRate = totalCalls > 0 ? Math.round((resolvedCount / totalCalls) * 100) : 0
  
  // Build distribution arrays
  const distribution = Object.entries(sentimentCounts).map(([sentiment, count]) => ({
    sentiment: sentiment as any,
    count,
    percentage: totalWithSentiment > 0 ? Math.round((count / totalWithSentiment) * 100) : 0,
  }))
  
  const outcomes = Object.entries(outcomeCounts).map(([outcome, count]) => ({
    outcome: outcome as any,
    count,
    percentage: totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0,
  }))
  
  const redFlagCategoriesArray = Object.entries(redFlagCategories).map(([category, count]) => ({
    category,
    count,
  }))
  
  const actionPrioritiesArray = Object.entries(actionPriorities).map(([priority, count]) => ({
    priority,
    count,
  }))
  
  // Top topics
  const topTopics = Array.from(topicCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  
  // Call trends (group by date)
  const callTrendsByDate = new Map<string, any>()
  extensionCalls.forEach((call) => {
    if (!call.call_time) return
    const date = new Date(call.call_time).toISOString().split('T')[0]
    
    if (!callTrendsByDate.has(date)) {
      callTrendsByDate.set(date, {
        date,
        callCount: 0,
        avgDuration: 0,
        positiveCount: 0,
        negativeCount: 0,
        neutralCount: 0,
        inboundCount: 0,
        outboundCount: 0,
        totalDuration: 0,
      })
    }
    
    const trend = callTrendsByDate.get(date)!
    trend.callCount++
    trend.totalDuration += call.call_duration_seconds || 0
    
    if (call.call_direction === 'Inbound') trend.inboundCount++
    if (call.call_direction === 'Outbound') trend.outboundCount++
    
    const insight = insightsByCallId.get(call.id)
    if (insight) {
      if (insight.overall_sentiment === 'positive') trend.positiveCount++
      if (insight.overall_sentiment === 'negative') trend.negativeCount++
      if (insight.overall_sentiment === 'neutral') trend.neutralCount++
    }
  })
  
  const callTrends = Array.from(callTrendsByDate.values())
    .map((trend) => ({
      ...trend,
      avgDuration: trend.callCount > 0 ? trend.totalDuration / trend.callCount : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
  
  return {
    extension,
    callVolume: {
      totalCalls,
      avgCallsPerDay,
      inboundCount,
      outboundCount,
    },
    sentimentAnalysis: {
      distribution,
      avgSatisfactionScore,
      positivePercentage,
      patientSatisfactionBreakdown: satisfactionCounts,
    },
    qualityMetrics: {
      professionalCalls,
      needsImprovementCalls,
      resolutionRate,
      avgCallDuration,
      overallAvgDuration,
      outcomes,
    },
    performanceIndicators: {
      callsWithRedFlags,
      redFlagsPercentage: totalCalls > 0 ? Math.round((callsWithRedFlags / totalCalls) * 100) : 0,
      redFlagCategories: redFlagCategoriesArray,
      callsWithActionItems,
      actionItemsPercentage: totalCalls > 0 ? Math.round((callsWithActionItems / totalCalls) * 100) : 0,
      actionPriorities: actionPrioritiesArray,
    },
    patientImpact: {
      newPatientCalls,
      appointmentsScheduled,
      appointmentsCancelled,
      estimatedRevenue: appointmentsScheduled * 150, // $150 per appointment estimate
    },
    topTopics,
    callTrends,
  }
}

// ============================================
// CALL HIGHLIGHTS ANALYTICS
// ============================================

/**
 * Rank calls by performance score
 * 
 * WEIGHTED SCORING FORMULA FOR BEST PERFORMING CALLS:
 * - 40% Sentiment Score: positive=100pts, neutral=50pts, negative=0pts, mixed=25pts
 * - 30% Satisfaction Score: Direct score (0-100)
 * - 20% Duration Score: Normalized duration (longer is better, capped at 600 seconds)
 * - 10% Professional Bonus: +10pts if staff_performance is 'professional'
 * 
 * Final score is 0-100 scale
 */
export function rankCallsByPerformance(calls: any[], insights: any[]): any[] {
  const insightsByCallId = new Map(insights.map((i) => [i.call_id, i]))
  
  const rankedCalls = calls
    .map((call) => {
      const insight = insightsByCallId.get(call.id)
      if (!insight) return null
      
      // Calculate sentiment score (40% weight)
      let sentimentScore = 0
      if (insight.overall_sentiment === 'positive') sentimentScore = 100
      else if (insight.overall_sentiment === 'neutral') sentimentScore = 50
      else if (insight.overall_sentiment === 'mixed') sentimentScore = 25
      else sentimentScore = 0 // negative
      
      // Calculate satisfaction score (30% weight)
      let satisfactionScore = 50 // default
      const satisfaction = insight.patient_satisfaction
      if (satisfaction === 'happy') satisfactionScore = 100
      else if (satisfaction === 'satisfied') satisfactionScore = 75
      else if (satisfaction === 'neutral') satisfactionScore = 50
      else if (satisfaction === 'frustrated') satisfactionScore = 25
      else if (satisfaction === 'angry') satisfactionScore = 0
      
      // Calculate duration score (20% weight) - normalize to 0-100
      // Cap at 10 minutes (600 seconds) as "perfect" duration
      const duration = call.call_duration_seconds || 0
      const durationScore = Math.min((duration / 600) * 100, 100)
      
      // Professional bonus (10% weight)
      const professionalBonus = insight.staff_performance === 'professional' ? 10 : 0
      
      // Calculate weighted final score
      const finalScore = 
        (sentimentScore * 0.40) +
        (satisfactionScore * 0.30) +
        (durationScore * 0.20) +
        professionalBonus
      
      return {
        call,
        insights: insight,
        score: Math.round(finalScore),
        duration,
        sentiment: insight.overall_sentiment,
        satisfactionScore,
      }
    })
    .filter((item) => item !== null)
    .sort((a, b) => b.score - a.score)
  
  return rankedCalls
}

/**
 * Calculate extension performance score
 * 
 * WEIGHTED SCORING FORMULA FOR EXTENSION PERFORMANCE:
 * - 50% Sentiment Differential: (positive% - negative%) normalized to 0-100
 * - 30% Call Volume: Number of calls normalized to max in dataset
 * - 20% Satisfaction Score: Average satisfaction score (0-100)
 * 
 * Returns a score from 0-100 where higher is better
 */
export function calculateExtensionPerformanceScore(
  extension: string,
  allCalls: any[],
  allInsights: any[]
): any {
  // Filter calls for this extension
  const extensionCalls = allCalls.filter((c) => c.source_extension === extension)
  if (extensionCalls.length === 0) return null
  
  const insightsByCallId = new Map(allInsights.map((i) => [i.call_id, i]))
  
  // Calculate sentiment distribution
  const sentimentCounts = { positive: 0, negative: 0, neutral: 0, mixed: 0 }
  let totalSatisfactionScore = 0
  let satisfactionCount = 0
  
  extensionCalls.forEach((call) => {
    const insight = insightsByCallId.get(call.id)
    if (!insight) return
    
    // Count sentiment
    const sentiment = insight.overall_sentiment
    if (sentiment in sentimentCounts) {
      sentimentCounts[sentiment as keyof typeof sentimentCounts]++
    }
    
    // Sum satisfaction scores
    const satisfaction = insight.patient_satisfaction
    let score = 50
    if (satisfaction === 'happy') score = 100
    else if (satisfaction === 'satisfied') score = 75
    else if (satisfaction === 'neutral') score = 50
    else if (satisfaction === 'frustrated') score = 25
    else if (satisfaction === 'angry') score = 0
    
    totalSatisfactionScore += score
    satisfactionCount++
  })
  
  const totalCalls = extensionCalls.length
  const avgSatisfactionScore = satisfactionCount > 0 ? totalSatisfactionScore / satisfactionCount : 50
  
  // Calculate sentiment percentages
  const positivePercent = (sentimentCounts.positive / totalCalls) * 100
  const negativePercent = (sentimentCounts.negative / totalCalls) * 100
  
  // Sentiment differential (-100 to +100, normalize to 0-100)
  const sentimentDifferential = positivePercent - negativePercent
  const sentimentScore = ((sentimentDifferential + 100) / 2) // Convert -100...100 to 0...100
  
  // Find max calls in dataset for normalization
  const extensionGroups = new Map<string, number>()
  allCalls.forEach((call) => {
    if (!call.source_extension) return
    extensionGroups.set(
      call.source_extension,
      (extensionGroups.get(call.source_extension) || 0) + 1
    )
  })
  const maxCalls = Math.max(...Array.from(extensionGroups.values()))
  const callVolumeScore = (totalCalls / maxCalls) * 100
  
  // Calculate weighted performance score
  const performanceScore = 
    (sentimentScore * 0.50) +
    (callVolumeScore * 0.30) +
    (avgSatisfactionScore * 0.20)
  
  return {
    extension,
    totalCalls,
    performanceScore: Math.round(performanceScore),
    sentimentDistribution: sentimentCounts,
    avgSatisfactionScore: Math.round(avgSatisfactionScore),
    positivePercent: Math.round(positivePercent),
    negativePercent: Math.round(negativePercent),
  }
}

/**
 * Find highest performing extension
 */
export function findHighestPerformer(calls: any[], insights: any[]): any {
  const extensions = Array.from(new Set(calls.map((c) => c.source_extension).filter(Boolean)))
  
  const performers = extensions
    .map((ext) => calculateExtensionPerformanceScore(ext as string, calls, insights))
    .filter((p) => p !== null)
  
  if (performers.length === 0) return null
  
  return performers.reduce((best, current) => 
    current.performanceScore > best.performanceScore ? current : best
  )
}

/**
 * Find lowest performing extension
 */
export function findLowestPerformer(calls: any[], insights: any[]): any {
  const extensions = Array.from(new Set(calls.map((c) => c.source_extension).filter(Boolean)))
  
  const performers = extensions
    .map((ext) => calculateExtensionPerformanceScore(ext as string, calls, insights))
    .filter((p) => p !== null)
  
  if (performers.length === 0) return null
  
  return performers.reduce((worst, current) => 
    current.performanceScore < worst.performanceScore ? current : worst
  )
}

/**
 * Rank new patient calls (good or poor)
 * 
 * GOOD NEW PATIENT CALLS SCORING:
 * - 40% Positive Sentiment: positive=100pts, neutral=50pts, others=0pts
 * - 30% Satisfaction Score: Direct score (0-100)
 * - 20% Duration: Normalized duration (longer is better)
 * - 10% No Red Flags Bonus: +10pts if no red flags
 * 
 * POOR NEW PATIENT CALLS SCORING:
 * - 50% Negative Sentiment: negative=100pts, others=0pts
 * - 30% Low Satisfaction: (100 - satisfactionScore)
 * - 20% Has Red Flags: 20pts if has red flags, 0 otherwise
 */
export function rankNewPatientCalls(
  calls: any[],
  insights: any[],
  direction: 'good' | 'poor'
): any[] {
  const insightsByCallId = new Map(insights.map((i) => [i.call_id, i]))
  
  // Filter for new patient calls only
  const newPatientCalls = calls.filter((call) => call.is_new_patient === true)
  
  const rankedCalls = newPatientCalls
    .map((call) => {
      const insight = insightsByCallId.get(call.id)
      if (!insight) return null
      
      let score = 0
      
      if (direction === 'good') {
        // Good calls scoring
        let sentimentScore = 0
        if (insight.overall_sentiment === 'positive') sentimentScore = 100
        else if (insight.overall_sentiment === 'neutral') sentimentScore = 50
        
        let satisfactionScore = 50
        const satisfaction = insight.patient_satisfaction
        if (satisfaction === 'happy') satisfactionScore = 100
        else if (satisfaction === 'satisfied') satisfactionScore = 75
        else if (satisfaction === 'neutral') satisfactionScore = 50
        else if (satisfaction === 'frustrated') satisfactionScore = 25
        else if (satisfaction === 'angry') satisfactionScore = 0
        
        const duration = call.call_duration_seconds || 0
        const durationScore = Math.min((duration / 600) * 100, 100)
        
        const hasRedFlags = insight.red_flags && Array.isArray(insight.red_flags) && insight.red_flags.length > 0
        const noRedFlagsBonus = hasRedFlags ? 0 : 10
        
        score = 
          (sentimentScore * 0.40) +
          (satisfactionScore * 0.30) +
          (durationScore * 0.20) +
          noRedFlagsBonus
      } else {
        // Poor calls scoring (inverse)
        let sentimentScore = insight.overall_sentiment === 'negative' ? 100 : 0
        
        let satisfactionScore = 50
        const satisfaction = insight.patient_satisfaction
        if (satisfaction === 'happy') satisfactionScore = 100
        else if (satisfaction === 'satisfied') satisfactionScore = 75
        else if (satisfaction === 'neutral') satisfactionScore = 50
        else if (satisfaction === 'frustrated') satisfactionScore = 25
        else if (satisfaction === 'angry') satisfactionScore = 0
        const lowSatisfactionScore = 100 - satisfactionScore
        
        const hasRedFlags = insight.red_flags && Array.isArray(insight.red_flags) && insight.red_flags.length > 0
        const redFlagScore = hasRedFlags ? 20 : 0
        
        score = 
          (sentimentScore * 0.50) +
          (lowSatisfactionScore * 0.30) +
          redFlagScore
      }
      
      return {
        call,
        insights: insight,
        score: Math.round(score),
        duration: call.call_duration_seconds || 0,
        sentiment: insight.overall_sentiment,
        satisfactionScore: 50,
      }
    })
    .filter((item) => item !== null)
    .sort((a, b) => b.score - a.score)
  
  return rankedCalls
}


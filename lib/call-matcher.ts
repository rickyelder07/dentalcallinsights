/**
 * Call Matching Logic
 * 
 * Handles matching uploaded call recordings with CSV call data
 * Uses multiple matching strategies: time proximity, phone numbers, duration
 */

import { CsvCallData, CallMatch, CallMatchingOptions } from '@/types/csv';

export class CallMatcher {
  /**
   * Find potential CSV matches for a call recording
   */
  public static async findMatches(
    _userId: string,
    _callTime: Date,
    _phoneNumber?: string,
    _duration?: number,
    _options: CallMatchingOptions = {
      time_tolerance_minutes: 5,
      phone_number_match: true,
      duration_tolerance_seconds: 30,
      require_disposition_match: false
    }
  ): Promise<CallMatch[]> {
    // This would typically call a Supabase function
    // For now, return mock data structure
    return [];
  }

  /**
   * Calculate match score between a call recording and CSV data
   */
  public static calculateMatchScore(
    recordingTime: Date,
    csvTime: Date,
    recordingPhone?: string,
    csvSourcePhone?: string,
    csvDestinationPhone?: string,
    recordingDuration?: number,
    csvDuration?: number,
    options?: CallMatchingOptions
  ): number {
    // Use default options if not provided
    const matchOptions: CallMatchingOptions = options || {
      time_tolerance_minutes: 5,
      phone_number_match: true,
      duration_tolerance_seconds: 30,
      require_disposition_match: false,
    };

    let score = 0;
    let factors = 0;

    // Time proximity factor (0-1, higher is better)
    const timeDiffMinutes = Math.abs(recordingTime.getTime() - csvTime.getTime()) / (1000 * 60);
    const timeScore = Math.max(0, 1 - (timeDiffMinutes / matchOptions.time_tolerance_minutes));
    score += timeScore * 0.4; // 40% weight
    factors += 0.4;

    // Phone number match factor
    if (matchOptions.phone_number_match && recordingPhone && (csvSourcePhone || csvDestinationPhone)) {
      const phoneMatch = recordingPhone === csvSourcePhone || recordingPhone === csvDestinationPhone;
      if (phoneMatch) {
        score += 0.4; // 40% weight
      }
      factors += 0.4;
    }

    // Duration match factor
    if (recordingDuration && csvDuration) {
      const durationDiff = Math.abs(recordingDuration - csvDuration);
      const durationScore = Math.max(0, 1 - (durationDiff / matchOptions.duration_tolerance_seconds));
      score += durationScore * 0.2; // 20% weight
      factors += 0.2;
    }

    // Normalize score
    return factors > 0 ? score / factors : 0;
  }

  /**
   * Match calls by time proximity
   */
  public static matchByTime(
    csvData: CsvCallData[],
    callTime: Date,
    toleranceMinutes: number = 5
  ): CsvCallData[] {
    return csvData.filter(csv => {
      const csvTime = new Date(csv.call_time);
      const timeDiffMinutes = Math.abs(callTime.getTime() - csvTime.getTime()) / (1000 * 60);
      return timeDiffMinutes <= toleranceMinutes;
    }).sort((a, b) => {
      const timeDiffA = Math.abs(new Date(a.call_time).getTime() - callTime.getTime());
      const timeDiffB = Math.abs(new Date(b.call_time).getTime() - callTime.getTime());
      return timeDiffA - timeDiffB;
    });
  }

  /**
   * Match calls by phone number
   */
  public static matchByPhone(
    csvData: CsvCallData[],
    phoneNumber: string
  ): CsvCallData[] {
    return csvData.filter(csv => 
      csv.source_number === phoneNumber || csv.destination_number === phoneNumber
    );
  }

  /**
   * Match calls by duration similarity
   */
  public static matchByDuration(
    csvData: CsvCallData[],
    duration: number,
    toleranceSeconds: number = 30
  ): CsvCallData[] {
    return csvData.filter(csv => {
      if (!csv.call_duration_seconds) return false;
      const durationDiff = Math.abs(csv.call_duration_seconds - duration);
      return durationDiff <= toleranceSeconds;
    });
  }

  /**
   * Get the best match from a list of potential matches
   */
  public static getBestMatch(
    potentialMatches: CallMatch[],
    minScore: number = 0.7
  ): CallMatch | null {
    const validMatches = potentialMatches.filter(match => match.match_score >= minScore);
    if (validMatches.length === 0) return null;

    return validMatches.reduce((best, current) => 
      current.match_score > best.match_score ? current : best
    );
  }

  /**
   * Suggest manual matches for review
   */
  public static getManualMatchSuggestions(
    csvData: CsvCallData[],
    callTime: Date,
    phoneNumber?: string
  ): CsvCallData[] {
    const suggestions: CsvCallData[] = [];

    // Find calls within 30 minutes
    const timeMatches = this.matchByTime(csvData, callTime, 30);
    suggestions.push(...timeMatches);

    // Find calls with matching phone numbers
    if (phoneNumber) {
      const phoneMatches = this.matchByPhone(csvData, phoneNumber);
      suggestions.push(...phoneMatches);
    }

    // Remove duplicates and sort by time proximity
    const uniqueSuggestions = suggestions.filter((csv, index, self) => 
      index === self.findIndex(s => s.id === csv.id)
    );

    return uniqueSuggestions.sort((a, b) => {
      const timeDiffA = Math.abs(new Date(a.call_time).getTime() - callTime.getTime());
      const timeDiffB = Math.abs(new Date(b.call_time).getTime() - callTime.getTime());
      return timeDiffA - timeDiffB;
    });
  }

  /**
   * Validate match quality
   */
  public static validateMatch(match: CallMatch): {
    isHighQuality: boolean;
    isMediumQuality: boolean;
    isLowQuality: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let isHighQuality = true;
    let isMediumQuality = true;

    // Check time proximity
    if (Math.abs(match.time_diff_minutes) > 2) {
      reasons.push('Time difference is significant');
      isHighQuality = false;
    } else if (Math.abs(match.time_diff_minutes) > 5) {
      isMediumQuality = false;
    }

    // Check match score
    if (match.match_score < 0.9) {
      reasons.push('Match score is below 90%');
      isHighQuality = false;
    } else if (match.match_score < 0.7) {
      isMediumQuality = false;
    }

    // Check for required data
    if (!match.source_number && !match.destination_number) {
      reasons.push('No phone number data available');
      isHighQuality = false;
    }

    return {
      isHighQuality,
      isMediumQuality,
      isLowQuality: !isMediumQuality,
      reasons
    };
  }
}

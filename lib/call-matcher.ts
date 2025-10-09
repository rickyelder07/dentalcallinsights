/**
 * Call Matcher Utility
 * Handles matching audio recordings with CSV call data
 * Provides scoring algorithms for call matching
 */

export interface MatchingOptions {
  time_tolerance_minutes: number;
  phone_number_match: boolean;
  duration_tolerance_seconds: number;
  require_disposition_match: boolean;
}

export interface MatchScore {
  score: number;
  reasons: string[];
}

export class CallMatcher {
  /**
   * Calculate match score between audio call and CSV record
   */
  static calculateMatchScore(
    audioCallTime: Date,
    csvCallTime: Date,
    audioPhoneNumber?: string,
    csvSourceNumber?: string,
    csvDestinationNumber?: string,
    audioDuration?: number,
    csvDuration?: number,
    options: MatchingOptions = {
      time_tolerance_minutes: 5,
      phone_number_match: true,
      duration_tolerance_seconds: 30,
      require_disposition_match: false,
    }
  ): number {
    let score = 0;
    const reasons: string[] = [];

    // Time matching (most important factor)
    const timeDiffMinutes = Math.abs(audioCallTime.getTime() - csvCallTime.getTime()) / (1000 * 60);
    
    if (timeDiffMinutes === 0) {
      score += 50;
      reasons.push('Exact time match');
    } else if (timeDiffMinutes <= 1) {
      score += 40;
      reasons.push('Very close time match');
    } else if (timeDiffMinutes <= 2) {
      score += 30;
      reasons.push('Close time match');
    } else if (timeDiffMinutes <= options.time_tolerance_minutes) {
      score += 20;
      reasons.push('Within time tolerance');
    } else {
      score -= 10; // Penalty for being outside tolerance
    }

    // Phone number matching
    if (options.phone_number_match && audioPhoneNumber) {
      const phoneMatch = 
        audioPhoneNumber === csvSourceNumber || 
        audioPhoneNumber === csvDestinationNumber;
      
      if (phoneMatch) {
        score += 30;
        reasons.push('Phone number match');
      } else {
        score -= 5; // Small penalty for no phone match
      }
    }

    // Duration matching
    if (audioDuration && csvDuration) {
      const durationDiff = Math.abs(audioDuration - csvDuration);
      
      if (durationDiff === 0) {
        score += 20;
        reasons.push('Exact duration match');
      } else if (durationDiff <= 5) {
        score += 15;
        reasons.push('Very close duration');
      } else if (durationDiff <= 15) {
        score += 10;
        reasons.push('Close duration');
      } else if (durationDiff <= options.duration_tolerance_seconds) {
        score += 5;
        reasons.push('Within duration tolerance');
      } else {
        score -= 5; // Penalty for duration mismatch
      }
    }

    // Normalize score to 0-100 range
    const normalizedScore = Math.max(0, Math.min(100, score));

    return normalizedScore;
  }

  /**
   * Find best matches for a call
   */
  static findBestMatches(
    audioCall: {
      callTime: Date;
      phoneNumber?: string;
      duration?: number;
    },
    csvCalls: Array<{
      id: string;
      call_time: string;
      source_number?: string;
      destination_number?: string;
      call_duration_seconds?: number;
      disposition?: string;
    }>,
    options: MatchingOptions = {
      time_tolerance_minutes: 5,
      phone_number_match: true,
      duration_tolerance_seconds: 30,
      require_disposition_match: false,
    }
  ): Array<{
    csvCall: any;
    score: number;
    reasons: string[];
  }> {
    const matches = csvCalls.map(csvCall => {
      const score = this.calculateMatchScore(
        audioCall.callTime,
        new Date(csvCall.call_time),
        audioCall.phoneNumber,
        csvCall.source_number,
        csvCall.destination_number,
        audioCall.duration,
        csvCall.call_duration_seconds,
        options
      );

      return {
        csvCall,
        score,
        reasons: [], // Reasons would be populated in calculateMatchScore
      };
    });

    // Sort by score (highest first)
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Check if a match is considered valid
   */
  static isValidMatch(score: number, threshold: number = 60): boolean {
    return score >= threshold;
  }

  /**
   * Get match confidence level
   */
  static getMatchConfidence(score: number): 'high' | 'medium' | 'low' | 'none' {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'low';
    return 'none';
  }
}

/**
 * Call Matcher Component
 * Interface for matching audio recordings with CSV call data
 */

'use client';

import React, { useState } from 'react';
import type { CallMatch } from '@/types/csv';

interface CallMatcherProps {
  matches: CallMatch[];
  onSelectMatch: (match: CallMatch) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export default function CallMatcher({
  matches,
  onSelectMatch,
  onSkip,
  isLoading = false,
}: CallMatcherProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const getMatchQualityColor = (score: number): string => {
    if (score >= 0.9) return 'text-green-700 bg-green-100 border-green-300';
    if (score >= 0.7) return 'text-yellow-700 bg-yellow-100 border-yellow-300';
    return 'text-orange-700 bg-orange-100 border-orange-300';
  };

  const getMatchQualityLabel = (score: number): string => {
    if (score >= 0.9) return 'High Confidence';
    if (score >= 0.7) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const formatTimeDiff = (minutes: number): string => {
    const absMinutes = Math.abs(minutes);
    if (absMinutes < 1) {
      return 'Less than 1 minute';
    } else if (absMinutes < 60) {
      return `${Math.round(absMinutes)} minute${Math.round(absMinutes) !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(absMinutes / 60);
      const mins = Math.round(absMinutes % 60);
      return `${hours}h ${mins}m`;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSelectMatch = (match: CallMatch) => {
    setSelectedMatchId(match.csv_id);
    onSelectMatch(match);
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="flex items-center justify-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="ml-3 text-gray-600">Finding potential matches...</p>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No matches found
          </h3>
              <p className="text-sm text-gray-500 mb-6">
                We could not find any matching CSV records for this recording.
              </p>
          <button
            onClick={onSkip}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Continue without matching
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Potential matches found
        </h3>
        <p className="text-sm text-gray-500">
          Select the best match or continue without matching
        </p>
      </div>

      {/* Match list */}
      <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
        {matches.map((match) => (
          <div
            key={match.csv_id}
            onClick={() => handleSelectMatch(match)}
            className={`
              border-2 rounded-lg p-4 cursor-pointer transition-all
              ${
                selectedMatchId === match.csv_id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            {/* Match header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${getMatchQualityColor(
                      match.match_score
                    )}`}
                  >
                    {getMatchQualityLabel(match.match_score)} ({Math.round(match.match_score * 100)}%)
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      match.call_direction === 'Inbound'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {match.call_direction}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {formatDate(match.call_time)}
                </p>
              </div>

              {/* Selection indicator */}
              {selectedMatchId === match.csv_id && (
                <svg
                  className="w-6 h-6 text-blue-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>

            {/* Match details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {match.source_number && (
                <div>
                  <p className="text-gray-500 text-xs">Source</p>
                  <p className="text-gray-900 font-medium">{match.source_number}</p>
                  {match.source_name && (
                    <p className="text-gray-600 text-xs">{match.source_name}</p>
                  )}
                </div>
              )}

              {match.destination_number && (
                <div>
                  <p className="text-gray-500 text-xs">Destination</p>
                  <p className="text-gray-900 font-medium">{match.destination_number}</p>
                </div>
              )}

              {match.call_duration_seconds !== undefined && (
                <div>
                  <p className="text-gray-500 text-xs">Duration</p>
                  <p className="text-gray-900 font-medium">
                    {Math.floor(match.call_duration_seconds / 60)}m{' '}
                    {match.call_duration_seconds % 60}s
                  </p>
                </div>
              )}

              {match.disposition && (
                <div>
                  <p className="text-gray-500 text-xs">Disposition</p>
                  <p className="text-gray-900 font-medium capitalize">
                    {match.disposition}
                  </p>
                </div>
              )}
            </div>

            {/* Time difference */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Time difference: {formatTimeDiff(match.time_diff_minutes)}
                {match.time_diff_minutes > 0 ? ' earlier' : ' later'}
              </p>
            </div>

            {/* Match reasons */}
            {match.reasons && match.reasons.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Match factors:</p>
                <div className="flex flex-wrap gap-1">
                  {match.reasons.map((reason, index) => (
                    <span
                      key={index}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            if (selectedMatchId) {
              const match = matches.find((m) => m.csv_id === selectedMatchId);
              if (match) {
                onSelectMatch(match);
              }
            }
          }}
          disabled={!selectedMatchId}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Use selected match
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Skip
        </button>
      </div>
    </div>
  );
}


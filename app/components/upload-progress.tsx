/**
 * Upload Progress Component
 * Displays real-time upload progress with speed and time remaining
 */

'use client';

import React from 'react';
import type { UploadProgress, UploadStatus } from '@/types/upload';
import { formatFileSize } from '@/lib/file-validation';
import { formatUploadSpeed, formatTimeRemaining } from '@/lib/upload';

interface UploadProgressProps {
  progress: UploadProgress;
  onCancel?: () => void;
}

export default function UploadProgressComponent({
  progress,
  onCancel,
}: UploadProgressProps) {
  const getStatusColor = (status: UploadStatus): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'uploading':
      case 'processing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: UploadStatus): string => {
    switch (status) {
      case 'idle':
        return 'Ready';
      case 'validating':
        return 'Validating...';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const showCancelButton = ['validating', 'uploading'].includes(progress.status);
  const showDetails = ['uploading', 'processing'].includes(progress.status);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* File name and status */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {progress.fileName}
          </p>
          <p className="text-xs text-gray-500">{formatFileSize(progress.fileSize)}</p>
        </div>
        <div className="ml-4 flex items-center">
          <span
            className={`text-xs font-medium px-2 py-1 rounded ${
              progress.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : progress.status === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {getStatusText(progress.status)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(
              progress.status
            )}`}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Progress details */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{Math.round(progress.percentage)}%</span>
        {showDetails && progress.uploadSpeed && progress.estimatedTimeRemaining && (
          <div className="flex items-center gap-3">
            <span>{formatUploadSpeed(progress.uploadSpeed)}</span>
            <span>•</span>
            <span>{formatTimeRemaining(progress.estimatedTimeRemaining)} remaining</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {progress.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {progress.error}
        </div>
      )}

      {/* Cancel button */}
      {showCancelButton && onCancel && (
        <button
          onClick={onCancel}
          className="mt-2 w-full text-xs text-red-600 hover:text-red-800 hover:underline"
        >
          Cancel upload
        </button>
      )}

      {/* Success message */}
      {progress.status === 'completed' && (
        <div className="mt-2 flex items-center text-xs text-green-700">
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Upload completed successfully
        </div>
      )}
    </div>
  );
}


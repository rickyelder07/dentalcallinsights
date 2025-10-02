/**
 * Audio Uploader Component
 * Drag-and-drop audio file uploader with validation and progress tracking
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { validateAudioFile, formatFileSize } from '@/lib/file-validation';
import type { FileValidationResult } from '@/types/upload';

interface AudioUploaderProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string[];
  maxSize?: number;
  disabled?: boolean;
}

export default function AudioUploader({
  onFileSelect,
  acceptedFormats = ['.mp3', '.wav', '.m4a', '.aac'],
  maxSize = 100 * 1024 * 1024, // 100MB
  disabled = false,
}: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<FileValidationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileValidation = (file: File) => {
    const result = validateAudioFile(file);
    setValidation(result);

    if (result.valid) {
      setSelectedFile(file);
      onFileSelect(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileValidation(files[0]);
      }
    },
    [disabled]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileValidation(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setValidation(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all duration-200
            ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 bg-white'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />

          <div className="flex flex-col items-center">
            {/* Upload icon */}
            <svg
              className="w-16 h-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>

            <p className="text-lg font-medium text-gray-700 mb-2">
              {isDragging ? 'Drop audio file here' : 'Drag & drop audio file here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">or click to browse</p>

            <div className="text-xs text-gray-400">
              <p>Supported formats: {acceptedFormats.join(', ')}</p>
              <p>Maximum size: {formatFileSize(maxSize)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {/* Selected file info */}
          <div className="flex items-start justify-between">
            <div className="flex items-start flex-1 min-w-0">
              {/* Audio icon */}
              <svg
                className="w-10 h-10 text-blue-500 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>

                {/* Validation status */}
                {validation?.valid && (
                  <div className="mt-2 flex items-center text-xs text-green-700">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    File validated successfully
                  </div>
                )}

                {/* Validation warnings */}
                {validation?.warnings && validation.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <div key={index} className="flex items-start text-xs text-yellow-700">
                        <svg
                          className="w-4 h-4 mr-1 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {warning}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Remove button */}
            <button
              onClick={handleRemoveFile}
              className="ml-4 text-gray-400 hover:text-red-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Validation errors */}
      {validation && !validation.valid && validation.errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm font-medium text-red-800 mb-2">Validation errors:</p>
          <ul className="list-disc list-inside space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


/**
 * CSV Uploader Component
 * Upload and validate CSV call data files
 */

'use client';

import React, { useState, useRef } from 'react';
import { validateCsvFile, formatFileSize } from '@/lib/file-validation';
import { CsvParser } from '@/lib/csv-parser';
import type { FileValidationResult } from '@/types/upload';
import type { CsvValidationResult } from '@/types/csv';

interface CsvUploaderProps {
  onCsvParsed: (csvContent: string, validation: CsvValidationResult) => void;
  disabled?: boolean;
}

export default function CsvUploader({ onCsvParsed, disabled = false }: CsvUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<FileValidationResult | null>(null);
  const [csvValidation, setCsvValidation] = useState<CsvValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type and size
    const fileValidation = validateCsvFile(file);
    setValidation(fileValidation);

    if (!fileValidation.valid) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);

    try {
      // Read and parse CSV
      const csvContent = await file.text();
      const csvValidationResult = CsvParser.parseCsvFile(csvContent);
      setCsvValidation(csvValidationResult);

      if (csvValidationResult.valid || csvValidationResult.errors.length === 0) {
        onCsvParsed(csvContent, csvValidationResult);
      }
    } catch (error) {
      console.error('CSV parsing error:', error);
      setCsvValidation({
        valid: false,
        errors: [
          {
            row: 0,
            column: 'file',
            message:
              error instanceof Error ? error.message : 'Failed to parse CSV file',
          },
        ],
        warnings: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
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
    setCsvValidation(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onClick={handleClick}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed border-gray-200' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />

          <div className="flex flex-col items-center">
            {/* CSV icon */}
            <svg
              className="w-12 h-12 text-gray-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>

            <p className="text-base font-medium text-gray-700 mb-1">
              Upload CSV call data
            </p>
            <p className="text-xs text-gray-500">
              CSV file with call metadata • Max 10MB
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {/* Selected file info */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start flex-1 min-w-0">
              {/* CSV icon */}
              <svg
                className="w-8 h-8 text-green-500 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
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

          {/* Processing state */}
          {isProcessing && (
            <div className="flex items-center text-sm text-blue-600">
              <svg
                className="animate-spin h-4 w-4 mr-2"
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
              Processing CSV file...
            </div>
          )}

          {/* CSV Validation Results */}
          {csvValidation && !isProcessing && (
            <div className="mt-3 space-y-3">
              {/* Success message */}
              {csvValidation.valid && (
                <div className="flex items-start p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  <svg
                    className="w-5 h-5 mr-2 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="font-medium">CSV validated successfully</p>
                    {csvValidation.rowCount && (
                      <p className="text-xs mt-1">
                        {csvValidation.rowCount} rows ready to process
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Errors */}
              {csvValidation.errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    Validation errors ({csvValidation.errors.length}):
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {csvValidation.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-xs text-red-700">
                        Row {error.row}, {error.column}: {error.message}
                        {error.value && (
                          <span className="text-red-600 font-mono ml-1">
                            ({error.value})
                          </span>
                        )}
                      </div>
                    ))}
                    {csvValidation.errors.length > 10 && (
                      <p className="text-xs text-red-600 font-medium mt-2">
                        ...and {csvValidation.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {csvValidation.warnings.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    Warnings ({csvValidation.warnings.length}):
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {csvValidation.warnings.slice(0, 5).map((warning, index) => (
                      <div key={index} className="text-xs text-yellow-700">
                        Row {warning.row}, {warning.column}: {warning.message}
                      </div>
                    ))}
                    {csvValidation.warnings.length > 5 && (
                      <p className="text-xs text-yellow-600 font-medium mt-2">
                        ...and {csvValidation.warnings.length - 5} more warnings
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File validation errors */}
          {validation && !validation.valid && validation.errors.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-medium text-red-800 mb-2">File validation errors:</p>
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
      )}
    </div>
  );
}


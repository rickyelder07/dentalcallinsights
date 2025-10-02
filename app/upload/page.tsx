/**
 * Upload Page
 * Comprehensive interface for uploading MP3 files and CSV call data
 * Supports drag-and-drop, progress tracking, and call matching
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AudioUploader from '@/app/components/audio-uploader';
import CsvUploader from '@/app/components/csv-uploader';
import MetadataForm from '@/app/components/metadata-form';
import UploadProgressComponent from '@/app/components/upload-progress';
import CallMatcher from '@/app/components/call-matcher';
import type { CallMetadata, UploadProgress } from '@/types/upload';
import type { CsvValidationResult, CallMatch } from '@/types/csv';

type UploadStep = 'select-audio' | 'add-metadata' | 'upload-csv' | 'match-calls' | 'uploading' | 'complete';

export default function UploadPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<UploadStep>('select-audio');
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<CallMetadata>({});
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [potentialMatches, setPotentialMatches] = useState<CallMatch[]>([]);
  const [csvUploaded, setCsvUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedCallId, setUploadedCallId] = useState<string | null>(null);

  // Handle audio file selection
  const handleAudioFileSelect = (file: File) => {
    setSelectedAudioFile(file);
    setError(null);
  };

  // Handle metadata form submission
  const handleMetadataSubmit = async (formMetadata: CallMetadata) => {
    setMetadata(formMetadata);
    setCurrentStep('uploading');
    setError(null);

    try {
      // Combine date and time into ISO string if both provided
      let callDateTime = null;
      if (formMetadata.call_date && formMetadata.call_time) {
        callDateTime = `${formMetadata.call_date}T${formMetadata.call_time}:00`;
      } else if (formMetadata.call_date) {
        callDateTime = `${formMetadata.call_date}T12:00:00`;
      }

      const enrichedMetadata = {
        ...formMetadata,
        call_datetime: callDateTime,
      };

      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', selectedAudioFile!);
      formData.append('metadata', JSON.stringify(enrichedMetadata));

      // Upload file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadedCallId(result.callId);

      // Try to find matches if we have date/time and CSV data is already uploaded
      if (csvUploaded && callDateTime) {
        await findMatchesForCall(result.callId, callDateTime, formMetadata.duration);
      } else {
        setCurrentStep('complete');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setCurrentStep('add-metadata');
    }
  };

  // Handle CSV upload
  const handleCsvParsed = async (csvContent: string, validation: CsvValidationResult) => {
    if (validation.valid) {
      try {
        // Create a File object from CSV content
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        const csvFile = new File([csvBlob], 'call_data.csv', { type: 'text/csv' });

        const formData = new FormData();
        formData.append('file', csvFile);

        const response = await fetch('/api/csv-upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'CSV upload failed');
        }

        setCsvUploaded(true);
        
        // If we have an uploaded call with date/time, try to find matches
        if (uploadedCallId && (metadata.call_date || metadata.call_time)) {
          const callDateTime = metadata.call_date && metadata.call_time
            ? `${metadata.call_date}T${metadata.call_time}:00`
            : metadata.call_date
            ? `${metadata.call_date}T12:00:00`
            : null;
          
          if (callDateTime) {
            await findMatchesForCall(uploadedCallId, callDateTime, metadata.duration);
          }
        }
      } catch (err) {
        console.error('CSV upload error:', err);
        setError(err instanceof Error ? err.message : 'CSV upload failed');
      }
    }
  };

  // Find matches for uploaded call based on date/time and duration
  const findMatchesForCall = async (callId: string, callDateTime: string, duration?: number) => {
    try {
      const response = await fetch('/api/match-calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callId,
          callTime: callDateTime,
          phoneNumber: metadata.phone_number,
          duration: duration || undefined,
          options: {
            time_tolerance_minutes: 5,
            phone_number_match: true,
            duration_tolerance_seconds: 5, // Tighter tolerance - within 5 seconds
            require_disposition_match: false,
          },
        }),
      });

      const result = await response.json();

      if (response.ok && result.matches && result.matches.length > 0) {
        setPotentialMatches(result.matches);
        setCurrentStep('match-calls');
      } else {
        // No matches found, proceed to complete
        setCurrentStep('complete');
      }
    } catch (err) {
      console.error('Match finding error:', err);
      // Don't show error - matching is optional, proceed to complete
      setCurrentStep('complete');
    }
  };

  // Handle match selection
  const handleMatchSelect = async (match: CallMatch) => {
    if (!uploadedCallId) return;

    try {
      const response = await fetch('/api/match-calls', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callId: uploadedCallId,
          csvCallId: match.csv_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to link call with CSV data');
      }

      setCurrentStep('complete');
    } catch (err) {
      console.error('Match linking error:', err);
      setError(err instanceof Error ? err.message : 'Failed to link call');
    }
  };

  // Handle skip matching
  const handleSkipMatching = () => {
    setCurrentStep('complete');
  };

  // Reset and start over
  const handleReset = () => {
    setCurrentStep('select-audio');
    setSelectedAudioFile(null);
    setMetadata({});
    setUploadProgress(null);
    setPotentialMatches([]);
    setCsvUploaded(false);
    setError(null);
    setUploadedCallId(null);
  };

  // Navigate to next step
  const handleNext = () => {
    if (currentStep === 'select-audio' && selectedAudioFile) {
      setCurrentStep('add-metadata');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Upload Call Recording
        </h1>
        <p className="text-gray-600">
          Upload audio files and CSV call data for transcription and analysis
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['Audio', 'Metadata', 'Upload', 'Complete'].map((label, index) => {
            const stepOrder = ['select-audio', 'add-metadata', 'uploading', 'complete'];
            const currentIndex = stepOrder.indexOf(currentStep);
            const isActive = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-medium
                      ${isCurrent ? 'bg-blue-600 text-white' : isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}
                    `}
                  >
                    {isActive && !isCurrent ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${isCurrent ? 'text-blue-600' : isActive ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    {label}
                  </span>
                </div>
                {index < 3 && (
                  <div
                    className={`flex-1 h-1 mx-4 ${isActive ? 'bg-green-500' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Upload Flow */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Select Audio File */}
          {currentStep === 'select-audio' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 1: Select Audio File
              </h2>
              <AudioUploader onFileSelect={handleAudioFileSelect} />
              {selectedAudioFile && (
                <button
                  onClick={handleNext}
                  className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Continue to Metadata
                </button>
              )}
            </div>
          )}

          {/* Step 2: Add Metadata */}
          {currentStep === 'add-metadata' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 2: Add Call Information
              </h2>
              <MetadataForm
                onSubmit={handleMetadataSubmit}
                initialData={metadata}
                isLoading={false}
              />
            </div>
          )}

          {/* Step 3: Uploading */}
          {currentStep === 'uploading' && uploadProgress && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Step 3: Uploading...
              </h2>
              <UploadProgressComponent progress={uploadProgress} />
            </div>
          )}

          {/* Step 4: Match Calls */}
          {currentStep === 'match-calls' && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Match with CSV Data
              </h2>
              <CallMatcher
                matches={potentialMatches}
                onSelectMatch={handleMatchSelect}
                onSkip={handleSkipMatching}
              />
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <svg
                className="w-16 h-16 text-green-500 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Upload Complete!
              </h2>
              <p className="text-gray-600 mb-4">
                Your call recording has been successfully uploaded and is ready for processing.
              </p>
              
              {/* Manual matching option */}
              {csvUploaded && uploadedCallId && (metadata.call_date || metadata.call_time) && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800 mb-3">
                    CSV data is available. Would you like to match this recording with your CSV call data?
                  </p>
                  <button
                    onClick={() => {
                      const callDateTime = metadata.call_date && metadata.call_time
                        ? `${metadata.call_date}T${metadata.call_time}:00`
                        : metadata.call_date
                        ? `${metadata.call_date}T12:00:00`
                        : null;
                      if (callDateTime) {
                        findMatchesForCall(uploadedCallId, callDateTime, metadata.duration);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Find Matching CSV Records
                  </button>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => router.push('/library')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  View Library
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Upload Another
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - CSV Upload */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              CSV Call Data
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload CSV files containing call metadata for automatic matching with audio recordings.
            </p>
            <CsvUploader onCsvParsed={handleCsvParsed} />
            {csvUploaded && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded flex items-start">
                <svg
                  className="w-5 h-5 text-green-600 mr-2 flex-shrink-0"
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
                  <p className="text-sm font-medium text-green-800">
                    CSV data uploaded successfully
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Matching enabled for future uploads
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

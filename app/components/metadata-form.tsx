/**
 * Metadata Form Component
 * Form for entering call information and metadata
 */

'use client';

import React, { useState } from 'react';
import type { CallMetadata } from '@/types/upload';
import { validatePhoneNumber, validateDate, validateDuration } from '@/lib/file-validation';

interface MetadataFormProps {
  onSubmit: (metadata: CallMetadata) => void;
  initialData?: CallMetadata;
  isLoading?: boolean;
}

export default function MetadataForm({
  onSubmit,
  initialData,
  isLoading = false,
}: MetadataFormProps) {
  const [metadata, setMetadata] = useState<CallMetadata>(
    initialData || {
      patient_id: '',
      call_type: '',
      call_date: '',
      call_time: '',
      phone_number: '',
      duration: undefined,
      tags: [],
      notes: '',
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');

  const callTypes = [
    'Appointment Booking',
    'Follow-up',
    'Emergency',
    'Consultation',
    'Billing',
    'General Inquiry',
    'Other',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: Record<string, string> = {};

    if (metadata.phone_number) {
      const phoneValidation = validatePhoneNumber(metadata.phone_number);
      if (!phoneValidation.valid && phoneValidation.error) {
        newErrors.phone_number = phoneValidation.error;
      }
    }

    if (metadata.call_date) {
      const dateValidation = validateDate(metadata.call_date);
      if (!dateValidation.valid && dateValidation.error) {
        newErrors.call_date = dateValidation.error;
      }
    }

    if (metadata.duration !== undefined) {
      const durationValidation = validateDuration(metadata.duration);
      if (!durationValidation.valid && durationValidation.error) {
        newErrors.duration = durationValidation.error;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(metadata);
  };

  const handleInputChange = (
    field: keyof CallMetadata,
    value: string | number | undefined
  ) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !metadata.tags?.includes(tagInput.trim())) {
      setMetadata((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setMetadata((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Patient ID */}
      <div>
        <label htmlFor="patient_id" className="block text-sm font-medium text-gray-700 mb-1">
          Patient ID
        </label>
        <input
          type="text"
          id="patient_id"
          value={metadata.patient_id || ''}
          onChange={(e) => handleInputChange('patient_id', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="P001"
        />
      </div>

      {/* Call Type */}
      <div>
        <label htmlFor="call_type" className="block text-sm font-medium text-gray-700 mb-1">
          Call Type
        </label>
        <select
          id="call_type"
          value={metadata.call_type || ''}
          onChange={(e) => handleInputChange('call_type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select call type...</option>
          {callTypes.map((type) => (
            <option key={type} value={type.toLowerCase().replace(/\s+/g, '_')}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Call Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="call_date" className="block text-sm font-medium text-gray-700 mb-1">
            Call Date
          </label>
          <input
            type="date"
            id="call_date"
            value={metadata.call_date || ''}
            onChange={(e) => handleInputChange('call_date', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
              errors.call_date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.call_date && (
            <p className="mt-1 text-xs text-red-600">{errors.call_date}</p>
          )}
        </div>

        <div>
          <label htmlFor="call_time" className="block text-sm font-medium text-gray-700 mb-1">
            Call Time
          </label>
          <input
            type="time"
            id="call_time"
            value={metadata.call_time || ''}
            onChange={(e) => handleInputChange('call_time', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Phone Number */}
      <div>
        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          id="phone_number"
          value={metadata.phone_number || ''}
          onChange={(e) => handleInputChange('phone_number', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
            errors.phone_number ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="+1234567890"
        />
        {errors.phone_number && (
          <p className="mt-1 text-xs text-red-600">{errors.phone_number}</p>
        )}
      </div>

      {/* Duration */}
      <div>
        <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
          Duration (seconds)
        </label>
        <input
          type="number"
          id="duration"
          value={metadata.duration || ''}
          onChange={(e) =>
            handleInputChange(
              'duration',
              e.target.value ? parseInt(e.target.value) : undefined
            )
          }
          className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
            errors.duration ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="120"
          min="0"
        />
        {errors.duration && <p className="mt-1 text-xs text-red-600">{errors.duration}</p>}
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add a tag..."
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Add
          </button>
        </div>
        {metadata.tags && metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {metadata.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          value={metadata.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Add any additional notes..."
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Uploading...' : 'Upload File'}
      </button>
    </form>
  );
}


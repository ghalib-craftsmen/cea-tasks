import { useState } from 'react';
import type { WorkLocationType, SpecialDayCheck } from '../types';

interface LocationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  currentLocation: WorkLocationType;
  specialDay?: SpecialDayCheck;
  onSelect: (location: WorkLocationType) => void;
}

export function LocationSelectionModal({
  isOpen,
  onClose,
  date,
  currentLocation,
  specialDay,
  onSelect,
}: LocationSelectionModalProps) {
  const [selectedLocation, setSelectedLocation] = useState<WorkLocationType>(currentLocation);

  if (!isOpen) return null;

  const handleSelect = () => {
    onSelect(selectedLocation);
    onClose();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Select Location
          </h2>
          <p className="text-gray-600 mb-6">
            {formatDate(date)}
          </p>

          {specialDay?.is_closed && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-900 font-semibold">
                ⚠️ Office Closed
              </p>
              <p className="text-red-700 text-sm mt-1">
                {specialDay.note || 'The office is closed on this day.'}
              </p>
            </div>
          )}

          {!specialDay?.is_closed && (
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setSelectedLocation('Office')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedLocation === 'Office'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🏢</span>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Office</p>
                      <p className="text-sm text-gray-600">Work from the office</p>
                    </div>
                  </div>
                  {selectedLocation === 'Office' && (
                    <span className="text-blue-600 text-2xl">✓</span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setSelectedLocation('WFH')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedLocation === 'WFH'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🏠</span>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">WFH</p>
                      <p className="text-sm text-gray-600">Work from home</p>
                    </div>
                  </div>
                  {selectedLocation === 'WFH' && (
                    <span className="text-green-600 text-2xl">✓</span>
                  )}
                </div>
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {!specialDay?.is_closed && (
              <button
                onClick={handleSelect}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

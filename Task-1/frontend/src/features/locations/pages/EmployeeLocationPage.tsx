import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { getMyLocation, updateMyLocation, getWFHPeriods, getSpecialDays } from '../api';
import { Calendar } from '../../../components/Calendar';
import { LocationSelectionModal } from '../../../components/LocationSelectionModal';
import type { WorkLocationType, SpecialDayCheck, SpecialDayResponse } from '../../../types';
import { Toast } from '../../../components/ui/toastUtils';
import { toDateKey } from '../../../utils/formatDate';

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

async function fetchMonthLocations(currentDate: Date) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const locationData: Record<string, WorkLocationType> = {};

  const promises = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = toDateKey(date);

    promises.push(
      getMyLocation(dateStr)
        .then((location) => {
          locationData[dateStr] = location.location;
        })
        .catch(() => null)
    );
  }

  await Promise.all(promises);
  return locationData;
}

function buildSpecialDaysMap(days: SpecialDayResponse[]): Record<string, SpecialDayCheck> {
  const map: Record<string, SpecialDayCheck> = {};
  for (const day of days) {
    map[day.date] = {
      date: day.date,
      is_closed: day.type === 'Closed',
      type: day.type,
      note: day.note ?? undefined,
    };
  }
  return map;
}

export function EmployeeLocationPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'calendar' | 'manual'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Manual view state
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [manualDate, setManualDate] = useState(toDateKey(tomorrow));
  const [manualLocation, setManualLocation] = useState<WorkLocationType>('Office');

  const monthKey = getMonthKey(currentDate);

  // Fetch locations for the current month
  const { data: locationData = {} } = useQuery({
    queryKey: ['month-locations', monthKey],
    queryFn: () => fetchMonthLocations(currentDate),
    enabled: isAuthenticated,
  });

  // Fetch all special days (single call, auto-refetches)
  const { data: specialDays = [] } = useQuery({
    queryKey: ['special-days'],
    queryFn: getSpecialDays,
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const specialDaysData = buildSpecialDaysMap(specialDays);

  // Fetch WFH periods
  const { data: wfhPeriods = [] } = useQuery({
    queryKey: ['wfh-periods'],
    queryFn: getWFHPeriods,
    enabled: isAuthenticated,
  });



  // Update location mutation
  const updateMutation = useMutation({
    mutationFn: (data: { date: string; location: WorkLocationType }) =>
      updateMyLocation({ date: data.date, location: data.location }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['month-locations', monthKey] });
      Toast.success('Location updated successfully!');
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      Toast.error(error?.response?.data?.detail || 'Failed to update location. Please try again.');
    },
  });

  // Redirect unauthenticated users
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleDateClick = (date: Date) => {
    const dateStr = toDateKey(date);
    const specialDay = specialDaysData[dateStr];
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (specialDay?.is_closed || isWeekend) {
      Toast.warning('Office is closed on this day. Location cannot be changed.');
      return;
    }

    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleLocationSelect = (location: WorkLocationType) => {
    if (!selectedDate) return;

    const dateStr = toDateKey(selectedDate);
    updateMutation.mutate({ date: dateStr, location });
  };

  const handleManualSave = () => {
    if (!manualDate) return;
    const date = new Date(manualDate + 'T00:00:00');
    const specialDay = specialDaysData[manualDate];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    if (specialDay?.is_closed || isWeekend) {
      Toast.warning('Office is closed on this day. Location cannot be changed.');
      return;
    }

    updateMutation.mutate({ date: manualDate, location: manualLocation });
  };

  const getDisabledDates = (): Set<string> => {
    const disabled = new Set<string>();
    Object.entries(specialDaysData).forEach(([date, data]) => {
      if (data.is_closed) {
        disabled.add(date);
      }
    });

    // Add all weekends for the current month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        disabled.add(toDateKey(date));
      }
    }

    return disabled;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Work Location</h1>
        <p className="mt-1 text-gray-500 text-sm">Manage your work location schedule.</p>
      </div>

      {/* View toggle */}
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 gap-1">
        <button
          onClick={() => setView('calendar')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            view === 'calendar'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Calendar View
        </button>
        <button
          onClick={() => setView('manual')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            view === 'manual'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Manual Entry
        </button>
      </div>

      {/* Calendar view */}
      {view === 'calendar' && (
        <div>
          <p className="text-sm text-gray-500 mb-3">Click on any working day to set your location.</p>
          <Calendar
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onDateClick={handleDateClick}
            locationData={locationData}
            wfhPeriods={wfhPeriods}
            specialDays={specialDaysData}
            disabledDates={getDisabledDates()}
          />
        </div>
      )}

      {/* Manual entry view */}
      {view === 'manual' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-md space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input
              type="date"
              value={manualDate}
              onChange={e => setManualDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Work Location</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setManualLocation('Office')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  manualLocation === 'Office'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-2xl">🏢</span>
                <span className={`text-sm font-semibold ${manualLocation === 'Office' ? 'text-blue-700' : 'text-gray-700'}`}>
                  Office
                </span>
                {manualLocation === 'Office' && (
                  <span className="text-xs text-blue-500">Selected</span>
                )}
              </button>

              <button
                onClick={() => setManualLocation('WFH')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  manualLocation === 'WFH'
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-2xl">🏠</span>
                <span className={`text-sm font-semibold ${manualLocation === 'WFH' ? 'text-violet-700' : 'text-gray-700'}`}>
                  Work from Home
                </span>
                {manualLocation === 'WFH' && (
                  <span className="text-xs text-violet-500">Selected</span>
                )}
              </button>
            </div>
          </div>

          <button
            onClick={handleManualSave}
            disabled={!manualDate || updateMutation.isPending}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Location'}
          </button>
        </div>
      )}

      <LocationSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate ? toDateKey(selectedDate) : ''}
        currentLocation={selectedDate ? locationData[toDateKey(selectedDate)] || 'Office' : 'Office'}
        specialDay={selectedDate ? specialDaysData[toDateKey(selectedDate)] : undefined}
        onSelect={handleLocationSelect}
      />
    </div>
  );
}

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Work Location</h1>
        <p className="mt-2 text-gray-600">
          Manage your work location schedule for the month.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Calendar View</h2>
        <p className="text-sm text-gray-600 mb-4">
          Click on any date to set your work location (Office or WFH).
        </p>

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

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Legend</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 border border-blue-200 rounded" />
            <div>
              <p className="font-medium text-gray-900">Office</p>
              <p className="text-sm text-gray-600">Working from office</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-50 border border-green-200 rounded" />
            <div>
              <p className="font-medium text-gray-900">WFH</p>
              <p className="text-sm text-gray-600">Working from home</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-50 border border-red-200 rounded" />
            <div>
              <p className="font-medium text-gray-900">Closed</p>
              <p className="text-sm text-gray-600">Office is closed</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-50 border border-yellow-200 rounded" />
            <div>
              <p className="font-medium text-gray-900">Special Day</p>
              <p className="text-sm text-gray-600">Holiday or celebration</p>
            </div>
          </div>
        </div>
      </div>

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

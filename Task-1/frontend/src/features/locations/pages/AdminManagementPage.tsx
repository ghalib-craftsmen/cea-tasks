import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { getWFHPeriods, createWFHPeriod, deleteWFHPeriod, getSpecialDays, createSpecialDay, deleteSpecialDay } from '../api';
import { getCurrentUser } from '../../../features/users/api';
import { Calendar } from '../../../components/Calendar';
import type { WFHPeriodCreate, SpecialDayCreate, SpecialDayType, SpecialDayCheck } from '../../../types';
import { Toast } from '../../../components/ui/toastUtils';

export function AdminManagementPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRange, setSelectedRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [showSpecialDayForm, setShowSpecialDayForm] = useState(false);
  const [specialDayForm, setSpecialDayForm] = useState<SpecialDayCreate>({
    date: new Date().toISOString().split('T')[0],
    type: 'Closed',
    note: '',
  });

  // Fetch current user to get role
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  // Check if user has access (Admin or Logistics)
  const hasAccess = currentUser?.role === 'Admin' || currentUser?.role === 'Logistics';

  // Fetch WFH periods
  const { data: wfhPeriods = [] } = useQuery({
    queryKey: ['wfh-periods'],
    queryFn: getWFHPeriods,
    enabled: isAuthenticated && hasAccess,
  });

  // Fetch special days
  const { data: specialDays = [] } = useQuery({
    queryKey: ['special-days'],
    queryFn: getSpecialDays,
    enabled: isAuthenticated && hasAccess,
  });

  // Create WFH period mutation
  const createWFHMutation = useMutation({
    mutationFn: (data: WFHPeriodCreate) => createWFHPeriod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wfh-periods'] });
      Toast.success('WFH period created successfully!');
      setSelectedRange({ start: null, end: null });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      Toast.error(error?.response?.data?.detail || 'Failed to create WFH period. Please try again.');
    },
  });

  // Delete WFH period mutation
  const deleteWFHMutation = useMutation({
    mutationFn: (periodId: number) => deleteWFHPeriod(periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wfh-periods'] });
      Toast.success('WFH period deleted successfully!');
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      Toast.error(error?.response?.data?.detail || 'Failed to delete WFH period. Please try again.');
    },
  });

  // Create special day mutation
  const createSpecialDayMutation = useMutation({
    mutationFn: (data: SpecialDayCreate) => createSpecialDay(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-days'] });
      Toast.success('Special day created successfully!');
      setShowSpecialDayForm(false);
      setSpecialDayForm({
        date: new Date().toISOString().split('T')[0],
        type: 'Closed',
        note: '',
      });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      Toast.error(error?.response?.data?.detail || 'Failed to create special day. Please try again.');
    },
  });

  // Delete special day mutation
  const deleteSpecialDayMutation = useMutation({
    mutationFn: (dayId: number) => deleteSpecialDay(dayId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-days'] });
      Toast.success('Special day deleted successfully!');
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      Toast.error(error?.response?.data?.detail || 'Failed to delete special day. Please try again.');
    },
  });

  // Redirect unauthenticated users or users without access
  if (!isAuthenticated || !hasAccess) {
    return <Navigate to="/" replace />;
  }

  const handleRangeSelect = (start: Date | null, end: Date | null) => {
    setSelectedRange({ start, end });
  };

  const handleCreateWFHPeriod = () => {
    if (!selectedRange.start || !selectedRange.end) {
      Toast.error('Please select a date range on the calendar.');
      return;
    }

    const startDate = selectedRange.start.toISOString().split('T')[0];
    const endDate = selectedRange.end.toISOString().split('T')[0];

    createWFHMutation.mutate({ start_date: startDate, end_date: endDate });
  };

  const handleDeleteWFHPeriod = (periodId: number) => {
    if (window.confirm('Are you sure you want to delete this WFH period?')) {
      deleteWFHMutation.mutate(periodId);
    }
  };

  const handleSpecialDaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSpecialDayMutation.mutate(specialDayForm);
  };

  const handleDeleteSpecialDay = (dayId: number) => {
    if (window.confirm('Are you sure you want to delete this special day?')) {
      deleteSpecialDayMutation.mutate(dayId);
    }
  };

  const getSpecialDaysMap = (): Record<string, SpecialDayCheck> => {
    const map: Record<string, SpecialDayCheck> = {};
    specialDays.forEach((day) => {
      map[day.date] = {
        date: day.date,
        is_closed: day.type === 'Closed',
        type: day.type,
        note: day.note || undefined,
      };
    });
    return map;
  };

  const getDisabledDates = () => {
    const disabled = new Set<string>();
    specialDays.forEach((day) => {
      if (day.type === 'Closed') {
        disabled.add(day.date);
      }
    });
    return disabled;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
        <p className="mt-2 text-gray-600">
          Manage WFH periods and special days for the organization.
        </p>
      </div>

      {/* WFH Periods Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">WFH Periods</h2>
          <button
            onClick={handleCreateWFHPeriod}
            disabled={!selectedRange.start || !selectedRange.end || createWFHMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createWFHMutation.isPending ? 'Creating...' : 'Create WFH Period'}
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Select a date range on the calendar to create a new WFH period. Click on an existing period to delete it.
        </p>

        <div className="mb-6">
          {selectedRange.start && selectedRange.end ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                Selected range: <strong>{selectedRange.start.toISOString().split('T')[0]}</strong> to{' '}
                <strong>{selectedRange.end.toISOString().split('T')[0]}</strong>
              </p>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">No date range selected</p>
            </div>
          )}
        </div>

        <Calendar
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          wfhPeriods={wfhPeriods}
          specialDays={getSpecialDaysMap()}
          disabledDates={getDisabledDates()}
          selectionMode="range"
          selectedRange={selectedRange}
          onRangeSelect={handleRangeSelect}
        />

        {wfhPeriods.length > 0 && (
          <div className="mt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Existing WFH Periods</h3>
            <div className="space-y-2">
              {wfhPeriods.map((period) => (
                <div
                  key={period.id}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-green-900">
                      {period.start_date} to {period.end_date}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteWFHPeriod(period.id)}
                    disabled={deleteWFHMutation.isPending}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Special Days Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Special Days</h2>
          <button
            onClick={() => setShowSpecialDayForm(!showSpecialDayForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showSpecialDayForm ? 'Cancel' : 'Add Special Day'}
          </button>
        </div>

        {showSpecialDayForm && (
          <form onSubmit={handleSpecialDaySubmit} className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  value={specialDayForm.date}
                  onChange={(e) => setSpecialDayForm({ ...specialDayForm, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="type"
                  value={specialDayForm.type}
                  onChange={(e) => setSpecialDayForm({ ...specialDayForm, type: e.target.value as SpecialDayType })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Closed">Closed</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Celebration">Celebration</option>
                </select>
              </div>
              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                  Note (optional)
                </label>
                <input
                  id="note"
                  type="text"
                  value={specialDayForm.note || ''}
                  onChange={(e) => setSpecialDayForm({ ...specialDayForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={createSpecialDayMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createSpecialDayMutation.isPending ? 'Creating...' : 'Create Special Day'}
              </button>
            </div>
          </form>
        )}

        {specialDays.length > 0 ? (
          <div className="space-y-2">
            {specialDays.map((day) => (
              <div
                key={day.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  day.type === 'Closed'
                    ? 'bg-red-50 border-red-200'
                    : day.type === 'Holiday'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-purple-50 border-purple-200'
                }`}
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {day.date} - <span className="font-semibold">{day.type}</span>
                  </p>
                  {day.note && <p className="text-sm text-gray-600">{day.note}</p>}
                </div>
                <button
                  onClick={() => handleDeleteSpecialDay(day.id)}
                  disabled={deleteSpecialDayMutation.isPending}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No special days configured.</p>
        )}
      </div>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { getTodaysParticipation, updateParticipation } from '../api';
import { getCurrentUser } from '../../users/api';
import { checkSpecialDay, getMyLocation } from '../../locations/api';
import { getSettings } from '../../admin/api';
import type { MealType, ParticipationUpdate } from '../../../types';
import { Toast } from '../../../components/ui/toastUtils';
import { Spinner } from '../../../components/ui/Spinner';
import { toDateKey } from '../../../utils/formatDate';

const mealTypes: { type: MealType; label: string; icon: string }[] = [
  { type: 'Lunch', label: 'Lunch', icon: '🍱' },
  { type: 'Snacks', label: 'Snacks', icon: '🍪' },
  { type: 'Iftar', label: 'Iftar', icon: '🌙' },
  { type: 'EventDinner', label: 'Event Dinner', icon: '🎉' },
  { type: 'OptionalDinner', label: 'Optional Dinner', icon: '🍽️' },
];

export function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current user for role
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  const isEmployee = currentUser?.role === 'Employee';
  const isAdminOrLogistics = currentUser?.role === 'Admin' || currentUser?.role === 'Logistics';

  // Always show tomorrow's meal preferences
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + 1);
  const targetDateStr = toDateKey(targetDate);

  // Fetch cutoff settings
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    enabled: isAuthenticated,
  });

  const cutoffHour = settingsData?.cutoff_hour ?? 21;
  const cutoffMinute = settingsData?.cutoff_minute ?? 0;

  // Check cutoff (dynamic time, employees only)
  // Hour 0 (12 AM) means midnight = end of day, so cutoff never passes today
  const effectiveCutoffHour = cutoffHour === 0 ? 24 : cutoffHour;
  const cutoffPassed = isEmployee && (now.getHours() > effectiveCutoffHour || (now.getHours() === effectiveCutoffHour && now.getMinutes() >= cutoffMinute));

  // Fetch special day status for target date
  const { data: specialDayData } = useQuery({
    queryKey: ['special-day-check', targetDateStr],
    queryFn: () => checkSpecialDay(targetDateStr),
    enabled: isAuthenticated,
  });

  const isSpecialDay = !!(specialDayData?.is_closed || (specialDayData?.type && ['Holiday', 'Celebration', 'Closed'].includes(specialDayData.type)));

  // Fetch work location for target date
  const { data: locationData } = useQuery({
    queryKey: ['me', 'location', targetDateStr],
    queryFn: () => getMyLocation(targetDateStr),
    enabled: isAuthenticated,
  });

  const workLocation = locationData?.location;
  const isWFH = workLocation === 'WFH';

  // Admin/Logistics can always select meals; others restricted by special day, WFH, cutoff
  const canSelectMeals = isAdminOrLogistics || (!isSpecialDay && !isWFH && !cutoffPassed);

  // Fetch today's meal participation using TanStack Query
  const { data: mealData, isLoading, error } = useQuery({
    queryKey: ['meals', 'today'],
    queryFn: getTodaysParticipation,
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  // Update meal participation mutation
  const updateMutation = useMutation({
    mutationFn: (data: ParticipationUpdate) => updateParticipation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', 'today'] });
      Toast.success('Meal participation updated successfully!');
    },
    onError: (error: any) => {
      if (error?.response?.status === 403) {
        Toast.error('Cutoff time passed. Updates locked for tomorrow\'s meals.');
      } else {
        Toast.error('Failed to update meal participation. Please try again.');
      }
    },
  });

  // Redirect unauthenticated users to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleToggleMeal = (mealType: MealType) => {
    if (!mealData) return;
    
    const updatedMeals: Record<MealType, boolean> = {
      ...mealData.meals,
      [mealType]: !mealData.meals[mealType],
    };

    updateMutation.mutate({ meals: updatedMeals });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mealData) {
      updateMutation.mutate({ meals: mealData.meals });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load meal data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Meal Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {user?.username}! Manage your meal participation for tomorrow.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="mb-6">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={mealData?.date || new Date().toISOString().split('T')[0]}
              disabled
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-gray-500">Tomorrow's meal participation</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Available Meals</h2>

            {isSpecialDay && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-900 font-semibold">
                  Office is {specialDayData?.type}
                </p>
                <p className="text-red-700 text-sm mt-1">
                  Meal preferences are not available on {specialDayData?.type} days.
                </p>
                {specialDayData?.note && (
                  <p className="text-red-700 text-sm mt-1">{specialDayData.note}</p>
                )}
              </div>
            )}
            {!isSpecialDay && isWFH && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-900 font-semibold">Work from Home</p>
                <p className="text-yellow-700 text-sm mt-1">
                  Meal preferences are only available when working from the office.
                </p>
              </div>
            )}
            {!isSpecialDay && !isWFH && cutoffPassed && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-900 font-semibold">Cutoff Time Passed</p>
                <p className="text-yellow-700 text-sm mt-1">
                  Cutoff time ({cutoffHour === 0 ? '12' : cutoffHour > 12 ? cutoffHour - 12 : cutoffHour}:{String(cutoffMinute).padStart(2, '0')} {cutoffHour >= 12 ? 'PM' : 'AM'}) has passed. You can no longer update tomorrow's meal preferences.
                </p>
              </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${!canSelectMeals ? 'opacity-50 pointer-events-none' : ''}`}>
              {mealTypes.map((meal) => {
                const isSelected = mealData?.meals?.[meal.type] || false;
                return (
                  <button
                    key={meal.type}
                    type="button"
                    onClick={() => handleToggleMeal(meal.type)}
                    disabled={updateMutation.isPending || !canSelectMeals}
                    className={`
                      relative p-6 rounded-lg border-2 transition-all duration-200
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                      ${(updateMutation.isPending || !canSelectMeals) ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-4xl">{meal.icon}</span>
                      <div className="text-left">
                        <p className="text-lg font-semibold text-gray-900">{meal.label}</p>
                        <p className="text-sm text-gray-500">
                          {isSelected ? 'Participating' : 'Not participating'}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <svg
                          className="w-6 h-6 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending || !canSelectMeals}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Participation'}
            </button>
          </div>
        </div>

        {mealData && (
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Current Selection</h2>
            {isSpecialDay ? (
              <p className="text-gray-500">Office is {specialDayData?.type} - no meal selection applicable.</p>
            ) : isWFH ? (
              <p className="text-gray-500">Working from home - no meal selection applicable.</p>
            ) : Object.entries(mealData.meals).filter(([, selected]) => selected).length === 0 ? (
              <p className="text-gray-500">No meals selected for today.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(mealData.meals)
                  .filter(([, selected]) => selected)
                  .map(([type]) => {
                    const meal = mealTypes.find((m) => m.type === type);
                    return (
                      <span
                        key={type}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {meal?.icon} {meal?.label}
                      </span>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { getCurrentUser } from '../features/users/api';
import { getMyLocation, checkSpecialDay } from '../features/locations/api';
import { getSettings } from '../features/admin/api';
import type { MealType } from '../types';
import { getTodaysParticipation, updateParticipation } from '../features/meals/api';
import { toDateKey } from '../utils/formatDate';

const mealTypes: { type: MealType; label: string; icon: string }[] = [
  { type: 'Lunch', label: 'Lunch', icon: '🍱' },
  { type: 'Snacks', label: 'Snacks', icon: '🍪' },
  { type: 'Iftar', label: 'Iftar', icon: '🌙' },
  { type: 'EventDinner', label: 'Event Dinner', icon: '🎉' },
  { type: 'OptionalDinner', label: 'Optional Dinner', icon: '🍽️' },
];

export function Meals() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  const isEmployee = currentUser?.role === 'Employee';
  const isAdminOrLogistics = currentUser?.role === 'Admin' || currentUser?.role === 'Logistics';

  // Fetch cutoff settings
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    enabled: isAuthenticated,
  });

  const cutoffHour = settingsData?.cutoff_hour ?? 21;
  const cutoffMinute = settingsData?.cutoff_minute ?? 0;

  // Check if cutoff has passed (dynamic time, employees only)
  // Hour 0 (12 AM) means midnight = end of day, so cutoff never passes today
  const now = new Date();
  const effectiveCutoffHour = cutoffHour === 0 ? 24 : cutoffHour;
  const cutoffPassed = isEmployee && (now.getHours() > effectiveCutoffHour || (now.getHours() === effectiveCutoffHour && now.getMinutes() >= cutoffMinute));

  // Always show tomorrow's meal preferences
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + 1);
  const targetDateStr = toDateKey(targetDate);

  // Fetch user's work location for the target date
  const { data: locationData } = useQuery({
    queryKey: ['me', 'location', targetDateStr],
    queryFn: () => getMyLocation(targetDateStr),
    enabled: isAuthenticated,
  });

  // Fetch special day status for the target date
  const { data: specialDayData } = useQuery({
    queryKey: ['special-day-check', targetDateStr],
    queryFn: () => checkSpecialDay(targetDateStr),
    enabled: isAuthenticated,
  });

  const isSpecialDay = !!(specialDayData?.is_closed || (specialDayData?.type && ['Holiday', 'Celebration', 'Closed'].includes(specialDayData.type)));

  // Fetch today's meal participation
  const { data: mealData, isLoading } = useQuery({
    queryKey: ['meals', 'today'],
    queryFn: getTodaysParticipation,
  });

  const workLocation = locationData?.location;
  // Admin/Logistics can always select meals (no WFH/cutoff/special day restriction)
  const canSelectMeals = isAdminOrLogistics || (workLocation === 'Office' && !isSpecialDay && !cutoffPassed);

  // Update meal participation
  const updateMutation = useMutation({
    mutationFn: (meals: Record<MealType, boolean>) => updateParticipation({ meals }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', 'today'] });
    },
    onError: (error: { response?: { status?: number } }) => {
      if (error?.response?.status === 403) {
        toast.error('Cutoff time passed. Updates locked for tomorrow\'s meals.');
      } else {
        toast.error('Failed to update meal preferences. Please try again.');
      }
    },
  });

  const toggleMeal = (type: MealType) => {
    if (!mealData) return;
    const updatedMeals = {
      ...mealData.meals,
      [type]: !mealData.meals[type],
    };
    updateMutation.mutate(updatedMeals);
  };

  const handleSave = () => {
    if (mealData) {
      updateMutation.mutate(mealData.meals, {
        onSuccess: () => {
          toast.success('Meal preferences saved!');
          setIsEditing(false);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Meals</h1>
        <p className="mt-2 text-gray-600">
          Set your meal preferences for tomorrow
        </p>
        {isSpecialDay && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Office is <strong>{specialDayData?.type}</strong> on this day. Meal preferences are not available.
            </p>
            {specialDayData?.note && (
              <p className="text-sm text-red-700 mt-1">{specialDayData.note}</p>
            )}
          </div>
        )}
        {!isSpecialDay && workLocation === 'WFH' && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              🏠 You are set to work from home. Meal preferences are only available when working from the office.
            </p>
          </div>
        )}
        {cutoffPassed && workLocation !== 'WFH' && !isSpecialDay && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Cutoff time ({cutoffHour === 0 ? '12' : cutoffHour > 12 ? cutoffHour - 12 : cutoffHour}:{String(cutoffMinute).padStart(2, '0')} {cutoffHour >= 12 ? 'PM' : 'AM'}) has passed. You can no longer update tomorrow's meal preferences.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="mb-6">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={mealData?.date || targetDateStr}
            disabled
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
          />
          <p className="mt-1 text-sm text-gray-500">
            Tomorrow's meal preferences
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Available Meals</h2>
            {!isEditing && canSelectMeals && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Preferences
              </button>
            )}
          </div>

          {!canSelectMeals && isSpecialDay && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-900 font-semibold">Office is {specialDayData?.type}</p>
              <p className="text-red-700 text-sm mt-1">Meal preferences are not available on {specialDayData?.type} days.</p>
            </div>
          )}
          {!canSelectMeals && !isSpecialDay && workLocation && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-900 font-semibold">🏠 Work from Home</p>
              <p className="text-yellow-700 text-sm mt-1">
                Meal preferences are only available when working from the office. Please update your work location to Office to select meals.
              </p>
            </div>
          )}

          {/* ── Saved / read-only view ── */}
          {!isEditing && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mealTypes.map((meal) => {
                const isSelected = mealData?.meals?.[meal.type] || false;
                return (
                  <div
                    key={meal.type}
                    className={`relative p-6 rounded-lg border-2 ${
                      isSelected ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <span className={`text-4xl ${!isSelected ? 'opacity-40' : ''}`}>{meal.icon}</span>
                      <div>
                        <p className={`text-lg font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-400'}`}>{meal.label}</p>
                        <p className={`text-sm font-medium ${isSelected ? 'text-green-600' : 'text-gray-400'}`}>
                          {isSelected ? 'Opted in' : 'Opted out'}
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-3 right-3">
                      {isSelected ? (
                        <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Edit / interactive view ── */}
          {isEditing && (
            <>
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${!canSelectMeals ? 'opacity-50 pointer-events-none' : ''}`}>
                {mealTypes.map((meal) => {
                  const isSelected = mealData?.meals?.[meal.type] || false;
                  return (
                    <button
                      key={meal.type}
                      onClick={() => toggleMeal(meal.type)}
                      disabled={updateMutation.isPending || !canSelectMeals}
                      className={`
                        relative p-6 rounded-lg border-2 transition-all duration-200 text-left
                        ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                        ${(updateMutation.isPending || !canSelectMeals) ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-4xl">{meal.icon}</span>
                        <div>
                          <p className="text-lg font-semibold text-gray-900">{meal.label}</p>
                          <p className="text-sm text-gray-500">{isSelected ? 'Selected' : 'Not selected'}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={updateMutation.isPending}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending || !canSelectMeals}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {mealData && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Selection</h2>
          {isSpecialDay ? (
            <p className="text-gray-500">
              Office is {specialDayData?.type} - no meal selection applicable.
            </p>
          ) : workLocation === 'WFH' ? (
            <p className="text-gray-500">
              🏠 Working from home - no meal selection applicable.
            </p>
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
    </div>
  );
}

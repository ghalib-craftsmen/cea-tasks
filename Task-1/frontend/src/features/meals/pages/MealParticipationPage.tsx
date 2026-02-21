import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { getTodaysParticipation, updateParticipation } from '../api';
import { mealParticipationSchema, type MealParticipationFormData, defaultMealParticipationValues } from '../../../schemas/formSchemas';
import type { MealType, ParticipationUpdate, MealRecord } from '../../../types';
import { Spinner } from '../../../components/ui/Spinner';

const mealTypes: { type: MealType; label: string; icon: string }[] = [
  { type: 'Lunch', label: 'Lunch', icon: '🍱' },
  { type: 'Snacks', label: 'Snacks', icon: '🍪' },
  { type: 'Iftar', label: 'Iftar', icon: '🌙' },
  { type: 'EventDinner', label: 'Event Dinner', icon: '🎉' },
  { type: 'OptionalDinner', label: 'Optional Dinner', icon: '🍽️' },
];

export function MealParticipationPage() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  // Initialize form with default values
  const { control, handleSubmit, watch, reset, formState: { errors, isDirty, isSubmitting } } = useForm<MealParticipationFormData>({
    resolver: zodResolver(mealParticipationSchema),
    defaultValues: defaultMealParticipationValues,
  });

  // Watch meals for real-time count updates
  const watchedMeals = watch('meals');

  // Calculate selected meals count
  const selectedCount = Object.values(watchedMeals).filter(Boolean).length;
  const totalCount = mealTypes.length;

  // Fetch today's meal participation using TanStack Query
  const { data: mealData, isLoading, error, refetch } = useQuery<MealRecord>({
    queryKey: ['meals', 'today'],
    queryFn: getTodaysParticipation,
    enabled: isAuthenticated,
  });

  // Update form when data is loaded
  useEffect(() => {
    if (mealData) {
      reset({
        date: mealData.date,
        meals: mealData.meals,
      });
    }
  }, [mealData, reset]);

  // Update meal participation mutation
  const updateMutation = useMutation({
    mutationFn: (data: ParticipationUpdate) => updateParticipation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', 'today'] });
      success('Meal participation updated successfully!');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { status?: number; data?: { detail?: string } } };
      if (err.response?.status === 403) {
        showError(err.response.data?.detail || 'Cutoff time passed. Updates locked for tomorrow\'s meals.');
      } else {
        showError((error as Error).message || 'Failed to update meal participation. Please try again.');
      }
    },
  });

  // Redirect unauthenticated users to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const onSubmit = (formData: MealParticipationFormData) => {
    updateMutation.mutate({ meals: formData.meals, date: formData.date });
  };

  const handleRetry = () => {
    refetch();
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <svg
            className="w-6 h-6 text-red-600 mr-3 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-red-900">Failed to load meal data</h3>
            <p className="mt-1 text-red-700">Unable to fetch your meal participation. Please try again.</p>
          </div>
        </div>
        <button
          onClick={handleRetry}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Meal Participation</h1>
        <p className="mt-2 text-gray-600">
          Welcome, {user?.username}! Manage your meal participation for the selected date.
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Current Selection</p>
            <p className="text-3xl font-bold mt-1">{selectedCount} / {totalCount}</p>
            <p className="text-blue-100 text-sm mt-1">meals selected</p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm font-medium">Date</p>
            <p className="text-xl font-semibold mt-1">{watch('date')}</p>
          </div>
        </div>
        {isDirty && (
          <div className="mt-4 pt-4 border-t border-blue-400">
            <p className="text-sm text-blue-100 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              You have unsaved changes
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          {/* Date Selection */}
          <div className="mb-6">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="date"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              )}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {watch('date') === new Date().toISOString().split('T')[0]
                ? "Today's meal participation"
                : 'Historical meal participation (view only)'}
            </p>
          </div>

          {/* Meal Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Available Meals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mealTypes.map((meal) => (
                <Controller
                  key={meal.type}
                  name={`meals.${meal.type}`}
                  control={control}
                  render={({ field }) => {
                    const isSelected = field.value;
                    return (
                      <button
                        type="button"
                        onClick={() => field.onChange(!isSelected)}
                        disabled={updateMutation.isPending}
                        className={`
                          relative p-6 rounded-lg border-2 transition-all duration-200
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                          ${updateMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
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
                  }}
                />
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {selectedCount === 0
                ? 'No meals selected'
                : `${selectedCount} meal${selectedCount !== 1 ? 's' : ''} selected`}
            </div>
            <button
              type="submit"
              disabled={!isDirty || updateMutation.isPending || isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
            >
              {updateMutation.isPending || isSubmitting ? 'Updating...' : 'Update Participation'}
            </button>
          </div>
        </div>

        {/* Current Selection Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Current Selection</h2>
          {selectedCount === 0 ? (
            <div className="flex items-center text-gray-500">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              No meals selected for this date.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mealTypes
                .filter((meal) => watchedMeals[meal.type])
                .map((meal) => (
                  <span
                    key={meal.type}
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                  >
                    <span className="mr-2">{meal.icon}</span>
                    {meal.label}
                  </span>
                ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

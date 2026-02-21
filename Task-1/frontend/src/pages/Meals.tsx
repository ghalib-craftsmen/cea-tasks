import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type { MealType } from '../types';
import { getTodaysParticipation, updateParticipation } from '../features/meals/api';

const mealTypes: { type: MealType; label: string; icon: string }[] = [
  { type: 'Lunch', label: 'Lunch', icon: '🍱' },
  { type: 'Snacks', label: 'Snacks', icon: '🍪' },
  { type: 'Iftar', label: 'Iftar', icon: '🌙' },
  { type: 'EventDinner', label: 'Event Dinner', icon: '🎉' },
  { type: 'OptionalDinner', label: 'Optional Dinner', icon: '🍽️' },
];

export function Meals() {
  const queryClient = useQueryClient();

  // Fetch today's meal participation
  const { data: mealData, isLoading } = useQuery({
    queryKey: ['meals', 'today'],
    queryFn: getTodaysParticipation,
  });

  // Update meal participation
  const updateMutation = useMutation({
    mutationFn: (meals: Record<MealType, boolean>) => updateParticipation({ meals }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', 'today'] });
    },
    onError: (error: any) => {
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
          toast.success('Meal preferences updated successfully!');
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
          Select your meal preferences for the day
        </p>
      </div>

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
          <p className="mt-1 text-sm text-gray-500">Today's meal preferences</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Available Meals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mealTypes.map((meal) => {
              const isSelected = mealData?.meals?.[meal.type] || false;
              return (
                <button
                  key={meal.type}
                  onClick={() => toggleMeal(meal.type)}
                  disabled={updateMutation.isPending}
                  className={`
                    relative p-6 rounded-lg border-2 transition-all duration-200
                    ${isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                    ${updateMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex items-center space-x-4">
                    <span className="text-4xl">{meal.icon}</span>
                    <div className="text-left">
                      <p className="text-lg font-semibold text-gray-900">{meal.label}</p>
                      <p className="text-sm text-gray-500">
                        {isSelected ? 'Selected' : 'Not selected'}
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
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {mealData && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Selection</h2>
          {Object.entries(mealData.meals).filter(([, selected]) => selected).length === 0 ? (
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

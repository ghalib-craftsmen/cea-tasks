import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { getTodaysParticipation } from '../features/meals/api';
import { getHeadcountSummary } from '../features/headcount/api';

export function Dashboard() {
  const { user } = useAuth();

  // Fetch today's meal participation
  const { data: mealData, isLoading: mealsLoading } = useQuery({
    queryKey: ['meals', 'today'],
    queryFn: getTodaysParticipation,
  });

  // Fetch headcount summary (admin/logistics only)
  const { data: headcountData, isLoading: headcountLoading } = useQuery({
    queryKey: ['headcount'],
    queryFn: getHeadcountSummary,
    enabled: user?.role === 'Admin' || user?.role === 'Logistics',
  });

  // Calculate stats from meal data
  const selectedMealsCount = mealData 
    ? Object.values(mealData.meals).filter(Boolean).length 
    : 0;

  const totalEmployees = headcountData?.total_employees || 0;
  const optedInPercentage = headcountData?.meal_counts?.[0]?.opted_in_percentage || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {user?.username}! Here's an overview of your meal planning.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today's Meals</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {mealsLoading ? '...' : selectedMealsCount}
              </p>
            </div>
            <div className="text-4xl">🍽️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Team Members</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {headcountLoading ? '...' : totalEmployees}
              </p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Participation</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {headcountLoading ? '...' : `${Math.round(optedInPercentage)}%`}
              </p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Date</p>
              <p className="mt-2 text-lg font-bold text-gray-900">
                {mealData?.date || new Date().toISOString().split('T')[0]}
              </p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = '/meals'}
            className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span className="mr-2">🍽️</span>
            View Meals
          </button>
          {(user?.role === 'Admin' || user?.role === 'Logistics') && (
            <button
              onClick={() => window.location.href = '/headcount'}
              className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span className="mr-2">👥</span>
              Check Headcount
            </button>
          )}
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <span className="mr-2">📊</span>
            View Stats
          </button>
        </div>
      </div>

      {mealData && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Meal Selection</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(mealData.meals).map(([mealType, selected]) => (
              <div
                key={mealType}
                className={`p-4 rounded-lg border-2 ${
                  selected
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{mealType}</span>
                  {selected ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400">✗</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(user?.role === 'Admin' || user?.role === 'Logistics') && headcountData && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Headcount Summary</h2>
          <div className="space-y-4">
            {headcountData.meal_counts.map((mealCount) => (
              <div key={mealCount.meal_type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">🍽️</span>
                  <div>
                    <p className="font-medium text-gray-900">{mealCount.meal_type}</p>
                    <p className="text-sm text-gray-500">
                      {mealCount.opted_in} opted in, {mealCount.opted_out} opted out
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    {mealCount.opted_in_percentage.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500">participation</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

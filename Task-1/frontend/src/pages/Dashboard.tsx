import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { getCurrentUser } from '../features/users/api';
import { getTodaysParticipation } from '../features/meals/api';
import { getHeadcountSummary } from '../features/headcount/api';

const PIE_COLORS = ['#16a34a', '#dc2626'];

export function Dashboard() {
  const { isAuthenticated } = useAuth();
  const [showStats, setShowStats] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  const { data: mealData, isLoading: mealsLoading } = useQuery({
    queryKey: ['meals', 'today'],
    queryFn: getTodaysParticipation,
  });

  const canViewHeadcount = currentUser?.role === 'Admin' || currentUser?.role === 'Logistics' || currentUser?.role === 'TeamLead';

  const { data: headcountData, isLoading: headcountLoading } = useQuery({
    queryKey: ['headcount'],
    queryFn: () => getHeadcountSummary(),
    enabled: canViewHeadcount,
  });

  const selectedMealsCount = mealData
    ? Object.values(mealData.meals).filter(Boolean).length
    : 0;

  const totalEmployees = headcountData?.total_employees || 0;
  const optedInPercentage = headcountData?.meal_counts?.[0]?.opted_in_percentage || 0;

  // Chart data
  const barChartData = headcountData?.meal_counts?.map((mc) => ({
    name: mc.meal_type,
    'Opted In': mc.opted_in,
    'Opted Out': mc.opted_out,
  })) || [];

  const firstMeal = headcountData?.meal_counts?.[0];
  const pieChartData = firstMeal
    ? [
        { name: 'Opted In', value: firstMeal.opted_in },
        { name: 'Opted Out', value: firstMeal.opted_out },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {currentUser?.name || currentUser?.username}! Here's an overview of your meal planning.
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

        {canViewHeadcount && (
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
        )}

        {canViewHeadcount && (
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
        )}

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
          {canViewHeadcount && (
            <button
              onClick={() => window.location.href = '/headcount'}
              className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span className="mr-2">👥</span>
              Check Headcount
            </button>
          )}
          {canViewHeadcount && (
            <button
              onClick={() => setShowStats(!showStats)}
              className={`flex items-center justify-center px-4 py-3 rounded-lg transition-colors ${
                showStats
                  ? 'bg-purple-700 text-white'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <span className="mr-2">📊</span>
              {showStats ? 'Hide Stats' : 'View Stats'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Graphs - shown after clicking View Stats */}
      {showStats && canViewHeadcount && headcountData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">All Meals Participation</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Opted In" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Opted Out" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {firstMeal?.meal_type || 'Lunch'} Breakdown
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  >
                    {pieChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Headcount Summary List */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Headcount Summary</h2>
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
        </div>
      )}

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
    </div>
  );
}

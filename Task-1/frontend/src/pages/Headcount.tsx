import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getCurrentUser, getTeams } from '../features/users/api';
import { getHeadcountSummary, getMealUsers } from '../features/headcount/api';
import type { MealType } from '../types';

const mealTypes: MealType[] = ['Lunch', 'Snacks', 'Iftar', 'EventDinner', 'OptionalDinner'];

export function Headcount() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams<{ teamId: string }>();
  const [selectedMeal, setSelectedMeal] = useState<MealType>('Lunch');

  const selectedTeamId = teamIdParam ? parseInt(teamIdParam, 10) : undefined;

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: getTeams,
    enabled: currentUser?.role === 'Admin' || currentUser?.role === 'Logistics',
  });

  const { data: headcountData, isLoading: summaryLoading } = useQuery({
    queryKey: ['headcount', selectedTeamId],
    queryFn: () => getHeadcountSummary(selectedTeamId),
  });

  const { data: mealUsersData, isLoading: usersLoading } = useQuery({
    queryKey: ['headcount', 'users', selectedMeal, selectedTeamId],
    queryFn: () => getMealUsers(selectedMeal, selectedTeamId),
  });

  const isAdmin = currentUser?.role === 'Admin';
  const isLogistics = currentUser?.role === 'Logistics';
  const isTeamLead = currentUser?.role === 'TeamLead';

  const selectedMealSummary = headcountData?.meal_counts?.find(
    (mc) => mc.meal_type === selectedMeal
  );

  const optedInPercentage = selectedMealSummary?.opted_in_percentage || 0;
  const optedOutPercentage = selectedMealSummary?.opted_out_percentage || 0;

  const handleTeamFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      navigate('/headcount');
    } else {
      navigate(`/headcount/team/${value}`);
    }
  };

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedTeamName = teams?.find(t => t.id === selectedTeamId)?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Headcount
          {selectedTeamName && (
            <span className="text-lg font-normal text-gray-500 ml-2">- {selectedTeamName}</span>
          )}
          {isTeamLead && currentUser?.team_name && (
            <span className="text-lg font-normal text-gray-500 ml-2">- {currentUser.team_name}</span>
          )}
        </h1>
        <p className="mt-2 text-gray-600">
          View meal participation and headcount statistics
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={headcountData?.date || new Date().toISOString().split('T')[0]}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-gray-500">Today's statistics</p>
          </div>
          <div className="flex-1">
            <label htmlFor="meal" className="block text-sm font-medium text-gray-700 mb-2">
              Select Meal Type
            </label>
            <select
              id="meal"
              value={selectedMeal}
              onChange={(e) => setSelectedMeal(e.target.value as MealType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {mealTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          {(isAdmin || isLogistics) && (
            <div className="flex-1">
              <label htmlFor="teamFilter" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Team
              </label>
              <select
                id="teamFilter"
                value={selectedTeamId?.toString() || ''}
                onChange={handleTeamFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Teams</option>
                {teams?.map((team) => (
                  <option key={team.id} value={team.id.toString()}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Employees</p>
              <p className="mt-2 text-3xl font-bold text-blue-900">
                {headcountData?.total_employees || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Opted In ({selectedMeal})</p>
              <p className="mt-2 text-3xl font-bold text-green-900">
                {selectedMealSummary?.opted_in || 0}
              </p>
              <p className="text-sm text-green-700">{optedInPercentage.toFixed(1)}%</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Opted Out ({selectedMeal})</p>
              <p className="mt-2 text-3xl font-bold text-red-900">
                {selectedMealSummary?.opted_out || 0}
              </p>
              <p className="text-sm text-red-700">{optedOutPercentage.toFixed(1)}%</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
          </div>
        </div>
      </div>

      {/* Participation Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Participation Progress ({selectedMeal})
        </h2>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-green-600 h-4 rounded-full transition-all duration-300"
            style={{ width: `${optedInPercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>{optedInPercentage.toFixed(1)}% opted in</span>
          <span>{optedOutPercentage.toFixed(1)}% opted out</span>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Employee List ({selectedMeal})
        </h2>
        {usersLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mealUsersData?.users?.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.team_name || 'None'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Opted In
                      </span>
                    </td>
                  </tr>
                ))}
                {(!mealUsersData?.users || mealUsersData.users.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                      No employees opted in for this meal
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

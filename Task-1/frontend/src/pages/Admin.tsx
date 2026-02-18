import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type { MealType } from '../types';
import { getAllParticipation, updateUserParticipation } from '../features/admin/api';

const mealTypes: MealType[] = ['Lunch', 'Snacks', 'Iftar', 'EventDinner', 'OptionalDinner'];

export function Admin() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'users' | 'teams' | 'settings'>('users');

  // Fetch all user participation data
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'participation'],
    queryFn: getAllParticipation,
  });

  // Update user participation
  const updateMutation = useMutation({
    mutationFn: ({ targetUserId, meals }: { targetUserId: number; meals: Record<string, boolean> }) =>
      updateUserParticipation({ target_user_id: targetUserId, meals }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'participation'] });
      queryClient.invalidateQueries({ queryKey: ['headcount'] });
      toast.success('User participation updated successfully!');
    },
    onError: () => {
      toast.error('Failed to update user participation. Please try again.');
    },
  });

  const handleMealToggle = (userId: number, mealType: MealType, currentValue: boolean) => {
    const user = users?.find((u) => u.user_id === userId);
    if (!user) return;

    const updatedMeals = {
      ...user.meals,
      [mealType]: !currentValue,
    };

    updateMutation.mutate({ targetUserId: userId, meals: updatedMeals });
  };

  const handleDeleteUser = () => {
    // Note: User deletion would need a separate API endpoint
    toast('User deletion is not yet implemented');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Group users by team for teams tab
  const teamsMap = users?.reduce((acc, user) => {
    const teamId = user.team_id || 0;
    if (!acc[teamId]) {
      acc[teamId] = { members: [], leads: [] };
    }
    acc[teamId].members.push(user);
    if (user.role === 'TeamLead') {
      acc[teamId].leads.push(user);
    }
    return acc;
  }, {} as Record<number, { members: typeof users; leads: typeof users }>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-2 text-gray-600">
          Manage users, teams, and system settings
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'users', label: 'Users', icon: '👥' },
              { id: 'teams', label: 'Teams', icon: '🏢' },
              { id: 'settings', label: 'Settings', icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'users' | 'teams' | 'settings')}
                className={`
                  flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                <span className="text-sm text-gray-500">
                  {users?.length || 0} users
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Meals
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users?.map((user) => (
                      <tr key={user.user_id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {user.name.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'Admin'
                                ? 'bg-purple-100 text-purple-800'
                                : user.role === 'TeamLead'
                                ? 'bg-blue-100 text-blue-800'
                                : user.role === 'Logistics'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.team_id ? `Team ${user.team_id}` : 'None'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {mealTypes.map((mealType) => (
                              <button
                                key={mealType}
                                onClick={() => handleMealToggle(user.user_id, mealType, user.meals[mealType])}
                                disabled={updateMutation.isPending}
                                className={`
                                  px-2 py-1 text-xs rounded border transition-colors
                                  ${
                                    user.meals[mealType]
                                      ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                                      : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                                  }
                                  ${updateMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                              >
                                {mealType.substring(0, 3)}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={handleDeleteUser}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Team Management</h2>
                <span className="text-sm text-gray-500">
                  {Object.keys(teamsMap || {}).length} teams
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(teamsMap || {}).map(([teamId, teamData]) => (
                  <div key={teamId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">
                        {teamId === '0' ? 'No Team' : `Team ${teamId}`}
                      </h3>
                      <span className="text-2xl">🏢</span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>Members: {teamData.members.length}</p>
                      <p>Team Leads: {teamData.leads.length}</p>
                      {teamData.leads.length > 0 && (
                        <p className="text-xs text-blue-600">
                          Lead: {teamData.leads.map((l) => l.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                        Edit
                      </button>
                      <button className="flex-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                        View Members
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">System Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    defaultValue="CraftMeal Inc."
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Contact admin to change</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Meal Time
                  </label>
                  <input
                    type="time"
                    defaultValue="12:00"
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Contact admin to change</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Email
                  </label>
                  <input
                    type="email"
                    defaultValue="admin@craftmeal.com"
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Contact admin to change</p>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive daily meal reminders</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-blue-600">
                    <span className="sr-only">Use setting</span>
                    <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                  </button>
                </div>

                <div className="pt-4">
                  <button className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

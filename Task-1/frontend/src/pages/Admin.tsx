import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type { MealType, UserRole, AdminUser, WorkLocationType } from '../types';
import { getAllParticipation, updateUserParticipation, getPendingUsers, approveUser, rejectUser, getAllUsers, deleteUser, updateUser } from '../features/admin/api';
import { getTeams } from '../features/users/api';
import { updateUserLocation } from '../features/locations/api';

const mealTypes: MealType[] = ['Lunch', 'Snacks', 'Iftar', 'EventDinner', 'OptionalDinner'];

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'Employee', label: 'Employee' },
  { value: 'TeamLead', label: 'Team Lead' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Logistics', label: 'Logistics' },
];

export function Admin() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'participation' | 'teams'>('pending');
  const [approveModalUser, setApproveModalUser] = useState<{ id: number; name: string; username: string } | null>(null);
  const [approveRole, setApproveRole] = useState<UserRole>('Employee');
  const [approveTeamId, setApproveTeamId] = useState<number | undefined>(undefined);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [editTeamId, setEditTeamId] = useState<number | undefined>(undefined);

  // Fetch all user participation data
  const { data: participationUsers, isLoading: participationLoading } = useQuery({
    queryKey: ['admin', 'participation'],
    queryFn: () => getAllParticipation(),
  });

  // Fetch all users (admin management)
  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: getAllUsers,
  });

  // Fetch pending users
  const { data: pendingUsers, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin', 'pending-users'],
    queryFn: getPendingUsers,
  });

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: getTeams,
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

  // Update user location mutation
  const updateLocationMutation = useMutation({
    mutationFn: ({ userId, date, location }: { userId: number; date: string; location: WorkLocationType }) =>
      updateUserLocation({ user_id: userId, date, location }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'participation'] });
      toast.success('User location updated successfully!');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Failed to update user location. Please try again.');
    },
  });

  const handleLocationChange = (userId: number, date: string, location: WorkLocationType) => {
    updateLocationMutation.mutate({ userId, date, location });
  };

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: ({ userId, role, teamId }: { userId: number; role: UserRole; teamId?: number }) =>
      approveUser({ user_id: userId, role, team_id: teamId || null }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'participation'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(data.message || 'User approved successfully!');
      setApproveModalUser(null);
      setApproveRole('Employee');
      setApproveTeamId(undefined);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const msg = err?.response?.data?.detail || 'Failed to approve user.';
      toast.error(msg);
    },
  });

  // Reject user mutation
  const rejectMutation = useMutation({
    mutationFn: (userId: number) => rejectUser(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(data.message || 'User rejected.');
    },
    onError: () => {
      toast.error('Failed to reject user. Please try again.');
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'participation'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-users'] });
      toast.success(data.message || 'User deleted.');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const msg = err?.response?.data?.detail || 'Failed to delete user.';
      toast.error(msg);
    },
  });

  // Update user role/team mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: { role?: string; team_id?: number | null } }) =>
      updateUser(userId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'participation'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success(data.message || 'User updated.');
      setEditingUser(null);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const msg = err?.response?.data?.detail || 'Failed to update user.';
      toast.error(msg);
    },
  });

  const handleMealToggle = (userId: number, mealType: MealType, currentValue: boolean) => {
    const user = participationUsers?.find((u) => u.user_id === userId);
    if (!user) return;

    const updatedMeals = {
      ...(user.meals || {}),
      [mealType]: !currentValue,
    };

    updateMutation.mutate({ targetUserId: userId, meals: updatedMeals });
  };

  const handleApproveSubmit = () => {
    if (!approveModalUser) return;
    approveMutation.mutate({
      userId: approveModalUser.id,
      role: approveRole,
      teamId: approveTeamId,
    });
  };

  const handleReject = (userId: number, username: string) => {
    if (window.confirm(`Are you sure you want to reject "${username}"?`)) {
      rejectMutation.mutate(userId);
    }
  };

  const handleDeleteUser = (userId: number, username: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${username}"? This cannot be undone.`)) {
      deleteMutation.mutate(userId);
    }
  };

  const handleEditSubmit = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      userId: editingUser.id,
      data: {
        role: editRole || undefined,
        team_id: editTeamId ?? undefined,
      },
    });
  };

  const pendingCount = pendingUsers?.length || 0;

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-purple-100 text-purple-800';
      case 'TeamLead': return 'bg-blue-100 text-blue-800';
      case 'Logistics': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-2 text-gray-600">
          Manage users, teams, and participation
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {([
              { id: 'pending' as const, label: 'Pending Users', icon: '🕐', badge: pendingCount },
              { id: 'users' as const, label: 'User Management', icon: '👥', badge: 0 },
              { id: 'participation' as const, label: 'Participation', icon: '🍽️', badge: 0 },
              { id: 'teams' as const, label: 'Teams', icon: '🏢', badge: 0 },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
                {tab.badge > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Pending Users Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Pending Registrations</h2>
                <span className="text-sm text-gray-500">{pendingCount} pending</span>
              </div>

              {pendingLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : pendingCount === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No pending registrations</p>
                  <p className="text-sm mt-1">New user registrations will appear here for approval.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingUsers?.map((pu) => (
                        <tr key={pu.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-yellow-600">{pu.name.charAt(0)}</span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{pu.name}</div>
                                <div className="text-sm text-gray-500">@{pu.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{pu.email}</td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button
                              onClick={() => setApproveModalUser({ id: pu.id, name: pu.name, username: pu.username })}
                              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(pu.id, pu.username)}
                              disabled={rejectMutation.isPending}
                              className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                <span className="text-sm text-gray-500">{allUsers?.length || 0} users</span>
              </div>

              {usersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allUsers?.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">{u.name.charAt(0)}</span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{u.name}</div>
                                <div className="text-sm text-gray-500">@{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(u.role)}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {u.team_name || (u.team_id ? `Team ${u.team_id}` : 'None')}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(u.status)}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditRole(u.role);
                                setEditTeamId(u.team_id ?? undefined);
                              }}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              disabled={deleteMutation.isPending}
                              className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Participation Tab */}
          {activeTab === 'participation' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Meal Participation</h2>
                <span className="text-sm text-gray-500">{participationUsers?.length || 0} users</span>
              </div>

              {participationLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meals</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {participationUsers?.map((user) => (
                        <tr key={user.user_id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">{user.name.charAt(0)}</span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                <div className="text-sm text-gray-500">@{user.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.team_id ? `Team ${user.team_id}` : 'None'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {user.role === 'Logistics' ? (
                              <span className="text-sm text-gray-500">-</span>
                            ) : (
                              <select
                                value={user.location || 'Office'}
                                onChange={(e) => handleLocationChange(user.user_id, user.date, e.target.value as WorkLocationType)}
                                disabled={updateLocationMutation.isPending}
                                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="Office">Office</option>
                                <option value="WFH">WFH</option>
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {mealTypes.map((mealType) => {
                                const mealValue = user.meals?.[mealType] ?? false;
                                return (
                                  <button
                                    key={mealType}
                                    onClick={() => handleMealToggle(user.user_id, mealType, mealValue)}
                                    disabled={updateMutation.isPending}
                                    className={`
                                      px-2 py-1 text-xs rounded border transition-colors
                                      ${mealValue
                                        ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                                        : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                                      }
                                      ${updateMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                  >
                                    {mealType.substring(0, 3)}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Team Overview</h2>
                <span className="text-sm text-gray-500">{teams?.length || 0} teams</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams?.map((team) => (
                  <div key={team.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{team.name}</h3>
                      <span className="text-xs text-gray-400">ID: {team.id}</span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>Members: {team.member_count || 0}</p>
                      {team.lead_name && (
                        <p className="text-xs text-blue-600">Lead: {team.lead_name}</p>
                      )}
                      {team.members && team.members.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-500 mb-2">Members:</p>
                          <div className="space-y-1">
                            {team.members.map((m) => (
                              <div key={m.user_id} className="flex items-center justify-between text-xs">
                                <span className="text-gray-700">{m.name}</span>
                                {m.meals && (
                                  <div className="flex gap-0.5">
                                    {mealTypes.map((mt) => (
                                      <span
                                        key={mt}
                                        className={`w-4 h-4 rounded text-center text-[10px] leading-4 ${
                                          m.meals?.[mt] ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'
                                        }`}
                                        title={`${mt}: ${m.meals?.[mt] ? 'In' : 'Out'}`}
                                      >
                                        {mt.charAt(0)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approve User Modal */}
      {approveModalUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Approve User: {approveModalUser.name}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Assign a role and team for <span className="font-medium">@{approveModalUser.username}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="approve-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  id="approve-role"
                  value={approveRole}
                  onChange={(e) => setApproveRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="approve-team" className="block text-sm font-medium text-gray-700 mb-1">Team (optional)</label>
                <select
                  id="approve-team"
                  value={approveTeamId ?? ''}
                  onChange={(e) => setApproveTeamId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No Team</option>
                  {teams?.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setApproveModalUser(null);
                  setApproveRole('Employee');
                  setApproveTeamId(undefined);
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveSubmit}
                disabled={approveMutation.isPending}
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit User: {editingUser.name}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Update role and team for <span className="font-medium">@{editingUser.username}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  id="edit-role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-team" className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                <select
                  id="edit-team"
                  value={editTeamId ?? ''}
                  onChange={(e) => setEditTeamId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No Team</option>
                  {teams?.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={updateUserMutation.isPending}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

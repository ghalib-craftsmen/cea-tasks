import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type { UserRole, AdminUser, AppSettings } from '../types';
import { getPendingUsers, approveUser, rejectUser, getAllUsers, deleteUser, updateUser, getSettings, updateSettings } from '../features/admin/api';
import { getTeams, getCurrentUser } from '../features/users/api';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'Employee', label: 'Employee' },
  { value: 'TeamLead', label: 'Team Lead' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Logistics', label: 'Logistics' },
];

export function Admin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const isAdmin = currentUser?.role === 'Admin';
  const isTeamLead = currentUser?.role === 'TeamLead';

  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'settings'>('pending');
  const [approveModalUser, setApproveModalUser] = useState<{ id: number; name: string; username: string } | null>(null);
  const [approveRole, setApproveRole] = useState<UserRole>('Employee');
  const [approveTeamId, setApproveTeamId] = useState<number | undefined>(undefined);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [editTeamId, setEditTeamId] = useState<number | undefined>(undefined);
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

  // Fetch settings
  const { data: settingsData } = useQuery<AppSettings>({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  const [cutoffHourOverride, setCutoffHourOverride] = useState<number | null>(null);
  const [cutoffMinuteOverride, setCutoffMinuteOverride] = useState<number | null>(null);
  const [scheduleForwardDaysOverride, setScheduleForwardDaysOverride] = useState<number | null>(null);

  const cutoffHour = cutoffHourOverride ?? settingsData?.cutoff_hour ?? 21;
  const cutoffMinute = cutoffMinuteOverride ?? settingsData?.cutoff_minute ?? 0;
  const scheduleForwardDays = scheduleForwardDaysOverride ?? settingsData?.schedule_forward_days ?? 14;

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<AppSettings>) => updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setCutoffHourOverride(null);
      setCutoffMinuteOverride(null);
      setScheduleForwardDaysOverride(null);
      toast.success('Settings updated successfully!');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Failed to update settings. Please try again.');
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      cutoff_hour: cutoffHour,
      cutoff_minute: cutoffMinute,
      schedule_forward_days: scheduleForwardDays,
    });
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
      toast.error(err?.response?.data?.detail || 'Failed to approve user.');
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
      toast.error('Failed to reject user.');
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
      toast.error(err?.response?.data?.detail || 'Failed to delete user.');
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
      toast.error(err?.response?.data?.detail || 'Failed to update user.');
    },
  });

  const handleApproveSubmit = () => {
    if (!approveModalUser) return;
    approveMutation.mutate({ userId: approveModalUser.id, role: approveRole, teamId: approveTeamId });
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
      data: { role: editRole || undefined, team_id: editTeamId ?? undefined },
    });
  };

  const pendingCount = pendingUsers?.length || 0;

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'TeamLead': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Logistics': return 'bg-teal-100 text-teal-800 border-teal-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

  const allTabs = [
    { id: 'pending' as const, label: 'Pending', badge: pendingCount, adminOnly: true },
    { id: 'users' as const, label: 'Users', badge: 0, adminOnly: true },
    { id: 'settings' as const, label: 'Settings', badge: 0, adminOnly: true },
  ];
  const tabs = allTabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{isTeamLead ? 'Team Participation' : 'Admin Panel'}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isTeamLead ? 'Manage meal participation for your team' : 'Manage users, meal participation, and settings'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 px-2">
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative px-5 py-3 text-sm font-medium rounded-t-lg transition-all
                  ${activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-red-500 text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">

          {/* ───── Pending Users Tab ───── */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Pending Registrations</h2>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{pendingCount} pending</span>
              </div>

              {pendingLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : pendingCount === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">No pending registrations</p>
                  <p className="text-xs mt-1">New user registrations will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingUsers?.map((pu) => (
                    <div key={pu.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-amber-700">{pu.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{pu.name}</p>
                          <p className="text-xs text-gray-500">@{pu.username} &middot; {pu.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setApproveModalUser({ id: pu.id, name: pu.name, username: pu.username })}
                          className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(pu.id, pu.username)}
                          disabled={rejectMutation.isPending}
                          className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ───── User Management Tab ───── */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{allUsers?.length || 0} users</span>
                  <button
                    onClick={() => navigate('/admin/users')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Create New User
                  </button>
                </div>
              </div>

              {usersLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Team</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {allUsers?.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-semibold text-blue-700">{u.name.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{u.name}</p>
                                <p className="text-xs text-gray-400">@{u.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRoleBadgeClass(u.role)}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {u.team_name || (u.team_id ? `Team ${u.team_id}` : '—')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(u.status)}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => { setEditingUser(u); setEditRole(u.role); setEditTeamId(u.team_id ?? undefined); }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                disabled={deleteMutation.isPending}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
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

          {/* ───── Settings Tab ───── */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Application Settings</h2>

              <div className="max-w-lg p-5 rounded-lg border border-gray-200 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Meal Cutoff Time
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Employees cannot update tomorrow's meal preferences after this time.
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={cutoffHour}
                      onChange={(e) => setCutoffHourOverride(Number(e.target.value))}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                        </option>
                      ))}
                    </select>
                    <span className="text-gray-400">:</span>
                    <select
                      value={cutoffMinute}
                      onChange={(e) => setCutoffMinuteOverride(Number(e.target.value))}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {[0, 15, 30, 45].map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  {settingsData && (
                    <p className="mt-2 text-xs text-gray-400">
                      Current: {settingsData.cutoff_hour === 0 ? '12' : settingsData.cutoff_hour > 12 ? settingsData.cutoff_hour - 12 : settingsData.cutoff_hour}:{String(settingsData.cutoff_minute).padStart(2, '0')} {settingsData.cutoff_hour >= 12 ? 'PM' : 'AM'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Scheduling Window
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    How many days ahead employees can set their meal and location preferences (1–90 days).
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={scheduleForwardDays}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v >= 1 && v <= 90) setScheduleForwardDaysOverride(v);
                      }}
                      className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-500">days</span>
                  </div>
                  {settingsData && (
                    <p className="mt-2 text-xs text-gray-400">
                      Current: {settingsData.schedule_forward_days ?? 14} days
                    </p>
                  )}
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  className="px-5 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ───── Approve User Modal ───── */}
      {approveModalUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Approve User</h3>
            <p className="text-sm text-gray-500 mb-5">
              Assign a role and team for <span className="font-medium text-gray-900">{approveModalUser.name}</span> (@{approveModalUser.username})
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="approve-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  id="approve-role"
                  value={approveRole}
                  onChange={(e) => setApproveRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No Team</option>
                  {teams?.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setApproveModalUser(null); setApproveRole('Employee'); setApproveTeamId(undefined); }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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

      {/* ───── Edit User Modal ───── */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Edit User</h3>
            <p className="text-sm text-gray-500 mb-5">
              Update role and team for <span className="font-medium text-gray-900">{editingUser.name}</span> (@{editingUser.username})
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  id="edit-role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No Team</option>
                  {teams?.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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

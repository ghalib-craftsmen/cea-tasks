import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { getAllParticipation, updateUserParticipation } from '../api';
import type { UserParticipation, MealType, ParticipationUpdateRequest } from '../../../types';
import { Table } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { Spinner } from '../../../components/ui/Spinner';

const mealTypes: { type: MealType; label: string; icon: string }[] = [
  { type: 'Lunch', label: 'Lunch', icon: '🍱' },
  { type: 'Snacks', label: 'Snacks', icon: '🍪' },
  { type: 'Iftar', label: 'Iftar', icon: '🌙' },
  { type: 'EventDinner', label: 'Event Dinner', icon: '🎉' },
  { type: 'OptionalDinner', label: 'Optional Dinner', icon: '🍽️' },
];

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserParticipation | null;
  onSave: (userId: number, meals: Record<MealType, boolean>) => void;
  isSaving: boolean;
}

function EditModal({ isOpen, onClose, user, onSave, isSaving }: EditModalProps) {
  const [localMeals, setLocalMeals] = useState<Record<MealType, boolean>>({
    Lunch: false,
    Snacks: false,
    Iftar: false,
    EventDinner: false,
    OptionalDinner: false,
  });

  if (user && JSON.stringify(localMeals) !== JSON.stringify(user.meals)) {
    setLocalMeals(user.meals);
  }

  const handleToggleMeal = (mealType: MealType) => {
    setLocalMeals((prev) => ({
      ...prev,
      [mealType]: !prev[mealType],
    }));
  };

  const handleSave = () => {
    if (user) {
      onSave(user.user_id, localMeals);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Meal Participation" size="lg">
      {user && (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">User Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium text-gray-900">{user.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium text-gray-900">{user.email}</span>
              </div>
              <div>
                <span className="text-gray-600">Role:</span>
                <span className="ml-2 font-medium text-gray-900">{user.role}</span>
              </div>
              <div>
                <span className="text-gray-600">Team:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {user.team_id ? `Team ${user.team_id}` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Meal Selection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mealTypes.map((meal) => {
                const isSelected = localMeals[meal.type] || false;
                return (
                  <button
                    key={meal.type}
                    type="button"
                    onClick={() => handleToggleMeal(meal.type)}
                    disabled={isSaving}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all duration-200 text-left
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                      ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{meal.icon}</span>
                        <span className="font-medium text-gray-900">{meal.label}</span>
                      </div>
                      {isSelected && (
                        <svg
                          className="w-5 h-5 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AdminDashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  const [selectedUser, setSelectedUser] = useState<UserParticipation | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch all user participation data using TanStack Query
  const { data: participationData, isLoading, error } = useQuery({
    queryKey: ['admin', 'participation'],
    queryFn: getAllParticipation,
    enabled: isAuthenticated,
  });

  // Update user participation mutation
  const updateMutation = useMutation({
    mutationFn: (data: ParticipationUpdateRequest) => updateUserParticipation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'participation'] });
      success('User participation updated successfully!');
      setIsEditModalOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      showError('Failed to update user participation. Please try again.');
    },
  });

  const canAccess = ['Admin', 'TeamLead', 'Logistics'].includes(user?.role || '');

  // Redirect unauthenticated users or unauthorized users
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleEditUser = (user: UserParticipation) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleSaveParticipation = (userId: number, meals: Record<MealType, boolean>) => {
    updateMutation.mutate({ target_user_id: userId, meals });
  };

  const renderMeals = (_value: unknown, row: Record<string, unknown>) => {
    const meals = row.meals as Record<MealType, boolean>;
    const selectedMeals = mealTypes.filter((meal) => meals[meal.type]);

    if (selectedMeals.length === 0) {
      return <span className="text-gray-400 italic">No meals selected</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {selectedMeals.map((meal) => (
          <span
            key={meal.type}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
            title={meal.label}
          >
            {meal.icon}
          </span>
        ))}
      </div>
    );
  };

  const renderRole = (value: unknown) => {
    const role = String(value);
    const roleColors: Record<string, string> = {
      Admin: 'bg-purple-100 text-purple-800',
      TeamLead: 'bg-blue-100 text-blue-800',
      Logistics: 'bg-orange-100 text-orange-800',
      Employee: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          roleColors[role] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {role}
      </span>
    );
  };

  const renderActions = (_value: unknown, row: Record<string, unknown>) => {
    return (
      <button
        onClick={() => handleEditUser(row as unknown as UserParticipation)}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
      >
        Edit
      </button>
    );
  };

  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'role', header: 'Role', sortable: true, render: renderRole },
    {
      key: 'team_id',
      header: 'Team',
      sortable: true,
      render: (value: unknown) => (value ? `Team ${value}` : 'N/A'),
    },
    { key: 'meals', header: 'Meal Choices', render: renderMeals },
    { key: 'actions', header: 'Actions', render: renderActions },
  ];

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
        <p className="text-red-800">Failed to load participation data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage meal participation for all users. View and update user meal choices.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">User Participation</h2>
              <p className="text-sm text-gray-500 mt-1">
                Showing {participationData?.length || 0} users
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <Table
            columns={columns}
            data={(participationData || []) as unknown as Record<string, unknown>[]}
            pageSize={15}
            className="w-full"
          />
        </div>
      </div>

      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSave={handleSaveParticipation}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}

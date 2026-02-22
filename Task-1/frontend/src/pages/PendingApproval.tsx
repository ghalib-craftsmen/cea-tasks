import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../features/users/api';
import { useAuth } from '../hooks/useAuth';
import { LogoutButton } from '../features/auth/components/LogoutButton';

export function PendingApproval() {
  const { user } = useAuth();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h1>
          <p className="text-gray-600">
            Hi{currentUser?.name ? `, ${currentUser.name}` : ''}! Your account has been created but is waiting for admin approval.
          </p>
          <p className="text-gray-500 text-sm mt-3">
            An administrator will review your account and assign you a role and team. You'll have full access once approved.
          </p>
        </div>

        {currentUser && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Your Details</h3>
            <p className="text-sm text-gray-600">Username: {currentUser.username}</p>
            <p className="text-sm text-gray-600">Email: {currentUser.email}</p>
            <p className="text-sm text-gray-600">
              Status: <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {currentUser.status || 'Pending'}
              </span>
            </p>
          </div>
        )}

        <LogoutButton />
      </div>
    </div>
  );
}

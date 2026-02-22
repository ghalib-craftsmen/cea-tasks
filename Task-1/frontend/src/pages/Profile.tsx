import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { getCurrentUser } from '../features/users/api';

export function Profile() {
  const { isAuthenticated } = useAuth();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-purple-100 text-purple-800';
      case 'TeamLead': return 'bg-blue-100 text-blue-800';
      case 'Logistics': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-2 text-gray-600">Your account details</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-md">
              <span className="text-2xl font-bold text-blue-600">
                {currentUser.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{currentUser.name}</h2>
              <p className="text-blue-100">@{currentUser.username}</p>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</label>
              <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Username</label>
              <p className="text-sm font-medium text-gray-900">@{currentUser.username}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</label>
              <p className="text-sm font-medium text-gray-900">{currentUser.email}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</label>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(currentUser.role)}`}>
                  {currentUser.role}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Team</label>
              <p className="text-sm font-medium text-gray-900">
                {currentUser.team_name || 'Not assigned'}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Account Status</label>
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  currentUser.status === 'Approved'
                    ? 'bg-green-100 text-green-800'
                    : currentUser.status === 'Pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {currentUser.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

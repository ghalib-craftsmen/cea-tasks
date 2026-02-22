import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { getCurrentUser } from '../features/users/api';
import { Spinner } from './ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (currentUser && currentUser.status !== 'Approved') {
    return <Navigate to="/pending" replace />;
  }

  return <>{children}</>;
};

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isAuthenticated } = useAuth();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (currentUser && currentUser.status !== 'Approved') {
    return <Navigate to="/pending" replace />;
  }

  if (currentUser?.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

interface AdminOrLogisticsRouteProps {
  children: React.ReactNode;
}

export const AdminOrLogisticsRoute = ({ children }: AdminOrLogisticsRouteProps) => {
  const { isAuthenticated } = useAuth();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (currentUser && currentUser.status !== 'Approved') {
    return <Navigate to="/pending" replace />;
  }

  const isAdmin = currentUser?.role === 'Admin';
  const isLogistics = currentUser?.role === 'Logistics';

  if (!isAdmin && !isLogistics) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

interface HeadcountRouteProps {
  children: React.ReactNode;
}

export const HeadcountRoute = ({ children }: HeadcountRouteProps) => {
  const { isAuthenticated } = useAuth();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (currentUser && currentUser.status !== 'Approved') {
    return <Navigate to="/pending" replace />;
  }

  const allowed = currentUser?.role === 'Admin' || currentUser?.role === 'Logistics' || currentUser?.role === 'TeamLead';

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

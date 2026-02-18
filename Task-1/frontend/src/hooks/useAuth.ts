import { useAuthStore } from '../store/useAuthStore';

export const useAuth = () => {
  const { user, token, setAuth, logout } = useAuthStore();

  const isAuthenticated = !!token;
  const isAdmin = user?.role === 'admin';

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    setAuth,
    logout,
  };
};

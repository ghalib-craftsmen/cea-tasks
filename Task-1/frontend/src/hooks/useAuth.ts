import { useAuthStore } from '../store/useAuthStore';
import { api } from '../lib/axios';
import type { LoginCredentials, AuthResponse } from '../types';

export const useAuth = () => {
  const { user, token, isAuthenticated, setAuth, logout } = useAuthStore();

  const login = async (credentials: LoginCredentials) => {
    try {
      // Login to get the token
      const response = await api.post<AuthResponse>('/api/auth/login', credentials);
      const { access_token } = response.data;
      
      // Set the token in the store (user info will be fetched later when needed)
      setAuth({ id: '', username: '', role: '' }, access_token);
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  };

  const isAdmin = user?.role === 'admin';

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    login,
    logout,
  };
};

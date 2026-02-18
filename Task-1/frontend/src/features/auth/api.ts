import { api } from '../../lib/axios';
import type {
  LoginCredentials,
  AuthResponse,
  LogoutResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from '../../types';

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', credentials);
  return response.data;
}

export async function logout(): Promise<LogoutResponse> {
  const response = await api.post<LogoutResponse>('/auth/logout');
  return response.data;
}

export async function register(request: RegisterRequest): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>('/auth/register', request);
  return response.data;
}

export async function getCurrentUser(): Promise<User> {
  const response = await api.get<User>('/auth/me');
  return response.data;
}

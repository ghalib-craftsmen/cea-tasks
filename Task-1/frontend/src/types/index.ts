export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  detail: string;
  status?: number;
}

export type UserStatus = 'Pending' | 'Approved' | 'Rejected';

export interface User {
  id: number;
  username: string;
  password?: string;
  name: string;
  email: string;
  role: UserRole;
  team_id?: number | null;
  team_name?: string | null;
  status?: UserStatus;
}

export type UserRole = 'Employee' | 'TeamLead' | 'Admin' | 'Logistics';

export interface Team {
  id: number;
  name: string;
  leadId: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface SelfRegisterRequest {
  username: string;
  password: string;
  name: string;
  email: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  name: string;
  email: string;
  role?: UserRole;
  team_id?: number | null;
}

export interface PendingUser {
  id: number;
  username: string;
  name: string;
  email: string;
  status: string;
}

export interface ApproveUserRequest {
  user_id: number;
  role: UserRole;
  team_id?: number | null;
}

export interface LogoutResponse {
  message: string;
  username: string;
}

export interface RegisterResponse {
  message: string;
  code: number;
}

export type MealType = 'Lunch' | 'Snacks' | 'Iftar' | 'EventDinner' | 'OptionalDinner';

export interface MealRecord {
  user_id: number;
  date: string;
  meals: Record<MealType, boolean>;
}

export interface ParticipationUpdate {
  meals: Record<MealType, boolean>;
  date?: string;
}

export interface UserParticipation {
  user_id: number;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  team_id?: number | null;
  date: string;
  meals: Record<MealType, boolean>;
}

export interface ParticipationUpdateRequest {
  target_user_id: number;
  meals: Record<MealType, boolean>;
}

export interface MealCountSummary {
  meal_type: string;
  total_employees: number;
  opted_in: number;
  opted_out: number;
  opted_in_percentage: number;
  opted_out_percentage: number;
}

export interface HeadcountSummary {
  date: string;
  total_employees: number;
  meal_counts: MealCountSummary[];
}

export interface MealUserDetail {
  user_id: number;
  name: string;
  team_id?: number | null;
  team_name?: string | null;
}

export interface MealUserList {
  meal_type: string;
  date: string;
  opted_in_count: number;
  users: MealUserDetail[];
}

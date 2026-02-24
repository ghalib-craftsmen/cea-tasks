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

export interface TeamMemberInfo {
  user_id: number;
  username: string;
  name: string;
  role: string;
  meals?: Record<MealType, boolean> | null;
}

export interface Team {
  id: number;
  name: string;
  leadId: number;
  lead_name?: string | null;
  member_count?: number;
  members?: TeamMemberInfo[] | null;
}

export interface AdminUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  team_id?: number | null;
  team_name?: string | null;
  status: string;
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
  location?: WorkLocationType;
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

export type WorkLocationType = 'Office' | 'WFH';

export type SpecialDayType = 'Closed' | 'Holiday' | 'Celebration';

export interface WorkLocation {
  user_id: number;
  date: string;
  location: WorkLocationType;
}

export interface WorkLocationUpdate {
  date: string;
  location: WorkLocationType;
}

export interface WorkLocationResponse {
  user_id: number;
  date: string;
  location: WorkLocationType;
}

export interface WorkLocationAdminUpdate {
  user_id: number;
  date: string;
  location: WorkLocationType;
}

export interface WFHPeriod {
  id: number;
  start_date: string;
  end_date: string;
}

export interface WFHPeriodCreate {
  start_date: string;
  end_date: string;
  team_id?: number | null;
}

export interface WFHPeriodResponse {
  id: number;
  start_date: string;
  end_date: string;
  team_id?: number;
}

export interface SpecialDay {
  id: number;
  date: string;
  type: SpecialDayType;
  note?: string | null;
}

export interface SpecialDayCreate {
  date: string;
  type: SpecialDayType;
  note?: string | null;
}

export interface SpecialDayResponse {
  id: number;
  date: string;
  type: SpecialDayType;
  note?: string | null;
}

export interface SpecialDayCheck {
  date: string;
  is_closed: boolean;
  type: SpecialDayType | null;
  note?: string | null;
}

export interface AppSettings {
  cutoff_hour: number;
  cutoff_minute: number;
  schedule_forward_days: number;
}

export interface HeadcountAggregationRow {
  team?: string | null;
  team_id?: number | null;
  meal: string;
  total_in: number;
  total_out: number;
  office_count: number;   
  wfh_count: number;      
  office_in: number;      
  wfh_in: number;        
}

export interface HeadcountAggregationResponse {
  date: string;
  data: HeadcountAggregationRow[];
}

export interface EventMealCreate {
  date: string;
  title: string;
  description?: string | null;
}

export interface EventMealResponse {
  id: number;
  date: string;
  title: string;
  description?: string | null;
  created_by: number;
}


export interface AuditLogResponse {
  id: number;
  timestamp: string;
  actor_user_id: number;
  actor_name?: string | null;
  target_user_id: number;
  target_name?: string | null;
  action_type: string;
  new_value: string;
  date?: string | null;
}

export interface WFHSummaryItem {
  user_id: number;
  name: string;
  team_id?: number | null;
  days_used: number;
  is_over_limit: boolean;
  allowance: number;
}

export interface EventMealSummary {
  id: number;
  date: string;
  title: string;
  description?: string | null;
}

export interface DashboardSummary {
  today_date: string;
  tomorrow_date: string;
  today_headcount: number;
  tomorrow_forecast: number;
  total_employees: number;
  upcoming_events: EventMealSummary[];
  wfh_over_limit_count: number;
  wfh_allowance: number;
}

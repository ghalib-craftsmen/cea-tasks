// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  detail: string;
  status?: number;
}

// User Types
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

// Auth Types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Meal Types
export interface Meal {
  id: string;
  name: string;
  date: string;
  type: 'lunch' | 'dinner';
  capacity: number;
  current_participants: number;
}

export interface MealParticipation {
  id: string;
  meal_id: string;
  user_id: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  created_at: string;
}

// Headcount Types
export interface Headcount {
  id: string;
  date: string;
  total_count: number;
  meal_counts: {
    lunch: number;
    dinner: number;
  };
}

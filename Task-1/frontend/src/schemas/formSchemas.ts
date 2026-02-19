import { z } from 'zod';


// Validates username and password fields for user authentication
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;


// Validates user registration fields including username, password, name, email, and optional role/team
export const registrationSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .trim()
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  role: z
    .enum(['Employee', 'TeamLead', 'Admin', 'Logistics'] as const)
    .optional(),
  team_id: z
    .number()
    .int('Team ID must be an integer')
    .positive('Team ID must be positive')
    .nullable()
    .optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;


// Validates date and meal selection fields for meal participation tracking
export const mealParticipationSchema = z.object({
  date: z
    .string()
    .min(1, 'Date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD'),
  meals: z.object({
    Lunch: z.boolean(),
    Snacks: z.boolean(),
    Iftar: z.boolean(),
    EventDinner: z.boolean(),
    OptionalDinner: z.boolean(),
  }),
});

export type MealParticipationFormData = z.infer<typeof mealParticipationSchema>;

// Helper type for meal type keys
export type MealTypeKey = keyof MealParticipationFormData['meals'];

// Default values for meal participation form
export const defaultMealParticipationValues: MealParticipationFormData = {
  date: new Date().toISOString().split('T')[0],
  meals: {
    Lunch: false,
    Snacks: false,
    Iftar: false,
    EventDinner: false,
    OptionalDinner: false,
  },
};

// Default values for login form
export const defaultLoginValues: LoginFormData = {
  username: '',
  password: '',
};


// Default values for registration form
export const defaultRegistrationValues: RegistrationFormData = {
  username: '',
  password: '',
  confirmPassword: '',
  name: '',
  email: '',
  role: undefined,
  team_id: null,
};

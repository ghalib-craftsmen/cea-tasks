import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import axios from 'axios';
import { useToast } from '../../../hooks/useToast';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import type { SelfRegisterRequest, RegisterResponse } from '../../../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const selfRegistrationSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50),
  name: z.string().min(1, 'Full name is required').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SelfRegistrationFormData = z.infer<typeof selfRegistrationSchema>;

export const RegistrationPage = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SelfRegistrationFormData>({
    resolver: zodResolver(selfRegistrationSchema),
    defaultValues: {
      username: '',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: SelfRegisterRequest) => {
      const response = await axios.post<RegisterResponse>(`${API_URL}/auth/register`, data);
      return response.data;
    },
    onSuccess: (data) => {
      success(data.message || 'Registration successful! Your account is pending admin approval.');
      navigate('/login');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || 'Registration failed. Please try again.';
      showError(errorMessage);
      setError('root', {
        type: 'manual',
        message: errorMessage,
      });
    },
  });

  const onSubmit = (data: SelfRegistrationFormData) => {
    registerMutation.mutate({
      username: data.username,
      password: data.password,
      name: data.name,
      email: data.email,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Register to get started. An admin will review and approve your account.
          </p>
        </div>

        {errors.root && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{errors.root.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            id="username"
            label="Username"
            type="text"
            placeholder="Enter your username"
            error={errors.username?.message}
            disabled={isSubmitting}
            {...register('username')}
          />

          <Input
            id="name"
            label="Full Name"
            type="text"
            placeholder="Enter your full name"
            error={errors.name?.message}
            disabled={isSubmitting}
            {...register('name')}
          />

          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="Enter your email"
            error={errors.email?.message}
            disabled={isSubmitting}
            {...register('email')}
          />

          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="Enter your password (min 8 characters)"
            error={errors.password?.message}
            disabled={isSubmitting}
            {...register('password')}
          />

          <Input
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            error={errors.confirmPassword?.message}
            disabled={isSubmitting}
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner size="sm" color="white" />
                <span>Creating account...</span>
              </div>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

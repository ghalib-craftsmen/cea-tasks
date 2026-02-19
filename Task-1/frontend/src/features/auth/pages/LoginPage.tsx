import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useApiPost } from '../../../hooks/useApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { useToast } from '../../../hooks/useToast';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import type { LoginCredentials, AuthResponse } from '../../../types';

const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { success, error: showError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const loginMutation = useApiPost<LoginCredentials, AuthResponse>('/auth/login', {
    onSuccess: (data) => {
      // Store the JWT token in useAuthStore
      // Note: We'll get user info from a separate call if needed
      setAuth({ id: '', username: '', role: '' }, data.access_token);
      success('Login successful! Redirecting to dashboard...');
      navigate('/dashboard');
    },
    onError: (error) => {
      // Show error message for invalid credentials
      showError(error.detail || 'Invalid credentials. Please try again.');
      setError('root', {
        type: 'manual',
        message: error.detail || 'Invalid credentials. Please try again.',
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
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
            id="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            error={errors.password?.message}
            disabled={isSubmitting}
            {...register('password')}
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
                <span>Signing in...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Contact administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

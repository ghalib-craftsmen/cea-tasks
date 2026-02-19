import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useApiPost } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { registrationSchema, type RegistrationFormData, defaultRegistrationValues } from '../../../schemas/formSchemas';
import type { RegisterRequest, RegisterResponse } from '../../../types';

const roleOptions = [
  { value: 'Employee', label: 'Employee' },
  { value: 'TeamLead', label: 'Team Lead' },
  { value: 'Admin', label: 'Admin' },
  { value: 'Logistics', label: 'Logistics' },
] as const;

export const RegistrationPage = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: defaultRegistrationValues,
  });

  const registerMutation = useApiPost<RegisterRequest, RegisterResponse>('/auth/register', {
    onSuccess: (data) => {
      success(data.message || 'Registration successful! Please log in.');
      navigate('/login');
    },
    onError: (error) => {
      // Show error message for registration failure
      const errorMessage = error.detail || 'Registration failed. Please try again.';
      showError(errorMessage);
      setError('root', {
        type: 'manual',
        message: errorMessage,
      });
    },
  });

  const onSubmit = (data: RegistrationFormData) => {
    // Remove confirmPassword before sending to API
    // Also convert empty string role to undefined
    const registerData = {
      username: data.username,
      password: data.password,
      name: data.name,
      email: data.email,
      role: data.role || undefined,
      team_id: data.team_id,
    };
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="mt-2 text-sm text-gray-600">Register to get started</p>
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

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              id="role"
              {...register('role')}
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select a role</option>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>

          <Input
            id="team_id"
            label="Team ID (Optional)"
            type="number"
            placeholder="Enter team ID"
            error={errors.team_id?.message}
            disabled={isSubmitting}
            {...register('team_id', { valueAsNumber: true })}
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

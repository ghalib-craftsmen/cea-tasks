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

const PANEL_ITEMS = [
  { emoji: '🍳',  top: '6%',    left: '7%',   size: '3.4rem', delay: '0s',   dur: '4.5s' },
  { emoji: '🥘',  top: '9%',    right: '8%',  size: '2.9rem', delay: '0.8s', dur: '5.2s' },
  { emoji: '🍜',  top: '34%',   left: '4%',   size: '3.1rem', delay: '1.5s', dur: '4.8s' },
  { emoji: '🥗',  top: '38%',   right: '5%',  size: '2.7rem', delay: '2.5s', dur: '5.6s' },
  { emoji: '🍱',  top: '62%',   left: '6%',   size: '2.8rem', delay: '0.4s', dur: '4.2s' },
  { emoji: '🫕',  top: '65%',   right: '7%',  size: '3rem',   delay: '1.9s', dur: '5s'   },
  { emoji: '🧆',  bottom: '14%', left: '12%',  size: '2.6rem', delay: '3.1s', dur: '6.2s' },
  { emoji: '🥙',  bottom: '9%',  right: '10%', size: '2.5rem', delay: '1.2s', dur: '4.6s' },
];

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
    <div className="min-h-screen flex">
      <style>{`
        @keyframes panelFloat {
          0%, 100% { transform: translateY(0px) rotate(-4deg) scale(1); }
          50%       { transform: translateY(-16px) rotate(5deg) scale(1.06); }
        }
      `}</style>

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[46%] relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 flex-col items-center justify-center p-14">
        {/* Blobs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-80 h-80 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />

        {/* Floating food items */}
        {PANEL_ITEMS.map(({ emoji, top, left, right, bottom, size, delay, dur }) => (
          <span
            key={emoji}
            style={{
              position: 'absolute',
              top, left, right, bottom,
              fontSize: size,
              lineHeight: 1,
              opacity: 0.2,
              userSelect: 'none',
              pointerEvents: 'none',
              animation: `panelFloat ${dur} ease-in-out ${delay} infinite`,
            }}
          >
            {emoji}
          </span>
        ))}

        {/* Brand content */}
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-white/30">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 14h18v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-1zm0-1a8 8 0 018-8 8 8 0 018 8H3zm8-6.5a1 1 0 01.5-.87 1 1 0 011 0 1 1 0 01.5.87v2a1 1 0 01-2 0v-2zM8.5 20h7l.5 1.5a.5.5 0 01-.47.5H8.47a.5.5 0 01-.47-.5L8.5 20z"/>
              </svg>
            </div>
            <span className="text-3xl font-extrabold text-white tracking-tight">CraftMeal</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3 leading-snug">
            Join your team<br />on CraftMeal
          </h2>
          <p className="text-orange-100 text-base leading-relaxed max-w-xs mx-auto mb-12">
            Create your account and start managing meal preferences with your team today.
          </p>

          {/* Steps */}
          <div className="space-y-5 text-left">
            {[
              { step: '1', text: 'Create your account' },
              { step: '2', text: 'Admin reviews & approves' },
              { step: '3', text: 'Start tracking meals' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3.5">
                <span className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center shrink-0 text-white text-xs font-bold">
                  {step}
                </span>
                <span className="text-orange-50 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="mt-10 p-4 bg-white/10 rounded-xl border border-white/20 text-left">
            <p className="text-orange-100 text-xs leading-relaxed">
              <span className="font-semibold text-white">Note:</span> New accounts require admin approval before you can log in.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-10 sm:px-12 overflow-y-auto">

        {/* Mobile logo */}
        <a href="/" className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="h-9 w-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 14h18v1a3 3 0 01-3 3H6a3 3 0 01-3-3v-1zm0-1a8 8 0 018-8 8 8 0 018 8H3zm8-6.5a1 1 0 01.5-.87 1 1 0 011 0 1 1 0 01.5.87v2a1 1 0 01-2 0v-2zM8.5 20h7l.5 1.5a.5.5 0 01-.47.5H8.47a.5.5 0 01-.47-.5L8.5 20z"/>
            </svg>
          </div>
          <span className="text-xl font-bold">
            <span className="text-orange-600">Craft</span><span className="text-gray-900">Meal</span>
          </span>
        </a>

        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-3xl font-bold text-gray-900 mb-1.5">Create account</h1>
            <p className="text-gray-500 text-sm">Register to get started. Your account needs admin approval.</p>
          </div>

          {/* Error */}
          {errors.root && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{errors.root.message}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="username"
              label="Username"
              type="text"
              placeholder="Choose a username"
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
              placeholder="Min. 8 characters"
              error={errors.password?.message}
              disabled={isSubmitting}
              {...register('password')}
            />

            <Input
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              error={errors.confirmPassword?.message}
              disabled={isSubmitting}
              {...register('confirmPassword')}
            />

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size="sm" color="white" />
                    Creating account…
                  </span>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </form>

          {/* Footer */}
          <p className="mt-7 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <a href="/login" className="font-semibold text-orange-600 hover:text-orange-700 transition-colors">
              Sign in
            </a>
          </p>
          <p className="mt-3 text-center">
            <a href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Back to home
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

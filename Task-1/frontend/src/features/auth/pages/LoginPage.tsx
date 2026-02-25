import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useApiPost } from '../../../hooks/useApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { useToast } from '../../../hooks/useToast';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { loginSchema, type LoginFormData, defaultLoginValues } from '../../../schemas/formSchemas';
import type { LoginCredentials, AuthResponse } from '../../../types';

const PANEL_ITEMS = [
  { emoji: '🍽️', top: '7%',    left: '8%',   size: '3.5rem', delay: '0s',   dur: '4.2s' },
  { emoji: '🥗',  top: '10%',   right: '9%',  size: '2.8rem', delay: '1s',   dur: '5s'   },
  { emoji: '🥘',  top: '36%',   left: '4%',   size: '3rem',   delay: '1.8s', dur: '4.6s' },
  { emoji: '🍱',  top: '40%',   right: '6%',  size: '2.6rem', delay: '0.5s', dur: '5.4s' },
  { emoji: '🍜',  bottom: '20%', left: '10%',  size: '3.1rem', delay: '2.2s', dur: '4.8s' },
  { emoji: '🍛',  bottom: '11%', right: '8%',  size: '2.7rem', delay: '1.4s', dur: '5.2s' },
  { emoji: '🥙',  top: '64%',   left: '38%',  size: '2.4rem', delay: '3s',   dur: '6s'   },
];

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
    defaultValues: defaultLoginValues,
  });

  const loginMutation = useApiPost<LoginCredentials, AuthResponse>('/auth/login', {
    onSuccess: (data) => {
      setAuth({ id: '', username: '', role: '' }, data.access_token);
      success('Login successful! Redirecting to dashboard...');
      navigate('/dashboard');
    },
    onError: (error) => {
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
            Smart meal planning<br />for modern teams
          </h2>
          <p className="text-orange-100 text-base leading-relaxed max-w-xs mx-auto mb-12">
            Effortless daily meal coordination — from preferences to headcount, all in one place.
          </p>

          <div className="space-y-4 text-left">
            {['Daily meal preferences', 'Real-time team headcount', 'Role-based access control'].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-orange-50 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12 sm:px-12">

        {/* Mobile logo */}
        <a href="/" className="lg:hidden flex items-center gap-2.5 mb-10">
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-1.5">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to your CraftMeal account to continue.</p>
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" color="white" />
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <a href="/register" className="font-semibold text-orange-600 hover:text-orange-700 transition-colors">
              Create one
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

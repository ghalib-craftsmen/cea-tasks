import type { ReactNode } from 'react';

export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'white';
  className?: string;
  fullScreen?: boolean;
  message?: string;
  children?: ReactNode;
}

export const LoadingSpinner = ({
  size = 'md',
  color = 'primary',
  className = '',
  fullScreen = false,
  message,
  children,
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    xs: 'w-4 h-4 border-2',
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-14 h-14 border-4',
    xl: 'w-20 h-20 border-4',
  };

  const colorClasses = {
    primary: 'border-blue-600 border-t-transparent',
    secondary: 'border-gray-600 border-t-transparent',
    success: 'border-green-600 border-t-transparent',
    danger: 'border-red-600 border-t-transparent',
    warning: 'border-yellow-600 border-t-transparent',
    info: 'border-cyan-600 border-t-transparent',
    white: 'border-white border-t-transparent',
  };

  const spinnerElement = (
    <div
      className={`inline-block rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );

  const content = children || spinnerElement;

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
        {spinnerElement}
        {message && (
          <p className="mt-4 text-gray-700 font-medium animate-pulse">{message}</p>
        )}
      </div>
    );
  }

  if (message) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        {spinnerElement}
        <p className="mt-4 text-gray-700 font-medium animate-pulse">{message}</p>
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;

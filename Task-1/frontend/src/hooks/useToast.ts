import { useCallback } from 'react';
import { Toast } from '../components/ui/toastUtils';

export interface UseToastReturn {
  success: (message: string, options?: { duration?: number; id?: string }) => void;
  error: (message: string, options?: { duration?: number; id?: string }) => void;
  info: (message: string, options?: { duration?: number; id?: string }) => void;
  dismiss: (toastId?: string) => void;
}

/**
 * Custom hook for displaying toast notifications
 * Provides success, error, and info toast methods with consistent positioning and styling
 * Default position: top-right
 * Default duration: 5 seconds (5000ms)
 */
export function useToast(): UseToastReturn {
  const success = useCallback((message: string, options?: { duration?: number; id?: string }) => {
    return Toast.success(message, {
      duration: options?.duration || 5000,
      position: 'top-right',
      id: options?.id,
    });
  }, []);

  const error = useCallback((message: string, options?: { duration?: number; id?: string }) => {
    return Toast.error(message, {
      duration: options?.duration || 5000,
      position: 'top-right',
      id: options?.id,
    });
  }, []);

  const info = useCallback((message: string, options?: { duration?: number; id?: string }) => {
    return Toast.info(message, {
      duration: options?.duration || 5000,
      position: 'top-right',
      id: options?.id,
    });
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    Toast.dismiss(toastId);
  }, []);

  return {
    success,
    error,
    info,
    dismiss,
  };
}

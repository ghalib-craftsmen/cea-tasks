import { QueryClient } from '@tanstack/react-query';
import { Toast } from '../components/ui/toastUtils';
import type { ApiError } from '../hooks/useApi';


export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: (failureCount, error) => {
          const apiError = error as unknown as ApiError;
          if (apiError.status === 401 || apiError.status === 403 || apiError.status === 404) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: (failureCount, error) => {
          const apiError = error as unknown as ApiError;
          if (apiError.status === 401 || apiError.status === 403 || apiError.status === 404) {
            return false;
          }
          return failureCount < 1;
        },
      },
    },
  });
}


export function handleQueryError(error: unknown, context?: { queryKey?: unknown[] }): void {
  console.error('Query error:', error, context);

  if (error && typeof error === 'object' && 'detail' in error) {
    const apiError = error as ApiError & { detail: string; status?: number };

    if (apiError.status === 401) {
      return;
    }

    Toast.error(apiError.detail || 'An error occurred while fetching data');
    return;
  }

  if (error instanceof Error) {
    if (error.message.includes('Network Error')) {
      Toast.error('Network error. Please check your connection and try again.');
      return;
    }

    Toast.error(error.message || 'An unexpected error occurred');
    return;
  }

  Toast.error('An unexpected error occurred. Please try again.');
}


export function handleMutationError(error: unknown, variables?: unknown, context?: unknown): void {
  console.error('Mutation error:', error, variables, context);

  if (error && typeof error === 'object' && 'detail' in error) {
    const apiError = error as ApiError & { detail: string; status?: number };

    if (apiError.status === 401) {
      return;
    }

    Toast.error(apiError.detail || 'An error occurred while saving data');
    return;
  }

  if (error instanceof Error) {
    if (error.message.includes('Network Error')) {
      Toast.error('Network error. Please check your connection and try again.');
      return;
    }

    Toast.error(error.message || 'An unexpected error occurred');
    return;
  }

  Toast.error('An unexpected error occurred. Please try again.');
}


export function handleMutationSuccess(data: unknown, variables?: unknown, context?: unknown): void {
  console.log('Mutation success:', data, variables, context);

  if (data && typeof data === 'object' && 'message' in data) {
    Toast.success((data as { message: string }).message || 'Operation completed successfully');
  }
}

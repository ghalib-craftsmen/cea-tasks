import { useMutation, useQuery, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { api } from '../lib/axios';
import type { AxiosError } from 'axios';

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  detail: string;
  status?: number;
}

export function useApiGet<T>(
  queryKey: readonly unknown[],
  url: string,
  options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get<T>(url);
      return response.data;
    },
    ...options,
  });
}

export function useApiPost<TData, TResponse>(
  url: string,
  options?: Omit<UseMutationOptions<TResponse, ApiError, TData>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: async (data: TData) => {
      const response = await api.post<TResponse>(url, data);
      return response.data;
    },
    ...options,
  });
}

export function useApiPut<TData, TResponse>(
  url: string,
  options?: Omit<UseMutationOptions<TResponse, ApiError, TData>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: async (data: TData) => {
      const response = await api.put<TResponse>(url, data);
      return response.data;
    },
    ...options,
  });
}

export function useApiDelete<TResponse>(
  url: string,
  options?: Omit<UseMutationOptions<TResponse, ApiError, void>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: async () => {
      const response = await api.delete<TResponse>(url);
      return response.data;
    },
    ...options,
  });
}

export function handleApiError(error: unknown): ApiError {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError<{ detail: string }>;
    if (axiosError.response?.data?.detail) {
      return {
        detail: axiosError.response.data.detail,
        status: axiosError.response.status,
      };
    }
  }
  return {
    detail: 'An unexpected error occurred',
  };
}

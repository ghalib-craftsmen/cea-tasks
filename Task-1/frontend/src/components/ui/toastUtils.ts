import toast from 'react-hot-toast';

export interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  id?: string;
}

export const Toast = {
  success: (message: string, options?: ToastOptions) => {
    return toast.success(message, {
      duration: options?.duration || 5000,
      position: options?.position || 'top-right',
      id: options?.id,
      className: 'bg-white text-gray-900 shadow-lg rounded-lg border border-green-200',
    });
  },

  error: (message: string, options?: ToastOptions) => {
    return toast.error(message, {
      duration: options?.duration || 5000,
      position: options?.position || 'top-right',
      id: options?.id,
      className: 'bg-white text-gray-900 shadow-lg rounded-lg border border-red-200',
    });
  },

  info: (message: string, options?: ToastOptions) => {
    return toast(message, {
      duration: options?.duration || 5000,
      position: options?.position || 'top-right',
      id: options?.id,
      icon: 'ℹ️',
      className: 'bg-white text-gray-900 shadow-lg rounded-lg border border-blue-200',
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    return toast(message, {
      duration: options?.duration || 5000,
      position: options?.position || 'top-right',
      id: options?.id,
      icon: '⚠️',
      className: 'bg-white text-gray-900 shadow-lg rounded-lg border border-yellow-200',
    });
  },

  loading: (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      position: options?.position || 'top-right',
      id: options?.id,
      className: 'bg-white text-gray-900 shadow-lg rounded-lg border border-gray-200',
    });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
    options?: ToastOptions,
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    }, {
      position: options?.position || 'top-right',
      id: options?.id,
      success: {
        className: 'bg-white text-gray-900 shadow-lg rounded-lg border border-green-200',
        duration: options?.duration || 5000,
      },
      error: {
        className: 'bg-white text-gray-900 shadow-lg rounded-lg border border-red-200',
        duration: options?.duration || 5000,
      },
    });
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },

  remove: () => {
    toast.remove();
  },
};

export { toast };

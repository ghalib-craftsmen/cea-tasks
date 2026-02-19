import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes';
import { createQueryClient } from './lib/reactQuery';

const queryClient = createQueryClient();

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Global Error Boundary caught:', error, errorInfo);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

import { createBrowserRouter } from 'react-router-dom';
import { AuthFeature } from '../features/auth';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Layout } from '../components/Layout';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthFeature />,
  },
  {
    path: '/',
    element: (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-6">
            Welcome to CraftMeal
          </h1>
          <p className="text-gray-600 text-center mb-6">
            Your meal planning and headcount management system
          </p>
          <div className="space-y-4">
            <a
              href="/login"
              className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-medium transition-colors"
            >
              Login
            </a>
          </div>
        </div>
      </div>
    ),
  },
  {
    path: '/dashboard',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <div className="p-8">
              <h1 className="text-3xl font-bold">Welcome to CraftMeal</h1>
              <p className="mt-4 text-gray-600">This is a protected page. You are authenticated!</p>
            </div>
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

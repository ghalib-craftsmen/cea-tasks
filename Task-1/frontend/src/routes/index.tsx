import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ProtectedRoute, AdminRoute } from '../components/ProtectedRoute';
import { Layout } from '../components/Layout';
import { Dashboard } from '../pages/Dashboard';
import { Meals } from '../pages/Meals';
import { Admin } from '../pages/Admin';
import { Headcount } from '../pages/Headcount';
import { NotFound } from '../pages/NotFound';

const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
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
    path: '/',
    element: <Layout />,
    children: [
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'meals',
        element: (
          <ProtectedRoute>
            <Meals />
          </ProtectedRoute>
        ),
      },
      {
        path: 'headcount',
        element: (
          <ProtectedRoute>
            <Headcount />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <Admin />
          </AdminRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

export const router = createBrowserRouter(routes);

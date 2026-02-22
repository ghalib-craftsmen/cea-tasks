import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { ProtectedRoute, AdminRoute, AdminOrLogisticsRoute, HeadcountRoute } from '../components/ProtectedRoute';
import { Layout } from '../components/Layout';
import { Loading } from '../components/ui/Loading';

// Lazy load page components
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegistrationPage = lazy(() => import('../features/auth/pages/RegistrationPage').then(m => ({ default: m.RegistrationPage })));
const DashboardPage = lazy(() => import('../features/meals/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AdminDashboardPage = lazy(() => import('../features/admin/pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const UserManagementPage = lazy(() => import('../features/admin/pages/UserManagementPage').then(m => ({ default: m.UserManagementPage })));
const HeadcountSummaryPage = lazy(() => import('../features/headcount/pages/HeadcountSummaryPage').then(m => ({ default: m.HeadcountSummaryPage })));
const Dashboard = lazy(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Meals = lazy(() => import('../pages/Meals').then(m => ({ default: m.Meals })));
const Admin = lazy(() => import('../pages/Admin').then(m => ({ default: m.Admin })));
const Headcount = lazy(() => import('../pages/Headcount').then(m => ({ default: m.Headcount })));
const Profile = lazy(() => import('../pages/Profile').then(m => ({ default: m.Profile })));
const PendingApproval = lazy(() => import('../pages/PendingApproval').then(m => ({ default: m.PendingApproval })));
const NotFound = lazy(() => import('../pages/NotFound').then(m => ({ default: m.NotFound })));

const routes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <Suspense fallback={<Loading />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/register',
    element: (
      <Suspense fallback={<Loading />}>
        <RegistrationPage />
      </Suspense>
    ),
  },
  {
    path: '/pending',
    element: (
      <Suspense fallback={<Loading />}>
        <PendingApproval />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-6 tracking-tight">
            Welcome to <span className="text-orange-600">Craft</span><span className="text-gray-900">Meal</span>
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
            <a
              href="/register"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 text-center font-medium transition-colors"
            >
              Register
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
            <Suspense fallback={<Loading />}>
              <Dashboard />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'meals',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <Meals />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'meals/dashboard',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <DashboardPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <Profile />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'headcount',
        element: (
          <HeadcountRoute>
            <Suspense fallback={<Loading />}>
              <Headcount />
            </Suspense>
          </HeadcountRoute>
        ),
      },
      {
        path: 'headcount/team/:teamId',
        element: (
          <HeadcountRoute>
            <Suspense fallback={<Loading />}>
              <Headcount />
            </Suspense>
          </HeadcountRoute>
        ),
      },
      {
        path: 'headcount/summary',
        element: (
          <AdminOrLogisticsRoute>
            <Suspense fallback={<Loading />}>
              <HeadcountSummaryPage />
            </Suspense>
          </AdminOrLogisticsRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <Suspense fallback={<Loading />}>
              <Admin />
            </Suspense>
          </AdminRoute>
        ),
      },
      {
        path: 'admin/dashboard',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<Loading />}>
              <AdminDashboardPage />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <Suspense fallback={<Loading />}>
            <UserManagementPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<Loading />}>
        <NotFound />
      </Suspense>
    ),
  },
];

export const router = createBrowserRouter(routes);

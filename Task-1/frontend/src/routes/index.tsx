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
const Home = lazy(() => import('../pages/Home').then(m => ({ default: m.Home })));
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
      <Suspense fallback={<Loading />}>
        <Home />
      </Suspense>
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

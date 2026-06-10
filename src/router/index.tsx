import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { AuthLayout } from '../components/layout/AuthLayout';
import { AppLayout } from '../components/layout/AppLayout';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';
import DashboardPage from '../pages/DashboardPage';
import CheckinPage from '../pages/CheckinPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import ApiKeysPage from '../pages/ApiKeysPage';
import AccountsPage from '../pages/AccountsPage';
import OAuthCallbackPage from '../pages/OAuthCallbackPage';
import GroupsPage from '../pages/GroupsPage';
import UsagePage from '../pages/UsagePage';
import BalanceTransactionsPage from '../pages/BalanceTransactionsPage';
import AdminUsagePage from '../pages/AdminUsagePage';
import ModelPricesPage from '../pages/ModelPricesPage';
import UsersPage from '../pages/admin/UsersPage';
import ApiKeysAdminPage from '../pages/admin/ApiKeysAdminPage';
import BalanceTransactionsAdminPage from '../pages/admin/BalanceTransactionsAdminPage';
import ProfilePage from '../pages/ProfilePage';

function AuthGuard() {
  const token = useAuthStore((s) => s.token);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  if (isAuthenticating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-dark-950">
        <div className="animate-spin h-10 w-10 rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;

  // Redirect admin users away from user routes
  const path = window.location.pathname;
  if (isAdmin && path === '/dashboard') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}

function AdminGuard() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const token = useAuthStore((s) => s.token);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);

  if (isAuthenticating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-dark-950">
        <div className="animate-spin h-10 w-10 rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

function GuestGuard() {
  const token = useAuthStore((s) => s.token);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  if (token) {
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  return <Outlet />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth pages (redirect if already logged in) */}
        <Route element={<GuestGuard />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
          </Route>
        </Route>

        {/* User routes */}
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/checkin" element={<CheckinPage />} />
            <Route path="/api-keys" element={<ApiKeysPage />} />
            <Route path="/usage" element={<UsagePage />} />
            <Route path="/balance-transactions" element={<BalanceTransactionsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Admin routes */}
        <Route element={<AdminGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/accounts" element={<AccountsPage />} />
            <Route path="/admin/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/admin/groups" element={<GroupsPage />} />
            <Route path="/admin/usage" element={<AdminUsagePage />} />
            <Route path="/admin/model-prices" element={<ModelPricesPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/balance-transactions" element={<BalanceTransactionsAdminPage />} />
            <Route path="/admin/api-keys" element={<ApiKeysAdminPage />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

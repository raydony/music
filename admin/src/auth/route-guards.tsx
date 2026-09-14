import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './auth-context';

function AuthLoading() {
  return (
    <div className="auth-loading" aria-label="正在验证登录状态">
      <Spin size="large" />
    </div>
  );
}

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <AuthLoading />;
  }

  if (status !== 'authenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return <Outlet />;
}

export function LoginRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <AuthLoading />;
  }

  return status === 'authenticated' ? <Navigate to="/" replace /> : <Outlet />;
}

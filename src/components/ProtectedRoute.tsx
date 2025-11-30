import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserRoleStore } from '../stores/userRoleStore';
import type { Permission } from '../permissions';
import { ROUTES } from '../AppRoutes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { user, hasPermission, loading } = useUserRoleStore();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (loading) return;

    if (!user) {
      // Redirect to landing page if not authenticated
      navigate(ROUTES.ROOT, { replace: true });
      return;
    }

    if (requiredPermission && !hasPermission(requiredPermission)) {
      // For admin routes, redirect to user dashboard
      if (location.pathname.startsWith('/admin')) {
        navigate(ROUTES.DASHBOARD, { replace: true });
      } else {
        // For other protected routes, redirect to dashboard
        navigate(ROUTES.DASHBOARD, { replace: true });
      }
      return;
    }
  }, [user, hasPermission, requiredPermission, loading, navigate, location.pathname]);

  if (loading || !user || (requiredPermission && !hasPermission(requiredPermission))) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
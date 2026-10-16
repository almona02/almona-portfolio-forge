import { useAuth } from '@/context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, requireAdmin = false }: { children: JSX.Element; requireAdmin?: boolean }) => {
  const { user, supabaseUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user && !supabaseUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // A session without a resolved profile must never grant privileged UI access.
  // Database/API authorization remains the enforcement boundary.
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

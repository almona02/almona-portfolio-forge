import { useAuth } from '@/context/AuthContext';
import { buildReturnPath } from '@/lib/auth/safeReturnPath';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requireRoles,
}: {
  children: JSX.Element;
  requireAdmin?: boolean;
  /** When set, profile role must be one of these values (DB remains the authority). */
  requireRoles?: string[];
}) => {
  const { user, supabaseUser, loading, isProfileResolved } = useAuth();
  const location = useLocation();
  const needsRole = requireAdmin || Boolean(requireRoles?.length);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user && !supabaseUser) {
    // Preserve intended internal destination (pathname + search + hash) for post-login return.
    return <Navigate to="/login" replace state={{ from: buildReturnPath(location) }} />;
  }

  // Role-gated routes must wait for the real profiles row. An optimistic
  // placeholder role of "customer" must not bounce technicians/support to "/".
  if (needsRole && supabaseUser && !isProfileResolved) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  // A session without a resolved profile must never grant privileged UI access.
  // Database/API authorization remains the enforcement boundary.
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  if (requireRoles?.length) {
    const role = user?.role;
    if (!role || !requireRoles.includes(role)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!loading && user) return;
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [loading, user]);

  if (loading) {
    console.log('[ProtectedRoute] Loading...', { user: !!user, timedOut });
    if (timedOut && !user) {
      console.log('[ProtectedRoute] Timed out, redirecting');
      return <Navigate to="/login" replace />;
    }
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting');
    return <Navigate to="/login" replace />;
  }

  console.log('[ProtectedRoute] Access granted');
  return children;
};

export default ProtectedRoute;

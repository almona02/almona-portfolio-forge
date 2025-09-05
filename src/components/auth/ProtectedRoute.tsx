import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!loading && user) return;
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [loading, user]);

  if (loading) {
    if (timedOut && !user) {
      return <Navigate to="/login" replace />;
    }
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

export default ProtectedRoute;

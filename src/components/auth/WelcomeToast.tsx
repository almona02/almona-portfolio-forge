import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * WelcomeToast
 * Wraps the app to show a welcome message one time per session.
 */
export const WelcomeToast: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.full_name) {
      const sessionKey = 'welcome_toast_shown_session';
      const lastSession = sessionStorage.getItem(sessionKey);
      
      // Simple session check - only show once per browser tab session
      if (!lastSession) {
        toast.success(`Welcome back, ${user.full_name}`, {
          duration: 4000,
          position: 'top-center'
        });
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, [user?.full_name]); // Depend on full_name so we show it once it's loaded

  return null;
};

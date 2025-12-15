
 
import React, { useState, useEffect, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { withErrorBoundary } from '@/hocs/withErrorBoundary';

const Login = () => {
  const { t } = useTranslation('translation');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // kept for transition; will sync with actionLoading
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { signIn: login, user, actionLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Defer toast and navigation to avoid blocking the login interaction
      requestAnimationFrame(() => {
        toast.success('Logged in successfully!');
        // Use startTransition for navigation to improve INP
        startTransition(() => {
          navigate('/');
        });
      });
    }
  }, [user, navigate]);

  // Load remembered email from local storage (browser "remember me")
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('almona_login_email');
      if (stored) {
        setEmail(stored);
        setRememberMe(true);
      }
    } catch {
      // ignore storage issues
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      // Persist email for next time if remember me is checked
      try {
        if (rememberMe) {
          window.localStorage.setItem('almona_login_email', email);
        } else {
          window.localStorage.removeItem('almona_login_email');
        }
      } catch {
        // ignore storage issues
      }
      // On some mobile browsers auth state propagation can be delayed; navigate optimistically.
      navigate('/', { replace: true });
    } catch (error: any) {
      // Extract polished error message
      const errorMessage = error?.message || error?.error?.message || 'We were unable to complete your login request. Please verify your credentials and try again.';
      setError(errorMessage);
      
      // Show toast with refined error message
      toast.error(errorMessage, {
        duration: 6000, // Show for 6 seconds to ensure users can read the message
        style: {
          background: 'rgba(220, 38, 38, 0.95)',
          color: '#fff',
          fontSize: '14px',
          padding: '16px',
          borderRadius: '8px',
        },
      });
      
      // Log full error for debugging (detailed logging for support team)
      console.error('Login error details:', {
        message: errorMessage,
        originalError: error,
        email: email ? `${email.substring(0, 3)}***` : 'not provided',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark">
      <main 
        className="flex-grow flex items-center justify-center p-4 bg-cover bg-center relative" 
        style={{ backgroundImage: "url('/images/machines/cutting-machine.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-almona-dark/55 via-almona-dark/20 to-almona-dark/65 backdrop-blur-[1px]" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md mx-auto backdrop-blur-lg bg-black/60 rounded-2xl shadow-2xl overflow-hidden"
        >
          <Card className="bg-transparent border-0 text-white">
            <CardHeader className="text-center p-8 lg:mt-10">
              <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
                <CardTitle className="text-4xl font-bold text-gradient-orange">{t('auth.welcome_back', 'Welcome back, Fabricator')}</CardTitle>
              </motion.div>
              <CardDescription className="text-gray-300 pt-2">
                {t('auth.sign_in_to_continue', 'Sign in to continue to Almona')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <Alert variant="destructive" className="mb-6 bg-red-500/20 border-red-500/50 text-red-300">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.email', 'Email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder={t('auth.email_placeholder', 'you@example.com')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light"
                      />
                    </div>
                  </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('auth.password', 'Password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('auth.password_placeholder', '••••••••')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pl-10 pr-10 bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                  </div>
                </motion.div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="remember-me" className="text-sm text-gray-300">
                      {t('auth.remember_me', 'Remember me on this browser')}
                    </Label>
                  </div>
                  <a href="#" className="text-sm text-almona-light hover:underline">
                    {t('auth.forgot_password', 'Forgot password?')}
                  </a>
                </div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
                  <Button type="submit" className="w-full bg-gradient-orange hover:bg-almona-orange-dark text-white font-bold py-3" disabled={loading || actionLoading}>
                    {loading || actionLoading ? t('auth.signing_in', 'Signing In...') : t('auth.sign_in', 'Sign In')}
                  </Button>
                </motion.div>
              </form>
              
              <div className="mt-8 text-center text-sm text-gray-400">
                {t('auth.dont_have_account', "Don't have an account?")}{' '}
                <a href="/register" className="font-medium text-almona-light hover:underline">
                  {t('auth.sign_up', 'Sign up')}
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default withErrorBoundary(Login);
            

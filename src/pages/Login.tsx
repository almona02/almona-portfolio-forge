
 
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button-gold-tier';
import { GoldTierCard as Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card-gold-tier';
import { Checkbox } from '@/components/ui/checkbox';
import { GoldTierInput as Input, PasswordInput } from '@/components/ui/input-gold-tier';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { FADE_IN, SCALE_IN, SLIDE_UP } from '@/lib/animations/motion';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import React, { startTransition, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { withErrorBoundary } from '@/hocs/withErrorBoundary';

const Login = () => {
  const { t } = useTranslation('translation');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const { signIn: login, user, actionLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      requestAnimationFrame(() => {
        toast.success('Logged in successfully!');
        startTransition(() => {
          navigate('/');
        });
      });
    }
  }, [user, navigate]);

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
      try {
        if (rememberMe) {
          window.localStorage.setItem('almona_login_email', email);
        } else {
          window.localStorage.removeItem('almona_login_email');
        }
      } catch {
        // ignore storage issues
      }
      navigate('/', { replace: true });
    } catch (error: any) {
      const errorMessage = error?.message || error?.error?.message || 'We were unable to complete your login request. Please verify your credentials and try again.';
      setError(errorMessage);
      
      toast.error(errorMessage, {
        duration: 6000,
        style: {
          background: 'rgba(220, 38, 38, 0.95)',
          color: '#fff',
          fontSize: '14px',
          padding: '16px',
          borderRadius: '8px',
        },
      });
      
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
          variants={SCALE_IN}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md mx-auto backdrop-blur-xl bg-black/40 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
        >
          <Card className="bg-transparent border-0 text-white shadow-none">
            <CardHeader className="text-center p-8 lg:mt-6">
              <motion.div variants={SLIDE_UP}>
                <CardTitle className="text-4xl font-bold text-gradient-gold drop-shadow-sm">{t('auth.welcome_back', 'Welcome back')}</CardTitle>
              </motion.div>
              <CardDescription className="text-gray-300 pt-2 font-medium">
                {t('auth.sign_in_to_continue', 'Sign in to continue to Almona')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              {error && (
                <motion.div variants={FADE_IN}>
                  <Alert variant="destructive" className="mb-6 bg-red-500/20 border-red-500/50 text-red-100 backdrop-blur-md">
                    <AlertDescription className="font-medium">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <motion.div variants={SLIDE_UP} custom={1}>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-amber-100/80 font-medium">{t('auth.email', 'Email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('auth.email_placeholder', 'you@example.com')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      leftIcon={<Mail className="h-4 w-4" />}
                      className="bg-black/50 border-amber-500/20 focus:border-amber-400 text-white placeholder:text-gray-500"
                    />
                  </div>
                </motion.div>

                <motion.div variants={SLIDE_UP} custom={2}>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-amber-100/80 font-medium">{t('auth.password', 'Password')}</Label>
                    <PasswordInput
                      id="password"
                      placeholder={t('auth.password_placeholder', '••••••••')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-black/50 border-amber-500/20 focus:border-amber-400 text-white placeholder:text-gray-500"
                    />
                  </div>
                </motion.div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:text-black"
                    />
                    <Label htmlFor="remember-me" className="text-sm text-gray-300 font-normal cursor-pointer">
                      {t('auth.remember_me', 'Remember me')}
                    </Label>
                  </div>
                  <a href="#" className="text-sm text-amber-400 hover:text-amber-300 transition-colors">
                    {t('auth.forgot_password', 'Forgot password?')}
                  </a>
                </div>

                <motion.div variants={SLIDE_UP} custom={3}>
                  <Button 
                    type="submit" 
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading || actionLoading}
                    loadingText={t('auth.signing_in', 'Signing In...')}
                    className="font-bold shadow-lg shadow-amber-900/20"
                  >
                    {t('auth.sign_in', 'Sign In')}
                  </Button>
                </motion.div>
              </form>
              
              <div className="mt-8 text-center text-sm text-gray-400">
                {t('auth.dont_have_account', "Don't have an account?")}{' '}
                <a href="/register" className="font-semibold text-amber-500 hover:text-amber-400 hover:underline transition-colors">
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
            

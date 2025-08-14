
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { FacebookLoginButton } from '@/components/auth/FacebookLoginButton';
import { SmsOtpModal } from '@/components/auth/SmsOtpModal';

const Login = () => {
  const [email, setEmail] = useState('almona02@yahoo.com');
  const [password, setPassword] = useState('momo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSmsOtpModal, setShowSmsOtpModal] = useState(false);
  const { signIn: login, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      toast.success('Logged in successfully!');
      navigate('/');
    } catch (error: any) {
      setError(error.message || 'Login failed. Please check your credentials.');
      toast.error(error.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // Redirect will be handled by Supabase OAuth flow
    } catch (error: any) {
      setError(error.message || 'Google sign-in failed.');
      toast.error(error.message || 'Google sign-in failed.');
    }
  };

  const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.804 9.81C34.553 6.186 29.658 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039L38.804 9.81C34.553 6.186 29.658 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 35.245 44 30.028 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark">
      <Navbar />
      <main 
        className="flex-grow flex items-center justify-center p-4 bg-cover bg-center relative" 
        style={{ backgroundImage: "url('/images/machines/processing-center.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-almona-dark/80 via-transparent to-almona-dark/80" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md mx-auto backdrop-blur-lg bg-black/60 rounded-2xl shadow-2xl overflow-hidden"
        >
          <Card className="bg-transparent border-0 text-white">
            <CardHeader className="text-center p-8">
              <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
                <CardTitle className="text-4xl font-bold text-gradient-orange">Welcome Back</CardTitle>
              </motion.div>
              <CardDescription className="text-gray-300 pt-2">
                Sign in to continue to Almona
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
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
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
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
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
                <div className="flex items-center justify-end">
                  <a href="#" className="text-sm text-almona-light hover:underline">
                    Forgot password?
                  </a>
                </div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
                  <Button type="submit" className="w-full bg-gradient-orange hover:bg-almona-orange-dark text-white font-bold py-3" disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </motion.div>
              </form>
              
              <div className="my-6 flex items-center">
                <div className="flex-grow border-t border-gray-600"></div>
                <span className="mx-4 text-gray-400 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-600"></div>
              </div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }} className="space-y-4">
                <Button onClick={handleGoogleSignIn} variant="outline" className="w-full bg-transparent border-almona-light/30 hover:bg-almona-light/10 flex items-center justify-center">
                  <GoogleIcon />
                  Sign In with Google
                </Button>
                <FacebookLoginButton onSuccess={() => navigate('/')} />
                <Button onClick={() => setShowSmsOtpModal(true)} variant="outline" className="w-full bg-transparent border-almona-light/30 hover:bg-almona-light/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Login with Phone Number
                </Button>
              </motion.div>

              <div className="mt-8 text-center text-sm text-gray-400">
                Don't have an account?{' '}
                <a href="/register" className="font-medium text-almona-light hover:underline">
                  Sign up
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      {showSmsOtpModal && (
        <SmsOtpModal
          isOpen={showSmsOtpModal}
          onClose={() => setShowSmsOtpModal(false)}
          onSuccess={() => {
            toast.success('Logged in successfully with phone number!');
            navigate('/');
          }}
        />
      )}
      <Footer />
    </div>
  );
};

export default Login;
            


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

const Login = () => {
  const [email, setEmail] = useState('almona02@yahoo.com');
  const [password, setPassword] = useState('momo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-almona-dark">
      <Navbar />
      <main className="flex-grow flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: "url('/images/machines/processing-center.jpg')" }}>
        <div className="w-full max-w-md mx-auto backdrop-blur-sm bg-white/30 dark:bg-black/50 rounded-2xl shadow-xl">
          <Card className="bg-transparent border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">Welcome Back</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Sign in to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-200">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/80 dark:bg-almona-dark/80 border-gray-300 dark:border-almona-light focus:ring-2 focus:ring-almona-light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 dark:text-gray-200">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/80 dark:bg-almona-dark/80 border-gray-300 dark:border-almona-light focus:ring-2 focus:ring-almona-light"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <a href="#" className="text-sm text-almona-light hover:underline">
                    Forgot password?
                  </a>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:from-orange-600 hover:to-yellow-600" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
                Or continue with
              </div>
              <Button onClick={handleGoogleSignIn} className="w-full mt-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 dark:bg-almona-dark dark:text-white dark:border-almona-light dark:hover:bg-almona-darker">
                Sign In with Google
              </Button>
              <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
                Don't have an account?{' '}
                <a href="/signup" className="font-medium text-almona-light hover:underline">
                  Sign up
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Login;

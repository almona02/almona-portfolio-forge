
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Logged in successfully!');
      navigate('/'); // Redirect to home or previous page
    } catch (error: any) {
      toast.error(error.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24 flex items-center justify-center">
        <Card className="w-full max-w-md bg-almona-darker border-almona-light">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gradient-orange text-center">Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-almona-dark border-almona-light"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-almona-dark border-almona-light"
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-orange" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Login;

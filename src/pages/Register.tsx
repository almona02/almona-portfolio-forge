import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, User, Mail, Lock, Building, Factory } from 'lucide-react';
import { toast } from 'sonner';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string()
    .regex(/^\+20[0-9]{10}$/, 'Phone must be +20 followed by 10 digits')
    .min(12, 'Phone must be +20 followed by 10 digits')
    .max(13, 'Phone must be +20 followed by 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  company: z.string().optional(),
  sector: z.enum(['ALUMINIUM', 'UPVC'], {
    errorMap: () => ({ message: 'Please select a sector' })
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const Register = () => {
  const { signUp, loading } = useAuth();
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await signUp(data);
      toast.success('Registration successful! Please check your email to verify your account.');
    } catch (err) {
      toast.error(err.message || 'Registration failed.');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (!value.startsWith('20')) {
      value = '20' + value;
    }
    if (value.length > 12) {
      value = value.slice(0, 12);
    }
    setValue('phone', '+' + value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fill-rule=evenodd%3E%3Cg fill=%239C92AC fill-opacity=0.05%3E%3Cpath d=M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z/%3E%3C/g%3E%3C/g%3E%3C/svg%3E)] opacity-20"></div>
      
      <Card className="w-full max-w-md bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Factory className="h-12 w-12 text-amber-500 animate-pulse" />
              <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping"></div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-slate-100">
            Industrial Account Registration
          </CardTitle>
          <CardTitle className="text-sm text-center text-slate-400">
            Join our industrial machinery network
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Enter your full name"
                  className="pl-10 bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:ring-amber-500"
                />
              </div>
              {errors.name && <p className="text-red-400 text-sm">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="Enter your email"
                  className="pl-10 bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:ring-amber-500"
                />
              </div>
              {errors.email && <p className="text-red-400 text-sm">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="phone"
                  type="tel"
                  value={watch('phone') || '+20'}
                  onChange={handlePhoneChange}
                  placeholder="+20XXXXXXXXXX"
                  maxLength={13}
                  className="pl-10 bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:ring-amber-500"
                />
              </div>
              {errors.phone && <p className="text-red-400 text-sm">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Enter your password"
                  className="pl-10 bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:ring-amber-500"
                />
              </div>
              {errors.password && <p className="text-red-400 text-sm">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  placeholder="Confirm your password"
                  className="pl-10 bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:ring-amber-500"
                />
              </div>
              {errors.confirmPassword && <p className="text-red-400 text-sm">{errors.confirmPassword.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-slate-300">Company Name (Optional)</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="company"
                  {...register('company')}
                  placeholder="Enter your company name"
                  className="pl-10 bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector" className="text-slate-300">Industry Sector</Label>
              <div className="flex space-x-4 justify-center mt-2">
                <button
                  type="button"
                  onClick={() => setValue('sector', 'ALUMINIUM')}
                  className={`flex flex-col items-center p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                    watch('sector') === 'ALUMINIUM'
                      ? 'bg-amber-500 text-slate-900 shadow-[0_0_10px_#f59e0b]'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-amber-500 hover:text-slate-900'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M9 21V9" />
                  </svg>
                  ALUMINIUM
                </button>
                <button
                  type="button"
                  onClick={() => setValue('sector', 'UPVC')}
                  className={`flex flex-col items-center p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                    watch('sector') === 'UPVC'
                      ? 'bg-amber-500 text-slate-900 shadow-[0_0_10px_#f59e0b]'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-amber-500 hover:text-slate-900'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M9 21V9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 21V9" />
                  </svg>
                  UPVC
                </button>
              </div>
              {errors.sector && <p className="text-red-400 text-sm">{errors.sector.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registering...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;

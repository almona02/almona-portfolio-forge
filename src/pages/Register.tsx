import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Phone, User, Mail, Lock, Building, Factory, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const egyptianCities = [
  "Cairo", "Alexandria", "Giza", "Shubra El-Kheima", "Port Said", "Suez",
  "Luxor", "al-Mansura", "El-Mahalla El-Kubra", "Tanta", "Asyut", "Ismailia",
  "Fayyum", "Zagazig", "Aswan", "Damietta", "Damanhur", "al-Minya",
  "Beni Suef", "Qena", "Sohag", "Hurghada", "6th of October City", "Shibin El Kom",
  "Banha", "Kafr el-Sheikh", "Arish", "Belbeis", "Mersa Matruh",
  "10th of Ramadan City", "New Cairo", "Heliopolis", "Nasr City"
];

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
  workshopCity: z.string().min(1, 'Please select a city'),
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
                <CardTitle className="text-4xl font-bold text-gradient-orange">Create Your Account</CardTitle>
              </motion.div>
              <CardDescription className="text-gray-300 pt-2">
                Join our network of industry professionals
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input id="name" {...register('name')} placeholder="John Doe" className="pl-10 bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light" />
                    </div>
                    {errors.name && <p className="text-red-400 text-sm">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input id="email" type="email" {...register('email')} placeholder="you@example.com" className="pl-10 bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light" />
                    </div>
                    {errors.email && <p className="text-red-400 text-sm">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input id="phone" type="tel" value={watch('phone') || '+20'} onChange={handlePhoneChange} placeholder="+20XXXXXXXXXX" maxLength={13} className="pl-10 bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light" />
                  </div>
                  {errors.phone && <p className="text-red-400 text-sm">{errors.phone.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input id="password" type="password" {...register('password')} placeholder="••••••••" className="pl-10 bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light" />
                    </div>
                    {errors.password && <p className="text-red-400 text-sm">{errors.password.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input id="confirmPassword" type="password" {...register('confirmPassword')} placeholder="••••••••" className="pl-10 bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light" />
                    </div>
                    {errors.confirmPassword && <p className="text-red-400 text-sm">{errors.confirmPassword.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name (Optional)</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input id="company" {...register('company')} placeholder="Almona Inc." className="pl-10 bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workshopCity">Workshop City</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Select onValueChange={(value) => setValue('workshopCity', value)}>
                        <SelectTrigger className="pl-10 bg-almona-dark/80 border-almona-light/30 focus:ring-2 focus:ring-almona-light focus:border-almona-light">
                          <SelectValue placeholder="Select your city" />
                        </SelectTrigger>
                        <SelectContent className="bg-almona-dark/95 text-white border-almona-light/30">
                          {egyptianCities.map(city => (
                            <SelectItem key={city} value={city} className="hover:bg-almona-light/10">{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {errors.workshopCity && <p className="text-red-400 text-sm">{errors.workshopCity.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Industry Sector</Label>
                  <div className="flex space-x-4 justify-center pt-2">
                    <button type="button" onClick={() => setValue('sector', 'ALUMINIUM')} className={`flex-1 flex flex-col items-center p-4 rounded-lg cursor-pointer transition-all duration-300 border-2 ${watch('sector') === 'ALUMINIUM' ? 'border-almona-orange bg-almona-orange/10' : 'border-almona-light/30 bg-almona-dark/80 hover:bg-almona-light/10'}`}>
                      <Factory className="h-8 w-8 mb-2" />
                      ALUMINIUM
                    </button>
                    <button type="button" onClick={() => setValue('sector', 'UPVC')} className={`flex-1 flex flex-col items-center p-4 rounded-lg cursor-pointer transition-all duration-300 border-2 ${watch('sector') === 'UPVC' ? 'border-almona-orange bg-almona-orange/10' : 'border-almona-light/30 bg-almona-dark/80 hover:bg-almona-light/10'}`}>
                      <Building className="h-8 w-8 mb-2" />
                      UPVC
                    </button>
                  </div>
                  {errors.sector && <p className="text-red-400 text-sm">{errors.sector.message}</p>}
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
                  <Button type="submit" className="w-full bg-gradient-orange hover:bg-almona-orange-dark text-white font-bold py-3 mt-4" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </motion.div>
              </form>
              <div className="mt-6 text-center text-sm text-gray-400">
                Already have an account?{' '}
                <a href="/login" className="font-medium text-almona-light hover:underline">
                  Sign in
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Register;

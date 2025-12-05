import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Phone, User, Mail, Lock, Building, Factory, MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
// import Navbar from '@/components/layout/Navbar';
// import Footer from '@/components/layout/Footer';
import { useState } from 'react';
import { withErrorBoundary } from '@/hocs/withErrorBoundary';

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
  workshopLocation: z.string().min(1, 'Please select a location'),
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
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const totalSteps = 3;

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await signUp({
        email: data.email,
        password: data.password,
        full_name: data.name,
        company_name: data.company,
        phone: data.phone,
        sector: data.sector
      });
      toast.success('Registration successful! Please check your email to verify your account.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed.';
      toast.error(errorMessage);
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

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div key={index} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            index + 1 === currentStep 
              ? 'bg-almona-orange text-white' 
              : index + 1 < currentStep 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-600 text-gray-300'
          }`}>
            {index + 1 < currentStep ? '✓' : index + 1}
          </div>
          {index < totalSteps - 1 && (
            <div className={`w-16 h-1 mx-2 ${index + 1 < currentStep ? 'bg-green-500' : 'bg-gray-600'}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <main 
        className="flex-grow flex items-center justify-center p-4 bg-cover bg-center relative py-12" 
        style={{ backgroundImage: "url('/images/machines/cutting-machine.jpg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-almona-dark/90 via-almona-dark/70 to-almona-dark/90" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full max-w-4xl mx-auto mt-6 sm:mt-8 lg:mt-12 backdrop-blur-xl bg-black/50 rounded-3xl shadow-2xl overflow-hidden border border-almona-light/20"
        >
          <Card className="bg-transparent border-0 text-white">
            <CardHeader className="text-center p-8 pb-6 lg:mt-10">
              <motion.div 
                initial={{ y: -20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex items-center justify-center mb-2"
              >
                <Sparkles className="h-8 w-8 text-almona-orange mr-2" />
                <CardTitle className="text-4xl font-bold text-gradient-orange">Join Almona Network</CardTitle>
              </motion.div>
              <CardDescription className="text-gray-300 pt-2 text-lg">
                Register to access exclusive industry resources and support
              </CardDescription>
            </CardHeader>

            {renderStepIndicator()}

            <CardContent className="p-8 pt-0">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="name" className="text-almona-light">Full Name</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-almona-light/70" />
                            <Input 
                              id="name" 
                              {...register('name')} 
                              placeholder="John Doe" 
                              className="pl-10 bg-almona-dark/60 border-almona-light/30 focus:ring-2 focus:ring-almona-orange focus:border-almona-orange h-12" 
                            />
                          </div>
                          {errors.name && (
                            <motion.p 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-red-400 text-sm"
                            >
                              {errors.name.message}
                            </motion.p>
                          )}
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="email" className="text-almona-light">Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-almona-light/70" />
                            <Input 
                              id="email" 
                              type="email" 
                              {...register('email')} 
                              placeholder="you@example.com" 
                              className="pl-10 bg-almona-dark/60 border-almona-light/30 focus:ring-2 focus:ring-almona-orange focus:border-almona-orange h-12" 
                            />
                          </div>
                          {errors.email && (
                            <motion.p 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-red-400 text-sm"
                            >
                              {errors.email.message}
                            </motion.p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="phone" className="text-almona-light">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-almona-light/70" />
                          <Input 
                            id="phone" 
                            type="tel" 
                            value={watch('phone') || '+20'} 
                            onChange={handlePhoneChange} 
                            placeholder="+20XXXXXXXXXX" 
                            maxLength={13} 
                            className="pl-10 bg-almona-dark/60 border-almona-light/30 focus:ring-2 focus:ring-almona-orange focus:border-almona-orange h-12" 
                          />
                        </div>
                        {errors.phone && (
                          <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm"
                          >
                            {errors.phone.message}
                          </motion.p>
                        )}
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button 
                          type="button" 
                          onClick={nextStep}
                          className="bg-gradient-orange hover:bg-almona-orange-dark text-white font-bold py-3 px-8 flex items-center"
                        >
                          Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="password" className="text-almona-light">Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-almona-light/70" />
                            <Input 
                              id="password" 
                              type="password" 
                              {...register('password')} 
                              placeholder="••••••••" 
                              className="pl-10 bg-almona-dark/60 border-almona-light/30 focus:ring-2 focus:ring-almona-orange focus:border-almona-orange h-12" 
                            />
                          </div>
                          {errors.password && (
                            <motion.p 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-red-400 text-sm"
                            >
                              {errors.password.message}
                            </motion.p>
                          )}
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="confirmPassword" className="text-almona-light">Confirm Password</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-almona-light/70" />
                            <Input 
                              id="confirmPassword" 
                              type="password" 
                              {...register('confirmPassword')} 
                              placeholder="••••••••" 
                              className="pl-10 bg-almona-dark/60 border-almona-light/30 focus:ring-2 focus:ring-almona-orange focus:border-almona-orange h-12" 
                            />
                          </div>
                          {errors.confirmPassword && (
                            <motion.p 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-red-400 text-sm"
                            >
                              {errors.confirmPassword.message}
                            </motion.p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="company" className="text-almona-light">Company Name (Optional)</Label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-almona-light/70" />
                          <Input 
                            id="company" 
                            {...register('company')} 
                            placeholder="Almona Inc." 
                            className="pl-10 bg-almona-dark/60 border-almona-light/30 focus:ring-2 focus:ring-almona-orange focus:border-almona-orange h-12" 
                          />
                        </div>
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button 
                          type="button" 
                          onClick={prevStep}
                          variant="outline"
                          className="border-almona-light/30 text-almona-light hover:bg-almona-light/10"
                        >
                          Back
                        </Button>
                        <Button 
                          type="button" 
                          onClick={nextStep}
                          className="bg-gradient-orange hover:bg-almona-orange-dark text-white font-bold py-3 px-8 flex items-center"
                        >
                          Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="workshopLocation" className="text-almona-light">Workshop Location</Label>
                          <motion.div 
                            className="relative"
                            animate={selectedLocation ? { scale: [1, 1.02, 1] } : {}}
                            transition={{ duration: 0.3 }}
                          >
                            <motion.div
                              animate={selectedLocation ? { 
                                color: '#ff6b35',
                                scale: [1, 1.1, 1]
                              } : {}}
                              transition={{ duration: 0.4 }}
                            >
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-almona-light/70 z-10" />
                            </motion.div>
                            <Select onValueChange={(value) => {
                              setValue('workshopLocation', value);
                              setSelectedLocation(value);
                            }}>
                              <SelectTrigger className={`pl-10 h-12 transition-all duration-300 ${
                                selectedLocation 
                                  ? 'bg-almona-orange/10 border-almona-orange shadow-lg shadow-almona-orange/20 ring-2 ring-almona-orange/30' 
                                  : 'bg-almona-dark/60 border-almona-light/30 focus:ring-2 focus:ring-almona-orange focus:border-almona-orange'
                              }`}>
                                <SelectValue 
                                  placeholder="Select your location" 
                                  className={selectedLocation ? 'text-almona-orange font-medium' : ''}
                                />
                              </SelectTrigger>
                              <SelectContent className="bg-almona-dark/95 text-white border-almona-light/30 backdrop-blur-xl">
                                {egyptianCities.map(city => (
                                  <SelectItem 
                                    key={city} 
                                    value={city} 
                                    className="hover:bg-almona-orange/20 focus:bg-almona-orange/20 transition-colors duration-200"
                                  >
                                    <motion.div
                                      whileHover={{ x: 4 }}
                                      className="flex items-center"
                                    >
                                      <MapPin className="h-4 w-4 mr-2 text-almona-orange/70" />
                                      {city}
                                    </motion.div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedLocation && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 z-10"
                              >
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 0.5 }}
                                  className="w-5 h-5 rounded-full bg-almona-orange flex items-center justify-center"
                                >
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-white text-xs font-bold"
                                  >
                                    ✓
                                  </motion.span>
                                </motion.div>
                              </motion.div>
                            )}
                          </motion.div>
                          {selectedLocation && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center text-almona-orange text-sm font-medium"
                            >
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 0.5, repeat: 2 }}
                              >
                                ✨
                              </motion.div>
                              <span className="ml-1">Location selected: {selectedLocation}</span>
                            </motion.div>
                          )}
                          {errors.workshopLocation && (
                            <motion.p 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-red-400 text-sm"
                            >
                              {errors.workshopLocation.message}
                            </motion.p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-almona-light">Industry Sector</Label>
                        <div className="flex space-x-4 justify-center pt-2">
                          <motion.button 
                            type="button" 
                            onClick={() => setValue('sector', 'ALUMINIUM')} 
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            className={`flex-1 flex flex-col items-center p-4 rounded-lg cursor-pointer transition-all duration-300 border-2 ${watch('sector') === 'ALUMINIUM' ? 'border-almona-orange bg-almona-orange/10' : 'border-almona-light/30 bg-almona-dark/60 hover:bg-almona-light/10'}`}
                          >
                            <Factory className="h-8 w-8 mb-2" />
                            ALUMINIUM
                          </motion.button>
                          <motion.button 
                            type="button" 
                            onClick={() => setValue('sector', 'UPVC')} 
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            className={`flex-1 flex flex-col items-center p-4 rounded-lg cursor-pointer transition-all duration-300 border-2 ${watch('sector') === 'UPVC' ? 'border-almona-orange bg-almona-orange/10' : 'border-almona-light/30 bg-almona-dark/60 hover:bg-almona-light/10'}`}
                          >
                            <Building className="h-8 w-8 mb-2" />
                            UPVC
                          </motion.button>
                        </div>
                        {errors.sector && (
                          <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-400 text-sm"
                          >
                            {errors.sector.message}
                          </motion.p>
                        )}
                      </div>

                      <div className="flex justify-between pt-4">
                        <Button 
                          type="button" 
                          onClick={prevStep}
                          variant="outline"
                          className="border-almona-light/30 text-almona-light hover:bg-almona-light/10"
                        >
                          Back
                        </Button>
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          transition={{ delay: 0.5, duration: 0.5 }}
                        >
                          <Button 
                            type="submit" 
                            className="bg-gradient-orange hover:bg-almona-orange-dark text-white font-bold py-3 px-8" 
                            disabled={loading}
                          >
                            {loading ? 'Creating Account...' : 'Complete Registration'}
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-8 text-center text-sm text-gray-400 border-t border-almona-light/20 pt-6"
              >
                Already have an account?{' '}
                <a href="/login" className="font-medium text-almona-orange hover:underline">
                  Sign in
                </a>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </>
  );
};

export default withErrorBoundary(Register);
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { lazy, Suspense } from 'react';
import { FormSkeleton } from '@/components/ui/FormSkeleton';

const MachineRegistrationEnhanced = lazy(() => import('@/components/services/MachineRegistration').then(m => ({ default: m.MachineRegistrationEnhanced })));

const RegisterMachinePage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-almona-dark text-white">
      <Navbar />
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-gradient-orange text-center">Register New Machine</h1>
          <Suspense fallback={<FormSkeleton />}> 
            <MachineRegistrationEnhanced />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RegisterMachinePage;
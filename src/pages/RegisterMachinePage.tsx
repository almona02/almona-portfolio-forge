import { lazy, Suspense } from 'react';
import { FormSkeleton } from '@/components/ui/FormSkeleton';

const MachineRegistrationEnhanced = lazy(() => import('@/components/services/MachineRegistration').then(m => ({ default: m.MachineRegistrationEnhanced })));

const RegisterMachinePage = () => {
  return (
    <>
      <main className="flex-grow pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <h1 className="typography-h1 sm:text-4xl mb-8 text-gradient-orange text-center">Register New Machine</h1>
          <Suspense fallback={<FormSkeleton />}> 
            <MachineRegistrationEnhanced />
          </Suspense>
        </div>
      </main>
    </>
  );
};

export default RegisterMachinePage;
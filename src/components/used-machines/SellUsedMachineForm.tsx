import React, { useState, useEffect } from 'react';
import { Progress } from '@/shared/ui/ui/progress';
import { Button } from '@/shared/ui/ui/button';
import MachineSpecsForm from './MachineSpecsForm';
import FileUploader from './FileUploader';
import ContactVerification from './ContactVerification';

const SellUsedMachineForm = () => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('usedMachineForm');
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, []);

  const handleNext = (data) => {
    const updatedData = { ...formData, ...data };
    setFormData(updatedData);
    localStorage.setItem('usedMachineForm', JSON.stringify(updatedData));
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleVerificationComplete = (data) => {
    const updatedData = { ...formData, ...data };
    setFormData(updatedData);
    setIsVerified(true);
    console.log('Form submitted:', updatedData);
    localStorage.removeItem('usedMachineForm');
  };

  return (
    <div className="bg-almona-darker rounded-xl p-6 mb-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Sell a Used Machine</h2>
      <div className="mb-8">
        <Progress value={step === 0 ? 0 : step === 1 ? 33 : step === 2 ? 66 : 100} />
        <div className="flex justify-between mt-2 text-sm text-gray-400">
          <span>Machine Info</span>
          <span>Upload Photos</span>
          <span>Seller Info</span>
          <span>Final Review</span>
        </div>
      </div>

      {step === 0 && <MachineSpecsForm onNext={handleNext} onBack={handleBack} />} 
      {step === 1 && <FileUploader onNext={handleNext} onBack={handleBack} />}
      {step === 2 && <ContactVerification onComplete={handleVerificationComplete} onBack={handleBack} />}

      {isVerified && (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold mb-4">Submission Successful!</h3>
          <p className="text-gray-400 mb-6">
            Our inspection team will contact you within 24 hours to schedule a technical inspection.
            You will receive a WhatsApp message with the inspection details.
          </p>
          <Button onClick={() => {
            setIsVerified(false);
            setStep(0);
          }}>
            Sell Another Machine
          </Button>
        </div>
      )}
    </div>
  );
};

export default SellUsedMachineForm;
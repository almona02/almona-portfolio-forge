import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ContactVerificationProps {
  onComplete: (data: Record<string, string>) => void;
  onBack: () => void;
}

const ContactVerification: React.FC<ContactVerificationProps> = ({ onComplete, onBack }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCompleteClick = () => {
    onComplete(formData);
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Seller Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input name="name" placeholder="Your Name" onChange={handleChange} />
        <Input name="phone" placeholder="Phone Number" onChange={handleChange} />
        <Input name="email" placeholder="Email Address" onChange={handleChange} />
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={handleCompleteClick}>Submit</Button>
      </div>
    </div>
  );
};

export default ContactVerification;
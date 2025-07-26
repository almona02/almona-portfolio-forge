import React, { useState } from 'react';
import { Button } from '../../shared/ui/ui/button';
import { Input } from '../../shared/ui/ui/input';

interface ContactVerificationProps {
  onComplete: () => void;
  onBack: () => void;
}

const ContactVerification: React.FC<ContactVerificationProps> = ({ onComplete, onBack }) => {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; email?: string }>({});

  const validate = () => {
    const newErrors: { phone?: string; email?: string } = {};
    if (!phone) newErrors.phone = 'يرجى إدخال رقم الهاتف';
    if (!email || !/\S+@\S+\.\S+/.test(email)) newErrors.email = 'يرجى إدخال بريد إلكتروني صحيح';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onComplete();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-right max-w-md mx-auto">
      <div>
        <label className="block mb-1 font-semibold">رقم الهاتف</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
      </div>
      <div>
        <label className="block mb-1 font-semibold">البريد الإلكتروني</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" type="button" onClick={onBack}>
          رجوع
        </Button>
        <Button type="submit">تأكيد</Button>
      </div>
    </form>
  );
};

export default ContactVerification;

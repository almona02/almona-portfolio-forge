import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Phone, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface SmsOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SmsOtpModal: React.FC<SmsOtpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+971'); // Default to UAE
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithPhoneNumber } = useAuth();

  const handleSendOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/sms/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_number: phoneNumber, country_code: countryCode }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('OTP sent successfully!');
        setStep('verify');
      } else {
        setError(data.message || 'Failed to send OTP.');
        toast.error(data.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
      toast.error(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPhoneNumber(phoneNumber, countryCode, otp);
      toast.success('Phone number verified and logged in successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP.');
      toast.error(err.message || 'Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-almona-dark text-gray-900 dark:text-white rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Phone Number Login</DialogTitle>
          <DialogDescription className="text-center text-gray-600 dark:text-gray-300">
            {step === 'request'
              ? 'Enter your phone number to receive an OTP.'
              : 'Enter the OTP sent to your phone number.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
          {step === 'request' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="space-y-2">
                <Label htmlFor="countryCode" className="text-gray-700 dark:text-gray-200">Country Code</Label>
                <Input
                  id="countryCode"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-white/80 dark:bg-almona-dark/80 border-gray-300 dark:border-almona-light focus:ring-2 focus:ring-almona-light"
                />
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="phoneNumber" className="text-gray-700 dark:text-gray-200">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="e.g., 501234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10 bg-white/80 dark:bg-almona-dark/80 border-gray-300 dark:border-almona-light focus:ring-2 focus:ring-almona-light"
                  />
                </div>
              </div>
              <Button onClick={handleSendOtp} disabled={loading} className="w-full mt-6 bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600">
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-gray-700 dark:text-gray-200">OTP</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="pl-10 bg-white/80 dark:bg-almona-dark/80 border-gray-300 dark:border-almona-light focus:ring-2 focus:ring-almona-light"
                  />
                </div>
              </div>
              <Button onClick={handleVerifyOtp} disabled={loading} className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600">
                {loading ? 'Verifying OTP...' : 'Verify OTP'}
              </Button>
              <Button variant="link" onClick={() => setStep('request')} className="w-full mt-2 text-almona-light">
                Resend OTP
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
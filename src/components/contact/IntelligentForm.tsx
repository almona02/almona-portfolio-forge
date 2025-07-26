import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { AlertTriangle, Check, HardHat, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { sendSms } from '@/lib/smsService';

type FormData = {
  inquiryType: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  machineSerial: string;
  message: string;
  attachments: FileList | null;
  emergency: boolean;
};

export const IntelligentForm = ({ 
  emergencyMode, 
  emergencyToggle 
}: { 
  emergencyMode: boolean; 
  emergencyToggle: (enabled: boolean) => void 
}) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>();
  const [isLoading, setIsLoading] = useState(false);
  interface MachineInfo {
    model: string;
    installationDate: string;
    lastService: string;
    warranty: string;
  }

  const [machineInfo, setMachineInfo] = useState<MachineInfo | null>(null);

  const [serialValidating, setSerialValidating] = useState(false);
  const [serialValid, setSerialValid] = useState<boolean | null>(null);

  const inquiryType = watch('inquiryType');
  const machineSerial = watch('machineSerial');

  // Validate machine serial number
  useEffect(() => {
    const validateSerial = async () => {
      if (machineSerial && machineSerial.length >= 8) {
        setSerialValidating(true);
        try {
          // Simulate API call to validate serial
          await new Promise(resolve => setTimeout(resolve, 1000));
          const isValid = Math.random() > 0.3; // Mock validation
          setSerialValid(isValid);
          if (isValid) {
            // Mock machine data
            setMachineInfo({
              model: 'DK-502',
              installationDate: '2023-05-15',
              lastService: '2024-01-20',
              warranty: '2025-05-15'
            });
          } else {
            setMachineInfo(null);
          }
        } catch (error) {
          console.error('Validation error:', error);
          setSerialValid(null);
        } finally {
          setSerialValidating(false);
        }
      }
    };

    const debounceTimer = setTimeout(validateSerial, 500);
    return () => clearTimeout(debounceTimer);
  }, [machineSerial]);




const onSubmit = async (data: FormData) => {
  setIsLoading(true);
  try {
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Form submitted:', data);

    // Send SMS notification for emergency requests
    if (data.emergency && data.phone) {
      const smsMessage = `Emergency inquiry received from ${data.name}. Please respond immediately.`;
      const smsSent = await sendSms({ to: data.phone, message: smsMessage });
      if (smsSent) {
        alert('Your inquiry has been submitted successfully! An SMS notification has been sent.');
      } else {
        alert('Your inquiry has been submitted, but SMS notification failed.');
      }
    } else {
      alert('Your inquiry has been submitted successfully!');
    }
  } catch (error) {
    console.error('Submission error:', error);
    alert('There was an error submitting your inquiry.');
  } finally {
    setIsLoading(false);
  }
};

  const handleEmergencyToggle = () => {
    const newMode = !emergencyMode;
    emergencyToggle(newMode);
    setValue('emergency', newMode);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {emergencyMode && (
        <div className="bg-red-900/20 p-4 rounded-lg border border-red-900/50 flex items-center">
          <AlertTriangle className="text-red-500 mr-3" />
          <span className="text-red-300">Emergency mode activated - Your request will be prioritized</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="inquiryType">Inquiry Type *</Label>
          <Select 
            onValueChange={(value) => setValue('inquiryType', value)}
            defaultValue="technical"
          >
            <SelectTrigger>
              <SelectValue placeholder="Select inquiry type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="technical">Technical Support</SelectItem>
              <SelectItem value="sales">Sales Inquiry</SelectItem>
              <SelectItem value="service">Service Request</SelectItem>
              <SelectItem value="parts">Parts Inquiry</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="machineSerial">Machine Serial Number</Label>
          <div className="relative">
            <Input
              id="machineSerial"
              placeholder="Enter machine serial"
              {...register('machineSerial')}
              className="pr-10"
            />
            {serialValidating && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
            )}
            {serialValid === true && (
              <Check className="absolute right-3 top-3 h-4 w-4 text-green-500" />
            )}
            {serialValid === false && (
              <AlertTriangle className="absolute right-3 top-3 h-4 w-4 text-red-500" />
            )}
          </div>
          {machineInfo && (
            <div className="mt-2 p-3 bg-almona-darker/50 rounded-lg border border-almona-light/10 text-sm">
              <div className="font-medium">Machine: {machineInfo.model}</div>
              <div>Warranty until: {machineInfo.warranty}</div>
              <div>Last service: {machineInfo.lastService}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            placeholder="Your name"
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+20 123 456 7890"
            {...register('phone', { required: 'Phone is required' })}
          />
          {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            placeholder="Your company name"
            {...register('company')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message *</Label>
        <textarea
          id="message"
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Describe your inquiry in detail..."
          {...register('message', { required: 'Message is required' })}
        />
        {errors.message && <p className="text-red-500 text-sm">{errors.message.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="attachments">Attachments (Technical Docs, Photos)</Label>
        <Input
          id="attachments"
          type="file"
          multiple
          accept=".pdf,.jpg,.png,.doc,.docx"
          {...register('attachments')}
        />
        <p className="text-sm text-muted-foreground">
          Upload machine documentation, error photos, or other relevant files (max 10MB)
        </p>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button
          type="button"
          variant={emergencyMode ? 'destructive' : 'outline'}
          onClick={handleEmergencyToggle}
          className="flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          {emergencyMode ? 'Emergency Active' : 'Emergency Request'}
        </Button>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Inquiry'
          )}
        </Button>
      </div>

      {emergencyMode && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-500">
          <AlertTriangle className="h-4 w-4" />
          <span>Emergency requests will trigger immediate technician dispatch</span>
        </div>
      )}
    </form>
  );
};

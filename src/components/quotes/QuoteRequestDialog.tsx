import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/ui/dialog';
import { QuoteRequestStepper } from './QuoteRequestStepper';
import { useToast } from '@/hooks/useToast';

import { Machine } from '../../types/index';

interface Service {
  name: string;
  price: number;
}

interface QuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    products?: Machine[];
    services?: Service[];
    contactInfo?: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
    };
  };
}

export const QuoteRequestDialog: React.FC<QuoteRequestDialogProps> = ({
  open,
  onOpenChange,
  initialData,
}) => {
  const { toast } = useToast();

  const handleSubmit = async (quoteData: { products: Machine[], services: Service[], contactInfo: any, projectDescription: string, urgency: string }) => {
    try {
      // Simulate API call
      console.log('Quote submitted:', quoteData);
      
      toast({
        title: "Quote Request Submitted",
        description: "Our team will contact you within 24 hours",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit quote request",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-almona-darker border-almona-light">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gradient-orange">
            Request a Quote
          </DialogTitle>
        </DialogHeader>
        <QuoteRequestStepper
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

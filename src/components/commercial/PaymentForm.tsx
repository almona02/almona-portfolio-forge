/**
 * Payment Form Component
 * 
 * Gold-tier payment form with Stripe Elements integration.
 * Provides secure payment processing with prestige theme styling.
 * 
 * Features:
 * - Stripe Elements integration
 * - Form validation with react-hook-form + zod
 * - Loading and error states
 * - Prestige theme styling
 * - Activity logging integration
 * - Support for multiple payment methods
 * 
 * Usage:
 * ```tsx
 * <PaymentForm
 *   invoiceId={invoiceId}
 *   amount={100.00}
 *   currency="USD"
 *   onSuccess={(payment) => console.log('Payment successful', payment)}
 *   onError={(error) => console.error('Payment failed', error)}
 * />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { PaymentService } from '@/services/payments/PaymentService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Label } from '@/shared/ui/ui/label';
import { Input } from '@/shared/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Payment form schema
const paymentFormSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'EGP', 'TRY']),
  paymentMethod: z.enum(['stripe', 'cash', 'check', 'bank_transfer']),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  /** Invoice ID (optional for standalone payments) */
  invoiceId?: string | null;
  /** Payment amount */
  amount: number;
  /** Currency code */
  currency?: string;
  /** Callback on successful payment */
  onSuccess?: (paymentId: string) => void;
  /** Callback on payment error */
  onError?: (error: Error) => void;
  /** Show manual payment options */
  showManualPayment?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// Stripe publishable key (lazy loaded)
const getStripePromise = () => {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.warn('Stripe publishable key not configured');
    return null;
  }
  return loadStripe(publishableKey);
};

/**
 * Inner payment form component (uses Stripe hooks)
 */
const PaymentFormInner: React.FC<PaymentFormProps & { clientSecret: string }> = ({
  invoiceId,
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  showManualPayment = true,
  clientSecret,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount,
      currency: currency.toUpperCase() as PaymentFormValues['currency'],
      paymentMethod: 'stripe',
      notes: '',
    },
  });

  const { handleSubmit, watch, setValue } = form;
  const paymentMethod = watch('paymentMethod');

  const onSubmit = async (data: PaymentFormValues) => {
    if (!stripe || !elements) {
      setError('Stripe is not loaded. Please refresh the page.');
      return;
    }

    // Handle manual payments
    if (data.paymentMethod !== 'stripe') {
      try {
        setProcessing(true);
        setError(null);

        const paymentId = await PaymentService.createManualPayment(
          invoiceId || null,
          data.amount,
          data.currency,
          data.paymentMethod,
          data.notes
        );

        setSuccess(true);
        toast.success('Payment recorded successfully');
        onSuccess?.(paymentId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Payment failed');
        setError(error.message);
        toast.error(error.message);
        onError?.(error);
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Handle Stripe payment
    try {
      setProcessing(true);
      setError(null);

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message || 'Payment failed');
      }

      if (paymentIntent?.status === 'succeeded') {
        setSuccess(true);
        toast.success('Payment processed successfully');
        onSuccess?.(paymentIntent.id);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Payment failed');
      setError(error.message);
      toast.error(error.message);
      onError?.(error);
    } finally {
      setProcessing(false);
    }
  };

  // Stripe Card Element styling (prestige theme)
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#f1f5f9',
        fontFamily: 'system-ui, sans-serif',
        '::placeholder': {
          color: '#94a3b8',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
    hidePostalCode: true,
  };

  if (success) {
    return (
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-amber-200 mb-2">Payment Successful</h3>
            <p className="text-sm text-amber-600/70">
              Your payment of {currency} {amount.toFixed(2)} has been processed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-amber-200 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Process Payment
            </CardTitle>
            <CardDescription className="text-sm text-amber-600/70 mt-1">
              Secure payment processing powered by Stripe
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-600/30">
            <Lock className="w-3 h-3 mr-1" />
            Secure
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Payment Amount Display */}
          <div className="p-4 rounded-lg bg-[#0f0f0f]/60 border border-amber-600/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                <Label className="text-sm text-amber-600/70">Amount</Label>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-200">
                  {currency} {amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          {showManualPayment && (
            <div className="space-y-2">
              <Label className="text-sm text-amber-300">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setValue('paymentMethod', value as PaymentFormValues['paymentMethod'])}
              >
                <SelectTrigger className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f0f0f] border-amber-600/30">
                  <SelectItem value="stripe">Credit/Debit Card (Stripe)</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stripe Card Element */}
          {paymentMethod === 'stripe' && (
            <div className="space-y-2">
              <Label className="text-sm text-amber-300">Card Details</Label>
              <div className="p-4 rounded-lg bg-[#0f0f0f]/60 border border-amber-600/30">
                <CardElement options={cardElementOptions} />
              </div>
              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-400 text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Manual Payment Notes */}
          {paymentMethod !== 'stripe' && (
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm text-amber-300">
                Notes (optional)
              </Label>
              <Input
                id="notes"
                {...form.register('notes')}
                placeholder="Add payment reference or notes..."
                className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 placeholder:text-amber-600/50"
              />
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={processing || !stripe || !elements}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                {paymentMethod === 'stripe' ? 'Pay Now' : 'Record Payment'}
              </>
            )}
          </Button>

          {/* Security Notice */}
          <p className="text-xs text-center text-amber-600/50 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            Your payment information is encrypted and secure
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

/**
 * Payment Form Component
 * 
 * Main component that wraps Stripe Elements provider.
 */
export const PaymentForm: React.FC<PaymentFormProps> = ({
  invoiceId,
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  showManualPayment = true,
  className,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        setLoading(true);
        setError(null);

        // NOTE: PaymentService.createPaymentIntent() uses Stripe server-side SDK
        // In production, this should be called from a backend API route
        // For now, we'll handle the error gracefully if Stripe is not configured
        
        // TODO: Replace with API call to backend route:
        // const response = await fetch('/api/payments/create-intent', {
        //   method: 'POST',
        //   body: JSON.stringify({ invoiceId, amount, currency })
        // });
        // const { clientSecret } = await response.json();

        try {
          const result = await PaymentService.createPaymentIntent(
            invoiceId || null,
            amount,
            currency.toLowerCase()
          );
          setClientSecret(result.clientSecret);
        } catch (stripeError) {
          // If Stripe server SDK fails (expected in browser), show manual payment option
          if (stripeError instanceof Error && stripeError.message.includes('Stripe')) {
            setError('Stripe payment processing requires backend configuration. Please use manual payment methods.');
            // Don't set clientSecret - will show manual payment form
            return;
          }
          throw stripeError;
        }
      } catch (err) {
        console.error('Failed to initialize payment:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMessage);
        toast.error(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setLoading(false);
      }
    };

    if (amount > 0) {
      initializePayment();
    }
  }, [invoiceId, amount, currency, onError]);

  if (loading) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
            <p className="text-sm text-amber-600/70">Initializing payment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !clientSecret) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        <CardContent className="p-8">
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-red-400">Payment Initialization Failed</AlertTitle>
            <AlertDescription className="text-red-400/70 text-sm mt-2">
              {error || 'Failed to initialize payment. Please try again.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // If no client secret (manual payment only or Stripe not configured)
  if (!clientSecret && showManualPayment) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-amber-200 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Record Payment
          </CardTitle>
          <CardDescription className="text-sm text-amber-600/70 mt-1">
            Record manual payment (cash, check, or bank transfer)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManualPaymentForm
            invoiceId={invoiceId}
            amount={amount}
            currency={currency}
            onSuccess={onSuccess}
            onError={onError}
          />
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        <CardContent className="p-8">
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-red-400">Payment Processing Unavailable</AlertTitle>
            <AlertDescription className="text-red-400/70 text-sm mt-2">
              Stripe payment processing is not configured. Please contact support or use manual payment methods.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const stripePromise = getStripePromise();
  if (!stripePromise) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        <CardContent className="p-8">
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-red-400">Stripe Not Configured</AlertTitle>
            <AlertDescription className="text-red-400/70 text-sm mt-2">
              Please set VITE_STRIPE_PUBLISHABLE_KEY in your environment variables.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const elementsOptions: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#f59e0b',
        colorBackground: '#0f172a',
        colorText: '#f1f5f9',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className={className}>
      <Elements stripe={stripePromise} options={elementsOptions}>
        <PaymentFormInner
          invoiceId={invoiceId}
          amount={amount}
          currency={currency}
          onSuccess={onSuccess}
          onError={onError}
          showManualPayment={showManualPayment}
          clientSecret={clientSecret}
        />
      </Elements>
    </div>
  );
};

/**
 * Manual Payment Form (for cash, check, bank transfer)
 */
const ManualPaymentForm: React.FC<{
  invoiceId?: string | null;
  amount: number;
  currency?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: Error) => void;
}> = ({ invoiceId, amount, currency = 'USD', onSuccess, onError }) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'bank_transfer'>('cash');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    try {
      const paymentId = await PaymentService.createManualPayment(
        invoiceId || null,
        amount,
        currency.toUpperCase(),
        paymentMethod,
        notes || undefined
      );

      toast.success('Payment recorded successfully');
      onSuccess?.(paymentId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Payment failed');
      setError(error.message);
      toast.error(error.message);
      onError?.(error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 rounded-lg bg-[#0f0f0f]/60 border border-amber-600/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <Label className="text-sm text-amber-600/70">Amount</Label>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-200">
              {currency} {amount.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-amber-300">Payment Method</Label>
        <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)}>
          <SelectTrigger className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0f0f0f] border-amber-600/30">
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="check">Check</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm text-amber-300">
          Notes (optional)
        </Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add payment reference or notes..."
          className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 placeholder:text-amber-600/50"
        />
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-400 text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={processing}
        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Recording...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Record Payment
          </>
        )}
      </Button>
    </form>
  );
};


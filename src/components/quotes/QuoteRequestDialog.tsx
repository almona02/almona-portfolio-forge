import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/ui/dialog';
import { QuoteRequestStepper } from './QuoteRequestStepper';
import { useToast } from '@/hooks/useToast';
import { useClipboard } from '@/hooks/useClipboard';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';

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
  relatedServiceTicketId?: string; // optional ticket linkage
}

export const QuoteRequestDialog: React.FC<QuoteRequestDialogProps> = ({
  open,
  onOpenChange,
  initialData,
  relatedServiceTicketId,
}) => {
  const { toast } = useToast();
  const quoteClipboard = useClipboard({ label: 'quote number' });
  const twinClipboard = useClipboard({ label: 'digital twin code' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | {
    quote_number: string;
    digital_twin_code?: string | null;
    portal_reference?: string | null;
    id: string;
  }>(null);

  const apiBase = (import.meta as any).env?.VITE_API_BASE || '';

  interface SubmitPayloadProduct { id: string; price?: number }
  interface SubmitPayloadService { id?: string; price?: number }
  interface SubmitQuoteData {
    // Flattened fields coming from QuoteRequestStepper
    name: string;
    email: string;
    phone: string;
    company?: string;
    projectDescription: string;
    urgency: string;
    deliveryLocation: string;
    specialRequirements: string;
    products: SubmitPayloadProduct[];
    services: SubmitPayloadService[];
  }

  const handleSubmit = async (quoteData: SubmitQuoteData) => {
    setSubmitting(true);
    try {
      const payload = {
        contact_name: quoteData.name || quoteData.email || 'Customer',
        contact_email: quoteData.email,
        contact_phone: quoteData.phone,
        company: quoteData.company,
        project_description: quoteData.projectDescription,
        urgency: quoteData.urgency,
        delivery_location: quoteData.deliveryLocation,
        special_requirements: quoteData.specialRequirements,
        // For now we map product/service arrays into minimal line items list (only price & product_id if present)
        products: (quoteData.products || []).map(p => ({ product_id: p.id, quantity: 1, unit_price: p.price })),
        services: (quoteData.services || []).map(s => ({ service_id: s.id, quantity: 1, unit_price: s.price })),
        related_service_ticket_id: relatedServiceTicketId,
      };

      const resp = await fetch(`${apiBase}/api/v2/quotes/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Failed to create quote');
      }
      const data = await resp.json();
      setResult({
        id: data.id,
        quote_number: data.quote_number,
        digital_twin_code: data.digital_twin_code,
        portal_reference: data.portal_reference,
      });
      toast({
        title: 'Quote Created',
        description: data.digital_twin_code ? `Twin ${data.digital_twin_code}` : 'Quote ready. Track it in portal.',
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to submit quote request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full bg-almona-darker border-almona-light max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl text-gradient-orange">
              Request a Quote
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Get a personalized quote for your selected products and services. Fill out the form below and we'll get back to you with pricing and availability.
            </DialogDescription>
          </DialogHeader>
          {!result && (
            <QuoteRequestStepper
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
              submitting={submitting}
              relatedServiceTicketId={relatedServiceTicketId}
            />
          )}
          {result && (
            <div className="space-y-6 py-4">
              <div className="p-4 rounded border border-almona-light/30 bg-almona-dark">
                <h3 className="typography-h3 text-lg mb-2">Quote Submitted</h3>
                <p className="text-sm text-gray-300 mb-2">Your quote was created successfully.</p>
                <ul className="text-sm text-gray-400 space-y-2 mb-4">
                  <li className="flex items-center justify-between">
                    <span><span className="text-gray-500">Quote #:</span> {result.quote_number}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => quoteClipboard.copyToClipboard(result.quote_number, 'quote number')}
                    >
                      {quoteClipboard.copiedText === result.quote_number ? (
                        <Check className="h-4 w-4 status-valid" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>
                      <span className="text-gray-500">Digital Twin:</span>{' '}
                      {result.digital_twin_code || 'Pending assignment'}
                    </span>
                    {result.digital_twin_code && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => twinClipboard.copyToClipboard(result.digital_twin_code!, 'digital twin code')}
                      >
                        {twinClipboard.copiedText === result.digital_twin_code ? (
                          <Check className="h-4 w-4 status-valid" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </li>
                  <li><span className="text-gray-500">Portal Reference:</span> {result.portal_reference || 'N/A'}</li>
                  {relatedServiceTicketId && (
                    <li>
                      <span className="text-gray-500">Linked Ticket:</span>{' '}
                      <button
                        type="button"
                        onClick={() => {
                          onOpenChange(false);
                          window.location.href = `/support/tickets/${relatedServiceTicketId}`;
                        }}
                        className="underline text-almona-orange hover:text-amber-400"
                      >
                        {relatedServiceTicketId.slice(0, 8)}...
                      </button>
                    </li>
                  )}
                </ul>
                <div className="flex gap-3">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      // Navigate user to portal tracking page; for now just close dialog
                      onOpenChange(false);
                      window.location.href = '/portal';
                    }}
                  >
                    Track in Portal
                  </button>
                  <button
                    className="px-4 py-2 rounded border border-almona-light/30 text-sm hover:bg-almona-light/10 transition"
                    onClick={() => {
                      setResult(null);
                    }}
                  >
                    Create Another
                  </button>
                </div>
              </div>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
};

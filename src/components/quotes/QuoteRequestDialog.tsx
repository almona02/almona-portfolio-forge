import React, { useState } from 'react';
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
  relatedServiceTicketId?: string; // optional ticket linkage
}

export const QuoteRequestDialog: React.FC<QuoteRequestDialogProps> = ({
  open,
  onOpenChange,
  initialData,
  relatedServiceTicketId,
}) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | {
    quote_number: string;
    digital_twin_code?: string | null;
    portal_reference?: string | null;
    id: string;
  }>(null);

  const apiBase = (import.meta as unknown as { env?: Record<string, string> })?.env?.VITE_PYTHON_API_URL || '';

  interface SubmitPayloadProduct { id: string; price?: number }
  interface SubmitPayloadService { id?: string; price?: number }
  interface SubmitQuoteData {
    products: SubmitPayloadProduct[];
    services: SubmitPayloadService[];
    contactInfo?: { name?: string; email?: string; phone?: string; company?: string };
    projectDescription: string;
    urgency: string;
  }

  const handleSubmit = async (quoteData: SubmitQuoteData) => {
    setSubmitting(true);
    try {
      const payload = {
        contact_name: quoteData.contactInfo?.name || quoteData.contactInfo?.email || 'Customer',
        contact_email: quoteData.contactInfo?.email,
        contact_phone: quoteData.contactInfo?.phone,
        company: quoteData.contactInfo?.company,
        project_description: quoteData.projectDescription,
        urgency: quoteData.urgency,
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
      <DialogContent className="max-w-4xl bg-almona-darker border-almona-light">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gradient-orange">
            Request a Quote
          </DialogTitle>
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
              <h3 className="text-lg font-semibold mb-2">Quote Submitted</h3>
              <p className="text-sm text-gray-300 mb-2">Your quote was created successfully.</p>
              <ul className="text-sm text-gray-400 space-y-1 mb-4">
                <li><span className="text-gray-500">Quote #:</span> {result.quote_number}</li>
                <li><span className="text-gray-500">Digital Twin:</span> {result.digital_twin_code || 'Pending assignment'}</li>
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
                      className="underline text-almona-orange hover:text-orange-400"
                    >
                      {relatedServiceTicketId.slice(0, 8)}...
                    </button>
                  </li>
                )}
              </ul>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded bg-almona-orange text-white text-sm hover:bg-orange-600 transition"
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

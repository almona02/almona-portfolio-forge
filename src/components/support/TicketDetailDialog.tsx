import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketWithDetails } from '@/types/tickets';
import { format } from 'date-fns';
import { Link2, MessageCircle, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TicketDetailDialogProps {
  ticket: TicketWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between gap-4 py-1.5 border-b border-border/40 text-sm">
    <span className="text-muted-foreground flex-shrink-0">{label}</span>
    <span className="text-right font-medium">{children}</span>
  </div>
);

export const TicketDetailDialog: React.FC<TicketDetailDialogProps> = ({ ticket, isOpen, onClose }) => {
  const { toast } = useToast();

  const ticketUrl = typeof window !== 'undefined' ? `${window.location.origin}/support/tickets/${ticket?.id}` : `/support/tickets/${ticket?.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(ticketUrl);
      toast({ title: 'Ticket link copied' });
    } catch {
      toast({ title: 'Copy failed', description: ticketUrl, variant: 'destructive' });
    }
  };

  const sendToCustomer = () => {
    if (!ticket) return;
    const text = encodeURIComponent(`Your Almona support ticket ${ticket.ticket_number}: ${ticketUrl}`);
    if (ticket.contact_phone) {
      const digits = (ticket.contact_phone || '').replace(/\D/g, '');
      const intl = digits.startsWith('20') ? digits : `20${digits.replace(/^0/, '')}`;
      window.open(`https://wa.me/${intl}?text=${text}`, '_blank', 'noopener,noreferrer');
    } else if (ticket.contact_email) {
      window.location.href = `mailto:${ticket.contact_email}?subject=${encodeURIComponent(`Your Almona support ticket ${ticket.ticket_number}`)}&body=${encodeURIComponent(ticketUrl)}`;
    } else {
      void copyLink();
    }
  };

  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Ticket {ticket.ticket_number}
            <TicketStatusBadge status={ticket.status} />
          </DialogTitle>
          <DialogDescription>{ticket.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1 py-2">
          <Row label="Customer">{ticket.user_profile?.full_name || 'Unknown'}{ticket.user_profile?.company_name ? ` · ${ticket.user_profile.company_name}` : ''}</Row>
          <Row label="Type">{String(ticket.type).replace(/_/g, ' ')}</Row>
          <Row label="Priority"><span className="capitalize">{ticket.priority}</span></Row>
          <Row label="Assigned to">{ticket.assigned_user?.full_name || 'Unassigned'}</Row>
          <Row label="Machine">{ticket.machine_serial_number || '—'}</Row>
          <Row label="Location">{ticket.site_location || '—'}</Row>
          <Row label="Phone">{ticket.contact_phone || '—'}</Row>
          <Row label="Email">{ticket.contact_email || '—'}</Row>
          <Row label="Created">{format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm')}</Row>
          {ticket.resolved_at && <Row label="Resolved">{format(new Date(ticket.resolved_at), 'MMM dd, yyyy HH:mm')}</Row>}
          {ticket.closed_at && <Row label="Closed">{format(new Date(ticket.closed_at), 'MMM dd, yyyy HH:mm')}</Row>}
          {ticket.sla_breached && (
            <Row label="SLA"><Badge variant="destructive">Breached</Badge></Row>
          )}
          <Row label="Messages">{ticket.message_count ?? 0}</Row>
        </div>

        <div className="mt-3">
          <div className="text-sm font-medium mb-1">Description</div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/40 rounded-md p-3">{ticket.description || '—'}</p>
        </div>

        {ticket.resolution_summary && (
          <div className="mt-3">
            <div className="text-sm font-medium mb-1">Resolution</div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/40 rounded-md p-3">{ticket.resolution_summary}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          <Button variant="outline" size="sm" onClick={() => void copyLink()}>
            <Link2 className="mr-2 h-4 w-4" /> Copy link
          </Button>
          {ticket.contact_email && (
            <Button variant="outline" size="sm" onClick={() => { window.location.href = `mailto:${ticket.contact_email}?subject=${encodeURIComponent(`Your Almona support ticket ${ticket.ticket_number}`)}&body=${encodeURIComponent(ticketUrl)}`; }}>
              <Mail className="mr-2 h-4 w-4" /> Email customer
            </Button>
          )}
          {ticket.contact_phone && (
            <Button variant="outline" size="sm" onClick={sendToCustomer}>
              <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp customer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailDialog;

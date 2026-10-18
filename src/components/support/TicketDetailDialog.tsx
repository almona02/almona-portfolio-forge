import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketWithDetails } from '@/types/tickets';
import { format } from 'date-fns';

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
      </DialogContent>
    </Dialog>
  );
};

export default TicketDetailDialog;

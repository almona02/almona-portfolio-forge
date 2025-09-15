import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ticketInteractiveClasses } from '@/lib/tickets/style';
import { ServiceTicket } from '@/types/tickets';
import { TicketStatusBadge } from '@/components/support/TicketStatusBadge';
import { Calendar, Clock } from 'lucide-react';

interface TicketCardProps {
  ticket: ServiceTicket & { message_count?: number };
  onOpen: (id: string) => void;
  selected?: boolean;
  reducedMotion?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onOpen, selected = false, reducedMotion = false }) => {
  const inactive = ['resolved','closed','cancelled'].includes(ticket.status);
  return (
    <Card
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(ticket.id); } }}
      className={[
        'bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm group cursor-pointer',
        'transition-colors',
        ticketInteractiveClasses({
          inactive,
          selected,
          focusable: true,
          lift: !reducedMotion
        }),
        'hover:border-almona-orange/50'
      ].join(' ')}
      onClick={() => onOpen(ticket.id)}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-lg group-hover:text-almona-orange transition-colors line-clamp-1">
              {ticket.title}
            </h3>
            <p className="text-gray-400 text-sm">#{ticket.ticket_number || ticket.id.slice(-8).toUpperCase()}</p>
          </div>
          <TicketStatusBadge status={ticket.status} />
        </div>
        {ticket.description && (
          <p className="text-gray-300 mb-4 line-clamp-2">{ticket.description}</p>
        )}
        <div className="flex justify-between items-center text-sm text-gray-400">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            Created: {new Date(ticket.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Updated: {new Date(ticket.updated_at).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

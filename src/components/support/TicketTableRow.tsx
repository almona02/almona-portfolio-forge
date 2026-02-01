import React from 'react';
import { TableRow, TableCell } from '@/shared/ui/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TicketStatusBadge } from '@/components/support/TicketStatusBadge';
import { ServiceTicket } from '@/types/tickets';
import { ticketInteractiveClasses, priorityStyles } from '@/lib/tickets/style';

interface TicketTableRowProps {
  ticket: ServiceTicket & { message_count?: number };
  selected?: boolean;
  onSelect: (id: string) => void;
}

export const TicketTableRow: React.FC<TicketTableRowProps> = ({ ticket, selected = false, onSelect }) => {
  const inactive = ['resolved','closed','cancelled'].includes(ticket.status);
  const priority = priorityStyles(ticket.priority);

  return (
    <TableRow
      tabIndex={0}
      aria-selected={selected}
      onClick={() => onSelect(ticket.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(ticket.id); } }}
      className={[
        'cursor-pointer group',
        ticketInteractiveClasses({ selected, inactive }),
        priority.rowAccent || ''
      ].join(' ')}
    >
      <TableCell className="font-medium whitespace-nowrap">{ticket.ticket_number}</TableCell>
      <TableCell className="align-top">
        <div>
          <div className="font-medium group-hover:text-amber-500 transition-colors line-clamp-1 max-w-[220px]">{ticket.title}</div>
          {ticket.description && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2 max-w-[260px]">{ticket.description}</div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="capitalize">{ticket.type.replace('_', ' ')}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={priority.badge + ' capitalize'}>{ticket.priority}</Badge>
      </TableCell>
      <TableCell>
        {ticket.source && <Badge variant="outline" className="capitalize">{ticket.source.replace('_',' ')}</Badge>}
      </TableCell>
      <TableCell>
        {ticket.maintenance_type && <Badge variant="secondary" className="capitalize">{ticket.maintenance_type}</Badge>}
      </TableCell>
      <TableCell>
        <TicketStatusBadge status={ticket.status} />
      </TableCell>
      <TableCell className="whitespace-nowrap">{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
      <TableCell>
        <Badge variant="outline">{ticket.message_count || 0}</Badge>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onSelect(ticket.id); }}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  );
};

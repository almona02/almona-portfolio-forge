import React from 'react'
import { Badge } from '@/components/ui/badge'
import { TicketStatus } from '@/types/tickets'
import { statusStyles, combineBadge } from '@/lib/tickets/style'

interface TicketStatusBadgeProps { status: TicketStatus; className?: string }

const labelMap: Record<TicketStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  awaiting_parts: 'Awaiting Parts',
  awaiting_customer: 'Awaiting Customer',
  pending_approval: 'Pending Approval',
  resolved: 'Resolved',
  closed: 'Closed',
  cancelled: 'Cancelled'
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status, className }) => {
  const s = statusStyles(status)
  return (
    <Badge
      variant={s.subdued ? 'outline' : 'secondary'}
      className={combineBadge('text-xs font-medium', s.badge, className)}
    >
      {labelMap[status]}
    </Badge>
  )
}

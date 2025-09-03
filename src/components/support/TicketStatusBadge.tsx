import React from 'react'
import { Badge } from '@/components/ui/badge'
import { TicketStatus } from '@/types/tickets'

interface TicketStatusBadgeProps {
  status: TicketStatus
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({ status }) => {
  const getStatusConfig = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return { variant: 'default' as const, label: 'Open', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' }
      case 'assigned':
        return { variant: 'default' as const, label: 'Assigned', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' }
      case 'in_progress':
        return { variant: 'default' as const, label: 'In Progress', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' }
      case 'awaiting_parts':
        return { variant: 'secondary' as const, label: 'Awaiting Parts', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' }
      case 'awaiting_customer':
        return { variant: 'secondary' as const, label: 'Awaiting Customer', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' }
      case 'pending_approval':
        return { variant: 'secondary' as const, label: 'Pending Approval', className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' }
      case 'resolved':
        return { variant: 'default' as const, label: 'Resolved', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' }
      case 'closed':
        return { variant: 'outline' as const, label: 'Closed', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' }
      case 'cancelled':
        return { variant: 'secondary' as const, label: 'Cancelled', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' }
      default:
        return { variant: 'outline' as const, label: status, className: '' }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}

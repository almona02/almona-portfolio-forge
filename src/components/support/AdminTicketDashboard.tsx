import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import { 
  MoreHorizontal, 
  UserPlus, 
  Settings, 
  Eye, 
  Filter,
  RefreshCw,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { TicketStatusBadge } from './TicketStatusBadge'
import { TicketMetrics } from './TicketMetrics'
import { TicketAssignmentDialog } from './TicketAssignmentDialog'
import { TicketStatusUpdateDialog } from './TicketStatusUpdateDialog'
import { 
  getAllTickets, 
  getTicketMetrics, 
  subscribeToTicketUpdates 
} from '@/lib/adminTicketApi'
import { 
  TicketWithDetails, 
  TicketStatus, 
  TicketPriority, 
  TicketType 
} from '@/types/tickets'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface AdminTicketDashboardProps {
  currentUserId: string
  userRole: 'admin' | 'technician' | 'sales_rep'
}

export const AdminTicketDashboard: React.FC<AdminTicketDashboardProps> = ({
  currentUserId,
  userRole: _userRole
}) => {
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null)
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [filters, setFilters] = useState({
    status: '' as TicketStatus | '',
    priority: '' as TicketPriority | '',
    type: '' as TicketType | '',
    assignee: ''
  })

  const queryClient = useQueryClient()

  // Fetch tickets with filters
  const { data: tickets = [], isLoading: loadingTickets, refetch } = useQuery({
    queryKey: ['admin-tickets', filters],
    queryFn: () => getAllTickets({
      status: filters.status ? [filters.status] : undefined,
      priority: filters.priority ? [filters.priority] : undefined,
      type: filters.type ? [filters.type] : undefined,
    }),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Fetch metrics
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['ticket-metrics'],
    queryFn: getTicketMetrics,
    refetchInterval: 60000, // Refetch every minute
  })

  // Set up real-time subscription
  useEffect(() => {
    const subscription = subscribeToTicketUpdates((payload) => {
      console.log('Real-time ticket update:', payload)
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket-metrics'] })
      
      // Show toast notification for updates
      if (payload.eventType === 'INSERT') {
        toast.info('New ticket created')
      } else if (payload.eventType === 'UPDATE') {
        toast.info('Ticket updated')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])

  // Filter tickets based on assignee filter
  const filteredTickets = React.useMemo(() => {
    if (!filters.assignee) return tickets
    
    if (filters.assignee === 'unassigned') {
      return tickets.filter(ticket => !ticket.assigned_to)
    }
    
    if (filters.assignee === 'me') {
      return tickets.filter(ticket => ticket.assigned_to === currentUserId)
    }
    
    return tickets.filter(ticket => ticket.assigned_to === filters.assignee)
  }, [tickets, filters.assignee, currentUserId])

  // Define table columns
  const columns: ColumnDef<TicketWithDetails>[] = [
    {
      accessorKey: 'ticket_number',
      header: 'Ticket #',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('ticket_number')}</div>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.getValue('title')}>
          {row.getValue('title')}
        </div>
      ),
    },
    {
      accessorKey: 'user_profile',
      header: 'Customer',
      cell: ({ row }) => {
        const profile = row.getValue('user_profile') as TicketWithDetails['user_profile']
        return (
          <div className="text-sm">
            <div className="font-medium">{profile?.full_name || 'Unknown'}</div>
            <div className="text-muted-foreground">{profile?.company_name}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <TicketStatusBadge status={row.getValue('status')} />,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const priority = row.getValue('priority') as TicketPriority
        return (
          <Badge 
            variant="outline" 
            className={`${
              priority === 'urgent' || priority === 'critical' 
                ? 'border-red-500 text-red-700' 
                : priority === 'high' 
                ? 'border-amber-500 text-amber-700' 
                : priority === 'medium'
                ? 'border-blue-500 text-blue-700'
                : 'border-green-500 text-green-700'
            }`}
          >
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.getValue('type') as TicketType
        return (
          <Badge variant="secondary">
            {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'assigned_user',
      header: 'Assigned To',
      cell: ({ row }) => {
        const assignedUser = row.getValue('assigned_user') as TicketWithDetails['assigned_user']
        return assignedUser ? (
          <div className="text-sm">
            <div className="font-medium">{assignedUser.full_name}</div>
            <div className="text-muted-foreground capitalize">{assignedUser.role}</div>
          </div>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Unassigned
          </Badge>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'))
        return (
          <div className="text-sm">
            <div>{format(date, 'MMM dd, yyyy')}</div>
            <div className="text-muted-foreground">{format(date, 'HH:mm')}</div>
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const ticket = row.original
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTicket(ticket)
                  // Navigate to ticket detail view
                  console.log('View ticket:', ticket.id)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTicket(ticket)
                  setAssignmentDialogOpen(true)
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Assign Ticket
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTicket(ticket)
                  setStatusDialogOpen(true)
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Update Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const handleRefresh = () => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['ticket-metrics'] })
    toast.success('Data refreshed')
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      type: '',
      assignee: ''
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typography-h1 tracking-tight">Support Tickets Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and track all support tickets across the organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loadingTickets}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingTickets ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <TicketMetrics metrics={metrics} isLoading={loadingMetrics} />
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="typography-label text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as TicketStatus }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="typography-label text-sm font-medium">Priority</label>
              <Select
                value={filters.priority}
                onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value as TicketPriority }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="typography-label text-sm font-medium">Type</label>
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as TicketType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="spare_parts">Spare Parts</SelectItem>
                  <SelectItem value="warranty">Warranty</SelectItem>
                  <SelectItem value="installation">Installation</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="typography-label text-sm font-medium">Assignee</label>
              <Select
                value={filters.assignee}
                onValueChange={(value) => setFilters(prev => ({ ...prev, assignee: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="me">Assigned to me</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Tickets ({filteredTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredTickets}
            searchKey="title"
            searchPlaceholder="Search tickets..."
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TicketAssignmentDialog
        ticket={selectedTicket}
        isOpen={assignmentDialogOpen}
        onClose={() => {
          setAssignmentDialogOpen(false)
          setSelectedTicket(null)
        }}
        currentUserId={currentUserId}
      />

      <TicketStatusUpdateDialog
        ticket={selectedTicket}
        isOpen={statusDialogOpen}
        onClose={() => {
          setStatusDialogOpen(false)
          setSelectedTicket(null)
        }}
      />
    </div>
  )
}

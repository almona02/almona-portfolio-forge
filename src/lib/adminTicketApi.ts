import { 
  ServiceTicket,
  TicketWithDetails,
  TicketStatus,
  TicketPriority,
  TicketFilters
} from '@/types/tickets'
import { supabase } from '@/lib/supabase'

// Extended mock data for admin dashboard
const mockAdminTickets: TicketWithDetails[] = [
  {
    id: '1',
    ticket_number: 'TKT-2024-000001',
    user_id: 'user1',
    title: 'Machine Installation Issue',
    description: 'Need help with installing the new aluminum cutting machine',
    type: 'installation',
    priority: 'high',
    status: 'open',
    related_quote_id: null,
    related_order_id: null,
    related_product_id: null,
    assigned_to: null,
    assigned_at: null,
    assigned_by: null,
    sla_response_due: '2024-01-16T10:00:00Z',
    sla_resolution_due: '2024-01-18T10:00:00Z',
    first_response_at: null,
    sla_breached: false,
    escalated: false,
    escalated_at: null,
    contact_phone: '+20123456789',
    contact_email: 'customer@example.com',
    preferred_contact_method: 'email',
    site_location: 'Cairo Workshop',
    machine_serial_number: 'ALM-2024-001',
    resolution_summary: null,
    customer_satisfaction_rating: null,
    customer_feedback: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    resolved_at: null,
    closed_at: null,
    user_profile: {
      full_name: 'Ahmed Mohamed',
      company_name: 'Cairo Manufacturing Co.',
      phone: '+20123456789'
    },
    message_count: 1,
    last_message_at: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    ticket_number: 'TKT-2024-000002',
    user_id: 'user2',
    title: 'Spare Parts Request - Hydraulic System',
    description: 'Need replacement parts for hydraulic system',
    type: 'spare_parts',
    priority: 'medium',
    status: 'in_progress',
    related_quote_id: null,
    related_order_id: null,
    related_product_id: null,
    assigned_to: 'tech1',
    assigned_at: '2024-01-14T09:00:00Z',
    assigned_by: 'admin1',
    sla_response_due: '2024-01-15T08:00:00Z',
    sla_resolution_due: '2024-01-17T08:00:00Z',
    first_response_at: '2024-01-14T09:30:00Z',
    sla_breached: false,
    escalated: false,
    escalated_at: null,
    contact_phone: '+20123456790',
    contact_email: 'maintenance@factory.com',
    preferred_contact_method: 'phone',
    site_location: 'Alexandria Factory',
    machine_serial_number: 'ALM-2023-045',
    resolution_summary: null,
    customer_satisfaction_rating: null,
    customer_feedback: null,
    created_at: '2024-01-14T08:00:00Z',
    updated_at: '2024-01-14T09:00:00Z',
    resolved_at: null,
    closed_at: null,
    user_profile: {
      full_name: 'Fatima Hassan',
      company_name: 'Alexandria Industrial',
      phone: '+20123456790'
    },
    assigned_user: {
      full_name: 'Omar Technician',
      role: 'technician'
    },
    message_count: 3,
    last_message_at: '2024-01-14T14:30:00Z'
  },
  {
    id: '3',
    ticket_number: 'TKT-2024-000003',
    user_id: 'user3',
    title: 'Warranty Claim - Motor Failure',
    description: 'Motor stopped working after 6 months of operation',
    type: 'warranty',
    priority: 'urgent',
    status: 'awaiting_parts',
    related_quote_id: null,
    related_order_id: 'ORD-2023-156',
    related_product_id: 'PROD-001',
    assigned_to: 'tech2',
    assigned_at: '2024-01-13T11:00:00Z',
    assigned_by: 'admin1',
    sla_response_due: '2024-01-13T15:00:00Z',
    sla_resolution_due: '2024-01-15T11:00:00Z',
    first_response_at: '2024-01-13T12:00:00Z',
    sla_breached: true,
    escalated: true,
    escalated_at: '2024-01-15T12:00:00Z',
    contact_phone: '+20123456791',
    contact_email: 'operations@company.com',
    preferred_contact_method: 'email',
    site_location: 'Giza Production Line',
    machine_serial_number: 'ALM-2023-089',
    resolution_summary: null,
    customer_satisfaction_rating: null,
    customer_feedback: null,
    created_at: '2024-01-13T10:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
    resolved_at: null,
    closed_at: null,
    user_profile: {
      full_name: 'Mohamed Ali',
      company_name: 'Giza Steel Works',
      phone: '+20123456791'
    },
    assigned_user: {
      full_name: 'Sarah Technician',
      role: 'technician'
    },
    related_product: {
      name_ar: 'محرك هيدروليكي',
      name_en: 'Hydraulic Motor',
      sku: 'HYD-MOT-001'
    },
    message_count: 5,
    last_message_at: '2024-01-15T16:45:00Z'
  },
  {
    id: '4',
    ticket_number: 'TKT-2024-000004',
    user_id: 'user4',
    title: 'Technical Support - Machine Calibration',
    description: 'Need assistance with calibrating the cutting precision',
    type: 'technical',
    priority: 'low',
    status: 'resolved',
    related_quote_id: null,
    related_order_id: null,
    related_product_id: null,
    assigned_to: 'tech1',
    assigned_at: '2024-01-12T14:00:00Z',
    assigned_by: 'admin1',
    sla_response_due: '2024-01-14T09:00:00Z',
    sla_resolution_due: '2024-01-17T09:00:00Z',
    first_response_at: '2024-01-12T15:30:00Z',
    sla_breached: false,
    escalated: false,
    escalated_at: null,
    contact_phone: '+20123456792',
    contact_email: 'tech@workshop.com',
    preferred_contact_method: 'phone',
    site_location: 'Mansoura Workshop',
    machine_serial_number: 'ALM-2024-012',
    resolution_summary: 'Calibration completed successfully. Machine is now operating within specifications.',
    customer_satisfaction_rating: 5,
    customer_feedback: 'Excellent service, very professional technician.',
    created_at: '2024-01-12T09:00:00Z',
    updated_at: '2024-01-14T16:00:00Z',
    resolved_at: '2024-01-14T16:00:00Z',
    closed_at: null,
    user_profile: {
      full_name: 'Khaled Ibrahim',
      company_name: 'Mansoura Metalworks',
      phone: '+20123456792'
    },
    assigned_user: {
      full_name: 'Omar Technician',
      role: 'technician'
    },
    message_count: 4,
    last_message_at: '2024-01-14T16:00:00Z'
  }
]

const mockTechnicians = [
  { id: 'tech1', full_name: 'Omar Technician', role: 'technician' },
  { id: 'tech2', full_name: 'Sarah Technician', role: 'technician' },
  { id: 'tech3', full_name: 'Ahmed Support', role: 'technician' },
  { id: 'admin1', full_name: 'Admin User', role: 'admin' },
  { id: 'sales1', full_name: 'Sales Rep', role: 'sales_rep' }
]

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Admin ticket operations
export const getAllTickets = async (filters?: TicketFilters): Promise<TicketWithDetails[]> => {
  await delay(300)
  
  let filteredTickets = [...mockAdminTickets]
  
  // Apply filters
  if (filters?.status && filters.status.length > 0) {
    filteredTickets = filteredTickets.filter(ticket => filters.status!.includes(ticket.status))
  }
  
  if (filters?.type && filters.type.length > 0) {
    filteredTickets = filteredTickets.filter(ticket => filters.type!.includes(ticket.type))
  }
  
  if (filters?.priority && filters.priority.length > 0) {
    filteredTickets = filteredTickets.filter(ticket => filters.priority!.includes(ticket.priority))
  }
  
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    filteredTickets = filteredTickets.filter(ticket => 
      ticket.title.toLowerCase().includes(searchLower) ||
      ticket.description?.toLowerCase().includes(searchLower) ||
      ticket.ticket_number.toLowerCase().includes(searchLower) ||
      ticket.user_profile?.full_name?.toLowerCase().includes(searchLower) ||
      ticket.user_profile?.company_name?.toLowerCase().includes(searchLower)
    )
  }
  
  return filteredTickets
}

export const assignTicket = async (
  ticketId: string, 
  assigneeId: string, 
  assignedBy: string
): Promise<ServiceTicket> => {
  await delay(300)
  
  const ticketIndex = mockAdminTickets.findIndex(t => t.id === ticketId)
  if (ticketIndex === -1) throw new Error('Ticket not found')
  
  const ticket = mockAdminTickets[ticketIndex]
  ticket.assigned_to = assigneeId
  ticket.assigned_by = assignedBy
  ticket.assigned_at = new Date().toISOString()
  ticket.updated_at = new Date().toISOString()
  
  // Update status to assigned if it was open
  if (ticket.status === 'open') {
    ticket.status = 'assigned'
  }
  
  return ticket
}

export const updateTicketStatusAndPriority = async (
  ticketId: string,
  updates: {
    status?: TicketStatus
    priority?: TicketPriority
    resolution_summary?: string
  }
): Promise<ServiceTicket> => {
  await delay(300)
  
  const ticketIndex = mockAdminTickets.findIndex(t => t.id === ticketId)
  if (ticketIndex === -1) throw new Error('Ticket not found')
  
  const ticket = mockAdminTickets[ticketIndex]
  
  if (updates.status) {
    ticket.status = updates.status
    
    if (updates.status === 'resolved' || updates.status === 'closed') {
      ticket.resolved_at = new Date().toISOString()
      if (updates.resolution_summary) {
        ticket.resolution_summary = updates.resolution_summary
      }
    }
    
    if (updates.status === 'closed') {
      ticket.closed_at = new Date().toISOString()
    }
  }
  
  if (updates.priority) {
    ticket.priority = updates.priority
  }
  
  ticket.updated_at = new Date().toISOString()
  
  return ticket
}

export const getAvailableAssignees = async (): Promise<Array<{id: string, full_name: string, role: string}>> => {
  await delay(200)
  return mockTechnicians
}

export const getTicketMetrics = async (): Promise<{
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  resolvedTickets: number
  overdueTickets: number
  avgResponseTime: number
  avgResolutionTime: number
  slaBreachRate: number
  byPriority: Record<string, number>
  byStatus: Record<string, number>
  byType: Record<string, number>
}> => {
  await delay(400)
  
  const tickets = mockAdminTickets
  const now = new Date()
  
  const totalTickets = tickets.length
  const openTickets = tickets.filter(t => ['open', 'assigned'].includes(t.status)).length
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length
  const overdueTickets = tickets.filter(t => 
    t.sla_resolution_due && new Date(t.sla_resolution_due) < now && !['resolved', 'closed'].includes(t.status)
  ).length
  
  // Calculate average response time (mock calculation)
  const ticketsWithResponse = tickets.filter(t => t.first_response_at)
  const avgResponseTime = ticketsWithResponse.length > 0 
    ? ticketsWithResponse.reduce((acc, ticket) => {
        const created = new Date(ticket.created_at)
        const responded = new Date(ticket.first_response_at!)
        return acc + (responded.getTime() - created.getTime()) / (1000 * 60 * 60) // hours
      }, 0) / ticketsWithResponse.length
    : 0
  
  // Calculate average resolution time (mock calculation)
  const resolvedTicketsList = tickets.filter(t => t.resolved_at)
  const avgResolutionTime = resolvedTicketsList.length > 0
    ? resolvedTicketsList.reduce((acc, ticket) => {
        const created = new Date(ticket.created_at)
        const resolved = new Date(ticket.resolved_at!)
        return acc + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60) // hours
      }, 0) / resolvedTicketsList.length
    : 0
  
  const slaBreachedCount = tickets.filter(t => t.sla_breached).length
  const slaBreachRate = totalTickets > 0 ? (slaBreachedCount / totalTickets) * 100 : 0
  
  // Group by priority
  const byPriority = tickets.reduce((acc, ticket) => {
    acc[ticket.priority] = (acc[ticket.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Group by status
  const byStatus = tickets.reduce((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Group by type
  const byType = tickets.reduce((acc, ticket) => {
    acc[ticket.type] = (acc[ticket.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return {
    totalTickets,
    openTickets,
    inProgressTickets,
    resolvedTickets,
    overdueTickets,
    avgResponseTime: Math.round(avgResponseTime * 100) / 100,
    avgResolutionTime: Math.round(avgResolutionTime * 100) / 100,
    slaBreachRate: Math.round(slaBreachRate * 100) / 100,
    byPriority,
    byStatus,
    byType
  }
}

// Real-time subscription helper
export const subscribeToTicketUpdates = (callback: (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: Record<string, unknown>
  old?: Record<string, unknown>
}) => void) => {
  return supabase
    .channel('admin-tickets')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_tickets'
      },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new,
          old: payload.old
        })
      }
    )
    .subscribe()
}

// Bulk operations
export const bulkAssignTickets = async (
  ticketIds: string[],
  assigneeId: string,
  assignedBy: string
): Promise<ServiceTicket[]> => {
  await delay(500)
  
  const updatedTickets: ServiceTicket[] = []
  
  for (const ticketId of ticketIds) {
    const ticket = await assignTicket(ticketId, assigneeId, assignedBy)
    updatedTickets.push(ticket)
  }
  
  return updatedTickets
}

export const bulkUpdateStatus = async (
  ticketIds: string[],
  status: TicketStatus
): Promise<ServiceTicket[]> => {
  await delay(500)
  
  const updatedTickets: ServiceTicket[] = []
  
  for (const ticketId of ticketIds) {
    const ticket = await updateTicketStatusAndPriority(ticketId, { status })
    updatedTickets.push(ticket)
  }
  
  return updatedTickets
}

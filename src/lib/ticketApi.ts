import { 
  CreateTicketData, 
  CreateMessageData, 
  TicketFilters,
  TicketStatus,
  ServiceTicket,
  TicketMessage,
  TicketWithDetails,
  MessageWithAuthor
} from '@/types/tickets'

// Mock data for development - replace with real Supabase calls when tables are created
const mockTickets: ServiceTicket[] = [
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
    sla_response_due: null,
    sla_resolution_due: null,
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
  },
  {
    id: '2',
    ticket_number: 'TKT-2024-000002',
    user_id: 'user1',
    title: 'Spare Parts Request',
    description: 'Need replacement parts for hydraulic system',
    type: 'spare_parts',
    priority: 'medium',
    status: 'in_progress',
    related_quote_id: null,
    related_order_id: null,
    related_product_id: null,
    assigned_to: 'tech1',
    assigned_at: '2024-01-14T09:00:00Z',
    assigned_by: null,
    sla_response_due: null,
    sla_resolution_due: null,
    first_response_at: '2024-01-14T09:30:00Z',
    sla_breached: false,
    escalated: false,
    escalated_at: null,
    contact_phone: '+20123456789',
    contact_email: 'customer@example.com',
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
  }
]

const mockMessages: TicketMessage[] = [
  {
    id: '1',
    ticket_id: '1',
    author_id: 'user1',
    message: 'I need help installing the new machine. The hydraulic connections seem complex.',
    message_type: 'message',
    is_internal_note: false,
    attachments: [],
    spare_parts_details: null,
    status_change: null,
    time_spent_minutes: null,
    created_at: '2024-01-15T10:00:00Z',
    edited_at: null,
  },
  {
    id: '2',
    ticket_id: '2',
    author_id: 'user1',
    message: 'The hydraulic pump is making unusual noises and needs replacement.',
    message_type: 'message',
    is_internal_note: false,
    attachments: [],
    spare_parts_details: {
      parts: [
        {
          sku: 'HYD-PUMP-001',
          name: 'Hydraulic Pump Assembly',
          quantity: 1,
          urgency: 'high'
        }
      ]
    },
    status_change: null,
    time_spent_minutes: null,
    created_at: '2024-01-14T08:00:00Z',
    edited_at: null,
  },
  {
    id: '3',
    ticket_id: '2',
    author_id: 'tech1',
    message: 'I have reviewed your request. The part is available and will be shipped within 2 days.',
    message_type: 'message',
    is_internal_note: false,
    attachments: [],
    spare_parts_details: null,
    status_change: {
      from: 'open',
      to: 'in_progress',
      reason: 'Technician assigned and parts located'
    },
    time_spent_minutes: 30,
    created_at: '2024-01-14T09:30:00Z',
    edited_at: null,
  }
]

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Ticket CRUD operations
export const createTicket = async (ticketData: CreateTicketData, userId: string): Promise<ServiceTicket> => {
  await delay(500) // Simulate API call
  
  const newTicket: ServiceTicket = {
    id: Date.now().toString(),
    ticket_number: `TKT-2024-${String(mockTickets.length + 1).padStart(6, '0')}`,
    user_id: userId,
    title: ticketData.title,
    description: ticketData.description || null,
    type: ticketData.type || 'general',
    priority: ticketData.priority || 'medium',
    status: 'open',
    related_quote_id: ticketData.related_quote_id || null,
    related_order_id: ticketData.related_order_id || null,
    related_product_id: ticketData.related_product_id || null,
    assigned_to: null,
    assigned_at: null,
    assigned_by: null,
    sla_response_due: null,
    sla_resolution_due: null,
    first_response_at: null,
    sla_breached: false,
    escalated: false,
    escalated_at: null,
    contact_phone: ticketData.contact_phone || null,
    contact_email: ticketData.contact_email || null,
    preferred_contact_method: ticketData.preferred_contact_method || 'email',
    site_location: ticketData.site_location || null,
    machine_serial_number: ticketData.machine_serial_number || null,
    resolution_summary: null,
    customer_satisfaction_rating: null,
    customer_feedback: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    resolved_at: null,
    closed_at: null,
  }
  
  mockTickets.push(newTicket)
  return newTicket
}

export const getUserTickets = async (
  userId: string, 
  filters?: TicketFilters
): Promise<TicketWithDetails[]> => {
  await delay(300)
  
  let filteredTickets = mockTickets.filter(ticket => ticket.user_id === userId)
  
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
      ticket.ticket_number.toLowerCase().includes(searchLower)
    )
  }
  
  return filteredTickets.map(ticket => ({
    ...ticket,
    user_profile: {
      full_name: 'John Doe',
      company_name: 'ABC Manufacturing',
      phone: '+20123456789'
    },
    assigned_user: ticket.assigned_to ? {
      full_name: 'Ahmed Hassan',
      role: 'technician'
    } : undefined,
    related_product: ticket.related_product_id ? {
      name_ar: 'ماكينة قطع الألومنيوم',
      name_en: 'Aluminum Cutting Machine',
      sku: 'ALM-CUT-001'
    } : undefined,
    message_count: mockMessages.filter(msg => msg.ticket_id === ticket.id).length,
    last_message_at: mockMessages
      .filter(msg => msg.ticket_id === ticket.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
  }))
}

export const getTicketById = async (ticketId: string): Promise<TicketWithDetails | null> => {
  await delay(200)
  
  const ticket = mockTickets.find(t => t.id === ticketId)
  if (!ticket) return null
  
  return {
    ...ticket,
    user_profile: {
      full_name: 'John Doe',
      company_name: 'ABC Manufacturing',
      phone: '+20123456789'
    },
    assigned_user: ticket.assigned_to ? {
      full_name: 'Ahmed Hassan',
      role: 'technician'
    } : undefined,
    related_product: ticket.related_product_id ? {
      name_ar: 'ماكينة قطع الألومنيوم',
      name_en: 'Aluminum Cutting Machine',
      sku: 'ALM-CUT-001'
    } : undefined,
    message_count: mockMessages.filter(msg => msg.ticket_id === ticket.id).length,
    last_message_at: mockMessages
      .filter(msg => msg.ticket_id === ticket.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
  }
}

export const updateTicketStatus = async (
  ticketId: string, 
  status: TicketStatus,
  resolution_summary?: string
): Promise<ServiceTicket> => {
  await delay(300)
  
  const ticketIndex = mockTickets.findIndex(t => t.id === ticketId)
  if (ticketIndex === -1) throw new Error('Ticket not found')
  
  const ticket = mockTickets[ticketIndex]
  ticket.status = status
  ticket.updated_at = new Date().toISOString()
  
  if (status === 'resolved' || status === 'closed') {
    ticket.resolved_at = new Date().toISOString()
    if (resolution_summary) {
      ticket.resolution_summary = resolution_summary
    }
  }
  
  if (status === 'closed') {
    ticket.closed_at = new Date().toISOString()
  }
  
  return ticket
}

// Message CRUD operations
export const getTicketMessages = async (ticketId: string): Promise<MessageWithAuthor[]> => {
  await delay(200)
  
  const messages = mockMessages.filter(msg => msg.ticket_id === ticketId)
  
  return messages.map(msg => ({
    ...msg,
    author: {
      full_name: msg.author_id === 'user1' ? 'John Doe' : 'Ahmed Hassan',
      role: msg.author_id === 'user1' ? 'customer' : 'technician',
      avatar_url: null
    }
  }))
}

export const createMessage = async (messageData: CreateMessageData & { author_id: string }): Promise<TicketMessage> => {
  await delay(300)
  
  const newMessage: TicketMessage = {
    id: Date.now().toString(),
    ticket_id: messageData.ticket_id,
    author_id: messageData.author_id,
    message: messageData.message,
    message_type: messageData.message_type || 'message',
    is_internal_note: messageData.is_internal_note || false,
    attachments: messageData.attachments || [],
    spare_parts_details: messageData.spare_parts_details || null,
    status_change: null,
    time_spent_minutes: messageData.time_spent_minutes || null,
    created_at: new Date().toISOString(),
    edited_at: null,
  }
  
  mockMessages.push(newMessage)
  return newMessage
}

// Analytics and reporting
export const getTicketStats = async (userId: string) => {
  await delay(200)
  
  const userTickets = mockTickets.filter(t => t.user_id === userId)
  
  return {
    total: userTickets.length,
    open: userTickets.filter(t => ['open', 'assigned', 'in_progress'].includes(t.status)).length,
    resolved: userTickets.filter(t => t.status === 'resolved').length,
    closed: userTickets.filter(t => t.status === 'closed').length,
    byPriority: {
      low: userTickets.filter(t => t.priority === 'low').length,
      medium: userTickets.filter(t => t.priority === 'medium').length,
      high: userTickets.filter(t => t.priority === 'high').length,
      critical: userTickets.filter(t => t.priority === 'critical').length,
      urgent: userTickets.filter(t => t.priority === 'urgent').length,
    },
    byType: {
      general: userTickets.filter(t => t.type === 'general').length,
      technical: userTickets.filter(t => t.type === 'technical').length,
      billing: userTickets.filter(t => t.type === 'billing').length,
      sales: userTickets.filter(t => t.type === 'sales').length,
      spare_parts: userTickets.filter(t => t.type === 'spare_parts').length,
      warranty: userTickets.filter(t => t.type === 'warranty').length,
      complaint: userTickets.filter(t => t.type === 'complaint').length,
      installation: userTickets.filter(t => t.type === 'installation').length,
      maintenance: userTickets.filter(t => t.type === 'maintenance').length,
    },
    avgResolutionTime: 24 // Mock average resolution time in hours
  }
}

// File upload for attachments (mock)
export const uploadTicketAttachment = async (
  file: File,
  ticketId: string
): Promise<string> => {
  await delay(1000) // Simulate upload time
  
  // In real implementation, this would upload to Supabase storage
  return `https://example.com/attachments/${ticketId}/${file.name}`
}

// Search helper
export const searchTickets = async (
  userId: string,
  searchTerm: string,
  filters?: Omit<TicketFilters, 'search'>
) => {
  return getUserTickets(userId, { ...filters, search: searchTerm })
}

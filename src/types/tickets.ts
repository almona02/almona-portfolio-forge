// Ticket system type definitions
export type TicketType = 'general' | 'technical' | 'billing' | 'sales' | 'spare_parts' | 'warranty' | 'complaint' | 'installation' | 'maintenance' | 'other'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical' | 'urgent'
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'awaiting_parts' | 'awaiting_customer' | 'pending_approval' | 'resolved' | 'closed' | 'cancelled'
export type MessageType = 'message' | 'spare_parts_request' | 'status_update' | 'assignment' | 'resolution' | 'internal_note'

export interface ServiceTicket {
  id: string
  ticket_number: string
  digital_twin_code?: string | null
  category?: string | null
  user_id: string
  title: string
  description: string | null
  type: TicketType
  priority: TicketPriority
  status: TicketStatus
  source?: string | null
  maintenance_type?: string | null
  related_quote_id: string | null
  related_order_id: string | null
  related_product_id: string | null
  assigned_to: string | null
  assigned_at: string | null
  assigned_by: string | null
  sla_response_due: string | null
  sla_resolution_due: string | null
  first_response_at: string | null
  sla_breached: boolean
  escalated: boolean
  escalated_at: string | null
  contact_phone: string | null
  contact_email: string | null
  preferred_contact_method: string
  site_location: string | null
  machine_serial_number: string | null
  resolution_summary: string | null
  customer_satisfaction_rating: number | null
  customer_feedback: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  closed_at: string | null
}

export interface TicketMessage {
  id: string
  ticket_id: string
  author_id: string
  message: string
  message_type: MessageType
  is_internal_note: boolean
  attachments: Array<{
    filename: string
    url: string
    size: number
    type: string
  }>
  spare_parts_details: {
    parts: Array<{
      sku: string
      name: string
      quantity: number
      urgency: string
    }>
    estimated_cost?: number
    delivery_timeline?: string
    quote_id?: string
  } | null
  status_change: {
    from: string
    to: string
    reason: string
  } | null
  time_spent_minutes: number | null
  created_at: string
  edited_at: string | null
}

export interface CreateTicketData {
  title: string
  description: string
  type: TicketType
  priority: TicketPriority
  contact_phone?: string
  contact_email?: string
  preferred_contact_method?: string
  site_location?: string
  machine_serial_number?: string
  related_product_id?: string
  related_quote_id?: string
  related_order_id?: string
  maintenance_type?: 'preventive' | 'corrective' | 'predictive' | 'emergency'
}

export interface CreateMessageData {
  ticket_id: string
  message: string
  message_type?: MessageType
  is_internal_note?: boolean
  attachments?: Array<{
    filename: string
    url: string
    size: number
    type: string
  }>
  spare_parts_details?: {
    parts: Array<{
      sku: string
      name: string
      quantity: number
      urgency: string
    }>
    estimated_cost?: number
    delivery_timeline?: string
  }
  time_spent_minutes?: number
}

export interface TicketFilters {
  status?: TicketStatus[]
  type?: TicketType[]
  priority?: TicketPriority[]
  search?: string
  dateFrom?: string
  dateTo?: string
}

// Extended database types for tickets
export interface TicketWithDetails extends ServiceTicket {
  user_profile?: {
    full_name: string | null
    company_name: string | null
    phone: string | null
  }
  assigned_user?: {
    full_name: string | null
    role: string
  }
  related_product?: {
    name_ar: string
    name_en: string
    sku: string
  }
  message_count?: number
  last_message_at?: string
}

export interface MessageWithAuthor extends TicketMessage {
  author?: {
    full_name: string | null
    role: string
    avatar_url: string | null
  }
}

// Makula.ai integration types for machine maintenance
export interface MachineMaintenanceData {
  machine_id: string
  serial_number: string
  model: string
  last_maintenance: string
  next_maintenance_due: string
  maintenance_history: Array<{
    date: string
    type: string
    description: string
    technician: string
    parts_replaced: string[]
    cost: number
  }>
  predictive_insights: {
    risk_level: 'low' | 'medium' | 'high'
    predicted_failures: Array<{
      component: string
      probability: number
      estimated_date: string
      recommended_action: string
    }>
    maintenance_recommendations: Array<{
      priority: 'low' | 'medium' | 'high'
      action: string
      estimated_cost: number
      urgency_days: number
    }>
  }
}

export interface MaintenanceTicketData extends CreateTicketData {
  machine_maintenance_data?: MachineMaintenanceData
  maintenance_type?: 'preventive' | 'corrective' | 'predictive' | 'emergency'
  urgency_level?: 'routine' | 'urgent' | 'critical'
}

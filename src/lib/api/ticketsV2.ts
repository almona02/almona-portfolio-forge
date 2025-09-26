/* Unified Tickets V2 API client
 * Bridges frontend to FastAPI /api/v2/tickets endpoints.
 */
import { TicketPriority, TicketStatus } from '@/types/tickets'

export interface V2SupportTicketPayload {
  category: 'support'
  payload: {
    title: string
    description?: string | null
    priority?: TicketPriority
    machine_id?: string | null
    machine_serial_number?: string | null
  }
}

export interface V2PreventiveMaintenancePayload {
  category: 'preventive_maintenance'
  payload: {
    title: string
    description?: string | null
    priority?: TicketPriority
    machine_id?: string | null
    machine_serial_number?: string | null
  }
  maintenance_metadata?: Record<string, unknown>
}

export interface V2ScheduledMaintenancePayload extends V2PreventiveMaintenancePayload {
  category: 'scheduled_maintenance'
  scheduled_for: string // ISO datetime
}

export interface V2EmergencyServicePayload {
  category: 'emergency_service'
  payload: {
    title: string
    description?: string | null
    priority?: TicketPriority
    machine_id?: string | null
    machine_serial_number?: string | null
  }
  severity?: TicketPriority
}

export interface V2ProductQuoteTicketPayload {
  category: 'product_quote'
  payload: {
    title: string
    description?: string | null
    priority?: TicketPriority
  }
  related_product_id?: string
}

export interface V2AddToQuoteTicketPayload {
  category: 'add_to_quote'
  payload: {
    title: string
    description?: string | null
    priority?: TicketPriority
  }
  related_quote_id?: string
}

export type V2CreateTicketPayload =
  | V2SupportTicketPayload
  | V2PreventiveMaintenancePayload
  | V2ScheduledMaintenancePayload
  | V2EmergencyServicePayload
  | V2ProductQuoteTicketPayload
  | V2AddToQuoteTicketPayload

export interface V2TicketResponse {
  id: string
  ticket_number: string
  category: string
  status: TicketStatus | string
  priority: TicketPriority
  title: string
  description?: string | null
  digital_twin_code?: string | null
  scheduled_for?: string | null
  machine_id?: string | null
  machine_serial_number?: string | null
  created_at: string
  updated_at: string
}

async function http<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Request failed ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || ''
const BASE = `${API_BASE}/api/v2/tickets`

export const ticketsV2Api = {
  create(payload: V2CreateTicketPayload) {
    let path = ''
    switch (payload.category) {
      case 'support':
        path = '/support'
        break
      case 'preventive_maintenance':
        path = '/maintenance/preventive'
        break
      case 'scheduled_maintenance':
        path = '/maintenance/scheduled'
        break
      case 'emergency_service':
        path = '/emergency'
        break
      case 'product_quote':
        path = '/product-quote'
        break
      case 'add_to_quote':
        path = '/add-to-quote'
        break
      default:
        throw new Error(`Unsupported category: ${(payload as any).category}`)
    }
    return http<V2TicketResponse>(`${BASE}${path}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  get(id: string) {
    return http<V2TicketResponse>(`${BASE}/${id}`)
  },
  list(filters?: { category?: string; status?: string }) {
    const params = new URLSearchParams()
    if (filters?.category) params.set('category', filters.category)
    if (filters?.status) params.set('status_param', filters.status)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return http<V2TicketResponse[]>(`${BASE}/${qs}`)
  },
  updateStatus(id: string, status: TicketStatus, resolution_summary?: string) {
    return http<V2TicketResponse>(`${BASE}/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, resolution_summary }),
    })
  },
  assign(id: string, assigneeId: string) {
    return http<V2TicketResponse>(`${BASE}/${id}/assign/${assigneeId}`, {
      method: 'POST',
    })
  },
  addMessage(id: string, message: string, opts?: { message_type?: string; is_internal?: boolean }) {
    return http<{ id: string }>(`${BASE}/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        message_type: opts?.message_type || 'message',
        is_internal: opts?.is_internal || false,
      }),
    })
  },
  listMessages(id: string) {
    return http<any[]>(`${BASE}/${id}/messages`)
  },
}

export type { V2TicketResponse as UnifiedTicket };
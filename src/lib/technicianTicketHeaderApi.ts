import { supabase } from '@/lib/supabase'

/** Approved technician ticket-header fields (T-G1). No contact_* / user_id. */
export type TechnicianTicketHeader = {
  id: string
  ticket_number: string | null
  title: string | null
  status: string | null
  priority: string | null
  type: string | null
  description: string | null
  machine_id: string | null
  machine_serial_number: string | null
  site_location: string | null
  created_at: string | null
  maintenance_type: string | null
}

export async function getTechnicianTicketHeader(
  ticketId: string,
): Promise<TechnicianTicketHeader | null> {
  const { data, error } = await supabase.rpc('get_technician_ticket_header', {
    p_ticket_id: ticketId,
  })
  if (error) throw new Error(error.message)
  if (data == null) return null
  return data as TechnicianTicketHeader
}

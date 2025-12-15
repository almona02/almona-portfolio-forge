import { supabase, createQuote, getProducts, getUserQuotes } from './supabase';
import { buildNavigationState, TicketContext } from '@/lib/ticketing/unifiedTicketing';

// =================================
// Type Definitions
// =================================

export interface Machine {
  id: string;
  created_at: string;
  name: string;
  model: string;
  serial_number: string;
  owner_id: string;
  installation_date?: string | null;
  warranty_valid?: boolean | null;
  photo_urls?: string[] | null;
}

// Service ticket shape (lightweight; for full shape use ServiceTicket from types/tickets if needed)
export interface Ticket {
  id: string;
  ticket_number?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  maintenance_type?: string | null;
  machine_serial_number?: string | null;
  source?: string | null;
  context?: Record<string, unknown> | null;
}

export interface Document {
  id: string;
  user_id: string;
  document_name: string;
  document_url: string;
  upload_date: string;
}

// =================================
// Auth API
// =================================

interface TicketInsert {
  user_id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  machine_id?: string;
  maintenance_type?: string;
  scheduled_date?: string;
  status: string;
}

export const api = {
  // Auth endpoints
  login: async (credentials) => {
    return supabase.auth.signInWithPassword(credentials);
  },
  register: async (userData) => {
    const { data: { user }, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          full_name: userData.full_name,
          company_name: userData.company_name,
          phone: userData.phone,
          sector: userData.sector,
        }
      }
    });

    if (error) {
      throw error;
    }
    return user;
  },
  logout: async () => {
    return supabase.auth.signOut();
  },

  // Customer data
  // Fetch user-specific machines
   fetchUserMachines: async (userId: string): Promise<Machine[]> => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      const msg = err.message?.toLowerCase() || '';
      // Gracefully handle missing table / RLS denial by returning empty array instead of hard failure
      if (err.code === '42P01' || msg.includes('relation') && msg.includes('machines')) {
        console.warn('[api.fetchUserMachines] machines table missing; returning empty list');
        return [];
      }
      if (msg.includes('permission denied') || msg.includes('rls')) {
        console.warn('[api.fetchUserMachines] RLS prevented access; returning empty list');
        return [];
      }
      console.error('Error fetching machines:', error);
      throw new Error(err.message || 'Failed to fetch machines');
    }
  },

  // Fetch user-specific tickets
  fetchUserTickets: async (userId: string): Promise<Ticket[]> => {
    try {
      const { data, error } = await supabase
        .from('service_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      const msg = err.message?.toLowerCase() || '';
      if (err.code === '42P01' || (msg.includes('relation') && msg.includes('service_tickets'))) {
        console.warn('[api.fetchUserTickets] service_tickets table missing; returning empty list');
        return [];
      }
      if (msg.includes('permission denied') || msg.includes('rls')) {
        console.warn('[api.fetchUserTickets] RLS prevented access; returning empty list');
        return [];
      }
      console.error('Error fetching tickets:', error);
      throw new Error(err.message || 'Failed to fetch tickets');
    }
  },

  // Register a new machine
  registerMachine: async (machineData: {
    name: string;
    model: string;
    serial_number: string;
    owner_id: string;
    installation_date?: string | null;
    warranty_valid?: boolean | null;
    photo_urls?: string[] | null;
  }) => {
   
  const { data, error } = await (supabase as unknown as { from: (table: string) => any })
      .from('machines')
      .insert([machineData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Upload a machine photo (returns public URL). Bucket must exist in Supabase storage.
  uploadMachinePhoto: async (file: File, ownerId: string, serial: string) => {
    const path = `${ownerId}/${serial}/${Date.now()}-${file.name}`;
     
    const storage = (supabase as unknown as { storage: any }).storage.from('machine-photos');
    const { error } = await storage.upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: pub } = storage.getPublicUrl(path);
    return pub.publicUrl as string;
  },

  // Create a new support ticket
  createTicket: async (ticketData: TicketInsert & { attachments?: File[]; source?: string; context?: Record<string, unknown> }): Promise<Ticket> => {
    const payload = {
      user_id: ticketData.user_id,
      title: ticketData.title,
      description: ticketData.description,
      type: ticketData.type,
      priority: ticketData.priority,
      machine_serial_number: ticketData.machine_id ?? null,
      maintenance_type: ticketData.maintenance_type ?? null,
      status: ticketData.status,
      source: ticketData.source || 'api',
      context: ticketData.context || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as const;
     
    const { data, error } = await (supabase as unknown as { from: (table: string) => any })
      .from('service_tickets')
      .insert([payload])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating ticket:', error);
      throw new Error(error.message || 'Failed to create ticket');
    }
    return data;
  },

  // Post a ticket message
  createTicketMessage: async (params: { ticket_id: string; author_id: string; message: string; message_type?: string; is_internal_note?: boolean; spare_parts_details?: unknown }) => {
    const payload = {
      ticket_id: params.ticket_id,
      author_id: params.author_id,
      message: params.message,
      message_type: params.message_type || 'message',
      is_internal_note: params.is_internal_note || false,
      spare_parts_details: params.spare_parts_details || null,
      created_at: new Date().toISOString()
    };
     
    const { data, error } = await (supabase as unknown as { from: (table: string) => any })
      .from('ticket_messages')
      .insert([payload])
      .select()
      .single();
    if (error) {
      console.error('Error creating ticket message:', error);
      throw new Error(error.message || 'Failed to create ticket message');
    }
    return data;
  },

  // Analytics: count by source and basic SLA (resolved count / total)
  fetchTicketSourceAnalytics: async () => {
    const { data, error } = await supabase
      .from('service_tickets')
      .select('source,status,created_at,resolved_at');
    if (error) throw error;
    const stats: Record<string, { total: number; resolved: number }> = {};
  type Row = { source?: string | null; status?: string | null };
  (data as Row[] | null || []).forEach(t => {
      const src = t.source || 'unknown';
      if (!stats[src]) stats[src] = { total: 0, resolved: 0 };
      stats[src].total++;
      if (t.status === 'resolved' || t.status === 'closed') stats[src].resolved++;
    });
    return Object.entries(stats).map(([source, s]) => ({ source, total: s.total, resolved: s.resolved, resolutionRate: s.total ? s.resolved / s.total : 0 }));
  },

   // Get user documents
  fetchUserDocuments: async (userId: string): Promise<Document[]> => {
    const { data, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .order('upload_date', { ascending: false });

    if (error) {
      // Gracefully degrade if table is not yet provisioned or PostgREST returns 404
      const msg = (error.message || '').toLowerCase();
      const code = (error as unknown as { code?: string; status?: number }).code;
      const status = (error as unknown as { status?: number }).status;
      const missingTable = msg.includes('relation') && msg.includes('user_documents');
      const undefinedTableCode = code === '42P01';
      const httpNotFound = status === 404 || msg.includes('404') || msg.includes('not found');
      const permissionError = status === 403 || msg.includes('permission') || msg.includes('RLS');
      if (missingTable || undefinedTableCode || httpNotFound || permissionError) {
        // Silently return empty list for expected errors
        if (process.env.NODE_ENV === 'development' && !permissionError) {
          console.warn('[api.fetchUserDocuments] user_documents not available; returning empty list.');
        }
        return [];
      }
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching documents:', error);
      }
      throw new Error(error.message || 'Failed to fetch documents');
    }
    return data || [];
  }
};

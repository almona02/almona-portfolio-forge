export interface Machine {
  id: string;
  name: string;
  model: string;
  serial_number: string;
  owner_id: string;
  purchase_date?: string;
  warranty_expiry?: string;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  type: string;
  user_id: string;
  machine_id?: string;
  created_at: string;
  updated_at: string;
}
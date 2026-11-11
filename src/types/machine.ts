export interface Machine {
  id: string;
  name: string;
  model: string;
  /** Manufacturer serial (null for provisional / missing-plate). Never an ALM- value. */
  serial_number: string | null;
  serial_number_raw?: string | null;
  provisional_asset_ref?: string | null;
  catalog_link_status?: 'linked' | 'uncatalogued' | 'uncertain';
  identity_confidence?: string;
  identity_review_status?: string;
  identity_lifecycle?: string;
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
export interface Machine {
  id: string;
  name: string;
  model: string;
  serial_number: string;
  installation_date?: string;
  status: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  type: string;
  upload_date: string;
  size: string;
  url: string;
}
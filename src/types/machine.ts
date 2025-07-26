export interface Machine {
  id: string;
  serialNumber: string;
  model: string;
  installationDate: Date;
  warrantyExpiry: Date;
  location: {
    facility: string;
    geoCoordinates?: string;
    floorPlanPosition?: string;
  };
  serviceHistory: ServiceEvent[];
  healthMetrics: {
    overallScore: number;
    components: {
      [key: string]: {
        score: number;
        lastCheck: Date;
      };
    };
  };
  connected: boolean;
  owner: Customer;
}

export interface Customer {
  id: string;
  name: string;
  facilities: Facility[];
  contacts: ContactPerson[];
  serviceContract: ServiceContract;
  accessLevel: 'basic' | 'premium' | 'enterprise';
}

export interface ServiceEvent {
  id: string;
  date: Date;
  type: 'maintenance' | 'repair' | 'inspection';
  technician: string;
  duration: number;
  partsUsed: Part[];
  notes: string;
  followUpRequired: boolean;
}

export interface Facility {
  id: string;
  name: string;
  address: string;
  geoCoordinates?: string;
}

export interface ContactPerson {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface ServiceContract {
  id: string;
  startDate: Date;
  endDate: Date;
  terms: string;
  coverageLevel: 'basic' | 'premium' | 'enterprise';
}

export interface Part {
  id: string;
  name: string;
  partNumber: string;
  manufacturer: string;
  price: number;
  stockQuantity: number;
}

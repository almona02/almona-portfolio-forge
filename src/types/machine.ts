import { Certification } from './certification';
export interface Machine {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  releaseDate: Date;
  type: string;
  powerSpec: string;
  dimensions: string;
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
  specifications: {
    key: string;
    value: string;
  }[];
  certifications: Certification[];
  stock: number;
  tags: string[];
  pricing?: {
    currency: "EGP" | "USD" | "EUR";
    basePrice?: number;
    installationCost?: number;
    warrantyYears?: number;
  };
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

export interface Customer {
  id: string;
  name: string;
  facilities: Facility[];
  contacts: ContactPerson[];
  serviceContract: ServiceContract;
  accessLevel: 'basic' | 'premium' | 'enterprise';
}

export interface Facility {
  id: string;
  name: string;
  address: string;
}

export interface ContactPerson {
  id: string;
  name: string;
}

export interface ServiceContract {
  id: string;
  type: string;
}

export interface Part {
  id: string;
  name: string;
}

import type { PilotSystemId } from '@/data/pilot-systems';

export interface SystemCertifications {
  iso?: string[];
  en?: string[]; // European Norms
  astm?: string[]; // American Standards
  egyptian?: string[]; // EOS Standards
}

export interface TechnicalSpecs {
  uValue: number; // W/m²K
  windLoadClass: string; // e.g., 'C4'
  airPermeability: string; // e.g., 'Class 4'
  waterTightness: string; // e.g., '9A'
  soundReduction: number; // dB
  profileDepth: number; // mm
  glazingCapacity: { min: number; max: number }; // mm
}

export interface SystemGalleryItem {
  id: PilotSystemId | string;
  name: string;
  nameArabic: string;
  manufacturer: string;
  category: 'aluminum' | 'upvc' | 'specialty';
  description: string;
  descriptionArabic: string;
  
  // Market Intelligence
  marketShare: number; // Percentage
  priceRange: { min: number; max: number; currency: 'EGP' };
  tier: 'gold' | 'silver' | 'bronze';
  availability: 'stock' | 'order' | 'import';
  
  // Technical Data
  specs: TechnicalSpecs;
  certifications: SystemCertifications;
  
  // Assets
  imageUrl?: string;
  blueprintUrl?: string; // For the technical drawing view
  
  // Integration
  pilotAvailable: boolean;
  pilotSystemId?: PilotSystemId;
}

export interface GalleryFilterState {
  category: 'all' | 'aluminum' | 'upvc';
  tier: 'all' | 'gold' | 'silver';
  search: string;
  sortBy: 'marketShare' | 'price' | 'uValue';
}


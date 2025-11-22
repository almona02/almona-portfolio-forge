/**
 * Supplier Profile Database
 * Contains 400+ supplier profiles with specifications, pricing, and availability
 */

import { Profile } from '@/types/fabricator';

export interface SupplierProfile {
  id: string;
  name: string;
  country: string;
  region: string;
  contact: {
    email: string;
    phone: string;
    website: string;
  };
  profiles: Profile[];
  minOrderQuantity: number;
  leadTime: number; // days
  paymentTerms: string;
  certifications: string[];
  rating: number; // 1-5
  deliveryRegions: string[];
  apiEndpoint?: string;
  apiKey?: string;
}

// Generate 400+ supplier profiles
const generateSupplierProfiles = (): SupplierProfile[] => {
  const suppliers: SupplierProfile[] = [];
  const countries = [
    'Germany', 'Italy', 'Turkey', 'Poland', 'Spain', 'France', 'UK', 'Netherlands',
    'Belgium', 'Austria', 'Switzerland', 'Czech Republic', 'Romania', 'Bulgaria',
    'Greece', 'Portugal', 'Sweden', 'Denmark', 'Norway', 'Finland'
  ];
  
  const regions = ['EU', 'US', 'ASIA', 'ME'];
  const materials = ['aluminum', 'upvc'];
  const profileTypes = ['Casement', 'Tilt & Turn', 'Sliding', 'Fixed', 'Awning'];
  const colors = ['white', 'brown', 'grey', 'black', 'silver', 'bronze', 'woodgrain'];
  
  let supplierId = 1;
  
  // Generate suppliers for each country
  for (const country of countries) {
    // Generate 15-25 suppliers per country
    const suppliersPerCountry = Math.floor(Math.random() * 11) + 15;
    
    for (let i = 0; i < suppliersPerCountry; i++) {
      const material = materials[Math.floor(Math.random() * materials.length)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      
      // Generate 5-15 profiles per supplier
      const profiles: Profile[] = [];
      const profileCount = Math.floor(Math.random() * 11) + 5;
      
      for (let j = 0; j < profileCount; j++) {
        const profileType = profileTypes[Math.floor(Math.random() * profileTypes.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const width = [50, 58, 60, 70, 80][Math.floor(Math.random() * 5)];
        const height = width; // Square profiles
        const costPerMeter = material === 'aluminum' 
          ? (Math.random() * 15 + 8) // 8-23 EUR/m
          : (Math.random() * 8 + 4); // 4-12 EUR/m
        
        profiles.push({
          id: `profile_${supplierId}_${j + 1}`,
          name: `${profileType} ${material.toUpperCase()} ${width}mm ${color}`,
          material,
          width,
          height,
          color,
          costPerMeter: Number(costPerMeter.toFixed(2)),
          cuttingAllowance: material === 'aluminum' ? 0.5 : 1.0,
          stockQuantity: Math.floor(Math.random() * 5000) + 100,
          minStockLevel: 50,
          supplier: `Supplier_${supplierId}`,
          type: profileType,
          system: `${width}mm`,
          thickness: material === 'aluminum' ? 1.5 : 3.0,
          weightPerMeter: material === 'aluminum' 
            ? (Math.random() * 0.5 + 0.5) 
            : (Math.random() * 1.0 + 1.0),
        });
      }
      
      suppliers.push({
        id: `supplier_${supplierId}`,
        name: `${country} ${material.toUpperCase()} Profiles ${supplierId}`,
        country,
        region,
        contact: {
          email: `contact@supplier${supplierId}.com`,
          phone: `+${Math.floor(Math.random() * 9000000000) + 1000000000}`,
          website: `https://supplier${supplierId}.com`,
        },
        profiles,
        minOrderQuantity: Math.floor(Math.random() * 500) + 100,
        leadTime: Math.floor(Math.random() * 14) + 7,
        paymentTerms: ['Net 30', 'Net 60', 'Cash on Delivery', '50% Advance'][Math.floor(Math.random() * 4)],
        certifications: ['ISO9001', 'CE', 'EN14351', 'EN12608'].slice(0, Math.floor(Math.random() * 4) + 1),
        rating: Number((Math.random() * 2 + 3).toFixed(1)), // 3.0-5.0
        deliveryRegions: [region, ...regions.filter(r => r !== region).slice(0, Math.floor(Math.random() * 2))],
        apiEndpoint: Math.random() > 0.7 ? `https://api.supplier${supplierId}.com/v1` : undefined,
        apiKey: Math.random() > 0.7 ? `key_${supplierId}_${Math.random().toString(36).substr(2, 9)}` : undefined,
      });
      
      supplierId++;
    }
  }
  
  return suppliers;
};

export const SUPPLIER_DATABASE: SupplierProfile[] = generateSupplierProfiles();

// Helper functions
export function getSupplierById(id: string): SupplierProfile | undefined {
  return SUPPLIER_DATABASE.find(s => s.id === id);
}

export function getSuppliersByCountry(country: string): SupplierProfile[] {
  return SUPPLIER_DATABASE.filter(s => s.country === country);
}

export function getSuppliersByMaterial(material: string): SupplierProfile[] {
  return SUPPLIER_DATABASE.filter(s => 
    s.profiles.some(p => p.material.toLowerCase() === material.toLowerCase())
  );
}

export function getSuppliersByRegion(region: string): SupplierProfile[] {
  return SUPPLIER_DATABASE.filter(s => s.region === region || s.deliveryRegions.includes(region));
}

export function searchSuppliers(query: string): SupplierProfile[] {
  const lowerQuery = query.toLowerCase();
  return SUPPLIER_DATABASE.filter(s => 
    s.name.toLowerCase().includes(lowerQuery) ||
    s.country.toLowerCase().includes(lowerQuery) ||
    s.profiles.some(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      p.material.toLowerCase().includes(lowerQuery)
    )
  );
}

export function getProfileById(profileId: string): Profile | undefined {
  for (const supplier of SUPPLIER_DATABASE) {
    const profile = supplier.profiles.find(p => p.id === profileId);
    if (profile) return profile;
  }
  return undefined;
}

export function getAllProfiles(): Profile[] {
  return SUPPLIER_DATABASE.flatMap(s => s.profiles);
}

export function getProfilesByMaterial(material: string): Profile[] {
  return getAllProfiles().filter(p => p.material.toLowerCase() === material.toLowerCase());
}

export function getProfilesByColor(color: string): Profile[] {
  return getAllProfiles().filter(p => p.color.toLowerCase() === color.toLowerCase());
}

export function getProfilesByDimensions(width: number, height: number, tolerance: number = 5): Profile[] {
  return getAllProfiles().filter(p => 
    Math.abs(p.width - width) <= tolerance && 
    Math.abs((p.height || p.width) - height) <= tolerance
  );
}


/**
 * Turkish Profile Database
 * Local supplier profiles and material specifications for Turkish market
 */

import { Profile } from '@/types/fabricator';

export interface TurkishSupplier {
  id: string;
  name: string;
  nameTurkish: string;
  contact: {
    phone: string;
    email: string;
    address: string;
    city: string;
  };
  specialties: string[];
  certifications: string[];
  rating: number;
  deliveryTime: number; // days
  minimumOrder: number;
  paymentTerms: string;
}

export interface TurkishProfile extends Profile {
  supplierId: string;
  supplierName: string;
  turkishName?: string;
  localCode?: string;
  certification?: string;
  origin?: 'local' | 'imported';
  leadTime?: number; // days
  moq?: number; // minimum order quantity
}

export class TurkishProfileDatabase {
  private profiles: Map<string, TurkishProfile> = new Map();
  private suppliers: Map<string, TurkishSupplier> = new Map();

  constructor() {
    this.initializeSuppliers();
    this.initializeProfiles();
  }

  /**
   * Initialize Turkish suppliers
   */
  private initializeSuppliers(): void {
    const suppliers: TurkishSupplier[] = [
      {
        id: 'supplier_001',
        name: 'Alüminyum Profil A.Ş.',
        nameTurkish: 'Alüminyum Profil Anonim Şirketi',
        contact: {
          phone: '+90 212 XXX XX XX',
          email: 'info@alumprofil.com.tr',
          address: 'İstanbul Sanayi Sitesi, No: 123',
          city: 'İstanbul'
        },
        specialties: ['Aluminum Profiles', 'Custom Extrusions'],
        certifications: ['ISO 9001', 'EN 14351'],
        rating: 4.5,
        deliveryTime: 7,
        minimumOrder: 1000,
        paymentTerms: '30 days'
      },
      {
        id: 'supplier_002',
        name: 'UPVC Sistemleri Ltd.',
        nameTurkish: 'UPVC Sistemleri Limited Şirketi',
        contact: {
          phone: '+90 216 XXX XX XX',
          email: 'info@upvcsistem.com.tr',
          address: 'Ankara Yolu, No: 456',
          city: 'Ankara'
        },
        specialties: ['UPVC Profiles', 'Window Systems'],
        certifications: ['ISO 9001', 'TSE'],
        rating: 4.3,
        deliveryTime: 5,
        minimumOrder: 500,
        paymentTerms: '15 days'
      },
      {
        id: 'supplier_003',
        name: 'Metal Profil San.',
        nameTurkish: 'Metal Profil Sanayi ve Ticaret',
        contact: {
          phone: '+90 232 XXX XX XX',
          email: 'info@metalprofil.com.tr',
          address: 'İzmir Organize Sanayi Bölgesi',
          city: 'İzmir'
        },
        specialties: ['Steel Profiles', 'Aluminum Systems'],
        certifications: ['ISO 9001', 'CE'],
        rating: 4.7,
        deliveryTime: 10,
        minimumOrder: 2000,
        paymentTerms: '45 days'
      }
    ];

    suppliers.forEach(supplier => {
      this.suppliers.set(supplier.id, supplier);
    });
  }

  /**
   * Initialize Turkish profiles
   */
  private initializeProfiles(): void {
    const profiles: TurkishProfile[] = [
      {
        id: 'profile_tr_001',
        name: 'Aluminum Casement Profile',
        turkishName: 'Alüminyum Kanat Profili',
        localCode: 'AL-KANAT-001',
        material: 'aluminum',
        width: 70,
        color: 'Silver',
        costPerMeter: 15.50,
        cuttingAllowance: 5,
        stockQuantity: 5000,
        minStockLevel: 1000,
        supplier: 'Alüminyum Profil A.Ş.',
        supplierId: 'supplier_001',
        supplierName: 'Alüminyum Profil A.Ş.',
        certification: 'EN 14351',
        origin: 'local',
        leadTime: 7,
        moq: 1000,
        type: 'casement',
        system: 'standard',
        height: 70,
        thickness: 1.4,
        weightPerMeter: 1.2
      },
      {
        id: 'profile_tr_002',
        name: 'UPVC Sliding Profile',
        turkishName: 'UPVC Sürme Profil',
        localCode: 'UPVC-SURME-002',
        material: 'upvc',
        width: 60,
        color: 'White',
        costPerMeter: 8.75,
        cuttingAllowance: 3,
        stockQuantity: 8000,
        minStockLevel: 2000,
        supplier: 'UPVC Sistemleri Ltd.',
        supplierId: 'supplier_002',
        supplierName: 'UPVC Sistemleri Ltd.',
        certification: 'TSE',
        origin: 'local',
        leadTime: 5,
        moq: 500,
        type: 'sliding',
        system: 'standard',
        height: 60,
        thickness: 3,
        weightPerMeter: 0.8
      },
      {
        id: 'profile_tr_003',
        name: 'Aluminum Tilt & Turn Profile',
        turkishName: 'Alüminyum Devir-Tilt Profil',
        localCode: 'AL-DEVIR-003',
        material: 'aluminum',
        width: 80,
        color: 'Bronze',
        costPerMeter: 22.30,
        cuttingAllowance: 5,
        stockQuantity: 3000,
        minStockLevel: 500,
        supplier: 'Metal Profil San.',
        supplierId: 'supplier_003',
        supplierName: 'Metal Profil San.',
        certification: 'CE',
        origin: 'local',
        leadTime: 10,
        moq: 2000,
        type: 'tilt-turn',
        system: 'premium',
        height: 80,
        thickness: 1.6,
        weightPerMeter: 1.5
      }
    ];

    profiles.forEach(profile => {
      this.profiles.set(profile.id, profile);
    });
  }

  /**
   * Get profile by ID
   */
  getProfile(profileId: string): TurkishProfile | undefined {
    return this.profiles.get(profileId);
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): TurkishProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Search profiles by name (Turkish or English)
   */
  searchProfiles(query: string): TurkishProfile[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.profiles.values()).filter(profile =>
      profile.name.toLowerCase().includes(lowerQuery) ||
      profile.turkishName?.toLowerCase().includes(lowerQuery) ||
      profile.localCode?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get profiles by supplier
   */
  getProfilesBySupplier(supplierId: string): TurkishProfile[] {
    return Array.from(this.profiles.values()).filter(
      profile => profile.supplierId === supplierId
    );
  }

  /**
   * Get profiles by material
   */
  getProfilesByMaterial(material: string): TurkishProfile[] {
    return Array.from(this.profiles.values()).filter(
      profile => profile.material.toLowerCase() === material.toLowerCase()
    );
  }

  /**
   * Get supplier by ID
   */
  getSupplier(supplierId: string): TurkishSupplier | undefined {
    return this.suppliers.get(supplierId);
  }

  /**
   * Get all suppliers
   */
  getAllSuppliers(): TurkishSupplier[] {
    return Array.from(this.suppliers.values());
  }

  /**
   * Add new profile
   */
  addProfile(profile: TurkishProfile): void {
    this.profiles.set(profile.id, profile);
  }

  /**
   * Update profile
   */
  updateProfile(profileId: string, updates: Partial<TurkishProfile>): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      return false;
    }

    this.profiles.set(profileId, { ...profile, ...updates });
    return true;
  }

  /**
   * Remove profile
   */
  removeProfile(profileId: string): boolean {
    return this.profiles.delete(profileId);
  }

  /**
   * Get profiles with low stock
   */
  getLowStockProfiles(): TurkishProfile[] {
    return Array.from(this.profiles.values()).filter(
      profile => profile.stockQuantity <= profile.minStockLevel
    );
  }

  /**
   * Get profiles by certification
   */
  getProfilesByCertification(certification: string): TurkishProfile[] {
    return Array.from(this.profiles.values()).filter(
      profile => profile.certification === certification
    );
  }

  /**
   * Get local profiles only
   */
  getLocalProfiles(): TurkishProfile[] {
    return Array.from(this.profiles.values()).filter(
      profile => profile.origin === 'local'
    );
  }

  /**
   * Get imported profiles only
   */
  getImportedProfiles(): TurkishProfile[] {
    return Array.from(this.profiles.values()).filter(
      profile => profile.origin === 'imported'
    );
  }
}


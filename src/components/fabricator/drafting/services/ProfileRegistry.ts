
import type { MaterialSpec, MaterialType } from '../types/materialAware';

export interface SystemDefinition {
  id: string;
  name: string;
  manufacturer: string; // 'Alumil', 'P.S.', 'Valentin'
  category: 'sliding' | 'casement' | 'folding' | 'curtain_wall';
  material: MaterialType;
  defaultGlass: number; // mm
  description: string;
  specs: MaterialSpec;
}

/**
 * Egyptian Market Profile Registry
 * Singleton service proving specifications for local market systems.
 * 
 * Includes:
 * - Alumil M9660 (Thermal Break Casement)
 * - P.S. 9600 (High-End Sliding)
 * - Tansom/Mullion standards
 */
export class ProfileRegistry {
  private static instance: ProfileRegistry;
  private systems: Map<string, SystemDefinition> = new Map();

  private constructor() {
    this.initializeRegistry();
  }

  public static getInstance(): ProfileRegistry {
    if (!ProfileRegistry.instance) {
      ProfileRegistry.instance = new ProfileRegistry();
    }
    return ProfileRegistry.instance;
  }

  private initializeRegistry() {
    // 1. Alumil M9660 (Casement Thermal Break) - Egyptian Premium Standard
    this.registerSystem({
      id: 'alumil_m9660',
      name: 'Alumil M9660 Alutherm',
      manufacturer: 'Alumil',
      category: 'casement',
      material: 'aluminum',
      defaultGlass: 24,
      description: 'Thermal break system for high energy efficiency. Common in New Cairo villas.',
      specs: {
        material: 'aluminum',
        systemPackId: 'alumil_m9660',
        profileDepth: 56, // mm frame depth
        glazingPocket: {
          depth: 15,
          width: 50, // Accommodates up to 50mm glass
          clearance: 5
        },
        thermalBreak: {
          width: 24,
          material: 'polyamide'
        },
        maxSpanWithoutMullion: 1200, // conservative
        requiresReinforcementAbove: 2400,
        cornerConnection: 'corner_key',
        weightKgPerMeter: 1.2, // Average for M9660
        pricePerKg: 180, // EGP
        glassPricePerM2: 800 // EGP
      }
    });

    // 2. P.S. 9600 (Sliding) - Heavy Duty
    this.registerSystem({
      id: 'ps_9600',
      name: 'P.S. 9600 GT',
      manufacturer: 'P.S.',
      category: 'sliding',
      material: 'aluminum',
      defaultGlass: 24,
      description: 'Heavy duty sliding system with thermal break. Smooth operation for wide spans.',
      specs: {
        material: 'aluminum',
        systemPackId: 'ps_9600',
        profileDepth: 120, // 2-track rail depth
        glazingPocket: {
          depth: 12,
          width: 32,
          clearance: 4
        },
        thermalBreak: {
          width: 18,
          material: 'polyamide'
        },
        maxSpanWithoutMullion: 1600,
        requiresReinforcementAbove: 2600,
        cornerConnection: 'corner_key',
        weightKgPerMeter: 2.5, // Heavy duty
        pricePerKg: 160, // EGP
        glassPricePerM2: 1200 // Thicker glass
      }
    });

    // 3. Ecotherm 105 (Small Sliding) - Economy
    this.registerSystem({
      id: 'ecotherm_105',
      name: 'Ecotherm 105',
      manufacturer: 'Local',
      category: 'sliding',
      material: 'aluminum',
      defaultGlass: 6,
      description: 'Economy non-thermal sliding system.',
      specs: {
        material: 'aluminum',
        systemPackId: 'ecotherm_105',
        profileDepth: 80,
        glazingPocket: {
          depth: 8,
          width: 20,
          clearance: 3
        },
        maxSpanWithoutMullion: 1000,
        requiresReinforcementAbove: 2000,
        cornerConnection: 'corner_key',
        weightKgPerMeter: 0.8, // Light
        pricePerKg: 140, // EGP
        glassPricePerM2: 400
      }
    });
  }

  public registerSystem(system: SystemDefinition) {
    this.systems.set(system.id, system);
  }

  public getSystem(id: string): SystemDefinition | undefined {
    return this.systems.get(id);
  }

  public getAllSystems(): SystemDefinition[] {
    return Array.from(this.systems.values());
  }

  public getSystemsByManufacturer(manufacturer: string): SystemDefinition[] {
    return this.getAllSystems().filter(s => s.manufacturer === manufacturer);
  }

  public getSpecs(id: string): MaterialSpec | undefined {
    return this.systems.get(id)?.specs;
  }
}

/**
 * SandDustProtectionEngine - Sand/Dust Protection Systems
 * 
 * Generates sand/dust protection solutions for Egyptian climate:
 * - Special seals and gaskets
 * - Fine mesh screens for desert conditions
 * - Corrosion-resistant hardware for coastal areas
 * - Enhanced sealing systems
 * 
 * @since Phase 1: Special Presets (Weeks 7-8)
 */

import type { WindowUnit } from '@/types/fabricator';
import { EgyptianClimateAnalyzer } from './EgyptianClimateAnalyzer';

export interface SandDustProtectionSpec {
  seals: Array<{
    type: 'primary' | 'secondary' | 'drainage';
    material: 'EPDM' | 'silicone' | 'TPE';
    dimensions: { width: number; length: number };
    quantity: number;
    supplier: string;
    cost: number; // EGP
  }>;
  gaskets: Array<{
    type: 'frame_gasket' | 'sash_gasket' | 'glass_gasket';
    material: 'EPDM' | 'silicone';
    dimensions: { width: number; length: number };
    quantity: number;
    supplier: string;
    cost: number; // EGP
  }>;
  screenMesh?: {
    type: 'fine_mesh' | 'ultra_fine_mesh';
    meshSize: number; // mm
    area: number; // m²
    supplier: string;
    cost: number; // EGP
  };
  hardware: Array<{
    type: 'corrosion_resistant_hinge' | 'stainless_handle' | 'marine_lock';
    quantity: number;
    supplier: string;
    cost: number; // EGP
  }>;
  totalCost: number; // EGP
}

/**
 * SandDustProtectionEngine - Sand/dust protection system generator
 */
export class SandDustProtectionEngine {
  private climateAnalyzer: EgyptianClimateAnalyzer;

  constructor() {
    this.climateAnalyzer = new EgyptianClimateAnalyzer();
  }

  /**
   * Generate sand/dust protection system
   */
  async generateSandDustProtection(
    windowUnit: WindowUnit
  ): Promise<SandDustProtectionSpec> {
    const width = windowUnit.overallWidth;
    const height = windowUnit.overallHeight;
    const perimeter = (width + height) * 2;

    // Analyze climate conditions
    const climate = this.climateAnalyzer.analyzeClimate(windowUnit);

    const seals: SandDustProtectionSpec['seals'] = [];
    const gaskets: SandDustProtectionSpec['gaskets'] = [];
    const hardware: SandDustProtectionSpec['hardware'] = [];

    // Primary seals (frame-sash interface)
    seals.push({
      type: 'primary',
      material: 'EPDM', // Best for sand/dust protection
      dimensions: { width: 8, length: perimeter },
      quantity: 1,
      supplier: this.getSupplier('seals', windowUnit.positionMeta?.buildingBlock),
      cost: (perimeter / 1000) * 12 // 12 EGP/meter
    });

    // Secondary seals (drainage system)
    seals.push({
      type: 'drainage',
      material: 'EPDM',
      dimensions: { width: 6, length: width }, // Bottom only
      quantity: 1,
      supplier: this.getSupplier('seals', windowUnit.positionMeta?.buildingBlock),
      cost: (width / 1000) * 10 // 10 EGP/meter
    });

    // Frame gaskets
    gaskets.push({
      type: 'frame_gasket',
      material: 'EPDM',
      dimensions: { width: 10, length: perimeter },
      quantity: 1,
      supplier: this.getSupplier('gaskets', windowUnit.positionMeta?.buildingBlock),
      cost: (perimeter / 1000) * 15 // 15 EGP/meter
    });

    // Sash gaskets
    gaskets.push({
      type: 'sash_gasket',
      material: 'EPDM',
      dimensions: { width: 10, length: perimeter },
      quantity: 1,
      supplier: this.getSupplier('gaskets', windowUnit.positionMeta?.buildingBlock),
      cost: (perimeter / 1000) * 15
    });

    // Glass gaskets
    gaskets.push({
      type: 'glass_gasket',
      material: 'silicone',
      dimensions: { width: 5, length: perimeter },
      quantity: 1,
      supplier: this.getSupplier('gaskets', windowUnit.positionMeta?.buildingBlock),
      cost: (perimeter / 1000) * 8
    });

    // Fine mesh screen for desert conditions
    if (climate.hasSandDustRisk) {
      const meshArea = (width * height) / 1_000_000; // m²
      const screenMesh = {
        type: 'fine_mesh' as const,
        meshSize: 0.8, // mm (finer than standard 1.2mm)
        area: meshArea,
        supplier: this.getSupplier('mesh', windowUnit.positionMeta?.buildingBlock),
        cost: meshArea * 150 // 150 EGP/m² for fine mesh
      };

      const totalCost = 
        seals.reduce((sum, s) => sum + s.cost, 0) +
        gaskets.reduce((sum, g) => sum + g.cost, 0) +
        screenMesh.cost +
        hardware.reduce((sum, h) => sum + h.cost, 0);

      return {
        seals,
        gaskets,
        screenMesh,
        hardware,
        totalCost
      };
    }

    // Corrosion-resistant hardware for coastal areas
    if (climate.isCoastal) {
      hardware.push({
        type: 'corrosion_resistant_hinge',
        quantity: 4, // Standard: 4 hinges
        supplier: this.getSupplier('hardware', windowUnit.positionMeta?.buildingBlock),
        cost: 4 * 25 // 25 EGP per hinge
      });

      hardware.push({
        type: 'stainless_handle',
        quantity: 1,
        supplier: this.getSupplier('hardware', windowUnit.positionMeta?.buildingBlock),
        cost: 45 // 45 EGP
      });

      hardware.push({
        type: 'marine_lock',
        quantity: 1,
        supplier: this.getSupplier('hardware', windowUnit.positionMeta?.buildingBlock),
        cost: 60 // 60 EGP
      });
    }

    const totalCost = 
      seals.reduce((sum, s) => sum + s.cost, 0) +
      gaskets.reduce((sum, g) => sum + g.cost, 0) +
      hardware.reduce((sum, h) => sum + h.cost, 0);

    return {
      seals,
      gaskets,
      hardware,
      totalCost
    };
  }

  /**
   * Get supplier based on location
   */
  private getSupplier(category: 'seals' | 'gaskets' | 'mesh' | 'hardware', location?: string): string {
    const locationLower = (location || 'Cairo').toLowerCase();

    if (locationLower.includes('alexandria') || locationLower.includes('coastal')) {
      const suppliers: Record<string, string> = {
        seals: 'Mediterranean Seals Co.',
        gaskets: 'Coastal Gaskets Ltd.',
        mesh: 'Mediterranean Mesh Supplies',
        hardware: 'Marine Hardware Co.'
      };
      return suppliers[category] || 'Mediterranean Supplies';
    }

    // Default: Cairo suppliers
    const suppliers: Record<string, string> = {
      seals: 'Cairo Seals & Gaskets',
      gaskets: 'Egyptian Gasket Supplies',
      mesh: 'Egyptian Screen Mesh Co.',
      hardware: 'Cairo Hardware Distributors'
    };
    return suppliers[category] || 'Cairo Supplies';
  }
}



/**
 * BOM Builder Utility for Production Workflows
 *
 * Creates deterministic BOM data from window units for production reports.
 * Integrates with existing PresetAwareBOMGenerator while providing
 * simplified interface for production workflows.
 */

import { CompleteBOM, PresetAwareBOMGenerator } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import type { EgyptianTemplate } from '../types/drafting';

export interface BOMItem {
  id: string;
  category: 'profiles' | 'hardware' | 'glass' | 'accessories';
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  specifications?: Record<string, any>;
}

export interface ProductionBOM {
  windowUnitId: string;
  templateId: string;
  systemPackId: string;
  items: BOMItem[];
  totalCost: number;
  generatedAt: string;
  accuracy: number;
}

/**
 * BOM Builder for production workflows
 * Generates deterministic BOM data for reports and execution plans
 */
export class ProductionBOMBuilder {
  private bomGenerator: PresetAwareBOMGenerator;

  constructor() {
    this.bomGenerator = new PresetAwareBOMGenerator();
  }

  /**
   * Build BOM for a single window unit
   */
  async buildWindowBOM(
    windowUnit: WindowUnit,
    template: EgyptianTemplate,
    systemPack: SystemPack
  ): Promise<ProductionBOM> {
    // Generate complete BOM using existing generator
    const completeBOM = await this.bomGenerator.generateCompleteBOM(
      windowUnit,
      template as any,
      systemPack,
      true // Use cache for performance
    );

    // Transform to production-friendly format
    const items = this.transformBOMToItems(completeBOM);

    return {
      windowUnitId: windowUnit.id,
      templateId: template.id,
      systemPackId: systemPack.id,
      items,
      totalCost: completeBOM.cost.totalCost,
      generatedAt: new Date().toISOString(),
      accuracy: completeBOM.accuracy
    };
  }

  /**
   * Build BOM for multiple window units (batch operation)
   */
  async buildBatchBOM(
    windowUnits: WindowUnit[],
    templates: EgyptianTemplate[],
    systemPack: SystemPack
  ): Promise<ProductionBOM[]> {


    // Process in parallel for performance
    const promises = windowUnits.map(async (windowUnit) => {
      const template = templates.find(t => t.id === windowUnit.presetId);
      if (!template) {
        throw new Error(`Template not found for window unit ${windowUnit.id}`);
      }

      return this.buildWindowBOM(windowUnit, template, systemPack);
    });

    return Promise.all(promises);
  }

  /**
   * Transform CompleteBOM to production BOM items
   */
  private transformBOMToItems(bom: CompleteBOM): BOMItem[] {
    const items: BOMItem[] = [];

    // Transform profiles
    bom.profiles.forEach((profile) => {
      items.push({
        id: profile.id,
        category: 'profiles',
        code: profile.profileCode,
        name: profile.role === 'frame' ? 'Frame Profile' :
              profile.role === 'sash' ? 'Sash Profile' :
              profile.role === 'mullion' ? 'Mullion Profile' :
              profile.role === 'transom' ? 'Transom Profile' : 'Profile',
        quantity: profile.quantity,
        unit: 'piece',
        unitCost: profile.cost || 0,
        totalCost: (profile.cost || 0) * profile.quantity,
        specifications: {
          length: profile.length,
          role: profile.role,
          rawStockLength: profile.rawStockLength,
          wasteLength: profile.wasteLength,
          machiningZones: profile.machiningZones
        }
      });
    });

    // Transform hardware
    bom.hardware.forEach((hardware) => {
      items.push({
        id: hardware.id,
        category: 'hardware',
        code: hardware.supplierCode,
        name: hardware.name,
        quantity: hardware.quantity,
        unit: 'piece',
        unitCost: 0, // Hardware costs may be in separate system
        totalCost: 0,
        specifications: {
          category: hardware.category,
          positionSpec: hardware.positionSpec,
          installationNotes: hardware.installationNotes,
          torqueSpec: hardware.torqueSpec,
          alternatives: hardware.alternatives,
          estimatedTime: hardware.estimatedTime
        }
      });
    });

    // Transform glass
    bom.glazing.forEach((glazing) => {
      items.push({
        id: glazing.paneId,
        category: 'glass',
        code: glazing.glassCode || 'GLASS-STD',
        name: `${glazing.type} Glass Pane`,
        quantity: 1,
        unit: 'piece',
        unitCost: 0, // Glass costs may be in separate system
        totalCost: 0,
        specifications: {
          dimensions: glazing.dimensions,
          type: glazing.type,
          thickness: glazing.dimensions.thickness,
          weight: glazing.weight,
          uValue: glazing.uValue,
          safetyRating: glazing.safetyRating,
          edgeClearance: glazing.edgeClearance
        }
      });
    });

    // Transform accessories
    bom.accessories.forEach((accessory, index) => {
      items.push({
        id: `accessory-${index}`,
        category: 'accessories',
        code: accessory.supplier || 'ACC-STD',
        name: accessory.name,
        quantity: accessory.quantity,
        unit: 'piece',
        unitCost: accessory.unitPrice,
        totalCost: accessory.totalCost,
        specifications: {
          category: accessory.category,
          supplier: accessory.supplier
        }
      });
    });

    return items;
  }

  /**
   * Calculate aggregated BOM for production project
   */
  aggregateBOMForProject(boms: ProductionBOM[]): {
    totalItems: BOMItem[];
    summary: {
      totalCost: number;
      totalWindows: number;
      itemCounts: Record<string, number>;
    };
  } {
    const itemMap = new Map<string, BOMItem>();

    boms.forEach((bom) => {
      bom.items.forEach((item) => {
        const key = `${item.category}-${item.code}`;

        if (itemMap.has(key)) {
          const existing = itemMap.get(key)!;
          existing.quantity += item.quantity;
          existing.totalCost += item.totalCost;
        } else {
          itemMap.set(key, { ...item });
        }
      });
    });

    const totalItems = Array.from(itemMap.values());
    const totalCost = totalItems.reduce((sum, item) => sum + item.totalCost, 0);
    const totalWindows = boms.length;

    const itemCounts = totalItems.reduce((counts, item) => {
      counts[item.category] = (counts[item.category] || 0) + item.quantity;
      return counts;
    }, {} as Record<string, number>);

    return {
      totalItems,
      summary: {
        totalCost,
        totalWindows,
        itemCounts
      }
    };
  }
}

// Singleton instance for production workflows
export const productionBOMBuilder = new ProductionBOMBuilder();
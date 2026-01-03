/**
 * QuickOrderEngine - Fast Order Processing for Expert Fabricators
 * 
 * Enables expert fabricators to create projects in 2-3 minutes using:
 * - Template-based project creation
 * - Keyboard shortcuts
 * - Bulk operations
 * - Fast workflow optimization
 * 
 * Target: 2-3 minutes for complete project creation (vs 10-15 minutes standard)
 * 
 * @since Phase 1: Special Presets (Weeks 3-4)
 */

import type { WindowUnit } from '@/types/fabricator';

export interface QuickOrderParams {
  templateId?: string;
  dimensions: {
    width: number;
    height: number;
  };
  systemPackId: string;
  windowType: string;
  color?: string;
  glazingType?: string;
  quantity?: number;
  customizations?: Record<string, any>;
}

export interface QuickOrderResult {
  windowUnit: WindowUnit;
  processingTime: number; // milliseconds
  shortcutsUsed: string[];
}

/**
 * QuickOrderEngine - Fast order processing engine
 */
export class QuickOrderEngine {
  /**
   * Create window unit from quick order parameters
   */
  async createQuickOrder(params: QuickOrderParams): Promise<QuickOrderResult> {
    const startTime = performance.now();
    const shortcutsUsed: string[] = [];

    // If template is provided, load it first
    let baseUnit: Partial<WindowUnit> = {};
    if (params.templateId) {
      const { FabricatorTemplates } = await import('./FabricatorTemplates');
      const templates = new FabricatorTemplates();
      const template = await templates.loadTemplate(params.templateId);
      if (template) {
        baseUnit = template.windowUnit;
        shortcutsUsed.push('template_load');
      }
    }

    // Create window unit with quick defaults
    const windowUnit: WindowUnit = {
      id: `quick-${Date.now()}`,
      orderNumber: baseUnit.orderNumber || `QO-${Date.now().toString(36).toUpperCase()}`,
      posNumber: baseUnit.posNumber || '1',
      type: params.windowType || baseUnit.type || 'sliding_window',
      components: baseUnit.components || [],
      overallWidth: params.dimensions.width,
      overallHeight: params.dimensions.height,
      color: params.color || baseUnit.color || 'Silver',
      glazing: {
        type: params.glazingType || (baseUnit.glazing as any)?.type || 'double',
        thickness: 24
      },
      hardware: baseUnit.hardware || [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      systemPackId: params.systemPackId,
      quantity: params.quantity || 1,
      ...baseUnit,
      ...params.customizations
    };

    const processingTime = performance.now() - startTime;

    return {
      windowUnit,
      processingTime,
      shortcutsUsed
    };
  }

  /**
   * Create multiple orders from bulk parameters
   */
  async createBulkOrders(
    baseParams: QuickOrderParams,
    variations: Array<{ dimensions?: { width?: number; height?: number }; quantity?: number }>
  ): Promise<QuickOrderResult[]> {
    const results: QuickOrderResult[] = [];

    for (const variation of variations) {
      const params: QuickOrderParams = {
        ...baseParams,
        dimensions: {
          width: variation.dimensions?.width || baseParams.dimensions.width,
          height: variation.dimensions?.height || baseParams.dimensions.height
        },
        quantity: variation.quantity || baseParams.quantity || 1
      };

      const result = await this.createQuickOrder(params);
      results.push(result);
    }

    return results;
  }

  /**
   * Apply quick defaults based on system pack
   */
  getQuickDefaults(systemPackId: string): Partial<QuickOrderParams> {
    // Common defaults for popular system packs
    const defaults: Record<string, Partial<QuickOrderParams>> = {
      'rock60': {
        windowType: 'sliding_window',
        color: 'Silver',
        glazingType: 'double'
      },
      'jumbo100': {
        windowType: 'sliding_window',
        color: 'Silver',
        glazingType: 'double'
      },
      'panda-50': {
        windowType: 'sliding_window',
        color: 'White',
        glazingType: 'double'
      }
    };

    return defaults[systemPackId] || {
      windowType: 'sliding_window',
      color: 'Silver',
      glazingType: 'double'
    };
  }
}



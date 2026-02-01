/**
 * Production Reports Generator
 *
 * Generates production reports for RA Workshop parity:
 * - Execution plans
 * - Cutting lists
 * - Purchase orders
 */

import { productionService } from '@/services/productionService';
import type { WindowUnit } from '@/types/fabricator';
import { ProductionBOM } from './bomBuilder';

export type ProductionReportType = 'execution_plan' | 'cutting_list' | 'purchase_order' | 'labor_summary' | 'waste_summary';

export interface ProductionReport {
  id: string;
  projectId: string;
  projectName: string;
  reportType: ProductionReportType;
  generatedAt: string;
  data: ExecutionPlanData | CuttingListData | PurchaseOrderData;
}

export interface ExecutionPlanData {
  summary: {
    totalWindows: number;
    totalBOMItems: number;
    estimatedProductionTime: number; // hours
    groupedItems: Record<string, WindowUnit[]>;
  };
  steps: ExecutionStep[];
  bomSummary: ProductionBOM[];
}

export interface ExecutionStep {
  id: string;
  name: string;
  description: string;
  estimatedTime: number; // minutes
  requiredSkills: string[];
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

export interface CuttingListData {
  summary: {
    totalCuts: number;
    totalWaste: number;
    stockUtilization: number;
  };
  cuttingGroups: CuttingGroup[];
  optimizationMetrics: {
    wasteReduction: number;
    materialSavings: number;
  };
}

export interface CuttingGroup {
  material: string;
  profile: string;
  stockLength: number;
  cuts: Array<{
    length: number;
    quantity: number;
    waste: number;
  }>;
  totalWaste: number;
  utilization: number;
}

export interface PurchaseOrderData {
  summary: {
    totalItems: number;
    totalValue: number;
    suppliers: string[];
  };
  items: PurchaseOrderItem[];
  supplierGroups: Record<string, PurchaseOrderItem[]>;
}

export interface PurchaseOrderItem {
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplier: string;
  category: string;
  deliveryTime: number; // days
}

/**
 * Production Reports Generator
 */
export class ProductionReportsGenerator {
  /**
   * Generate execution plan report
   */
  async generateExecutionPlan(
    _projectId: string,
    windowUnits: WindowUnit[],
    boms: ProductionBOM[]
  ): Promise<ExecutionPlanData> {
    const totalWindows = windowUnits.length;
    const totalBOMItems = boms.reduce((sum, bom) => sum + bom.items.length, 0);

    // Group windows by type/color for execution
    const groupedItems = windowUnits.reduce((groups, unit) => {
      const key = unit.type || 'standard';
      if (!groups[key]) groups[key] = [];
      groups[key].push(unit);
      return groups;
    }, {} as Record<string, WindowUnit[]>);

    // Generate execution steps
    const steps: ExecutionStep[] = [
      {
        id: 'material-prep',
        name: 'Material Preparation',
        description: 'Cut and prepare all profiles according to cutting list',
        estimatedTime: Math.ceil(totalBOMItems * 2), // 2 min per item
        requiredSkills: ['cutting', 'measuring'],
        dependencies: [],
        status: 'pending'
      },
      {
        id: 'frame-assembly',
        name: 'Frame Assembly',
        description: 'Assemble window frames with corner keys and reinforcement',
        estimatedTime: Math.ceil(totalWindows * 15), // 15 min per window
        requiredSkills: ['assembly', 'welding'],
        dependencies: ['material-prep'],
        status: 'pending'
      },
      {
        id: 'sash-assembly',
        name: 'Sash Assembly',
        description: 'Assemble movable sashes with hardware',
        estimatedTime: Math.ceil(totalWindows * 12), // 12 min per window
        requiredSkills: ['assembly', 'hardware'],
        dependencies: ['frame-assembly'],
        status: 'pending'
      },
      {
        id: 'glazing',
        name: 'Glazing Installation',
        description: 'Install glass panels and weather sealing',
        estimatedTime: Math.ceil(totalWindows * 8), // 8 min per window
        requiredSkills: ['glazing', 'sealing'],
        dependencies: ['sash-assembly'],
        status: 'pending'
      },
      {
        id: 'hardware-install',
        name: 'Hardware Installation',
        description: 'Install all handles, hinges, locks, and rollers',
        estimatedTime: Math.ceil(totalWindows * 6), // 6 min per window
        requiredSkills: ['hardware'],
        dependencies: ['glazing'],
        status: 'pending'
      },
      {
        id: 'quality-check',
        name: 'Quality Control',
        description: 'Final inspection and testing of all windows',
        estimatedTime: Math.ceil(totalWindows * 5), // 5 min per window
        requiredSkills: ['qc', 'testing'],
        dependencies: ['hardware-install'],
        status: 'pending'
      }
    ];

    const estimatedProductionTime = steps.reduce((sum, step) => sum + step.estimatedTime, 0) / 60; // Convert to hours

    return {
      summary: {
        totalWindows,
        totalBOMItems,
        estimatedProductionTime,
        groupedItems
      },
      steps,
      bomSummary: boms
    };
  }

  /**
   * Generate cutting list report
   */
  async generateCuttingList(
    _projectId: string,
    boms: ProductionBOM[]
  ): Promise<CuttingListData> {
    const allItems = boms.flatMap(bom => bom.items);

    // Group by material and profile
    const cuttingGroups: CuttingGroup[] = [];
    const materialGroups = allItems.reduce((groups, item) => {
      if (item.category === 'profiles') {
        const key = `${item.specifications?.material || 'unknown'}-${item.code}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
      return groups;
    }, {} as Record<string, typeof allItems>);

    // Convert to cutting groups
    Object.entries(materialGroups).forEach(([key, items]) => {
      const [material, profile] = key.split('-');

      // Group by stock length (assume 6000mm standard)
      const stockLength = 6000;
      const cuts = items.map(item => ({
        length: item.specifications?.length || 1000,
        quantity: item.quantity,
        waste: 0 // Would be calculated by optimization
      }));

      // Calculate utilization (simplified)
      const totalCutLength = cuts.reduce((sum, cut) => sum + (cut.length * cut.quantity), 0);
      const totalWaste = (cuts.length * 100); // Assume 100mm waste per cut
      const utilization = (totalCutLength / (totalCutLength + totalWaste)) * 100;

      cuttingGroups.push({
        material,
        profile,
        stockLength,
        cuts,
        totalWaste,
        utilization
      });
    });

    const totalCuts = cuttingGroups.reduce((sum, group) => sum + group.cuts.length, 0);
    const totalWaste = cuttingGroups.reduce((sum, group) => sum + group.totalWaste, 0);
    const avgUtilization = cuttingGroups.reduce((sum, group) => sum + group.utilization, 0) / cuttingGroups.length;

    return {
      summary: {
        totalCuts,
        totalWaste,
        stockUtilization: avgUtilization
      },
      cuttingGroups,
      optimizationMetrics: {
        wasteReduction: 15, // Assume 15% waste reduction vs manual
        materialSavings: totalWaste * 0.5 // Rough estimate
      }
    };
  }

  /**
   * Generate purchase order report
   */
  async generatePurchaseOrder(
    _projectId: string,
    boms: ProductionBOM[]
  ): Promise<PurchaseOrderData> {
    const allItems = boms.flatMap(bom => bom.items);

    // Group by supplier and category
    const items: PurchaseOrderItem[] = [];
    const supplierGroups = allItems.reduce((groups, item) => {
      const supplier = item.specifications?.supplier || 'Default Supplier';

      const poItem: PurchaseOrderItem = {
        code: item.code,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitCost,
        totalPrice: item.totalCost,
        supplier,
        category: item.category,
        deliveryTime: this.getDeliveryTimeForCategory(item.category)
      };

      items.push(poItem);

      if (!groups[supplier]) groups[supplier] = [];
      groups[supplier].push(poItem);

      return groups;
    }, {} as Record<string, PurchaseOrderItem[]>);

    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const suppliers = Object.keys(supplierGroups);

    return {
      summary: {
        totalItems,
        totalValue,
        suppliers
      },
      items,
      supplierGroups
    };
  }

  /**
   * Save report to database
   */
  async saveReport(
    projectId: string,
    projectName: string,
    reportType: ProductionReportType,
    data: ExecutionPlanData | CuttingListData | PurchaseOrderData
  ): Promise<string> {
    const reportData = {
      projectId,
      projectName,
      reportType,
      generatedAt: new Date().toISOString(),
      data
    };

    const result = await productionService.createReport(
      projectId,
      reportType,
      reportData
    );

    return result.id;
  }

  /**
   * Load report from database
   */
  async loadReport(reportId: string): Promise<ProductionReport | null> {
    const data = await productionService.getReport(reportId);

    if (!data) return null;

    return {
      id: data.id,
      projectId: data.production_project_id,
      projectName: data.payload_json.projectName,
      reportType: data.report_type,
      generatedAt: data.payload_json.generatedAt,
      data: data.payload_json.data
    };
  }

  /**
   * Get delivery time estimate for category
   */
  private getDeliveryTimeForCategory(category: string): number {
    switch (category) {
      case 'profiles':
        return 7; // 1 week
      case 'hardware':
        return 3; // 3 days
      case 'glass':
        return 5; // 5 days
      case 'accessories':
        return 2; // 2 days
      default:
        return 5;
    }
  }
}

// Singleton instance
export const productionReportsGenerator = new ProductionReportsGenerator();
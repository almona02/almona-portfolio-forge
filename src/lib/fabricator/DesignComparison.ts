/**
 * Design Comparison Utility for ALMONA Fabricator
 * 
 * Provides comprehensive design comparison including:
 * - Grid structure differences
 * - Component differences
 * - Cost analysis
 * - Weight analysis
 * - Material usage
 * 
 * Constitutional: Deterministic comparison, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { WindowComponent, WindowGrid, WindowUnit } from '@/types/fabricator';

export interface GridDifference {
  rowsDifference: number;
  colsDifference: number;
  cellTypeDifferences: Array<{
    cellId: string;
    design1Type: string;
    design2Type: string;
  }>;
  mullionDifferences: {
    added: number;
    removed: number;
    modified: number;
  };
}

export interface ComponentDifference {
  added: WindowComponent[];
  removed: WindowComponent[];
  modified: Array<{
    componentId: string;
    changes: Record<string, { from: any; to: any }>;
  }>;
}

export interface CostDifference {
  profileCostDifference: number;
  hardwareCostDifference: number;
  glassCostDifference: number;
  laborCostDifference: number;
  totalDifference: number;
  percentChange: number;
  savings: boolean;
}

export interface WeightDifference {
  profileWeightDifference: number;
  glassWeightDifference: number;
  totalWeightDifference: number;
  percentChange: number;
}

export interface MaterialUsageDifference {
  profileLengthDifference: number;
  glassAreaDifference: number;
  hardwareCountDifference: number;
}

export interface ComparisonResult {
  design1Id: string;
  design2Id: string;
  gridDifferences: GridDifference;
  componentDifferences: ComponentDifference;
  costDifference: CostDifference;
  weightDifference: WeightDifference;
  materialUsageDifference: MaterialUsageDifference;
  summary: ComparisonSummary;
  timestamp: Date;
}

export interface ComparisonSummary {
  isSimilar: boolean;
  similarityScore: number; // 0-100
  mainDifferences: string[];
  recommendation: string;
}

/**
 * Compare two window designs
 */
export const compareDesigns = (
  design1: WindowUnit | null,
  design2: WindowUnit | null,
  bomData1: any,
  bomData2: any
): ComparisonResult | null => {
  if (!design1 || !design2) return null;

  const gridDifferences = compareGrids(design1.grid, design2.grid);
  const componentDifferences = compareComponents(design1.components, design2.components);
  const costDifference = calculateCostDifference(bomData1, bomData2);
  const weightDifference = calculateWeightDifference(bomData1, bomData2);
  const materialUsageDifference = calculateMaterialUsageDifference(design1, design2, bomData1, bomData2);

  const summary = generateComparisonSummary(
    gridDifferences,
    componentDifferences,
    costDifference,
    weightDifference,
    materialUsageDifference
  );

  return {
    design1Id: design1.id,
    design2Id: design2.id,
    gridDifferences,
    componentDifferences,
    costDifference,
    weightDifference,
    materialUsageDifference,
    summary,
    timestamp: new Date()
  };
};

/**
 * Compare grid structures
 */
export const compareGrids = (grid1: WindowGrid, grid2: WindowGrid): GridDifference => {
  const rowsDifference = grid2.rows - grid1.rows;
  const colsDifference = grid2.cols - grid1.cols;

  // Find cell type differences
  const cellTypeDifferences: GridDifference['cellTypeDifferences'] = [];
  const maxRows = Math.max(grid1.rows, grid2.rows);
  const maxCols = Math.max(grid1.cols, grid2.cols);

  for (let r = 0; r < maxRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      const cell1 = grid1.cells.find(cell => cell.row === r && cell.col === c);
      const cell2 = grid2.cells.find(cell => cell.row === r && cell.col === c);

      if (cell1?.type !== cell2?.type) {
        cellTypeDifferences.push({
          cellId: `${r}-${c}`,
          design1Type: cell1?.type || 'none',
          design2Type: cell2?.type || 'none'
        });
      }
    }
  }

  // Compare mullions
  const mullions1 = grid1.manualMullions || [];
  const mullions2 = grid2.manualMullions || [];

  const mullionDifferences = {
    added: mullions2.length - mullions1.length > 0 ? mullions2.length - mullions1.length : 0,
    removed: mullions1.length - mullions2.length > 0 ? mullions1.length - mullions2.length : 0,
    modified: 0
  };

  return {
    rowsDifference,
    colsDifference,
    cellTypeDifferences,
    mullionDifferences
  };
};

/**
 * Compare components
 */
export const compareComponents = (
  components1: WindowComponent[] | undefined,
  components2: WindowComponent[] | undefined
): ComponentDifference => {
  const comps1 = components1 || [];
  const comps2 = components2 || [];

  const added: WindowComponent[] = [];
  const removed: WindowComponent[] = [];
  const modified: ComponentDifference['modified'] = [];

  // Find added components
  comps2.forEach(comp2 => {
    const found = comps1.find(comp1 => comp1.id === comp2.id);
    if (!found) {
      added.push(comp2);
    }
  });

  // Find removed components
  comps1.forEach(comp1 => {
    const found = comps2.find(comp2 => comp2.id === comp1.id);
    if (!found) {
      removed.push(comp1);
    }
  });

  // Find modified components
  comps1.forEach(comp1 => {
    const comp2 = comps2.find(c => c.id === comp1.id);
    if (comp2) {
      const changes: Record<string, { from: any; to: any }> = {};

      if (comp1.type !== comp2.type) {
        changes.type = { from: comp1.type, to: comp2.type };
      }
      // Check profile role if it exists (optional property)
      const profileRole1 = (comp1 as any).profileRole;
      const profileRole2 = (comp2 as any).profileRole;
      if (profileRole1 !== profileRole2) {
        changes.profileRole = { from: profileRole1, to: profileRole2 };
      }
      // Check dimensions if they exist (optional property)
      const dims1 = (comp1 as any).dimensions;
      const dims2 = (comp2 as any).dimensions;
      if (dims1?.width !== dims2?.width) {
        changes.width = { from: dims1?.width, to: dims2?.width };
      }
      if (dims1?.height !== dims2?.height) {
        changes.height = { from: dims1?.height, to: dims2?.height };
      }
      if (comp1.quantity !== comp2.quantity) {
        changes.quantity = { from: comp1.quantity, to: comp2.quantity };
      }

      if (Object.keys(changes).length > 0) {
        modified.push({
          componentId: comp1.id,
          changes
        });
      }
    }
  });

  return { added, removed, modified };
};

/**
 * Calculate cost difference
 */
export const calculateCostDifference = (bomData1: any, bomData2: any): CostDifference => {
  const cost1 = bomData1?.totals?.materialCost || 0;
  const cost2 = bomData2?.totals?.materialCost || 0;

  const profileCostDifference = (bomData2?.aggregatedByCategory?.frame?.[0]?.totalCost || 0) -
    (bomData1?.aggregatedByCategory?.frame?.[0]?.totalCost || 0);

  const hardwareCostDifference = (bomData2?.totals?.hardwareCost || 0) -
    (bomData1?.totals?.hardwareCost || 0);

  const glassCostDifference = (bomData2?.glassDetails?.totalGlassArea || 0) * 50 -
    (bomData1?.glassDetails?.totalGlassArea || 0) * 50;

  const laborCostDifference = 0; // Placeholder

  const totalDifference = cost2 - cost1;
  const percentChange = cost1 > 0 ? (totalDifference / cost1) * 100 : 0;
  const savings = totalDifference < 0;

  return {
    profileCostDifference,
    hardwareCostDifference,
    glassCostDifference,
    laborCostDifference,
    totalDifference,
    percentChange,
    savings
  };
};

/**
 * Calculate weight difference
 */
export const calculateWeightDifference = (bomData1: any, bomData2: any): WeightDifference => {
  const weight1 = (bomData1?.totals?.weight || 0) + (bomData1?.glassDetails?.totalGlassWeight || 0);
  const weight2 = (bomData2?.totals?.weight || 0) + (bomData2?.glassDetails?.totalGlassWeight || 0);

  const profileWeightDifference = (bomData2?.totals?.weight || 0) - (bomData1?.totals?.weight || 0);
  const glassWeightDifference = (bomData2?.glassDetails?.totalGlassWeight || 0) -
    (bomData1?.glassDetails?.totalGlassWeight || 0);

  const totalWeightDifference = weight2 - weight1;
  const percentChange = weight1 > 0 ? (totalWeightDifference / weight1) * 100 : 0;

  return {
    profileWeightDifference,
    glassWeightDifference,
    totalWeightDifference,
    percentChange
  };
};

/**
 * Calculate material usage difference
 */
export const calculateMaterialUsageDifference = (
  design1: WindowUnit,
  design2: WindowUnit,
  bomData1: any,
  bomData2: any
): MaterialUsageDifference => {
  // Calculate total profile length
  const profileLength1 = design1.components?.reduce((sum, comp) => {
    return sum + ((comp.cuttingLengths?.[0] || 0) * (comp.quantity || 1));
  }, 0) || 0;

  const profileLength2 = design2.components?.reduce((sum, comp) => {
    return sum + ((comp.cuttingLengths?.[0] || 0) * (comp.quantity || 1));
  }, 0) || 0;

  const glassArea1 = bomData1?.glassDetails?.totalGlassArea || 0;
  const glassArea2 = bomData2?.glassDetails?.totalGlassArea || 0;

  const hardwareCount1 = design1.hardware?.length || 0;
  const hardwareCount2 = design2.hardware?.length || 0;

  return {
    profileLengthDifference: profileLength2 - profileLength1,
    glassAreaDifference: glassArea2 - glassArea1,
    hardwareCountDifference: hardwareCount2 - hardwareCount1
  };
};

/**
 * Generate comparison summary
 */
export const generateComparisonSummary = (
  gridDiff: GridDifference,
  componentDiff: ComponentDifference,
  costDiff: CostDifference,
  weightDiff: WeightDifference,
  materialDiff: MaterialUsageDifference
): ComparisonSummary => {
  const mainDifferences: string[] = [];
  let similarityScore = 100;

  // Grid differences
  if (gridDiff.rowsDifference !== 0) {
    mainDifferences.push(`Rows: ${gridDiff.rowsDifference > 0 ? '+' : ''}${gridDiff.rowsDifference}`);
    similarityScore -= 10;
  }
  if (gridDiff.colsDifference !== 0) {
    mainDifferences.push(`Columns: ${gridDiff.colsDifference > 0 ? '+' : ''}${gridDiff.colsDifference}`);
    similarityScore -= 10;
  }
  if (gridDiff.cellTypeDifferences.length > 0) {
    mainDifferences.push(`${gridDiff.cellTypeDifferences.length} cell type changes`);
    similarityScore -= 15;
  }

  // Component differences
  if (componentDiff.added.length > 0) {
    mainDifferences.push(`${componentDiff.added.length} components added`);
    similarityScore -= 10;
  }
  if (componentDiff.removed.length > 0) {
    mainDifferences.push(`${componentDiff.removed.length} components removed`);
    similarityScore -= 10;
  }
  if (componentDiff.modified.length > 0) {
    mainDifferences.push(`${componentDiff.modified.length} components modified`);
    similarityScore -= 5;
  }

  // Cost differences
  if (Math.abs(costDiff.percentChange) > 10) {
    mainDifferences.push(`Cost: ${costDiff.savings ? '-' : '+'}${Math.abs(costDiff.percentChange).toFixed(1)}%`);
    similarityScore -= 15;
  }

  // Weight differences
  if (Math.abs(weightDiff.percentChange) > 10) {
    mainDifferences.push(`Weight: ${Math.abs(weightDiff.percentChange).toFixed(1)}%`);
    similarityScore -= 10;
  }

  // Material usage
  if (Math.abs(materialDiff.profileLengthDifference) > 1000) {
    mainDifferences.push(`Profile length: ${materialDiff.profileLengthDifference > 0 ? '+' : ''}${(materialDiff.profileLengthDifference / 1000).toFixed(1)}m`);
    similarityScore -= 10;
  }

  const isSimilar = similarityScore > 70;

  let recommendation = '';
  if (isSimilar) {
    recommendation = 'Designs are very similar. Minor adjustments only.';
  } else if (costDiff.savings) {
    recommendation = `Design 2 is more cost-effective (saves ${Math.abs(costDiff.percentChange).toFixed(1)}%).`;
  } else if (weightDiff.totalWeightDifference < 0) {
    recommendation = `Design 2 is lighter (${Math.abs(weightDiff.totalWeightDifference).toFixed(1)}kg less).`;
  } else {
    recommendation = 'Designs have significant differences. Review carefully.';
  }

  return {
    isSimilar,
    similarityScore: Math.max(0, similarityScore),
    mainDifferences,
    recommendation
  };
};

/**
 * Export comparison as report
 */
export const exportComparisonReport = (comparison: ComparisonResult): string => {
  const lines: string[] = [
    '=== DESIGN COMPARISON REPORT ===',
    `Generated: ${comparison.timestamp.toLocaleString()}`,
    '',
    '--- GRID DIFFERENCES ---',
    `Rows: ${comparison.gridDifferences.rowsDifference > 0 ? '+' : ''}${comparison.gridDifferences.rowsDifference}`,
    `Columns: ${comparison.gridDifferences.colsDifference > 0 ? '+' : ''}${comparison.gridDifferences.colsDifference}`,
    `Cell type changes: ${comparison.gridDifferences.cellTypeDifferences.length}`,
    `Mullions added: ${comparison.gridDifferences.mullionDifferences.added}`,
    `Mullions removed: ${comparison.gridDifferences.mullionDifferences.removed}`,
    '',
    '--- COMPONENT DIFFERENCES ---',
    `Components added: ${comparison.componentDifferences.added.length}`,
    `Components removed: ${comparison.componentDifferences.removed.length}`,
    `Components modified: ${comparison.componentDifferences.modified.length}`,
    '',
    '--- COST ANALYSIS ---',
    `Profile cost difference: ${comparison.costDifference.profileCostDifference > 0 ? '+' : ''}${comparison.costDifference.profileCostDifference.toFixed(2)} EGP`,
    `Hardware cost difference: ${comparison.costDifference.hardwareCostDifference > 0 ? '+' : ''}${comparison.costDifference.hardwareCostDifference.toFixed(2)} EGP`,
    `Glass cost difference: ${comparison.costDifference.glassCostDifference > 0 ? '+' : ''}${comparison.costDifference.glassCostDifference.toFixed(2)} EGP`,
    `Total cost difference: ${comparison.costDifference.totalDifference > 0 ? '+' : ''}${comparison.costDifference.totalDifference.toFixed(2)} EGP (${comparison.costDifference.percentChange > 0 ? '+' : ''}${comparison.costDifference.percentChange.toFixed(1)}%)`,
    '',
    '--- WEIGHT ANALYSIS ---',
    `Profile weight difference: ${comparison.weightDifference.profileWeightDifference > 0 ? '+' : ''}${comparison.weightDifference.profileWeightDifference.toFixed(2)} kg`,
    `Glass weight difference: ${comparison.weightDifference.glassWeightDifference > 0 ? '+' : ''}${comparison.weightDifference.glassWeightDifference.toFixed(2)} kg`,
    `Total weight difference: ${comparison.weightDifference.totalWeightDifference > 0 ? '+' : ''}${comparison.weightDifference.totalWeightDifference.toFixed(2)} kg (${comparison.weightDifference.percentChange > 0 ? '+' : ''}${comparison.weightDifference.percentChange.toFixed(1)}%)`,
    '',
    '--- MATERIAL USAGE ---',
    `Profile length difference: ${comparison.materialUsageDifference.profileLengthDifference > 0 ? '+' : ''}${(comparison.materialUsageDifference.profileLengthDifference / 1000).toFixed(2)} m`,
    `Glass area difference: ${comparison.materialUsageDifference.glassAreaDifference > 0 ? '+' : ''}${comparison.materialUsageDifference.glassAreaDifference.toFixed(2)} m²`,
    `Hardware count difference: ${comparison.materialUsageDifference.hardwareCountDifference > 0 ? '+' : ''}${comparison.materialUsageDifference.hardwareCountDifference}`,
    '',
    '--- SUMMARY ---',
    `Similarity Score: ${comparison.summary.similarityScore.toFixed(0)}/100`,
    `Similar: ${comparison.summary.isSimilar ? 'Yes' : 'No'}`,
    `Main Differences: ${comparison.summary.mainDifferences.join(', ') || 'None'}`,
    `Recommendation: ${comparison.summary.recommendation}`
  ];

  return lines.join('\n');
};

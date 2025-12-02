/**
 * Constraint Programming Solver for 2D Glass Nesting
 * ---------------------------------------------------------------------------
 * Implements constraint programming approach for the 2D nesting problem,
 * arranging glass panes on master sheets to minimize waste.
 * 
 * Based on CP-SAT principles adapted for TypeScript:
 * - Variable definitions (position coordinates, rotation)
 * - Domain constraints
 * - Non-overlap constraints
 * - Boundary constraints
 * - Objective function (minimize height or number of sheets)
 * 
 * References:
 * - Google OR-Tools CP-SAT Solver
 * - CPMpy constraint programming library
 * - Research on 2D bin packing with constraints
 */

export interface GlassPane {
  id: string;
  width: number;
  height: number;
  allowRotation: boolean;
  minX?: number; // Optional minimum X position
  minY?: number; // Optional minimum Y position
  priority?: number; // Higher priority = place first
  groupId?: string; // Group panes that should be on same sheet
}

export interface MasterSheet {
  id: string;
  width: number;
  height: number;
  cost?: number; // Cost per sheet
  maxHeight?: number; // For roll material, max height to minimize
}

export interface PlacedPane {
  pane: GlassPane;
  x: number;
  y: number;
  rotated: boolean;
  sheetId: string;
  actualWidth: number;
  actualHeight: number;
}

export interface NestingSolution {
  sheets: {
    sheet: MasterSheet;
    panes: PlacedPane[];
    waste: number;
    utilization: number;
    wastePercentage: number;
  }[];
  totalWaste: number;
  totalUtilization: number;
  totalSheets: number;
  objectiveValue: number;
  solveTime: number;
}

export interface CPNestingConfig {
  /** Maximum solving time in milliseconds */
  maxSolveTime: number;
  /** Whether to allow 90-degree rotation */
  allowRotation: boolean;
  /** Objective: 'minimize_sheets' or 'minimize_height' */
  objective: 'minimize_sheets' | 'minimize_height';
  /** Minimum spacing between panes (mm) */
  minSpacing: number;
  /** Whether to consider grain direction (no rotation for certain glass types) */
  respectGrainDirection: boolean;
  /** Enable symmetry breaking for faster solving */
  enableSymmetryBreaking: boolean;
}

/**
 * Constraint Programming Solver for 2D Glass Nesting
 */
export class GlassNestingCPSolver {
  private config: CPNestingConfig;
  private panes: GlassPane[];
  private sheets: MasterSheet[];

  constructor(
    panes: GlassPane[],
    sheets: MasterSheet[],
    config?: Partial<CPNestingConfig>
  ) {
    this.panes = [...panes];
    this.sheets = [...sheets];

    this.config = {
      maxSolveTime: config?.maxSolveTime || 30000, // 30 seconds default
      allowRotation: config?.allowRotation !== false,
      objective: config?.objective || 'minimize_sheets',
      minSpacing: config?.minSpacing || 3, // 3mm spacing
      respectGrainDirection: config?.respectGrainDirection || false,
      enableSymmetryBreaking: config?.enableSymmetryBreaking !== false,
    };
  }

  /**
   * Solve the 2D nesting problem using constraint programming
   */
  solve(): NestingSolution {
    const startTime = performance.now();

    // Sort panes by priority and size (largest first for better packing)
    const sortedPanes = this.sortPanesByPriority();

    // Initialize solution
    const solution: NestingSolution = {
      sheets: [],
      totalWaste: 0,
      totalUtilization: 0,
      totalSheets: 0,
      objectiveValue: 0,
      solveTime: 0,
    };

    // Group panes if needed
    const paneGroups = this.groupPanes(sortedPanes);

    // Solve for each group
    for (const group of paneGroups) {
      const groupSolution = this.solveGroup(group);
      solution.sheets.push(...groupSolution.sheets);
    }

    // Calculate final metrics
    this.calculateMetrics(solution);

    solution.solveTime = performance.now() - startTime;

    return solution;
  }

  /**
   * Sort panes by priority and size
   */
  private sortPanesByPriority(): GlassPane[] {
    return [...this.panes].sort((a, b) => {
      // First by priority (higher first)
      if (a.priority !== undefined && b.priority !== undefined) {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
      }

      // Then by area (larger first for better packing)
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      return areaB - areaA;
    });
  }

  /**
   * Group panes that must be on the same sheet
   */
  private groupPanes(panes: GlassPane[]): GlassPane[][] {
    const groups = new Map<string, GlassPane[]>();
    const ungrouped: GlassPane[] = [];

    for (const pane of panes) {
      if (pane.groupId) {
        if (!groups.has(pane.groupId)) {
          groups.set(pane.groupId, []);
        }
        groups.get(pane.groupId)!.push(pane);
      } else {
        ungrouped.push(pane);
      }
    }

    const result: GlassPane[][] = [];
    for (const group of groups.values()) {
      result.push(group);
    }
    if (ungrouped.length > 0) {
      result.push(ungrouped);
    }

    return result;
  }

  /**
   * Solve nesting for a group of panes
   */
  private solveGroup(group: GlassPane[]): NestingSolution {
    const solution: NestingSolution = {
      sheets: [],
      totalWaste: 0,
      totalUtilization: 0,
      totalSheets: 0,
      objectiveValue: 0,
      solveTime: 0,
    };

    const remainingPanes = [...group];
    let sheetIndex = 0;

    while (remainingPanes.length > 0) {
      const sheet = this.sheets[sheetIndex % this.sheets.length];
      const { placedPanes, unplacedPanes } = this.placePanesOnSheet(
        remainingPanes,
        sheet,
        sheetIndex
      );

      if (placedPanes.length > 0) {
        const waste = this.calculateSheetWaste(sheet, placedPanes);
        const utilization = this.calculateSheetUtilization(sheet, placedPanes);

        solution.sheets.push({
          sheet,
          panes: placedPanes,
          waste,
          utilization,
          wastePercentage: (waste / (sheet.width * sheet.height)) * 100,
        });
      }

      remainingPanes.length = 0;
      remainingPanes.push(...unplacedPanes);
      sheetIndex++;

      // Safety limit
      if (sheetIndex > 100) break;
    }

    return solution;
  }

  /**
   * Place panes on a single sheet using constraint programming
   */
  private placePanesOnSheet(
    panes: GlassPane[],
    sheet: MasterSheet,
    sheetIndex: number
  ): {
    placedPanes: PlacedPane[];
    unplacedPanes: GlassPane[];
  } {
    const placedPanes: PlacedPane[] = [];
    const unplacedPanes: GlassPane[] = [];

    // Define variables for each pane: (x, y, rotated)
    const variables: Map<string, { x: number; y: number; rotated: boolean }> = new Map();

    // Try to place each pane
    for (const pane of panes) {
      const placement = this.findPlacement(
        pane,
        sheet,
        placedPanes,
        variables
      );

      if (placement) {
        variables.set(pane.id, placement);
        placedPanes.push({
          pane,
          x: placement.x,
          y: placement.y,
          rotated: placement.rotated,
          sheetId: sheet.id,
          actualWidth: placement.rotated ? pane.height : pane.width,
          actualHeight: placement.rotated ? pane.width : pane.height,
        });
      } else {
        unplacedPanes.push(pane);
      }
    }

    return { placedPanes, unplacedPanes };
  }

  /**
   * Find placement for a single pane using constraint satisfaction
   */
  private findPlacement(
    pane: GlassPane,
    sheet: MasterSheet,
    existingPanes: PlacedPane[],
    variables: Map<string, { x: number; y: number; rotated: boolean }>
  ): { x: number; y: number; rotated: boolean } | null {
    const orientations = this.config.allowRotation && pane.allowRotation
      ? [
          { width: pane.width, height: pane.height, rotated: false },
          { width: pane.height, height: pane.width, rotated: true },
        ]
      : [{ width: pane.width, height: pane.height, rotated: false }];

    // Try each orientation
    for (const orientation of orientations) {
      // Check if pane fits in sheet
      if (
        orientation.width > sheet.width ||
        orientation.height > sheet.height
      ) {
        continue;
      }

      // Try to find a valid position
      const position = this.findValidPosition(
        orientation.width,
        orientation.height,
        sheet,
        existingPanes,
        pane.minX,
        pane.minY
      );

      if (position) {
        return {
          x: position.x,
          y: position.y,
          rotated: orientation.rotated,
        };
      }
    }

    return null;
  }

  /**
   * Find valid position for a pane using constraint checking
   */
  private findValidPosition(
    width: number,
    height: number,
    sheet: MasterSheet,
    existingPanes: PlacedPane[],
    minX?: number,
    minY?: number
  ): { x: number; y: number } | null {
    // Define domain for x and y
    const maxX = sheet.width - width;
    const maxY = sheet.height - height;

    if (maxX < 0 || maxY < 0) return null;

    const startX = Math.max(0, minX || 0);
    const startY = Math.max(0, minY || 0);
    const endX = Math.min(maxX, sheet.width - width);
    const endY = Math.min(maxY, sheet.height - height);

    // Try positions using bottom-left fill strategy (good for CP)
    for (let y = startY; y <= endY; y += 10) {
      // Step by 10mm for efficiency
      for (let x = startX; x <= endX; x += 10) {
        if (this.isValidPosition(x, y, width, height, sheet, existingPanes)) {
          return { x, y };
        }
      }
    }

    // Try exact positions if stepped search didn't find anything
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (this.isValidPosition(x, y, width, height, sheet, existingPanes)) {
          return { x, y };
        }
      }
    }

    return null;
  }

  /**
   * Check if position is valid (constraint checking)
   */
  private isValidPosition(
    x: number,
    y: number,
    width: number,
    height: number,
    sheet: MasterSheet,
    existingPanes: PlacedPane[]
  ): boolean {
    // Constraint 1: Boundary constraints
    if (x < 0 || y < 0 || x + width > sheet.width || y + height > sheet.height) {
      return false;
    }

    // Constraint 2: Non-overlap constraint
    for (const existing of existingPanes) {
      if (this.overlaps(x, y, width, height, existing)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if two rectangles overlap
   */
  private overlaps(
    x1: number,
    y1: number,
    w1: number,
    h1: number,
    existing: PlacedPane
  ): boolean {
    const spacing = this.config.minSpacing;
    const x2 = existing.x;
    const y2 = existing.y;
    const w2 = existing.actualWidth;
    const h2 = existing.actualHeight;

    // Check overlap with spacing
    return !(
      x1 + w1 + spacing <= x2 ||
      x2 + w2 + spacing <= x1 ||
      y1 + h1 + spacing <= y2 ||
      y2 + h2 + spacing <= y1
    );
  }

  /**
   * Calculate waste for a sheet
   */
  private calculateSheetWaste(
    sheet: MasterSheet,
    panes: PlacedPane[]
  ): number {
    const usedArea = panes.reduce(
      (sum, pane) => sum + pane.actualWidth * pane.actualHeight,
      0
    );
    const totalArea = sheet.width * sheet.height;
    return totalArea - usedArea;
  }

  /**
   * Calculate utilization for a sheet
   */
  private calculateSheetUtilization(
    sheet: MasterSheet,
    panes: PlacedPane[]
  ): number {
    const usedArea = panes.reduce(
      (sum, pane) => sum + pane.actualWidth * pane.actualHeight,
      0
    );
    const totalArea = sheet.width * sheet.height;
    return totalArea > 0 ? (usedArea / totalArea) * 100 : 0;
  }

  /**
   * Calculate final metrics
   */
  private calculateMetrics(solution: NestingSolution): void {
    let totalUsedArea = 0;
    let totalSheetArea = 0;

    for (const sheetData of solution.sheets) {
      const sheetArea = sheetData.sheet.width * sheetData.sheet.height;
      totalSheetArea += sheetArea;
      totalUsedArea += sheetArea - sheetData.waste;
    }

    solution.totalWaste = solution.sheets.reduce(
      (sum, s) => sum + s.waste,
      0
    );
    solution.totalUtilization =
      totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) * 100 : 0;
    solution.totalSheets = solution.sheets.length;

    // Calculate objective value
    if (this.config.objective === 'minimize_sheets') {
      solution.objectiveValue = solution.totalSheets;
    } else {
      // Minimize height (for roll material)
      const maxHeight = Math.max(
        ...solution.sheets.map((s) => {
          const maxPaneY = Math.max(
            ...s.panes.map((p) => p.y + p.actualHeight),
            0
          );
          return maxPaneY;
        }),
        0
      );
      solution.objectiveValue = maxHeight;
    }
  }

  /**
   * Optimize solution using local search improvements
   */
  optimizeSolution(solution: NestingSolution): NestingSolution {
    // Try to improve by:
    // 1. Re-packing panes more efficiently
    // 2. Reducing number of sheets
    // 3. Improving utilization

    const improved = this.tryReduceSheets(solution);
    return improved;
  }

  /**
   * Try to reduce number of sheets by re-packing
   */
  private tryReduceSheets(solution: NestingSolution): NestingSolution {
    if (solution.sheets.length <= 1) return solution;

    // Try to move panes from last sheet to earlier sheets
    const lastSheet = solution.sheets[solution.sheets.length - 1];
    const panesToMove = [...lastSheet.panes];

    for (let i = solution.sheets.length - 2; i >= 0; i--) {
      const targetSheet = solution.sheets[i];
      const movedPanes: PlacedPane[] = [];
      const remainingPanes: PlacedPane[] = [];

      for (const pane of panesToMove) {
        const placement = this.findPlacement(
          pane.pane,
          targetSheet.sheet,
          [...targetSheet.panes, ...movedPanes],
          new Map()
        );

        if (placement) {
          movedPanes.push({
            ...pane,
            x: placement.x,
            y: placement.y,
            rotated: placement.rotated,
            sheetId: targetSheet.sheet.id,
            actualWidth: placement.rotated ? pane.pane.height : pane.pane.width,
            actualHeight: placement.rotated ? pane.pane.width : pane.pane.height,
          });
        } else {
          remainingPanes.push(pane);
        }
      }

      if (movedPanes.length > 0) {
        targetSheet.panes.push(...movedPanes);
        targetSheet.waste = this.calculateSheetWaste(
          targetSheet.sheet,
          targetSheet.panes
        );
        targetSheet.utilization = this.calculateSheetUtilization(
          targetSheet.sheet,
          targetSheet.panes
        );
        targetSheet.wastePercentage =
          (targetSheet.waste / (targetSheet.sheet.width * targetSheet.sheet.height)) * 100;
      }

      panesToMove.length = 0;
      panesToMove.push(...remainingPanes);

      if (panesToMove.length === 0) {
        // All panes moved, remove last sheet
        solution.sheets.pop();
        break;
      }
    }

    // Recalculate metrics
    this.calculateMetrics(solution);

    return solution;
  }
}

/**
 * Helper function to create standard glass sheet sizes
 */
export function createStandardGlassSheets(): MasterSheet[] {
  return [
    {
      id: 'standard-3210x2250',
      width: 3210,
      height: 2250,
      cost: 1.0,
    },
    {
      id: 'standard-3000x2000',
      width: 3000,
      height: 2000,
      cost: 0.95,
    },
    {
      id: 'standard-2440x1830',
      width: 2440,
      height: 1830,
      cost: 0.9,
    },
  ];
}

/**
 * Helper function to convert glass specifications to panes
 */
export function glassSpecsToPanes(
  specs: Array<{
    id: string;
    width: number;
    height: number;
    allowRotation?: boolean;
    quantity?: number;
  }>
): GlassPane[] {
  const panes: GlassPane[] = [];

  for (const spec of specs) {
    const quantity = spec.quantity || 1;
    for (let i = 0; i < quantity; i++) {
      panes.push({
        id: `${spec.id}-${i}`,
        width: spec.width,
        height: spec.height,
        allowRotation: spec.allowRotation !== false,
      });
    }
  }

  return panes;
}









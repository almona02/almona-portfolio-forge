/**
 * Template Extraction Engine - Gold Tier Accuracy
 * 
 * Reverse engineers ALMONA designs to extract template patterns.
 * Analyzes WindowUnit/WindowGrid structures and creates reusable templates.
 * 
 * @since Template Editor - Gold Tier Implementation
 */

import { EgyptianJobPatternRecognizer } from '@/lib/intelligence/EgyptianJobPatternRecognizer';
import type { GridCell, WindowGrid, WindowUnit } from '@/types/fabricator';
import type { EgyptianTemplate } from '../types/drafting';

export interface ExtractedTemplate extends EgyptianTemplate {
  /** Source project IDs that contributed to this template */
  sourceProjectIds: string[];
  /** Confidence score (0-100) based on pattern frequency */
  confidence: number;
  /** Number of times this pattern was found */
  frequency: number;
  /** Material preferences for this template */
  materialPreferences: {
    aluminum: number;
    upvc: number;
    preferred: 'aluminum' | 'upvc';
  };
  /** Typical dimensions from source projects */
  typicalDimensions: {
    widths: number[];
    heights: number[];
    averageWidth: number;
    averageHeight: number;
    widthRange: [number, number];
    heightRange: [number, number];
  };
  /** System pack compatibility */
  compatibleSystemPacks: string[];
  /** Success metrics (if available) */
  successMetrics?: {
    averageAccuracy: number;
    issueCount: number;
    successRate: number;
  };
  /** Created from analysis */
  extractedAt: Date;
  /** Workshop ID that owns this template */
  workshopId?: string;
}

export interface TemplateExtractionOptions {
  /** Minimum frequency to consider a pattern (default: 2) */
  minFrequency?: number;
  /** Minimum confidence score (0-100, default: 60) */
  minConfidence?: number;
  /** Include material preferences */
  includeMaterialPreferences?: boolean;
  /** Include success metrics */
  includeSuccessMetrics?: boolean;
  /** Workshop ID for filtering */
  workshopId?: string;
}

/**
 * Template Extraction Engine
 * 
 * Analyzes WindowUnit designs and extracts reusable template patterns.
 */
export class TemplateExtractionEngine {
  private patternRecognizer: EgyptianJobPatternRecognizer;

  constructor() {
    this.patternRecognizer = new EgyptianJobPatternRecognizer();
  }

  /**
   * Extract templates from a single WindowUnit
   */
  extractFromWindowUnit(windowUnit: WindowUnit): ExtractedTemplate | null {
    if (!windowUnit.grid || windowUnit.grid.cells.length === 0) {
      return null;
    }

    const grid = windowUnit.grid;
    const template = this.gridToTemplate(grid, windowUnit);

    if (!template) {
      return null;
    }

    return {
      ...template,
      sourceProjectIds: [windowUnit.id],
      confidence: 100, // Single source = 100% confidence
      frequency: 1,
      materialPreferences: {
        aluminum: windowUnit.systemPackId?.includes('aluminium') || windowUnit.systemPackId?.includes('jumbo') ? 1 : 0,
        upvc: windowUnit.systemPackId?.includes('upvc') || windowUnit.systemPackId?.includes('rock') ? 1 : 0,
        preferred: (windowUnit.systemPackId?.includes('aluminium') || windowUnit.systemPackId?.includes('jumbo')) ? 'aluminum' : 'upvc'
      },
      typicalDimensions: {
        widths: [windowUnit.overallWidth],
        heights: [windowUnit.overallHeight],
        averageWidth: windowUnit.overallWidth,
        averageHeight: windowUnit.overallHeight,
        widthRange: [windowUnit.overallWidth, windowUnit.overallWidth],
        heightRange: [windowUnit.overallHeight, windowUnit.overallHeight]
      },
      compatibleSystemPacks: windowUnit.systemPackId ? [windowUnit.systemPackId] : [],
      extractedAt: new Date(),
      workshopId: undefined
    };
  }

  /**
   * Extract templates from multiple WindowUnits (pattern recognition)
   */
  async extractFromHistory(
    windowUnits: WindowUnit[],
    options: TemplateExtractionOptions = {}
  ): Promise<ExtractedTemplate[]> {
    const {
      minFrequency = 2,
      minConfidence = 60,
      includeMaterialPreferences = true,
      includeSuccessMetrics = true,
      workshopId
    } = options;

    // Filter by workshop if specified
    const filteredUnits = workshopId
      ? windowUnits.filter(unit => (unit as any).workshopId === workshopId)
      : windowUnits;

    if (filteredUnits.length === 0) {
      return [];
    }

    // Group by grid pattern (normalized)
    const patternGroups = new Map<string, {
      units: WindowUnit[];
      normalizedGrid: WindowGrid;
    }>();

    for (const unit of filteredUnits) {
      if (!unit.grid || unit.grid.cells.length === 0) continue;

      const normalized = this.normalizeGrid(unit.grid);
      const patternKey = this.gridToPatternKey(normalized);

      if (!patternGroups.has(patternKey)) {
        patternGroups.set(patternKey, {
          units: [],
          normalizedGrid: normalized
        });
      }

      patternGroups.get(patternKey)!.units.push(unit);
    }

    // Extract templates from groups
    const extractedTemplates: ExtractedTemplate[] = [];

    for (const [, group] of patternGroups.entries()) {
      if (group.units.length < minFrequency) continue;

      const template = this.gridToTemplate(group.normalizedGrid, group.units[0]);
      if (!template) continue;

      // Calculate confidence based on frequency
      const frequency = group.units.length;
      const confidence = Math.min(100, 60 + (frequency - minFrequency) * 10);

      if (confidence < minConfidence) continue;

      // Aggregate dimensions
      const widths = group.units.map(u => u.overallWidth);
      const heights = group.units.map(u => u.overallHeight);
      const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
      const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;

      // Material preferences
      const materialPreferences = {
        aluminum: 0,
        upvc: 0,
        preferred: 'aluminum' as 'aluminum' | 'upvc'
      };

      if (includeMaterialPreferences) {
        group.units.forEach(unit => {
          const isAluminum = unit.systemPackId?.includes('aluminium') || 
                            unit.systemPackId?.includes('jumbo') ||
                            unit.systemPackId?.includes('caluminium');
          const isUPVC = unit.systemPackId?.includes('upvc') || 
                        unit.systemPackId?.includes('rock');

          if (isAluminum) materialPreferences.aluminum++;
          if (isUPVC) materialPreferences.upvc++;
        });

        materialPreferences.preferred = materialPreferences.aluminum >= materialPreferences.upvc 
          ? 'aluminum' 
          : 'upvc';
      }

      // System pack compatibility
      const systemPacks = new Set<string>();
      group.units.forEach(unit => {
        if (unit.systemPackId) {
          systemPacks.add(unit.systemPackId);
        }
      });

      // Success metrics (if available)
      let successMetrics;
      if (includeSuccessMetrics) {
        const unitsWithOptimization = group.units.filter(u => u.optimization);
        if (unitsWithOptimization.length > 0) {
          const accuracies = unitsWithOptimization
            .map(u => (u.optimization as any)?.accuracy || 0)
            .filter(a => a > 0);
          
          if (accuracies.length > 0) {
            const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
            const issueCount = unitsWithOptimization
              .filter(u => (u.optimization as any)?.issues?.length > 0)
              .length;
            const successRate = 1 - (issueCount / unitsWithOptimization.length);

            successMetrics = {
              averageAccuracy: avgAccuracy,
              issueCount,
              successRate
            };
          }
        }
      }

      extractedTemplates.push({
        ...template,
        sourceProjectIds: group.units.map(u => u.id),
        confidence,
        frequency,
        materialPreferences,
        typicalDimensions: {
          widths,
          heights,
          averageWidth: avgWidth,
          averageHeight: avgHeight,
          widthRange: [Math.min(...widths), Math.max(...widths)],
          heightRange: [Math.min(...heights), Math.max(...heights)]
        },
        compatibleSystemPacks: Array.from(systemPacks),
        successMetrics,
        extractedAt: new Date(),
        workshopId
      });
    }

    // Sort by confidence and frequency
    return extractedTemplates.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return b.frequency - a.frequency;
    });
  }

  /**
   * Extract templates using workshop history analysis
   */
  async extractFromWorkshopHistory(
    workshopId: string,
    options: TemplateExtractionOptions = {}
  ): Promise<ExtractedTemplate[]> {
    // Get workshop patterns (for future use)
    // const patterns = await this.patternRecognizer.recognizeDailyPatterns(workshopId);
    
    // TODO: Load actual WindowUnits from database
    // For now, return empty (will be populated when database integration is complete)
    const windowUnits: WindowUnit[] = [];
    
    return this.extractFromHistory(windowUnits, {
      ...options,
      workshopId
    });
  }

  /**
   * Convert WindowGrid to EgyptianTemplate
   */
  private gridToTemplate(grid: WindowGrid, sampleUnit: WindowUnit): EgyptianTemplate | null {
    if (grid.rows === 0 || grid.cols === 0) return null;

    // Build cell types matrix
    const cellTypes: string[][] = [];
    for (let row = 0; row < grid.rows; row++) {
      cellTypes[row] = [];
      for (let col = 0; col < grid.cols; col++) {
        const cell = grid.cells.find(c => c.row === row && c.col === col);
        if (cell) {
          // Map GridCell type to template cell type
          const type = this.mapCellType(cell.type);
          cellTypes[row][col] = type;
        } else {
          cellTypes[row][col] = 'empty';
        }
      }
    }

    // Calculate constraints from sample unit
    const minWidth = Math.max(300, sampleUnit.overallWidth * 0.5);
    const maxWidth = sampleUnit.overallWidth * 2;
    const minHeight = Math.max(300, sampleUnit.overallHeight * 0.5);
    const maxHeight = sampleUnit.overallHeight * 2;

    // Calculate cell min dimensions
    const cellMinWidth = minWidth / grid.cols;
    const cellMinHeight = minHeight / grid.rows;

    return {
      id: `extracted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: this.generateTemplateName(grid),
      rows: grid.rows,
      cols: grid.cols,
      cellTypes,
      constraints: {
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        cellMinWidth,
        cellMinHeight
      }
    };
  }

  /**
   * Normalize grid (remove empty rows/cols, standardize cell types)
   */
  private normalizeGrid(grid: WindowGrid): WindowGrid {
    // Remove empty cells
    const nonEmptyCells = grid.cells.filter(c => c.type !== 'empty');
    
    if (nonEmptyCells.length === 0) return grid;

    // Find actual bounds
    const minRow = Math.min(...nonEmptyCells.map(c => c.row));
    const maxRow = Math.max(...nonEmptyCells.map(c => c.row));
    const minCol = Math.min(...nonEmptyCells.map(c => c.col));
    const maxCol = Math.max(...nonEmptyCells.map(c => c.col));

    // Normalize to start at 0,0
    const normalizedCells: GridCell[] = nonEmptyCells.map(cell => ({
      ...cell,
      row: cell.row - minRow,
      col: cell.col - minCol
    }));

    return {
      rows: maxRow - minRow + 1,
      cols: maxCol - minCol + 1,
      cells: normalizedCells,
      colWidths: grid.colWidths?.slice(minCol, maxCol + 1),
      rowHeights: grid.rowHeights?.slice(minRow, maxRow + 1)
    };
  }

  /**
   * Generate pattern key for grouping
   */
  private gridToPatternKey(grid: WindowGrid): string {
    // Create a canonical representation
    const cells = grid.cells
      .sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      })
      .map(c => `${c.row},${c.col},${c.type}`)
      .join('|');

    return `${grid.rows}x${grid.cols}:${cells}`;
  }

  /**
   * Map GridCell type to template cell type
   */
  private mapCellType(cellType: GridCell['type']): string {
    const mapping: Record<GridCell['type'], string> = {
      'fixed': 'fixed',
      'sash': 'casement',
      'panel': 'fixed',
      'sliding': 'sliding',
      'empty': 'empty'
    };
    return mapping[cellType] || 'fixed';
  }

  /**
   * Generate template name from grid structure
   */
  private generateTemplateName(grid: WindowGrid): string {
    const cellCounts = new Map<string, number>();
    grid.cells.forEach(cell => {
      const count = cellCounts.get(cell.type) || 0;
      cellCounts.set(cell.type, count + 1);
    });

    const parts: string[] = [];
    if (cellCounts.get('sliding')) {
      parts.push(`${cellCounts.get('sliding')}-Panel Sliding`);
    }
    if (cellCounts.get('sash')) {
      parts.push(`${cellCounts.get('sash')}-Sash Casement`);
    }
    if (cellCounts.get('fixed')) {
      parts.push(`${cellCounts.get('fixed')} Fixed`);
    }

    if (parts.length === 0) {
      return `${grid.rows}x${grid.cols} Grid`;
    }

    return parts.join(' + ');
  }
}

/**
 * Helper: Extract template from current design
 */
export function extractTemplateFromDesign(windowUnit: WindowUnit): ExtractedTemplate | null {
  const engine = new TemplateExtractionEngine();
  return engine.extractFromWindowUnit(windowUnit);
}

/**
 * Helper: Extract templates from project history
 */
export async function extractTemplatesFromHistory(
  windowUnits: WindowUnit[],
  options?: TemplateExtractionOptions
): Promise<ExtractedTemplate[]> {
  const engine = new TemplateExtractionEngine();
  return engine.extractFromHistory(windowUnits, options);
}


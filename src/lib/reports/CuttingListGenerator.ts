/**
 * CuttingListGenerator - Business logic for processing cutting plans into report-ready data
 * Phase 2: Professional Report Generation System
 * 
 * Transforms optimization results into structured data suitable for report generation
 */

import {
  CuttingListReportData,
  ProcessedCuttingPlan,
  ProcessedCut,
  CuttingListSummary,
  CuttingDiagram,
  DiagramCut,
  DiagramWaste,
  ReportMetadata,
} from '../exports/types';
import { WindowUnit, OptimizationResult, CuttingPlan, Profile } from '@/types/fabricator';

/**
 * Cutting list generator class
 * Processes raw optimization data into structured report data
 */
export class CuttingListGenerator {
  /**
   * Generate complete cutting list report data
   */
  generateReportData(
    project: WindowUnit,
    optimization: OptimizationResult
  ): CuttingListReportData {
    // Process cutting plans
    const processedPlans = this.processCuttingPlans(optimization.cuttingPlan);

    // Generate summary
    const summary = this.generateSummary(project, optimization, processedPlans);

    // Generate metadata
    const metadata = this.generateMetadata(project);

    return {
      project,
      optimization,
      cuttingPlans: processedPlans,
      summary,
      metadata,
    };
  }

  /**
   * Process raw cutting plans into report-ready format
   */
  private processCuttingPlans(plans: CuttingPlan[]): ProcessedCuttingPlan[] {
    return plans.map((plan, index) => {
      const processedCuts = this.processCuts(plan.cuts, plan.stockLength);
      const diagram = this.generateDiagram(plan, processedCuts);

      return {
        plan,
        profile: plan.profile,
        stockLength: plan.stockLength,
        cuts: processedCuts,
        waste: plan.totalWaste,
        utilization: plan.utilization,
        sequence: index + 1,
        diagram,
      };
    });
  }

  /**
   * Process cuts with positioning and sequencing
   */
  private processCuts(cuts: any[], stockLength: number): ProcessedCut[] {
    let currentPosition = 0;
    const processed: ProcessedCut[] = [];

    // Sort cuts by length (largest first) for better visualization
    const sortedCuts = [...cuts].sort((a, b) => b.length - a.length);

    sortedCuts.forEach((cut, index) => {
      processed.push({
        length: cut.length,
        angle: cut.angle || 0,
        componentId: cut.componentId || `cut_${index + 1}`,
        componentType: this.inferComponentType(cut),
        waste: cut.waste || 0,
        position: currentPosition,
        sequence: index + 1,
      });

      currentPosition += cut.length;
    });

    return processed;
  }

  /**
   * Infer component type from cut data
   */
  private inferComponentType(cut: any): string {
    // This would be enhanced with actual component type detection
    if (cut.angle && cut.angle !== 0 && cut.angle !== 90) {
      return 'mitered';
    }
    return 'straight';
  }

  /**
   * Generate cutting diagram data
   */
  private generateDiagram(plan: CuttingPlan, cuts: ProcessedCut[]): CuttingDiagram {
    const diagramWidth = 800; // SVG width in pixels
    const diagramHeight = 200; // SVG height in pixels
    const scale = diagramWidth / plan.stockLength;

    const diagramCuts: DiagramCut[] = cuts.map((cut, index) => {
      const x = cut.position * scale;
      const width = cut.length * scale;
      const height = diagramHeight * 0.8; // 80% of diagram height

      return {
        x,
        y: diagramHeight * 0.1, // 10% margin from top
        width,
        height,
        length: cut.length,
        angle: cut.angle,
        label: `${cut.length.toFixed(0)}mm`,
        color: this.getCutColor(index),
      };
    });

    // Calculate waste segments
    const wasteSegments: DiagramWaste[] = [];
    let lastCutEnd = 0;

    cuts.forEach((cut) => {
      if (cut.position > lastCutEnd) {
        // Waste before this cut
        const wasteWidth = (cut.position - lastCutEnd) * scale;
        wasteSegments.push({
          x: lastCutEnd * scale,
          y: diagramHeight * 0.1,
          width: wasteWidth,
          height: diagramHeight * 0.8,
          percentage: ((cut.position - lastCutEnd) / plan.stockLength) * 100,
        });
      }
      lastCutEnd = cut.position + cut.length;
    });

    // Final waste segment
    if (lastCutEnd < plan.stockLength) {
      const wasteWidth = (plan.stockLength - lastCutEnd) * scale;
      wasteSegments.push({
        x: lastCutEnd * scale,
        y: diagramHeight * 0.1,
        width: wasteWidth,
        height: diagramHeight * 0.8,
        percentage: ((plan.stockLength - lastCutEnd) / plan.stockLength) * 100,
      });
    }

    return {
      width: diagramWidth,
      height: diagramHeight,
      cuts: diagramCuts,
      waste: wasteSegments,
      scale,
    };
  }

  /**
   * Get color for cut visualization
   */
  private getCutColor(index: number): string {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#F97316', // Orange
    ];
    return colors[index % colors.length];
  }

  /**
   * Generate cutting list summary
   */
  private generateSummary(
    project: WindowUnit,
    optimization: OptimizationResult,
    processedPlans: ProcessedCuttingPlan[]
  ): CuttingListSummary {
    const totalStockPieces = processedPlans.length;
    const totalMaterialUsed = optimization.materialUsage;
    const totalWaste = processedPlans.reduce((sum, plan) => sum + plan.waste, 0);
    const averageUtilization =
      processedPlans.reduce((sum, plan) => sum + plan.utilization, 0) / totalStockPieces;

    // Collect unique profiles
    const profileMap = new Map<string, Profile>();
    processedPlans.forEach((plan) => {
      if (!profileMap.has(plan.profile.id)) {
        profileMap.set(plan.profile.id, plan.profile);
      }
    });

    return {
      totalStockPieces,
      totalMaterialUsed,
      totalWaste,
      averageUtilization,
      totalCost: optimization.costBreakdown.totalCost,
      profilesUsed: Array.from(profileMap.values()),
      estimatedProductionTime: optimization.estimatedProductionTime,
    };
  }

  /**
   * Generate report metadata
   */
  private generateMetadata(project: WindowUnit): ReportMetadata {
    return {
      generatedAt: new Date(),
      projectId: project.id,
      orderNumber: project.orderNumber,
      posNumber: project.posNumber,
      version: '2.0.0',
      generator: 'Almona Portfolio Forge',
    };
  }

  /**
   * Get utilization statistics
   */
  getUtilizationStats(plans: ProcessedCuttingPlan[]): {
    excellent: number; // > 90%
    good: number; // 80-90%
    fair: number; // 70-80%
    poor: number; // < 70%
  } {
    const stats = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
    };

    plans.forEach((plan) => {
      if (plan.utilization >= 90) {
        stats.excellent++;
      } else if (plan.utilization >= 80) {
        stats.good++;
      } else if (plan.utilization >= 70) {
        stats.fair++;
      } else {
        stats.poor++;
      }
    });

    return stats;
  }

  /**
   * Get waste analysis
   */
  getWasteAnalysis(plans: ProcessedCuttingPlan[]): {
    totalWaste: number;
    averageWaste: number;
    wastePercentage: number;
    largestWastePiece: number;
    recommendations: string[];
  } {
    const totalWaste = plans.reduce((sum, plan) => sum + plan.waste, 0);
    const averageWaste = totalWaste / plans.length;
    const totalStock = plans.reduce((sum, plan) => sum + plan.stockLength, 0);
    const wastePercentage = (totalWaste / totalStock) * 100;
    const largestWastePiece = Math.max(...plans.map((plan) => plan.waste));

    const recommendations: string[] = [];
    if (wastePercentage > 15) {
      recommendations.push('Consider using smaller stock lengths to reduce waste');
    }
    if (largestWastePiece > 500) {
      recommendations.push('Large waste pieces detected - review cutting sequence');
    }
    if (averageWaste > 200) {
      recommendations.push('High average waste - optimize cutting plan');
    }

    return {
      totalWaste,
      averageWaste,
      wastePercentage,
      largestWastePiece,
      recommendations,
    };
  }
}

// Export singleton instance
export const cuttingListGenerator = new CuttingListGenerator();


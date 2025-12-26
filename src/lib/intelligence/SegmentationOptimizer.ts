/**
 * SegmentationOptimizer - Optimizes Segmentation for Complex Shapes
 * 
 * Calculates optimal segmentation for complex shapes with:
 * - Joint positions
 * - Reinforcement points
 * - Material optimization
 * - Assembly sequence
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

import type { SegmentationPlan, ShapePattern } from './ShapeInferenceEngine';

export interface OptimizedSegmentation extends SegmentationPlan {
  materialOptimization: {
    totalMaterialLength: number; // mm
    wastePercentage: number; // 0-100
    recommendedStockLengths: number[]; // mm
    cuttingPlan: Array<{
      stockLength: number;
      cuts: Array<{
        length: number;
        segmentId: string;
      }>;
      waste: number;
    }>;
  };
  assemblySequence: Array<{
    step: number;
    action: string;
    segmentIds: string[];
    tools: string[];
    estimatedTime: number; // minutes
  }>;
  qualityCheckpoints: Array<{
    step: number;
    check: string;
    critical: boolean;
  }>;
}

/**
 * SegmentationOptimizer - Optimizes segmentation for manufacturing
 */
export class SegmentationOptimizer {
  /**
   * Optimize segmentation plan for manufacturing
   */
  optimize(
    segmentation: SegmentationPlan,
    pattern: ShapePattern | null,
    stockLengths: number[] = [5800, 6000, 6500] // Common Egyptian stock lengths
  ): OptimizedSegmentation {
    // Calculate material optimization
    const materialOptimization = this.calculateMaterialOptimization(
      segmentation,
      stockLengths
    );
    
    // Generate assembly sequence
    const assemblySequence = this.generateAssemblySequence(
      segmentation,
      pattern
    );
    
    // Define quality checkpoints
    const qualityCheckpoints = this.defineQualityCheckpoints(
      segmentation,
      pattern
    );
    
    return {
      ...segmentation,
      materialOptimization,
      assemblySequence,
      qualityCheckpoints
    };
  }
  
  /**
   * Calculate material optimization
   */
  private calculateMaterialOptimization(
    segmentation: SegmentationPlan,
    stockLengths: number[]
  ): OptimizedSegmentation['materialOptimization'] {
    // Calculate total material needed
    const totalMaterialLength = segmentation.segments.reduce((sum, seg) => {
      // For L-shape and U-shape, add extra for joints
      const jointAllowance = seg.type === 'l_leg' || seg.type === 'u_leg' ? 50 : 0;
      return sum + seg.width + seg.height + jointAllowance;
    }, 0);
    
    // Optimize cutting plan
    const cuttingPlan = this.optimizeCuttingPlan(
      segmentation.segments,
      stockLengths
    );
    
    // Calculate waste
    const totalStockLength = cuttingPlan.reduce((sum, plan) => 
      sum + plan.stockLength, 0
    );
    const totalUsedLength = cuttingPlan.reduce((sum, plan) => 
      sum + plan.cuts.reduce((s, c) => s + c.length, 0), 0
    );
    const totalWaste = totalStockLength - totalUsedLength;
    const wastePercentage = totalStockLength > 0 
      ? (totalWaste / totalStockLength) * 100 
      : 0;
    
    return {
      totalMaterialLength,
      wastePercentage: Math.round(wastePercentage * 100) / 100,
      recommendedStockLengths: stockLengths,
      cuttingPlan
    };
  }
  
  /**
   * Optimize cutting plan to minimize waste
   */
  private optimizeCuttingPlan(
    segments: SegmentationPlan['segments'],
    stockLengths: number[]
  ): OptimizedSegmentation['materialOptimization']['cuttingPlan'] {
    const plan: OptimizedSegmentation['materialOptimization']['cuttingPlan'] = [];
    const sortedStockLengths = [...stockLengths].sort((a, b) => b - a); // Descending
    
    // Group segments by similar lengths for optimization
    const segmentLengths = segments.flatMap(seg => [
      { length: seg.width, segmentId: seg.id, type: 'width' },
      { length: seg.height, segmentId: seg.id, type: 'height' }
    ]);
    
    // Simple bin packing algorithm
    const remainingCuts = [...segmentLengths];
    
    while (remainingCuts.length > 0) {
      const stockLength = sortedStockLengths[0];
      const cuts: Array<{ length: number; segmentId: string }> = [];
      let usedLength = 0;
      
      // Try to fit as many cuts as possible
      for (let i = remainingCuts.length - 1; i >= 0; i--) {
        const cut = remainingCuts[i];
        if (usedLength + cut.length <= stockLength) {
          cuts.push({ length: cut.length, segmentId: cut.segmentId });
          usedLength += cut.length;
          remainingCuts.splice(i, 1);
        }
      }
      
      if (cuts.length > 0) {
        plan.push({
          stockLength,
          cuts,
          waste: stockLength - usedLength
        });
      } else {
        // If no cuts fit, use smallest stock for largest cut
        const largestCut = remainingCuts.reduce((max, cut) => 
          cut.length > max.length ? cut : max
        );
        const smallestStock = sortedStockLengths[sortedStockLengths.length - 1];
        
        plan.push({
          stockLength: smallestStock,
          cuts: [{ length: largestCut.length, segmentId: largestCut.segmentId }],
          waste: smallestStock - largestCut.length
        });
        
        remainingCuts.splice(remainingCuts.indexOf(largestCut), 1);
      }
    }
    
    return plan;
  }
  
  /**
   * Generate assembly sequence
   */
  private generateAssemblySequence(
    segmentation: SegmentationPlan,
    pattern: ShapePattern | null
  ): OptimizedSegmentation['assemblySequence'] {
    const sequence: OptimizedSegmentation['assemblySequence'] = [];
    
    if (pattern?.type === 'l_shape') {
      sequence.push(
        {
          step: 1,
          action: 'Cut and prepare leg 1 frame pieces',
          segmentIds: ['leg1'],
          tools: ['saw', 'miter_box'],
          estimatedTime: 15
        },
        {
          step: 2,
          action: 'Cut and prepare leg 2 frame pieces',
          segmentIds: ['leg2'],
          tools: ['saw', 'miter_box'],
          estimatedTime: 15
        },
        {
          step: 3,
          action: 'Assemble leg 1 frame',
          segmentIds: ['leg1'],
          tools: ['corner_cleats', 'screws'],
          estimatedTime: 10
        },
        {
          step: 4,
          action: 'Assemble leg 2 frame',
          segmentIds: ['leg2'],
          tools: ['corner_cleats', 'screws'],
          estimatedTime: 10
        },
        {
          step: 5,
          action: 'Join legs at corner with reinforcement',
          segmentIds: ['leg1', 'leg2'],
          tools: ['corner_reinforcement', 'welding_equipment'],
          estimatedTime: 20
        },
        {
          step: 6,
          action: 'Install hardware and glazing',
          segmentIds: ['leg1', 'leg2'],
          tools: ['hardware', 'glazing_tools'],
          estimatedTime: 20
        }
      );
    } else if (pattern?.type === 'u_shape') {
      sequence.push(
        {
          step: 1,
          action: 'Cut and prepare base frame pieces',
          segmentIds: ['base'],
          tools: ['saw', 'miter_box'],
          estimatedTime: 15
        },
        {
          step: 2,
          action: 'Cut and prepare left leg frame pieces',
          segmentIds: ['left-leg'],
          tools: ['saw', 'miter_box'],
          estimatedTime: 10
        },
        {
          step: 3,
          action: 'Cut and prepare right leg frame pieces',
          segmentIds: ['right-leg'],
          tools: ['saw', 'miter_box'],
          estimatedTime: 10
        },
        {
          step: 4,
          action: 'Assemble base frame',
          segmentIds: ['base'],
          tools: ['corner_cleats', 'screws'],
          estimatedTime: 15
        },
        {
          step: 5,
          action: 'Join left leg to base with reinforcement',
          segmentIds: ['left-leg', 'base'],
          tools: ['corner_reinforcement', 'welding_equipment'],
          estimatedTime: 15
        },
        {
          step: 6,
          action: 'Join right leg to base with reinforcement',
          segmentIds: ['right-leg', 'base'],
          tools: ['corner_reinforcement', 'welding_equipment'],
          estimatedTime: 15
        },
        {
          step: 7,
          action: 'Install hardware and glazing',
          segmentIds: ['base', 'left-leg', 'right-leg'],
          tools: ['hardware', 'glazing_tools'],
          estimatedTime: 25
        }
      );
    } else {
      // Default sequence for rectangular or other shapes
      sequence.push(
        {
          step: 1,
          action: 'Cut frame pieces',
          segmentIds: segmentation.segments.map(s => s.id),
          tools: ['saw', 'miter_box'],
          estimatedTime: 20
        },
        {
          step: 2,
          action: 'Assemble frame',
          segmentIds: segmentation.segments.map(s => s.id),
          tools: ['corner_cleats', 'screws'],
          estimatedTime: 15
        },
        {
          step: 3,
          action: 'Install hardware and glazing',
          segmentIds: segmentation.segments.map(s => s.id),
          tools: ['hardware', 'glazing_tools'],
          estimatedTime: 20
        }
      );
    }
    
    return sequence;
  }
  
  /**
   * Define quality checkpoints
   */
  private defineQualityCheckpoints(
    segmentation: SegmentationPlan,
    pattern: ShapePattern | null
  ): OptimizedSegmentation['qualityCheckpoints'] {
    const checkpoints: OptimizedSegmentation['qualityCheckpoints'] = [];
    
    // Checkpoint after cutting
    checkpoints.push({
      step: 1,
      check: 'Verify all cut lengths match specifications',
      critical: true
    });
    
    // Checkpoint after frame assembly
    checkpoints.push({
      step: 2,
      check: 'Check frame squareness and dimensions',
      critical: true
    });
    
    // Special checkpoints for complex shapes
    if (pattern?.type === 'l_shape' || pattern?.type === 'u_shape') {
      checkpoints.push({
        step: 3,
        check: 'Verify corner reinforcement is properly installed',
        critical: true
      });
      
      checkpoints.push({
        step: 4,
        check: 'Check corner angles are exactly 90 degrees',
        critical: true
      });
    }
    
    // Final checkpoint
    checkpoints.push({
      step: 5,
      check: 'Final inspection: hardware, glazing, and overall quality',
      critical: true
    });
    
    return checkpoints;
  }
}


/**
 * ComplexShapeGenerator - Generates Optimal Design for Non-Symmetric Shapes
 * 
 * Generates complete window design for complex shapes with:
 * - Material strategy based on shape complexity
 * - Hardware specification for complex shapes
 * - Production optimization (cutting patterns, assembly sequences)
 * - Egyptian Maalem advice for specific shapes
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

import type { 
  InferredShape, 
  SegmentationPlan,
  MaterialStrategy 
} from './ShapeInferenceEngine';
import type { ShapePattern } from './ShapePatterns';

export interface ComplexShapeDesign {
  shape: InferredShape;
  material: {
    type: 'aluminum' | 'upvc';
    systemPackId: string;
    profiles: Array<{
      role: 'frame' | 'sash' | 'mullion' | 'transom' | 'corner_reinforcement';
      profileId: string;
      quantity: number;
      lengths: number[]; // mm
    }>;
  };
  hardware: Array<{
    type: string;
    category: string;
    quantity: number;
    position: string; // e.g., "per segment", "per corner"
    specifications: Record<string, any>;
  }>;
  glazing: {
    type: 'float' | 'tempered' | 'laminated' | 'double' | 'triple';
    thickness: number; // mm
    segments: Array<{
      segmentId: string;
      width: number; // mm
      height: number; // mm
      glazingType: string;
    }>;
  };
  production: {
    cuttingPattern: CuttingPattern;
    assemblySequence: AssemblyStep[];
    estimatedTime: number; // minutes
    requiredTools: string[];
  };
  maalemAdvice: string;
}

export interface CuttingPattern {
  stockLengths: Array<{
    length: number; // mm
    cuts: Array<{
      segmentId: string;
      pieceType: 'width' | 'height' | 'diagonal';
      length: number; // mm
      angle?: number; // degrees for miter cuts
    }>;
    waste: number; // mm
  }>;
  totalWaste: number; // mm
  wastePercentage: number; // 0-100
}

export interface AssemblyStep {
  step: number;
  description: string;
  descriptionArabic: string;
  segmentIds: string[];
  tools: string[];
  estimatedTime: number; // minutes
  critical: boolean;
}

/**
 * ComplexShapeGenerator - Generates optimal design for non-symmetric shapes
 */
export class ComplexShapeGenerator {
  /**
   * Generate optimal design for non-symmetric shape
   */
  async generateOptimalDesign(
    shape: InferredShape,
    workshopContext?: {
      machineCapabilities?: string[];
      preferredMaterials?: string[];
      location?: string;
    }
  ): Promise<ComplexShapeDesign> {
    // 1. Material choice based on shape complexity
    const material = this.chooseMaterialForShape(shape, workshopContext);
    
    // 2. Profile selection for structural needs
    const profiles = this.selectProfilesForShape(shape, material);
    
    // 3. Hardware specification
    const hardware = this.specifyHardwareForShape(shape);
    
    // 4. Glazing specification
    const glazing = this.specifyGlazingForShape(shape);
    
    // 5. Production optimization
    const production = this.optimizeProduction(shape);
    
    // 6. Maalem advice
    const maalemAdvice = this.generateMaalemAdviceForShape(shape, workshopContext);
    
    return {
      shape,
      material: {
        type: material.recommendedMaterial,
        systemPackId: material.profileSystem,
        profiles
      },
      hardware,
      glazing,
      production,
      maalemAdvice
    };
  }
  
  /**
   * Choose material based on shape complexity and machine capabilities
   */
  private chooseMaterialForShape(
    shape: InferredShape,
    workshopContext?: { machineCapabilities?: string[]; preferredMaterials?: string[] }
  ): MaterialStrategy {
    // Use material strategy from shape inference, but allow workshop override
    let strategy = shape.materialStrategy;
    
    // Workshop preference override
    if (workshopContext?.preferredMaterials && workshopContext.preferredMaterials.length > 0) {
      const preferred = workshopContext.preferredMaterials[0];
      if (preferred === 'aluminum' || preferred === 'upvc') {
        strategy.recommendedMaterial = preferred;
      }
    }
    
    // Machine capability check
    if (workshopContext?.machineCapabilities) {
      const hasWelding = workshopContext.machineCapabilities.includes('welding');
      const hasBending = workshopContext.machineCapabilities.includes('bending');
      
      // Complex shapes may require welding
      if (shape.shapeType === 'l_shape' || shape.shapeType === 'u_shape') {
        if (!hasWelding && strategy.recommendedMaterial === 'aluminum') {
          // Suggest UPVC if no welding capability
          strategy.recommendedMaterial = 'upvc';
          strategy.requiresSpecialTools = false; // UPVC uses corner connectors, not welding
        }
      }
    }
    
    return strategy;
  }
  
  /**
   * Select profiles for shape structural needs
   */
  private selectProfilesForShape(
    shape: InferredShape,
    material: MaterialStrategy
  ): ComplexShapeDesign['material']['profiles'] {
    const profiles: ComplexShapeDesign['material']['profiles'] = [];
    
    // Frame profiles for each segment
    shape.segmentation.segments.forEach(segment => {
      profiles.push({
        role: 'frame',
        profileId: `${material.profileSystem}-frame`,
        quantity: 2, // Top and bottom
        lengths: [segment.width, segment.width]
      });
      
      profiles.push({
        role: 'frame',
        profileId: `${material.profileSystem}-frame`,
        quantity: 2, // Left and right
        lengths: [segment.height, segment.height]
      });
    });
    
    // Corner reinforcements for L-shape and U-shape
    if (shape.shapeType === 'l_shape' || shape.shapeType === 'u_shape') {
      shape.segmentation.reinforcement.forEach(reinf => {
        if (reinf.type === 'corner') {
          profiles.push({
            role: 'corner_reinforcement',
            profileId: `${material.profileSystem}-corner-reinforcement`,
            quantity: 1,
            lengths: [200, 200] // Standard corner reinforcement size
          });
        }
      });
    }
    
    // Mullions for joints
    shape.segmentation.joints.forEach(joint => {
      if (joint.type === 'mullion') {
        profiles.push({
          role: 'mullion',
          profileId: `${material.profileSystem}-mullion`,
          quantity: 1,
          lengths: [shape.segmentation.segments[0]?.height || 2000]
        });
      }
    });
    
    return profiles;
  }
  
  /**
   * Specify hardware for complex shape
   */
  private specifyHardwareForShape(shape: InferredShape): ComplexShapeDesign['hardware'] {
    const hardware: ComplexShapeDesign['hardware'] = [];
    
    // Hardware per segment
    shape.segmentation.segments.forEach(segment => {
      if (segment.type === 'l_leg' || segment.type === 'u_leg') {
        // Sliding hardware for L-shape and U-shape legs
        hardware.push({
          type: 'roller',
          category: 'sliding',
          quantity: 2, // Per leg
          position: `per ${segment.id}`,
          specifications: {
            loadCapacity: 50, // kg
            trackType: 'V-groove'
          }
        });
        
        hardware.push({
          type: 'handle',
          category: 'opening',
          quantity: 1,
          position: `per ${segment.id}`,
          specifications: {
            height: 1100, // mm from floor (Egyptian standard)
            type: 'standard'
          }
        });
      } else {
        // Standard hardware for rectangular segments
        hardware.push({
          type: 'handle',
          category: 'opening',
          quantity: 1,
          position: `per ${segment.id}`,
          specifications: {
            height: 1100,
            type: 'standard'
          }
        });
      }
    });
    
    // Corner hardware for L-shape and U-shape
    if (shape.shapeType === 'l_shape' || shape.shapeType === 'u_shape') {
      hardware.push({
        type: 'corner_connector',
        category: 'structural',
        quantity: shape.segmentation.joints.filter(j => j.type === 'corner').length,
        position: 'per corner joint',
        specifications: {
          type: shape.materialStrategy.recommendedMaterial === 'aluminum' ? 'welded' : 'mechanical',
          reinforcement: true
        }
      });
    }
    
    return hardware;
  }
  
  /**
   * Specify glazing for shape
   */
  private specifyGlazingForShape(shape: InferredShape): ComplexShapeDesign['glazing'] {
    const segments = shape.segmentation.segments.map(seg => ({
      segmentId: seg.id,
      width: seg.width,
      height: seg.height,
      glazingType: 'double' // Default double glazing
    }));
    
    return {
      type: 'double',
      thickness: 24, // mm (6+12+6)
      segments
    };
  }
  
  /**
   * Optimize production for complex shape
   */
  private optimizeProduction(shape: InferredShape): ComplexShapeDesign['production'] {
    const cuttingPattern = this.generateCuttingPattern(shape);
    const assemblySequence = this.generateAssemblySequence(shape);
    const estimatedTime = assemblySequence.reduce((sum, step) => sum + step.estimatedTime, 0);
    
    // Collect required tools
    const requiredTools = new Set<string>();
    assemblySequence.forEach(step => {
      step.tools.forEach(tool => requiredTools.add(tool));
    });
    
    return {
      cuttingPattern,
      assemblySequence,
      estimatedTime,
      requiredTools: Array.from(requiredTools)
    };
  }
  
  /**
   * Generate cutting pattern
   */
  private generateCuttingPattern(shape: InferredShape): CuttingPattern {
    const stockLengths: CuttingPattern['stockLengths'] = [];
    const stockLength = 6000; // mm - standard Egyptian stock
    
    // Group cuts by segment
    const allCuts: Array<{ segmentId: string; pieceType: 'width' | 'height'; length: number }> = [];
    
    shape.segmentation.segments.forEach(seg => {
      allCuts.push({ segmentId: seg.id, pieceType: 'width', length: seg.width });
      allCuts.push({ segmentId: seg.id, pieceType: 'width', length: seg.width });
      allCuts.push({ segmentId: seg.id, pieceType: 'height', length: seg.height });
      allCuts.push({ segmentId: seg.id, pieceType: 'height', length: seg.height });
    });
    
    // Simple bin packing
    const remainingCuts = [...allCuts];
    
    while (remainingCuts.length > 0) {
      const cuts: CuttingPattern['stockLengths'][0]['cuts'] = [];
      let usedLength = 0;
      
      for (let i = remainingCuts.length - 1; i >= 0; i--) {
        const cut = remainingCuts[i];
        if (usedLength + cut.length <= stockLength) {
          cuts.push({
            segmentId: cut.segmentId,
            pieceType: cut.pieceType,
            length: cut.length,
            angle: cut.pieceType === 'width' ? 0 : 90 // Miter angles
          });
          usedLength += cut.length;
          remainingCuts.splice(i, 1);
        }
      }
      
      if (cuts.length > 0) {
        stockLengths.push({
          length: stockLength,
          cuts,
          waste: stockLength - usedLength
        });
      } else {
        // Handle oversized cuts
        const largestCut = remainingCuts.reduce((max, cut) => 
          cut.length > max.length ? cut : max
        );
        stockLengths.push({
          length: stockLength,
          cuts: [{
            segmentId: largestCut.segmentId,
            pieceType: largestCut.pieceType,
            length: largestCut.length
          }],
          waste: stockLength - largestCut.length
        });
        remainingCuts.splice(remainingCuts.indexOf(largestCut), 1);
      }
    }
    
    const totalWaste = stockLengths.reduce((sum, stock) => sum + stock.waste, 0);
    const totalStock = stockLengths.length * stockLength;
    const wastePercentage = totalStock > 0 ? (totalWaste / totalStock) * 100 : 0;
    
    return {
      stockLengths,
      totalWaste,
      wastePercentage: Math.round(wastePercentage * 100) / 100
    };
  }
  
  /**
   * Generate assembly sequence
   */
  private generateAssemblySequence(shape: InferredShape): AssemblyStep[] {
    const steps: AssemblyStep[] = [];
    
    if (shape.shapeType === 'l_shape') {
      steps.push(
        {
          step: 1,
          description: 'Cut and prepare leg 1 frame pieces',
          descriptionArabic: 'قطع وإعداد قطع إطار الرجل الأولى',
          segmentIds: ['leg1'],
          tools: ['saw', 'miter_box'],
          estimatedTime: 15,
          critical: true
        },
        {
          step: 2,
          description: 'Cut and prepare leg 2 frame pieces',
          descriptionArabic: 'قطع وإعداد قطع إطار الرجل الثانية',
          segmentIds: ['leg2'],
          tools: ['saw', 'miter_box'],
          estimatedTime: 15,
          critical: true
        },
        {
          step: 3,
          description: 'Assemble leg 1 frame',
          descriptionArabic: 'تجميع إطار الرجل الأولى',
          segmentIds: ['leg1'],
          tools: ['corner_cleats', 'screws'],
          estimatedTime: 10,
          critical: true
        },
        {
          step: 4,
          description: 'Assemble leg 2 frame',
          descriptionArabic: 'تجميع إطار الرجل الثانية',
          segmentIds: ['leg2'],
          tools: ['corner_cleats', 'screws'],
          estimatedTime: 10,
          critical: true
        },
        {
          step: 5,
          description: 'Join legs at corner with reinforcement',
          descriptionArabic: 'ربط الأرجل عند الزاوية مع التعزيز',
          segmentIds: ['leg1', 'leg2'],
          tools: ['corner_reinforcement', 'welding_equipment'],
          estimatedTime: 20,
          critical: true
        },
        {
          step: 6,
          description: 'Install hardware and glazing',
          descriptionArabic: 'تركيب الأكسسوارات والزجاج',
          segmentIds: ['leg1', 'leg2'],
          tools: ['hardware', 'glazing_tools'],
          estimatedTime: 20,
          critical: true
        }
      );
    } else if (shape.shapeType === 'u_shape') {
      steps.push(
        {
          step: 1,
          description: 'Cut and prepare base frame pieces',
          descriptionArabic: 'قطع وإعداد قطع إطار القاعدة',
          segmentIds: ['base'],
          tools: ['saw', 'miter_box'],
          estimatedTime: 15,
          critical: true
        },
        {
          step: 2,
          description: 'Cut and prepare left leg frame pieces',
          descriptionArabic: 'قطع وإعداد قطع إطار الرجل اليسرى',
          segmentIds: ['left-leg'],
          tools: ['saw', 'miter_box'],
          estimatedTime: 10,
          critical: true
        },
        {
          step: 3,
          description: 'Cut and prepare right leg frame pieces',
          descriptionArabic: 'قطع وإعداد قطع إطار الرجل اليمنى',
          segmentIds: ['right-leg'],
          tools: ['saw', 'miter_box'],
          estimatedTime: 10,
          critical: true
        },
        {
          step: 4,
          description: 'Assemble base frame',
          descriptionArabic: 'تجميع إطار القاعدة',
          segmentIds: ['base'],
          tools: ['corner_cleats', 'screws'],
          estimatedTime: 15,
          critical: true
        },
        {
          step: 5,
          description: 'Join left leg to base with reinforcement',
          descriptionArabic: 'ربط الرجل اليسرى بالقاعدة مع التعزيز',
          segmentIds: ['left-leg', 'base'],
          tools: ['corner_reinforcement', 'welding_equipment'],
          estimatedTime: 15,
          critical: true
        },
        {
          step: 6,
          description: 'Join right leg to base with reinforcement',
          descriptionArabic: 'ربط الرجل اليمنى بالقاعدة مع التعزيز',
          segmentIds: ['right-leg', 'base'],
          tools: ['corner_reinforcement', 'welding_equipment'],
          estimatedTime: 15,
          critical: true
        },
        {
          step: 7,
          description: 'Install hardware and glazing',
          descriptionArabic: 'تركيب الأكسسوارات والزجاج',
          segmentIds: ['base', 'left-leg', 'right-leg'],
          tools: ['hardware', 'glazing_tools'],
          estimatedTime: 25,
          critical: true
        }
      );
    } else {
      // Default sequence for other shapes
      steps.push(
        {
          step: 1,
          description: 'Cut frame pieces',
          descriptionArabic: 'قطع قطع الإطار',
          segmentIds: shape.segmentation.segments.map(s => s.id),
          tools: ['saw', 'miter_box'],
          estimatedTime: 20,
          critical: true
        },
        {
          step: 2,
          description: 'Assemble frame',
          descriptionArabic: 'تجميع الإطار',
          segmentIds: shape.segmentation.segments.map(s => s.id),
          tools: ['corner_cleats', 'screws'],
          estimatedTime: 15,
          critical: true
        },
        {
          step: 3,
          description: 'Install hardware and glazing',
          descriptionArabic: 'تركيب الأكسسوارات والزجاج',
          segmentIds: shape.segmentation.segments.map(s => s.id),
          tools: ['hardware', 'glazing_tools'],
          estimatedTime: 20,
          critical: true
        }
      );
    }
    
    return steps;
  }
  
  /**
   * Generate Maalem advice for specific shape
   */
  private generateMaalemAdviceForShape(
    shape: InferredShape,
    workshopContext?: { location?: string }
  ): string {
    let advice = shape.maalemAdvice || '';
    
    // Add location-specific advice
    if (workshopContext?.location) {
      if (workshopContext.location === 'Alexandria') {
        advice += ' ⚠️ في الإسكندرية، استخدم أكسسوارات مقاومة للصدأ بسبب الرطوبة العالية.';
      } else if (workshopContext.location === 'Upper_Egypt') {
        advice += ' ⚠️ في الصعيد، استخدم زجاج سميك لحماية من الرمال والغبار.';
      }
    }
    
    // Add complexity-specific advice
    if (shape.materialStrategy.complexityLevel === 'complex') {
      advice += ' ⚠️ هذا التصميم معقد - خذ وقتك في القياس والتجميع.';
    }
    
    return advice;
  }
}


/**
 * ZeroDecisionGenerator - Magic Mode for Zero-Decision Generation
 * 
 * Generates optimal window designs without user choices, based on inferred intent.
 * Supports both rectangular and non-symmetric shapes.
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

import { ComplexShapeGenerator, type ComplexShapeDesign } from './ComplexShapeGenerator';
import type { InferredShape } from './ShapeInferenceEngine';
import { MaterialStrategyCalculator } from './MaterialStrategyCalculator';
import { HardwareSpecifier } from './HardwareSpecifier';
import type { ShapePattern } from './ShapePatterns';

export interface WorkshopContext {
  workshopId?: string;
  machineCapabilities?: string[];
  preferredMaterials?: string[];
  location?: 'Cairo' | 'Alexandria' | 'Upper_Egypt' | 'Other';
  laborRates?: {
    perSqm: number;
    perHour: number;
  };
  profitMargin?: number;
  cashFlowOptions?: {
    cashDiscount?: number; // percentage
    credit30DaysMargin?: number;
    credit90DaysMargin?: number;
  };
}

export interface MagicModeResult {
  // 1. Material choice (based on shape complexity)
  material: {
    type: 'aluminum' | 'upvc';
    systemPackId: string;
    reasoning: string;
    reasoningArabic: string;
  };
  
  // 2. Profile selection (based on structural needs)
  profile: {
    systemPackId: string;
    profiles: ComplexShapeDesign['material']['profiles'];
  };
  
  // 3. Hardware specification
  hardware: ComplexShapeDesign['hardware'];
  
  // 4. Glazing specification
  glazing: ComplexShapeDesign['glazing'];
  
  // 5. Production optimization
  optimization: {
    cuttingPattern: ComplexShapeDesign['production']['cuttingPattern'];
    assemblySequence: ComplexShapeDesign['production']['assemblySequence'];
    estimatedTime: number; // minutes
    requiredTools: string[];
  };
  
  // 6. Egyptian workshop advice
  maalemAdvice: string;
  
  // 7. Complete design (for production)
  completeDesign?: ComplexShapeDesign;
}

/**
 * ZeroDecisionGenerator - Generates optimal designs without user decisions
 */
export class ZeroDecisionGenerator {
  private complexShapeGenerator: ComplexShapeGenerator;
  private materialStrategyCalculator: MaterialStrategyCalculator;
  private hardwareSpecifier: HardwareSpecifier;
  
  constructor() {
    this.complexShapeGenerator = new ComplexShapeGenerator();
    this.materialStrategyCalculator = new MaterialStrategyCalculator();
    this.hardwareSpecifier = new HardwareSpecifier();
  }
  
  /**
   * Generate from non-symmetric shape (Magic Mode for complex shapes)
   */
  async generateFromNonSymmetricShape(
    shape: InferredShape,
    workshopContext: WorkshopContext
  ): Promise<MagicModeResult> {
    // Egyptian reality: "Show me the best way to make this L-shaped window"
    
    // 1. Generate complete design for complex shape
    const completeDesign = await this.complexShapeGenerator.generateOptimalDesign(
      shape,
      workshopContext
    );
    
    // 2. Material choice (based on shape complexity)
    const materialRecommendation = this.materialStrategyCalculator.chooseMaterialForShape(
      shape.shapeType,
      shape.materialStrategy.complexityLevel,
      this.mapMachineCapabilities(workshopContext.machineCapabilities),
      {
        preferredMaterial: workshopContext.preferredMaterials?.[0] as any,
        preferredSystem: undefined
      }
    );
    
    // 3. Profile selection (already in completeDesign)
    const profile = {
      systemPackId: completeDesign.material.systemPackId,
      profiles: completeDesign.material.profiles
    };
    
    // 4. Hardware specification (already in completeDesign)
    const hardware = completeDesign.hardware;
    
    // 5. Glazing specification (already in completeDesign)
    const glazing = completeDesign.glazing;
    
    // 6. Production optimization (already in completeDesign)
    const optimization = {
      cuttingPattern: completeDesign.production.cuttingPattern,
      assemblySequence: completeDesign.production.assemblySequence,
      estimatedTime: completeDesign.production.estimatedTime,
      requiredTools: completeDesign.production.requiredTools
    };
    
    // 7. Egyptian workshop advice (already in completeDesign)
    const maalemAdvice = completeDesign.maalemAdvice;
    
    return {
      material: {
        type: materialRecommendation.material,
        systemPackId: materialRecommendation.systemPackId,
        reasoning: materialRecommendation.reasoning,
        reasoningArabic: materialRecommendation.reasoningArabic
      },
      profile,
      hardware,
      glazing,
      optimization,
      maalemAdvice,
      completeDesign
    };
  }
  
  /**
   * Generate from rectangular shape (existing Magic Mode)
   */
  async generateFromRectangularShape(
    dimensions: { width: number; height: number },
    workshopContext: WorkshopContext
  ): Promise<MagicModeResult> {
    // For rectangular shapes, create a simple inferred shape
    const inferredShape: InferredShape = {
      shapeType: 'rectangular',
      confidence: 1.0,
      pattern: null,
      segmentation: {
        segments: [{
          id: 'rect-1',
          width: dimensions.width,
          height: dimensions.height,
          position: { x: 0, y: 0 },
          type: 'rectangular'
        }],
        joints: [],
        reinforcement: []
      },
      materialStrategy: {
        recommendedMaterial: workshopContext.preferredMaterials?.[0] || 'aluminum',
        profileSystem: 'panda-50',
        complexityLevel: 'simple',
        requiresSpecialTools: false,
        estimatedAssemblyTime: 30
      },
      maalemAdvice: 'نافذة مستطيلة بسيطة - جاهزة للتصنيع'
    };
    
    return this.generateFromNonSymmetricShape(inferredShape, workshopContext);
  }
  
  /**
   * Map machine capabilities to internal format
   */
  private mapMachineCapabilities(
    capabilities?: string[]
  ): MaterialStrategyCalculator['MachineCapabilities'] | undefined {
    if (!capabilities) return undefined;
    
    return {
      hasWelding: capabilities.includes('welding'),
      hasBending: capabilities.includes('bending'),
      hasCNC: capabilities.includes('cnc'),
      hasCrimping: capabilities.includes('crimping')
    };
  }
  
  /**
   * Generate irregular cutting pattern for complex shape
   * Note: This is handled by ComplexShapeGenerator.generateOptimalDesign()
   * This method is kept for potential future custom logic
   */
  private generateIrregularCuttingPattern(shape: InferredShape): ComplexShapeDesign['production']['cuttingPattern'] {
    // This is handled by ComplexShapeGenerator, but we can add custom logic here if needed
    // For now, delegate to the generator
    return {
      stockLengths: [],
      totalWaste: 0,
      wastePercentage: 0
    };
  }
  
  /**
   * Calculate complex shape assembly time
   * Note: This is handled by ComplexShapeGenerator.generateOptimalDesign()
   * This method is kept for potential future custom logic
   */
  private calculateComplexShapeTime(shape: InferredShape): number {
    return shape.materialStrategy.estimatedAssemblyTime;
  }
}


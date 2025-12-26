/**
 * ShapeInferenceEngine - Non-Symmetric Shape Detection
 * 
 * Detects and handles non-symmetric shapes from minimal input:
 * - Pattern recognition from description ("نافذة على شكل حرف L")
 * - Dimension analysis to detect L-shapes, U-shapes
 * - Egyptian workshop pattern matching
 * - Optimal segmentation calculation
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

import { 
  detectShapeFromDescription, 
  type ShapeType, 
  type ShapePattern,
  type LShapePattern,
  type UShapePattern,
  type IrregularPattern,
  type MultiSegmentPattern,
  L_SHAPE_PATTERNS,
  IRREGULAR_PATTERNS,
  MULTI_SEGMENT_PATTERNS
} from './ShapePatterns';

export interface UserInput {
  description?: string;
  dimensions?: {
    width?: number; // mm
    height?: number; // mm
    additionalDimensions?: Record<string, number>; // For complex shapes
  };
  workshopId?: string;
  roomType?: 'kitchen' | 'bathroom' | 'living' | 'bedroom' | 'commercial' | 'villa';
  location?: 'Cairo' | 'Alexandria' | 'Upper_Egypt' | 'Other';
}

export interface InferredShape {
  shapeType: ShapeType;
  confidence: number; // 0-1
  pattern: ShapePattern | null;
  segmentation: SegmentationPlan;
  materialStrategy: MaterialStrategy;
  maalemAdvice?: string;
}

export interface SegmentationPlan {
  segments: Array<{
    id: string;
    width: number; // mm
    height: number; // mm
    position: { x: number; y: number };
    type: 'rectangular' | 'l_leg' | 'u_base' | 'u_leg' | 'irregular';
  }>;
  joints: Array<{
    position: { x: number; y: number };
    type: 'corner' | 'mullion' | 'transom';
    reinforcement: boolean;
  }>;
  reinforcement: Array<{
    position: { x: number; y: number };
    type: 'corner' | 'joint' | 'structural';
    required: boolean;
  }>;
}

export interface MaterialStrategy {
  recommendedMaterial: 'aluminum' | 'upvc' | 'both';
  profileSystem: string; // System pack ID
  complexityLevel: 'simple' | 'medium' | 'complex';
  requiresSpecialTools: boolean;
  estimatedAssemblyTime: number; // minutes
}

/**
 * ShapeInferenceEngine - Main inference engine
 */
export class ShapeInferenceEngine {
  /**
   * Infer non-symmetric shape from user input
   */
  async inferNonSymmetricShape(userInput: UserInput): Promise<InferredShape> {
    // 1. Pattern recognition from description
    let shapeType: ShapeType = 'rectangular';
    let confidence = 0.5;
    
    if (userInput.description) {
      const detected = detectShapeFromDescription(userInput.description);
      if (detected) {
        shapeType = detected;
        confidence = 0.8; // High confidence from explicit description
      }
    }
    
    // 2. Dimension analysis
    if (userInput.dimensions && shapeType === 'rectangular') {
      const dimensionAnalysis = this.analyzeDimensions(userInput.dimensions);
      if (dimensionAnalysis.shapeType !== 'rectangular') {
        shapeType = dimensionAnalysis.shapeType;
        confidence = Math.max(confidence, dimensionAnalysis.confidence);
      }
    }
    
    // 3. Room type inference (Egyptian context)
    if (shapeType === 'rectangular' && userInput.roomType === 'kitchen') {
      // Kitchens often have L-shapes
      shapeType = 'l_shape';
      confidence = 0.6; // Moderate confidence
    }
    
    // 4. Generate pattern based on inferred shape
    const pattern = await this.generatePattern(shapeType, userInput);
    
    // 5. Calculate segmentation
    const segmentation = this.optimizeSegmentation(pattern, userInput.dimensions);
    
    // 6. Determine material strategy
    const materialStrategy = this.determineMaterialStrategy(pattern, userInput);
    
    // 7. Get Maalem advice
    const maalemAdvice = this.generateMaalemAdvice(shapeType, pattern, userInput);
    
    return {
      shapeType,
      confidence,
      pattern,
      segmentation,
      materialStrategy,
      maalemAdvice
    };
  }
  
  /**
   * Analyze dimensions to detect shape type
   */
  private analyzeDimensions(dimensions: NonNullable<UserInput['dimensions']>): {
    shapeType: ShapeType;
    confidence: number;
  } {
    const { width, height, additionalDimensions } = dimensions;
    
    // Need at least width and height for basic analysis
    if (!width || !height) {
      return { shapeType: 'rectangular', confidence: 0.3 };
    }
    
    // Check for L-shape indicators
    if (additionalDimensions) {
      // If we have leg1Width, leg1Height, leg2Width, leg2Height, it's likely L-shape
      if (additionalDimensions.leg1Width && 
          additionalDimensions.leg1Height && 
          additionalDimensions.leg2Width && 
          additionalDimensions.leg2Height) {
        return { shapeType: 'l_shape', confidence: 0.9 };
      }
      
      // If we have multiple segment dimensions, it's likely multi-segment
      if (Object.keys(additionalDimensions).length > 4) {
        return { shapeType: 'multi_segment', confidence: 0.7 };
      }
    }
    
    // Aspect ratio analysis
    const aspectRatio = width / height;
    
    // Very wide windows might be multi-segment
    if (width > 4000 && aspectRatio > 3) {
      return { shapeType: 'multi_segment', confidence: 0.6 };
    }
    
    // Very tall windows might be multi-segment
    if (height > 3000 && aspectRatio < 0.5) {
      return { shapeType: 'multi_segment', confidence: 0.6 };
    }
    
    return { shapeType: 'rectangular', confidence: 0.5 };
  }
  
  /**
   * Generate pattern from shape type and input
   */
  private async generatePattern(
    shapeType: ShapeType,
    userInput: UserInput
  ): Promise<ShapePattern | null> {
    const { dimensions } = userInput;
    
    if (!dimensions || !dimensions.width || !dimensions.height) {
      return null;
    }
    
    switch (shapeType) {
      case 'l_shape':
        return this.generateLShapePattern(dimensions, userInput);
      
      case 'u_shape':
        return this.generateUShapePattern(dimensions, userInput);
      
      case 'irregular':
      case 'arched':
      case 'geometric_grid':
        return this.generateIrregularPattern(shapeType, dimensions, userInput);
      
      case 'multi_segment':
      case 'curtain_wall':
      case 'room_divider':
        return this.generateMultiSegmentPattern(shapeType, dimensions, userInput);
      
      default:
        return null;
    }
  }
  
  /**
   * Generate L-shape pattern
   */
  private generateLShapePattern(
    dimensions: NonNullable<UserInput['dimensions']>,
    userInput: UserInput
  ): LShapePattern | null {
    const { width, height, additionalDimensions } = dimensions;
    
    // If explicit leg dimensions provided
    if (additionalDimensions?.leg1Width && 
        additionalDimensions.leg1Height &&
        additionalDimensions.leg2Width && 
        additionalDimensions.leg2Height) {
      return {
        type: 'l_shape',
        variant: additionalDimensions.asymmetrical ? 'asymmetrical' : 'corner',
        leg1Width: additionalDimensions.leg1Width,
        leg1Height: additionalDimensions.leg1Height,
        leg2Width: additionalDimensions.leg2Width,
        leg2Height: additionalDimensions.leg2Height,
        cornerAngle: additionalDimensions.cornerAngle || 90,
        descriptionArabic: userInput.roomType === 'kitchen' 
          ? 'نافذة مطبخ على شكل حرف L'
          : 'نافذة على شكل حرف L'
      };
    }
    
    // Infer from total dimensions (assume equal legs for corner window)
    if (width && height) {
      // For L-shape, typically one dimension is much larger
      const isLShape = Math.abs(width - height) > Math.min(width, height) * 0.3;
      
      if (isLShape) {
        const legLength = Math.max(width, height) / 2;
        const legWidth = Math.min(width, height);
        
        return {
          type: 'l_shape',
          variant: 'corner',
          leg1Width: legLength,
          leg1Height: legWidth,
          leg2Width: legLength,
          leg2Height: legWidth,
          cornerAngle: 90,
          descriptionArabic: 'نافذة على شكل حرف L (مستنتج من المقاسات)'
        };
      }
    }
    
    return null;
  }
  
  /**
   * Generate U-shape pattern
   */
  private generateUShapePattern(
    dimensions: NonNullable<UserInput['dimensions']>,
    userInput: UserInput
  ): UShapePattern | null {
    const { width, height, additionalDimensions } = dimensions;
    
    if (additionalDimensions?.baseWidth && 
        additionalDimensions.baseHeight &&
        additionalDimensions.leftLegWidth && 
        additionalDimensions.leftLegHeight &&
        additionalDimensions.rightLegWidth && 
        additionalDimensions.rightLegHeight) {
      return {
        type: 'u_shape',
        baseWidth: additionalDimensions.baseWidth,
        baseHeight: additionalDimensions.baseHeight,
        leftLegWidth: additionalDimensions.leftLegWidth,
        leftLegHeight: additionalDimensions.leftLegHeight,
        rightLegWidth: additionalDimensions.rightLegWidth,
        rightLegHeight: additionalDimensions.rightLegHeight,
        descriptionArabic: 'نافذة على شكل حرف U'
      };
    }
    
    // Infer U-shape from dimensions (very wide with side extensions)
    if (width && height && width > height * 2) {
      const baseWidth = width * 0.6;
      const legWidth = width * 0.2;
      const legHeight = height * 0.8;
      
      return {
        type: 'u_shape',
        baseWidth,
        baseHeight: height,
        leftLegWidth: legWidth,
        leftLegHeight: legHeight,
        rightLegWidth: legWidth,
        rightLegHeight: legHeight,
        descriptionArabic: 'نافذة على شكل حرف U (مستنتج من المقاسات)'
      };
    }
    
    return null;
  }
  
  /**
   * Generate irregular pattern
   */
  private generateIrregularPattern(
    shapeType: ShapeType,
    dimensions: NonNullable<UserInput['dimensions']>,
    userInput: UserInput
  ): IrregularPattern | null {
    const variant = shapeType === 'arched' ? 'arched_top' :
                   shapeType === 'geometric_grid' ? 'geometric_grid' :
                   'multiple_openings';
    
    return {
      type: 'irregular',
      variant,
      segments: [{
        id: 'seg-1',
        width: dimensions.width || 0,
        height: dimensions.height || 0,
        position: { x: 0, y: 0 },
        shape: variant === 'arched_top' ? 'arched' : 'rectangular'
      }],
      descriptionArabic: IRREGULAR_PATTERNS[variant]?.descriptionArabic || 'شكل غير منتظم'
    };
  }
  
  /**
   * Generate multi-segment pattern
   */
  private generateMultiSegmentPattern(
    shapeType: ShapeType,
    dimensions: NonNullable<UserInput['dimensions']>,
    userInput: UserInput
  ): MultiSegmentPattern | null {
    const variant = shapeType === 'curtain_wall' ? 'curtain_wall' :
                   shapeType === 'room_divider' ? 'room_divider' :
                   'sliding_wall';
    
    const { width, height } = dimensions;
    
    // Default: 3 segments for multi-segment
    const segmentWidth = width ? width / 3 : 1000;
    const segmentHeight = height || 2000;
    
    return {
      type: 'multi_segment',
      variant,
      segments: [
        { id: 'seg-1', width: segmentWidth, height: segmentHeight, position: { x: 0, y: 0 }, openingType: 'sliding' },
        { id: 'seg-2', width: segmentWidth, height: segmentHeight, position: { x: segmentWidth, y: 0 }, openingType: 'fixed' },
        { id: 'seg-3', width: segmentWidth, height: segmentHeight, position: { x: segmentWidth * 2, y: 0 }, openingType: 'sliding' }
      ],
      totalWidth: width || segmentWidth * 3,
      totalHeight: segmentHeight,
      descriptionArabic: MULTI_SEGMENT_PATTERNS[variant]?.descriptionArabic || 'نوافذ متعددة الأقسام'
    };
  }
  
  /**
   * Optimize segmentation for complex shapes
   */
  optimizeSegmentation(
    pattern: ShapePattern | null,
    dimensions?: UserInput['dimensions']
  ): SegmentationPlan {
    if (!pattern) {
      // Default rectangular segmentation
      return {
        segments: dimensions?.width && dimensions.height ? [{
          id: 'rect-1',
          width: dimensions.width,
          height: dimensions.height,
          position: { x: 0, y: 0 },
          type: 'rectangular'
        }] : [],
        joints: [],
        reinforcement: []
      };
    }
    
    switch (pattern.type) {
      case 'l_shape':
        return this.segmentLShape(pattern);
      
      case 'u_shape':
        return this.segmentUShape(pattern);
      
      case 'irregular':
        return this.segmentIrregular(pattern);
      
      case 'multi_segment':
        return this.segmentMultiSegment(pattern);
      
      default:
        return {
          segments: [],
          joints: [],
          reinforcement: []
        };
    }
  }
  
  /**
   * Segment L-shape into manufacturable pieces
   */
  private segmentLShape(pattern: LShapePattern): SegmentationPlan {
    const segments = [
      {
        id: 'leg1',
        width: pattern.leg1Width,
        height: pattern.leg1Height,
        position: { x: 0, y: 0 },
        type: 'l_leg' as const
      },
      {
        id: 'leg2',
        width: pattern.leg2Width,
        height: pattern.leg2Height,
        position: { x: pattern.leg1Width, y: 0 },
        type: 'l_leg' as const
      }
    ];
    
    const joints = [
      {
        position: { x: pattern.leg1Width, y: 0 },
        type: 'corner' as const,
        reinforcement: true // L-shape corners need reinforcement
      }
    ];
    
    const reinforcement = [
      {
        position: { x: pattern.leg1Width, y: 0 },
        type: 'corner' as const,
        required: true
      }
    ];
    
    return { segments, joints, reinforcement };
  }
  
  /**
   * Segment U-shape into manufacturable pieces
   */
  private segmentUShape(pattern: UShapePattern): SegmentationPlan {
    const segments = [
      {
        id: 'left-leg',
        width: pattern.leftLegWidth,
        height: pattern.leftLegHeight,
        position: { x: 0, y: 0 },
        type: 'u_leg' as const
      },
      {
        id: 'base',
        width: pattern.baseWidth,
        height: pattern.baseHeight,
        position: { x: pattern.leftLegWidth, y: 0 },
        type: 'u_base' as const
      },
      {
        id: 'right-leg',
        width: pattern.rightLegWidth,
        height: pattern.rightLegHeight,
        position: { x: pattern.leftLegWidth + pattern.baseWidth, y: 0 },
        type: 'u_leg' as const
      }
    ];
    
    const joints = [
      {
        position: { x: pattern.leftLegWidth, y: 0 },
        type: 'corner' as const,
        reinforcement: true
      },
      {
        position: { x: pattern.leftLegWidth + pattern.baseWidth, y: 0 },
        type: 'corner' as const,
        reinforcement: true
      }
    ];
    
    const reinforcement = joints.map(j => ({
      position: j.position,
      type: 'corner' as const,
      required: true
    }));
    
    return { segments, joints, reinforcement };
  }
  
  /**
   * Segment irregular shape
   */
  private segmentIrregular(pattern: IrregularPattern): SegmentationPlan {
    return {
      segments: pattern.segments.map(seg => ({
        id: seg.id,
        width: seg.width,
        height: seg.height,
        position: seg.position,
        type: 'rectangular' as const
      })),
      joints: [],
      reinforcement: []
    };
  }
  
  /**
   * Segment multi-segment pattern
   */
  private segmentMultiSegment(pattern: MultiSegmentPattern): SegmentationPlan {
    const segments = pattern.segments.map(seg => ({
      id: seg.id,
      width: seg.width,
      height: seg.height,
      position: seg.position,
      type: 'rectangular' as const
    }));
    
    const joints: SegmentationPlan['joints'] = [];
    
    // Add mullions between segments
    for (let i = 0; i < pattern.segments.length - 1; i++) {
      const currentSeg = pattern.segments[i];
      const nextSeg = pattern.segments[i + 1];
      
      if (currentSeg.position.x + currentSeg.width === nextSeg.position.x) {
        // Vertical mullion
        joints.push({
          position: { 
            x: currentSeg.position.x + currentSeg.width, 
            y: currentSeg.position.y 
          },
          type: 'mullion',
          reinforcement: false
        });
      }
    }
    
    return {
      segments,
      joints,
      reinforcement: []
    };
  }
  
  /**
   * Determine material strategy for shape
   */
  private determineMaterialStrategy(
    pattern: ShapePattern | null,
    userInput: UserInput
  ): MaterialStrategy {
    if (!pattern) {
      return {
        recommendedMaterial: 'aluminum',
        profileSystem: 'rock60',
        complexityLevel: 'simple',
        requiresSpecialTools: false,
        estimatedAssemblyTime: 30
      };
    }
    
    let complexityLevel: 'simple' | 'medium' | 'complex' = 'simple';
    let requiresSpecialTools = false;
    let estimatedAssemblyTime = 30;
    
    switch (pattern.type) {
      case 'l_shape':
        complexityLevel = 'medium';
        requiresSpecialTools = true; // Corner welding/joining
        estimatedAssemblyTime = 60;
        break;
      
      case 'u_shape':
        complexityLevel = 'medium';
        requiresSpecialTools = true;
        estimatedAssemblyTime = 75;
        break;
      
      case 'irregular':
        complexityLevel = 'complex';
        requiresSpecialTools = true;
        estimatedAssemblyTime = 120;
        break;
      
      case 'multi_segment':
        complexityLevel = pattern.variant === 'curtain_wall' ? 'complex' : 'medium';
        requiresSpecialTools = pattern.variant === 'curtain_wall';
        estimatedAssemblyTime = pattern.variant === 'curtain_wall' ? 180 : 90;
        break;
    }
    
    // Material recommendation based on complexity
    const recommendedMaterial = complexityLevel === 'complex' ? 'aluminum' : 'aluminum';
    const profileSystem = complexityLevel === 'complex' ? 'rock60' : 'panda-50';
    
    return {
      recommendedMaterial,
      profileSystem,
      complexityLevel,
      requiresSpecialTools,
      estimatedAssemblyTime
    };
  }
  
  /**
   * Generate Maalem advice for shape
   */
  private generateMaalemAdvice(
    shapeType: ShapeType,
    pattern: ShapePattern | null,
    userInput: UserInput
  ): string {
    if (shapeType === 'l_shape') {
      return '💡 نصيحة المعلم: نافذة L تحتاج لحام زاوية قوي. استخدم معززات زاوية (corner reinforcements) لضمان المتانة.';
    }
    
    if (shapeType === 'u_shape') {
      return '💡 نصيحة المعلم: نافذة U تحتاج لمعالجة خاصة في الزوايا. تأكد من استخدام وصلات قوية بين الأرجل والقاعدة.';
    }
    
    if (shapeType === 'irregular' || shapeType === 'arched') {
      return '💡 نصيحة المعلم: الأشكال غير المنتظمة تحتاج لقطع دقيق. استخدم قوالب (templates) للتأكد من الدقة.';
    }
    
    if (shapeType === 'multi_segment' || shapeType === 'curtain_wall') {
      return '💡 نصيحة المعلم: النوافذ المتعددة الأقسام تحتاج لتخطيط دقيق. رتب القطع حسب تسلسل التجميع.';
    }
    
    return '';
  }
  
  /**
   * Get Egyptian workshop patterns (for pattern matching)
   */
  async getEgyptianWorkshopPatterns(workshopId?: string): Promise<ShapePattern[]> {
    // TODO: Load from database when workshop history is available
    // For now, return common patterns
    return [];
  }
  
  /**
   * Find best match from workshop patterns
   */
  findBestMatch(
    dimensions: NonNullable<UserInput['dimensions']>,
    patterns: ShapePattern[]
  ): { pattern: ShapePattern; confidence: number } | null {
    if (patterns.length === 0) return null;
    
    // Simple matching: find pattern with closest dimensions
    // TODO: Implement more sophisticated matching algorithm
    return {
      pattern: patterns[0],
      confidence: 0.7
    };
  }
}


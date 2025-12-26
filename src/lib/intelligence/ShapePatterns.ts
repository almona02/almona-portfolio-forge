/**
 * ShapePatterns - Egyptian Shape Pattern Definitions
 * 
 * Defines common non-symmetric shapes in Egyptian fabrication:
 * - L-shape kitchen windows (نوافذ المطبخ على شكل حرف L)
 * - U-shape windows
 * - Irregular traditional shapes (المنازل التقليدية)
 * - Multi-segment large spaces (المساحات الكبيرة)
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

export type ShapeType = 
  | 'rectangular' 
  | 'l_shape' 
  | 'u_shape' 
  | 'irregular' 
  | 'multi_segment'
  | 'arched'
  | 'geometric_grid'
  | 'curtain_wall'
  | 'room_divider';

export interface LShapePattern {
  type: 'l_shape';
  variant: 'corner' | 'wrap_around' | 'asymmetrical' | 'with_ventilation';
  leg1Width: number; // mm
  leg1Height: number; // mm
  leg2Width: number; // mm
  leg2Height: number; // mm
  cornerAngle: number; // degrees (typically 90)
  descriptionArabic?: string;
}

export interface UShapePattern {
  type: 'u_shape';
  baseWidth: number; // mm
  baseHeight: number; // mm
  leftLegWidth: number; // mm
  leftLegHeight: number; // mm
  rightLegWidth: number; // mm
  rightLegHeight: number; // mm
  descriptionArabic?: string;
}

export interface IrregularPattern {
  type: 'irregular';
  variant: 'arched_top' | 'geometric_grid' | 'multiple_openings' | 'decorative_mullions';
  segments: Array<{
    id: string;
    width: number; // mm
    height: number; // mm
    position: { x: number; y: number }; // relative to origin
    shape: 'rectangular' | 'arched' | 'trapezoidal';
  }>;
  descriptionArabic?: string;
}

export interface MultiSegmentPattern {
  type: 'multi_segment';
  variant: 'sliding_wall' | 'curtain_wall' | 'room_divider';
  segments: Array<{
    id: string;
    width: number; // mm
    height: number; // mm
    position: { x: number; y: number };
    openingType: 'sliding' | 'fixed' | 'casement';
  }>;
  totalWidth: number; // mm
  totalHeight: number; // mm
  descriptionArabic?: string;
}

export type ShapePattern = LShapePattern | UShapePattern | IrregularPattern | MultiSegmentPattern;

/**
 * Egyptian L-Shape Kitchen Window Patterns
 * Common in Egyptian apartments
 */
export const L_SHAPE_PATTERNS: Record<string, Partial<LShapePattern>> = {
  cornerWindow: {
    variant: 'corner',
    cornerAngle: 90,
    descriptionArabic: 'نافذة زاوية للمطبخ (90 درجة)'
  },
  wrapAround: {
    variant: 'wrap_around',
    cornerAngle: 90,
    descriptionArabic: 'نوافذ تلتف حول جدارين'
  },
  asymmetricalL: {
    variant: 'asymmetrical',
    cornerAngle: 90,
    descriptionArabic: 'نافذة L غير متناظرة (رجل أطول من الأخرى)'
  },
  withVentilation: {
    variant: 'with_ventilation',
    cornerAngle: 90,
    descriptionArabic: 'نافذة L مع قسم تهوية'
  }
};

/**
 * Irregular Traditional Shapes
 * Egyptian traditional architecture
 */
export const IRREGULAR_PATTERNS: Record<string, Partial<IrregularPattern>> = {
  archedTops: {
    variant: 'arched_top',
    descriptionArabic: 'نوافذ مقوسة للبيوت القديمة'
  },
  geometricGrids: {
    variant: 'geometric_grid',
    descriptionArabic: 'شبكات هندسية تقليدية'
  },
  multipleOpenings: {
    variant: 'multiple_openings',
    descriptionArabic: 'نوافذ متعددة الفتحات'
  },
  decorativeMullions: {
    variant: 'decorative_mullions',
    descriptionArabic: 'أعمدة زخرفية'
  }
};

/**
 * Multi-Segment Patterns
 * Common in Egyptian villas and commercial spaces
 */
export const MULTI_SEGMENT_PATTERNS: Record<string, Partial<MultiSegmentPattern>> = {
  slidingWall: {
    variant: 'sliding_wall',
    descriptionArabic: 'جدار منزل كامل من النوافذ المنزلقة'
  },
  curtainWall: {
    variant: 'curtain_wall',
    descriptionArabic: 'واجهة زجاجية للمحلات التجارية'
  },
  roomDivider: {
    variant: 'room_divider',
    descriptionArabic: 'فواصل غرف من الألومنيوم والزجاج'
  }
};

/**
 * Detect shape type from Arabic description
 */
export function detectShapeFromDescription(description: string): ShapeType | null {
  const lowerDesc = description.toLowerCase();
  const arabicDesc = description; // Keep original for Arabic matching
  
  // L-shape detection
  if (lowerDesc.includes('l-shape') || 
      lowerDesc.includes('l shape') ||
      arabicDesc.includes('حرف L') ||
      arabicDesc.includes('شكل حرف L') ||
      arabicDesc.includes('نافذة على شكل L')) {
    return 'l_shape';
  }
  
  // U-shape detection
  if (lowerDesc.includes('u-shape') || 
      lowerDesc.includes('u shape') ||
      arabicDesc.includes('حرف U') ||
      arabicDesc.includes('شكل حرف U')) {
    return 'u_shape';
  }
  
  // Arched detection
  if (lowerDesc.includes('arched') ||
      arabicDesc.includes('مقوس') ||
      arabicDesc.includes('قوس')) {
    return 'arched';
  }
  
  // Geometric grid detection
  if (lowerDesc.includes('geometric') ||
      arabicDesc.includes('هندسي') ||
      arabicDesc.includes('شبكة')) {
    return 'geometric_grid';
  }
  
  // Curtain wall detection
  if (lowerDesc.includes('curtain wall') ||
      arabicDesc.includes('واجهة زجاجية') ||
      arabicDesc.includes('ستارة')) {
    return 'curtain_wall';
  }
  
  // Room divider detection
  if (lowerDesc.includes('room divider') ||
      arabicDesc.includes('فاصل غرف') ||
      arabicDesc.includes('فواصل')) {
    return 'room_divider';
  }
  
  // Multi-segment detection
  if (lowerDesc.includes('multi-segment') ||
      lowerDesc.includes('multiple') ||
      arabicDesc.includes('متعدد') ||
      arabicDesc.includes('عدة أقسام')) {
    return 'multi_segment';
  }
  
  return null;
}


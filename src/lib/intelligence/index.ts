/**
 * Intelligence Module - Centralized Exports
 * 
 * Egyptian Fabrication Intelligence System:
 * - Shape inference and pattern recognition
 * - Zero-decision generation (Magic Mode)
 * - Material strategy and hardware specification
 * - Assembly sequencing and optimization
 * - Workshop pattern learning
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

// Shape Intelligence
export { ShapeInferenceEngine } from './ShapeInferenceEngine';
export type { 
  UserInput, 
  InferredShape, 
  SegmentationPlan, 
  MaterialStrategy 
} from './ShapeInferenceEngine';

export { 
  detectShapeFromDescription,
  L_SHAPE_PATTERNS,
  IRREGULAR_PATTERNS,
  MULTI_SEGMENT_PATTERNS
} from './ShapePatterns';
export type { 
  ShapeType, 
  ShapePattern,
  LShapePattern,
  UShapePattern,
  IrregularPattern,
  MultiSegmentPattern
} from './ShapePatterns';

// Segmentation & Optimization
export { SegmentationOptimizer } from './SegmentationOptimizer';
export type { OptimizedSegmentation } from './SegmentationOptimizer';

// Complex Shape Generation
export { ComplexShapeGenerator } from './ComplexShapeGenerator';
export type { 
  ComplexShapeDesign,
  CuttingPattern,
  AssemblyStep
} from './ComplexShapeGenerator';

// Material & Hardware Strategy
export { MaterialStrategyCalculator } from './MaterialStrategyCalculator';
export type { 
  MachineCapabilities,
  MaterialRecommendation
} from './MaterialStrategyCalculator';

export { HardwareSpecifier } from './HardwareSpecifier';
export type { HardwareSpecification } from './HardwareSpecifier';

// Assembly Sequencing
export { ComplexAssemblySequencer } from './ComplexAssemblySequencer';
export type { AssemblySequence } from './ComplexAssemblySequencer';

// Zero-Decision Generation (Magic Mode)
export { ZeroDecisionGenerator } from './ZeroDecisionGenerator';
export type { 
  WorkshopContext,
  MagicModeResult
} from './ZeroDecisionGenerator';

// Workshop Pattern Recognition
export { EgyptianJobPatternRecognizer } from './EgyptianJobPatternRecognizer';
export type { 
  JobPatterns,
  ProjectInput,
  OptimizationSuggestions
} from './EgyptianJobPatternRecognizer';

// Smart Defaults (existing)
export { SmartDefaults } from './SmartDefaults';
export type { SmartDefaultsResult } from './SmartDefaults';

// Egyptian Context Analyzer (existing)
export { EgyptianContextAnalyzer } from './EgyptianContextAnalyzer';
export type { EgyptianContext } from './EgyptianContextAnalyzer';


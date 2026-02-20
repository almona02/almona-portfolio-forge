// src/components/fabricator/drafting/types/drafting.ts

// Core Geometry Types
export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // Rotation angle in degrees (0-360), default 0
  type?: 'fixed' | 'casement' | 'tilt-turn' | 'pivot' | 'sash' | 'panel' | 'sliding';
  id?: string;
  layerId?: string; // Layer assignment
}

export interface Line {
  start: Point;
  end: Point;
  type: 'solid' | 'dashed' | 'dotted';
  id?: string;
  layerId?: string; // Layer assignment
}

export interface Circle {
  cx: number;
  cy: number;
  r: number;
  id?: string;
  layerId?: string; // Layer assignment
}

export interface Arc {
  cx: number;
  cy: number;
  r: number;
  startAngle: number; // radians
  endAngle: number; // radians
  id?: string;
  layerId?: string; // Layer assignment
}

export interface Polygon {
  points: Point[];
  closed: boolean;
  rotation?: number; // Rotation angle in degrees (0-360), default 0
  id?: string;
  layerId?: string; // Layer assignment
}

export interface Spline {
  controlPoints: Point[]; // At least 2 points (start, end, control points)
  closed?: boolean; // Closed spline (loop)
  id?: string;
  layerId?: string; // Layer assignment
}

export interface Geometry2D {
  rectangles: Rectangle[];
  points: Point[];
  lines: Line[];
  circles: Circle[];
  arcs: Arc[];
  polygons: Polygon[];
  splines: Spline[];
}

// Dimension Types
export interface Dimension {
  id?: string;
  start: Point;
  end: Point;
  value: number;
  label: string;
  unit: 'mm' | 'cm' | 'm';
  layer: 'dimension' | 'reference';
  mode?: 'distance' | 'angle' | 'area' | 'perimeter' | 'radius';
  formatted?: string;
  precision?: number;
}

// Annotation Types
export interface Annotation {
  id: string;
  text: string;
  position: Point;
  layer: 'note' | 'mark' | 'instruction';
}

// Egyptian Template System (Deterministic, Rule-Based)
export interface EgyptianTemplate {
  id: string;
  name: string;
  rows: number;
  cols: number;
  cellTypes: string[][];
  colWidthRatios?: number[];
  rowHeightRatios?: number[];
  constraints: {
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
    cellMinWidth?: number;
    cellMinHeight?: number;
  };
}

// Viewport Type
export interface Viewport {
  /** Viewport center X coordinate */
  centerX: number;
  /** Viewport center Y coordinate */
  centerY: number;
  /** Zoom level (1.0 = 100%, 2.0 = 200%, 0.5 = 50%) */
  zoom: number;
  /** Viewport width in world coordinates */
  width: number;
  /** Viewport height in world coordinates */
  height: number;
}

// Import material-aware types
import type { HardwarePlacement, MaterialAwareRectangle, StructuralElement } from './materialAware';
import type { WindowGrid } from '@/types/fabricator';

// Import layer types
import type { Layer } from './layers';

// Import pattern types
import type { PatternResult } from '../utils/patternUtils';

// Drafting State
export interface DraftingState {
  geometry: Geometry2D;
  dimensions: Dimension[];
  annotations: Annotation[];
  selectedElement: number | null; // Single selection (legacy)
  selectedElements: number[]; // Multi-selection (box select)
  activeTemplate: EgyptianTemplate | null;
  previewPoint: Point | null;
  // Material-aware extensions
  hardware: HardwarePlacement[];
  structuralElements: StructuralElement[];
  materialAwareWindows: MaterialAwareRectangle[];
  /** Grid per material window (frame) id — rows, cols, cells for Add Sash / Quick Add 2 Sashes */
  materialWindowGrids?: Record<string, WindowGrid>;
  /** Per-cell glazing: frameId -> cellId -> { type, color?, georgianBars? } for BOM and 3D */
  materialWindowGlazing?: Record<string, Record<string, { type: 'single' | 'double'; color?: string; georgianBars?: boolean }>>;
  // Layers system
  layers: Layer[];
  activeLayerId: string | null;
  // Blocks system
  blockDefinitions: import('./blocks').BlockDefinition[];
  blockInstances: import('./blocks').BlockInstance[];
  placingBlockId: string | null; // Block ID being placed (click-to-place mode)
}

// Validation Results
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  issues?: string[];
  data?: {
    template: EgyptianTemplate;
    suggestedSystemPack: string;
    validationId: string;
  };
  tier: 'Tier 0' | 'Tier 1' | 'Tier 3';
  requiresHumanReview: boolean;
}

// Drafting Output (Constitutional Interface - Tier 0 Only)
export interface DraftingOutput {
  geometry: Geometry2D;
  dimensions: Dimension[];
  annotations: Annotation[];
  template: EgyptianTemplate;
  suggestedSystemPack: string;
  metadata: {
    tier: 'Tier 0';
    draftingOnly: true;
    requiresValidation: true;
    timestamp: string;
    validationId: string;
    constitutionalNote: string;
  };
  components?: unknown[];
}

// Tools
export type DraftingTool = 
  | 'select'
  | 'pan'
  | 'rectangle'
  | 'dimension'
  | 'text'
  | 'line'
  | 'circle'
  | 'arc'
  | 'polygon'
  | 'spline'
  | 'hinge'
  | 'handle'
  | 'lock'
  | 'roller'
  | 'mullion'
  | 'transom'
  | 'mirror'
  | 'rotate'
  | 'scale'
  | 'array-rectangular'
  | 'array-circular'
  | 'array-linear'
  | 'pattern-offset'
  | 'trim'
  | 'extend'
  | 'fillet'
  | 'chamfer'
  | 'offset';

// Context Type
export interface DraftingContextType {
  state: DraftingState;
  addRectangle: (rect: Rectangle) => void;
  addLine: (line: Line) => void;
  addCircle: (circle: Circle) => void;
  addArc: (arc: Arc) => void;
  addPolygon: (polygon: Polygon) => void;
  addSpline: (spline: Spline) => void;
  addAnnotation: (annotation: Annotation) => void;
  startDimension: (start: Point) => void;
  previewDimension: (end: Point) => void;
  snapToGrid: (rect: Rectangle) => Rectangle;
  validateAgainstTemplates: (rect: Rectangle) => Rectangle;
  validateDesign: () => Promise<ValidationResult>;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getGeometry: () => Geometry2D;
  getDimensions: () => Dimension[];
  getAnnotations: () => Annotation[];
  hasGeometry: () => boolean;
  getProperty: (prop: string) => number;
  setProperty: (prop: string, value: number) => void;
  getActiveTemplate: () => string;
  setTemplate: (templateId: string) => void;
  getAvailableTemplates: () => EgyptianTemplate[];
  selectElement: (index: number) => void;
  selectElements: (indices: number[]) => void;
  selectElementAt: (point: Point) => void;
  selectElementsInBox: (boxStart: Point, boxEnd: Point) => void;
  deleteSelected: () => void;
  clearSelection: () => void;
  isSelected: (index: number) => boolean;
  getSelectedElement: () => number | null;
  getSelectedElements: () => number[];
  getPreviewPoint: () => Point | null;
  // Update operations
  updateRectangle: (index: number, rect: Rectangle) => void;
  updateCircle: (index: number, circle: Circle) => void;
  updateLine: (index: number, line: Line) => void;
  updateArc: (index: number, arc: Arc) => void;
  updateHardware: (index: number, hardware: HardwarePlacement) => void;
  updateStructuralElement: (index: number, element: StructuralElement) => void;
  highlightIssues: (issues: string[]) => void;
  previewRectangle: (rect: Rectangle) => void;
  // Material-aware methods
  addHardware: (hardware: HardwarePlacement) => void;
  addStructuralElement: (element: StructuralElement) => void;
  addMaterialAwareWindow: (window: MaterialAwareRectangle) => void;
  convertRectangleToMaterialAware: (rectIndex: number, systemPackId: string) => void;
  resizeFrame: (rectIndex: number, widthMm: number, heightMm: number) => void;
  addSashToFrame: (materialWindowId: string) => void;
  quickAddTwoSashes: (materialWindowId: string, orientation?: 'horizontal' | 'vertical') => void;
  addMullionToFrame: (materialWindowId: string, mullion: { type: 'vertical' | 'horizontal'; positionMm: number; positionPercent?: number; widthMm?: number; splitType?: 'absolute' | 'proportional' | 'clearance-based' }) => void;
  assignGlazingToSash: (materialWindowId: string, cellId: string, glazing: { type: 'single' | 'double'; color?: string; georgianBars?: boolean }) => void;
  duplicateRectangle: (rectIndex: number) => void;
  duplicateMaterialAwareFrame: (materialWindowId: string) => void;
  getHardware: () => HardwarePlacement[];
  getStructuralElements: () => StructuralElement[];
  getMaterialAwareWindows: () => MaterialAwareRectangle[];
  getMaterialWindowGrids: () => Record<string, WindowGrid>;
  getMaterialWindowGlazing: () => Record<string, Record<string, { type: 'single' | 'double'; color?: string; georgianBars?: boolean }>>;
  // Transform methods
  mirrorSelected: (axis: 'horizontal' | 'vertical') => void;
  rotateSelected: (angle: number) => void;
  scaleSelected: (scaleX: number, scaleY?: number) => void;
  // Enhanced measurement methods
  addMeasurement: (start: Point, end: Point, mode?: 'distance' | 'angle' | 'area' | 'perimeter' | 'radius') => void;
  // Pattern/Array methods
  createRectangularArray: (rows: number, cols: number, rowSpacing: number, colSpacing: number, basePoint?: Point) => PatternResult | null;
  createCircularArray: (center: Point, radius: number, count: number, startAngle?: number) => PatternResult | null;
  createLinearArray: (startPoint: Point, endPoint: Point, count: number) => PatternResult | null;
  createOffsetPattern: (offsetX: number, offsetY: number, count: number) => PatternResult | null;
  // Trim/Extend methods
  trimLine: (lineToTrim: Line, cuttingLine: Line) => void;
  extendLine: (lineToExtend: Line, targetLine: Line) => void;
  // Fillet/Chamfer methods
  applyFilletToLines: (line1: Line, line2: Line, radius: number) => void;
  applyChamferToLines: (line1: Line, line2: Line, distance1: number, distance2?: number) => void;
  // Offset method
  offsetGeometry: (elementId: string, elementType: 'line' | 'rectangle' | 'polygon' | 'arc', distance: number) => void;
  getAccuracyMetrics: () => { precision: number; tolerance: number; minSpacing: number; maxElements: number; standards: string };
  // Layers system methods
  getLayers: () => Layer[];
  getActiveLayer: () => Layer;
  setActiveLayer: (layerId: string) => { success: boolean; error?: string };
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  createLayer: (name: string, color: string) => { success: boolean; error?: string; layer?: Layer };
  deleteLayer: (layerId: string) => { success: boolean; error?: string };
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  // Blocks system methods
  getBlockDefinitions: () => import('./blocks').BlockDefinition[];
  getBlockInstances: () => import('./blocks').BlockInstance[];
  startPlacingBlock: (blockId: string) => void;
  cancelPlacingBlock: () => void;
  getPlacingBlockId: () => string | null;
  insertBlock: (blockId: string, position: Point, scale?: { x: number; y: number }, rotation?: number) => { success: boolean; error?: string; instance?: import('./blocks').BlockInstance };
  addBlock: (block: import('./blocks').BlockDefinition) => { success: boolean; error?: string; block?: import('./blocks').BlockDefinition };
  deleteBlock: (blockId: string) => { success: boolean; error?: string };
  updateBlock: (blockId: string, updates: Partial<import('./blocks').BlockDefinition>) => void;
  createBlockFromSelection: (name: string, basePoint: Point, category?: import('./blocks').BlockDefinition['category']) => { success: boolean; error?: string; block?: import('./blocks').BlockDefinition };
}

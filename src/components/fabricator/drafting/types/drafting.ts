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
  type?: 'fixed' | 'casement' | 'tilt-turn' | 'pivot' | 'sash' | 'panel' | 'sliding';
  id?: string;
}

export interface Line {
  start: Point;
  end: Point;
  type: 'solid' | 'dashed' | 'dotted';
}

export interface Geometry2D {
  rectangles: Rectangle[];
  points: Point[];
  lines: Line[];
}

// Dimension Types
export interface Dimension {
  start: Point;
  end: Point;
  value: number;
  label: string;
  unit: 'mm';
  layer: 'dimension' | 'reference';
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
  constraints: {
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
    cellMinWidth?: number;
    cellMinHeight?: number;
  };
}

// Drafting State
export interface DraftingState {
  geometry: Geometry2D;
  dimensions: Dimension[];
  annotations: Annotation[];
  selectedElement: number | null;
  activeTemplate: EgyptianTemplate | null;
  previewPoint: Point | null;
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
}

// Tools
export type DraftingTool = 
  | 'select'
  | 'rectangle'
  | 'dimension'
  | 'text'
  | 'line'
  | 'circle';

// Context Type
export interface DraftingContextType {
  state: DraftingState;
  addRectangle: (rect: Rectangle) => void;
  startDimension: (start: Point) => void;
  previewDimension: (end: Point) => void;
  snapToGrid: (rect: Rectangle) => Rectangle;
  validateAgainstTemplates: (rect: Rectangle) => Rectangle;
  validateDesign: () => Promise<ValidationResult>;
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
  selectElementAt: (point: Point) => void;
  deleteSelected: () => void;
  clearSelection: () => void;
  isSelected: (index: number) => boolean;
  getPreviewPoint: () => Point | null;
  highlightIssues: (issues: string[]) => void;
  previewRectangle: (rect: Rectangle) => void;
}


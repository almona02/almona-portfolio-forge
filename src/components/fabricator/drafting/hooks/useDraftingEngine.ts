// src/components/fabricator/drafting/hooks/useDraftingEngine.ts
import { useCallback, useEffect, useState } from 'react';
import {
    Dimension,
    DraftingState,
    EgyptianTemplate,
    Geometry2D,
    Point,
    Rectangle,
    ValidationResult
} from '../types/drafting';
import { logDraftingAction } from '../utils/constitutionalAudit';
import { validateDimensions } from '../utils/dimensionValidator';
import { validateAgainstEgyptianTemplates } from '../utils/egyptianTemplateMatcher';
import { snapToGrid as snapToGridUtil } from '../utils/snapUtils';

const INITIAL_STATE: DraftingState = {
  geometry: {
    rectangles: [],
    points: [],
    lines: []
  },
  dimensions: [],
  annotations: [],
  selectedElement: null,
  activeTemplate: null,
  previewPoint: null
};

// Egyptian Templates Database (Deterministic, Rule-Based)
const EGYPTIAN_TEMPLATES: EgyptianTemplate[] = [
  {
    id: 'egyptian_casement_2x2',
    name: 'Egyptian Casement 2x2',
    rows: 2,
    cols: 2,
    cellTypes: [
      ['casement', 'casement'],
      ['casement', 'casement']
    ],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 1200,
      maxHeight: 2400,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_fixed_casement_3x1',
    name: 'Fixed + Casement 3x1',
    rows: 3,
    cols: 1,
    cellTypes: [['fixed'], ['casement'], ['fixed']],
    constraints: {
      minWidth: 800,
      maxWidth: 1200,
      minHeight: 1800,
      maxHeight: 2400,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_sliding_2x1',
    name: 'Sliding 2x1',
    rows: 2,
    cols: 1,
    cellTypes: [['sliding'], ['sliding']],
    constraints: {
      minWidth: 800,
      maxWidth: 2000,
      minHeight: 1200,
      maxHeight: 2400,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_tilt_turn_1x1',
    name: 'Tilt-Turn 1x1',
    rows: 1,
    cols: 1,
    cellTypes: [['tilt-turn']],
    constraints: {
      minWidth: 600,
      maxWidth: 1500,
      minHeight: 800,
      maxHeight: 2000
    }
  }
];

export const useDraftingEngine = (options?: {
  initialTemplate?: string;
  onStateChange?: (state: DraftingState) => void;
}) => {
  const [state, setState] = useState<DraftingState>(INITIAL_STATE);
  const [previewRect, setPreviewRect] = useState<Rectangle | null>(null);
  
  // Save state on change
  useEffect(() => {
    options?.onStateChange?.(state);
  }, [state, options]);

  // Core Operations
  const addRectangle = useCallback((rect: Rectangle) => {
    const rectWithId = { ...rect, id: `rect-${Date.now()}-${Math.random()}` };
    
    setState(prev => ({
      ...prev,
      geometry: {
        ...prev.geometry,
        rectangles: [...prev.geometry.rectangles, rectWithId]
      }
    }));

    // Constitutional audit logging
    logDraftingAction(
      'rectangle_added',
      { x: rect.x, y: rect.y, width: rect.width, height: rect.height, type: rect.type },
      { id: rectWithId.id },
      'CHECKPOINT-RECTANGLE-ADD'
    );
  }, []);

  const startDimension = useCallback((start: Point) => {
    setState(prev => ({
      ...prev,
      previewPoint: start
    }));
  }, []);

  const previewDimension = useCallback((end: Point) => {
    setState(prev => ({
      ...prev,
      previewPoint: end
    }));
  }, []);

  const snapToGrid = useCallback((rect: Rectangle): Rectangle => {
    return snapToGridUtil(rect, 5); // 5mm grid
  }, []);

  const validateAgainstTemplates = useCallback((rect: Rectangle): Rectangle => {
    // Validate against active template constraints
    const template = state.activeTemplate;
    if (template) {
      const avgCellWidth = rect.width / template.cols;
      const avgCellHeight = rect.height / template.rows;
      
      if (template.constraints.cellMinWidth && avgCellWidth < template.constraints.cellMinWidth) {
        // Adjust to minimum
        rect.width = template.constraints.cellMinWidth * template.cols;
      }
      if (template.constraints.cellMinHeight && avgCellHeight < template.constraints.cellMinHeight) {
        // Adjust to minimum
        rect.height = template.constraints.cellMinHeight * template.rows;
      }
    }
    return rect;
  }, [state.activeTemplate]);

  // Rule-based system pack suggestion (NO ML)
  const suggestSystemPackByRule = useCallback((template: EgyptianTemplate): string => {
    // Deterministic rules based on template characteristics
    if (template.rows > 3 || template.cols > 3) {
      return 'caluminium_ps_v3'; // Heavy-duty for large grids
    }
    
    if (template.cellTypes.flat().includes('tilt-turn')) {
      return 'caluminium_ps_v3'; // Tilt-turn requires specific hardware
    }
    
    // Default to standard system
    return 'caluminium_ps_v3';
  }, []);

  // Constitutional Validation Gate
  const validateDesign = useCallback(async (): Promise<ValidationResult> => {
    const validationId = `DRAFT-VALIDATE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const checkpoint = `CHECKPOINT-VALIDATION-${validationId}`;
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 1. Dimension Validation
    const dimValidation = validateDimensions(state.geometry);
    if (!dimValidation.valid) {
      errors.push(...dimValidation.errors);
    }
    warnings.push(...dimValidation.warnings);
    
    // 2. Egyptian Template Matching (Deterministic)
    const templateMatch = validateAgainstEgyptianTemplates(
      state.geometry,
      EGYPTIAN_TEMPLATES
    );
    
    if (!templateMatch.found) {
      warnings.push(`No exact Egyptian template match. ${templateMatch.closest ? `Closest: ${templateMatch.closest.name}` : ''}`);
    }
    
    // 3. Cell Type Validation
    const cellTypes = state.geometry.rectangles.map(r => r.type);
    const hasInvalidTypes = cellTypes.some(type => 
      type && !['fixed', 'casement', 'tilt-turn', 'pivot', 'sash', 'panel', 'sliding'].includes(type)
    );
    
    if (hasInvalidTypes) {
      errors.push('Invalid cell type detected');
    }
    
    // 4. Area Constraints
    const totalArea = state.geometry.rectangles.reduce(
      (sum, rect) => sum + (rect.width * rect.height), 
      0
    );
    
    if (totalArea > 10000000) { // 10m² limit
      warnings.push('Total area exceeds typical manufacturing limits');
    }
    
    // Determine if valid
    const isValid = errors.length === 0;
    
    const result: ValidationResult = {
      valid: isValid,
      errors,
      warnings,
      issues: [...errors, ...warnings],
      data: isValid ? {
        template: templateMatch.found ? templateMatch.template! : (templateMatch.closest || EGYPTIAN_TEMPLATES[0]),
        suggestedSystemPack: templateMatch.found 
          ? suggestSystemPackByRule(templateMatch.template!)
          : 'caluminium_ps_v3', // Default fallback
        validationId
      } : undefined,
      tier: 'Tier 1',
      requiresHumanReview: warnings.length > 0
    };

    // Constitutional audit logging - CRITICAL CHECKPOINT
    logDraftingAction(
      'validation_requested',
      { 
        geometry: { 
          rectangleCount: state.geometry.rectangles.length,
          totalArea 
        } 
      },
      { 
        valid: isValid, 
        errorCount: errors.length,
        warningCount: warnings.length,
        tier: 'Tier 1',
        validationId
      },
      checkpoint
    );
    
    return result;
  }, [state.geometry, suggestSystemPackByRule]);

  // Getters
  const getGeometry = useCallback((): Geometry2D => state.geometry, [state.geometry]);
  const getDimensions = useCallback((): Dimension[] => state.dimensions, [state.dimensions]);
  const getAnnotations = useCallback(() => state.annotations, [state.annotations]);
  const hasGeometry = useCallback(() => state.geometry.rectangles.length > 0, [state.geometry]);
  const getProperty = useCallback((prop: string) => {
    switch (prop) {
      case 'width': 
        return state.geometry.rectangles.reduce((max, r) => Math.max(max, r.x + r.width), 0) - 
               state.geometry.rectangles.reduce((min, r) => Math.min(min, r.x), Infinity);
      case 'height': 
        return state.geometry.rectangles.reduce((max, r) => Math.max(max, r.y + r.height), 0) - 
               state.geometry.rectangles.reduce((min, r) => Math.min(min, r.y), Infinity);
      default: return 0;
    }
  }, [state.geometry]);
  
  const setProperty = useCallback((prop: string, value: number) => {
    if (prop === 'width' || prop === 'height') {
      setState(prev => ({
        ...prev,
        geometry: {
          ...prev.geometry,
          rectangles: prev.geometry.rectangles.map(rect => {
            if (prop === 'width') {
              const scale = value / (rect.width || 1);
              return { ...rect, width: value, height: rect.height * scale };
            } else {
              const scale = value / (rect.height || 1);
              return { ...rect, height: value, width: rect.width * scale };
            }
          })
        }
      }));
    }
  }, []);

  const getActiveTemplate = useCallback(() => state.activeTemplate?.id || '', [state.activeTemplate]);
  const setTemplate = useCallback((templateId: string) => {
    const template = EGYPTIAN_TEMPLATES.find(t => t.id === templateId);
    setState(prev => ({ ...prev, activeTemplate: template || null }));

    // Constitutional audit logging
    if (template) {
      logDraftingAction(
        'template_selected',
        { templateId },
        { templateName: template.name, rows: template.rows, cols: template.cols },
        'CHECKPOINT-TEMPLATE-SELECT'
      );
    }
  }, []);

  const getAvailableTemplates = useCallback(() => EGYPTIAN_TEMPLATES, []);

  const selectElement = useCallback((index: number) => {
    setState(prev => ({ ...prev, selectedElement: index }));
  }, []);
  
  const selectElementAt = useCallback((point: Point) => {
    // Find rectangle containing point
    const index = state.geometry.rectangles.findIndex(rect => 
      point.x >= rect.x && 
      point.x <= rect.x + rect.width &&
      point.y >= rect.y && 
      point.y <= rect.y + rect.height
    );
    if (index >= 0) {
      setState(prev => ({ ...prev, selectedElement: index }));
    }
  }, [state.geometry]);
  
  const deleteSelected = useCallback(() => {
    if (state.selectedElement !== null) {
      const deletedRect = state.geometry.rectangles[state.selectedElement];
      
      setState(prev => ({
        ...prev,
        geometry: {
          ...prev.geometry,
          rectangles: prev.geometry.rectangles.filter((_, i) => i !== state.selectedElement)
        },
        selectedElement: null
      }));

      // Constitutional audit logging
      if (deletedRect) {
        logDraftingAction(
          'rectangle_deleted',
          { id: deletedRect.id, index: state.selectedElement },
          { rectangleCount: state.geometry.rectangles.length - 1 },
          'CHECKPOINT-RECTANGLE-DELETE'
        );
      }
    }
  }, [state.selectedElement, state.geometry]);
  
  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedElement: null }));
  }, []);
  
  const isSelected = useCallback((index: number) => state.selectedElement === index, [state.selectedElement]);
  
  const getPreviewPoint = useCallback(() => state.previewPoint, [state.previewPoint]);
  
  const highlightIssues = useCallback((issues: string[]) => {
    console.log('Highlighting issues:', issues);
    // Implementation for visual issue highlighting
  }, []);
  
  const previewRectangle = useCallback((rect: Rectangle) => {
    setPreviewRect(rect);
  }, []);

  return {
    // State
    state,
    
    // Operations
    addRectangle,
    startDimension,
    previewDimension,
    snapToGrid,
    validateAgainstTemplates,
    validateDesign,
    
    // Getters
    getGeometry,
    getDimensions,
    getAnnotations,
    hasGeometry,
    getProperty,
    setProperty,
    getActiveTemplate,
    setTemplate,
    getAvailableTemplates,
    
    // Selection
    selectElement,
    selectElementAt,
    deleteSelected,
    clearSelection,
    isSelected,
    getPreviewPoint,
    highlightIssues,
    previewRectangle,
    
    // Preview
    previewRect
  };
};


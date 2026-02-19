// src/components/fabricator/drafting/hooks/useDraftingEngine.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { BlockManager, type BlockDefinition, type BlockInstance } from '../types/blocks';
import {
    Annotation,
    Arc,
    Circle,
    Dimension,
    DraftingState,
    EgyptianTemplate,
    Geometry2D,
    Line,
    Point,
    Polygon,
    Rectangle,
    Spline,
    ValidationResult
} from '../types/drafting';
import { DEFAULT_LAYERS, LayerManager, type Layer } from '../types/layers';
import type { HardwarePlacement, MaterialAwareRectangle, StructuralElement } from '../types/materialAware';
import type { GridCell, ManualMullion, WindowGrid } from '@/types/fabricator';
import { logDraftingAction } from '../utils/constitutionalAudit';
import { validateDimensions } from '../utils/dimensionValidator';
import { validateAgainstEgyptianTemplates } from '../utils/egyptianTemplateMatcher';
import { EXPANDED_EGYPTIAN_TEMPLATES } from '../utils/egyptianTemplates';
import {
    applyChamfer,
    applyFillet
} from '../utils/filletChamferUtils';
import {
    SAFETY_LIMITS,
    ValidationError,
    validateArc,
    validateCircle,
    validateLine,
    validatePolygon,
    validateRectangle,
    validateSpline
} from '../utils/inputValidator';
import { calculateMeasurement } from '../utils/measurementUtils';
import {
    offsetArc,
    offsetLine,
    offsetPolygon,
    offsetRectangle
} from '../utils/offsetUtils';
import {
    createCircularArray,
    createLinearArray,
    createOffsetPattern,
    createRectangularArray,
    getAccuracyMetrics
} from '../utils/patternUtils';
import { getDefaultMaterialSpec, getMaterialSpec } from '../utils/materialSpecs';
import { snapToGrid as snapToGridUtil } from '../utils/snapUtils';
import { getGeometryCenter, transformGeometry } from '../utils/transformUtils';
import {
    extendLineToLine,
    trimLineToLine
} from '../utils/trimExtendUtils';
import { UndoRedoManager } from '../utils/undoRedoManager';

const INITIAL_STATE: DraftingState = {
  geometry: {
    rectangles: [],
    points: [],
    lines: [],
    circles: [],
    arcs: [],
    polygons: [],
    splines: []
  },
  dimensions: [],
  annotations: [],
  selectedElement: null,
  selectedElements: [], // Multi-selection support
  activeTemplate: null,
  previewPoint: null,
  // Material-aware extensions
  hardware: [],
  structuralElements: [],
  materialAwareWindows: [],
  materialWindowGrids: {},
  materialWindowGlazing: {},
  // Layers system
  layers: [...DEFAULT_LAYERS],
  activeLayerId: 'frame', // Default to frame layer
  // Blocks system
  blockDefinitions: [],
  blockInstances: [],
  placingBlockId: null
};

// Egyptian Templates Database (Deterministic, Rule-Based)
// Expanded from 4 to 50+ templates covering all common Egyptian patterns
const EGYPTIAN_TEMPLATES: EgyptianTemplate[] = EXPANDED_EGYPTIAN_TEMPLATES;

export const useDraftingEngine = (options?: {
  initialTemplate?: string;
  onStateChange?: (state: DraftingState) => void;
}) => {
  const [state, setState] = useState<DraftingState>(INITIAL_STATE);
  const [previewRect, setPreviewRect] = useState<Rectangle | null>(null);
  const undoRedoManager = useRef(new UndoRedoManager());
  const isUndoRedoOperation = useRef(false);
  
  // Initialize undo/redo with initial state
  useEffect(() => {
    undoRedoManager.current.initialize(INITIAL_STATE);
  }, []);
  
  // Save state on change (but not during undo/redo operations)
  useEffect(() => {
    if (!isUndoRedoOperation.current) {
      options?.onStateChange?.(state);
    }
    isUndoRedoOperation.current = false;
  }, [state, options]);

  // Undo/Redo operations
  const undo = useCallback(() => {
    const previousState = undoRedoManager.current.undo();
    if (previousState) {
      isUndoRedoOperation.current = true;
      setState(previousState);
      logDraftingAction('undo', {}, { historySize: undoRedoManager.current.getHistorySize() }, 'CHECKPOINT-UNDO');
    }
  }, []);

  const redo = useCallback(() => {
    const nextState = undoRedoManager.current.redo();
    if (nextState) {
      isUndoRedoOperation.current = true;
      setState(nextState);
      logDraftingAction('redo', {}, { historySize: undoRedoManager.current.getHistorySize() }, 'CHECKPOINT-REDO');
    }
  }, []);

  const canUndo = useCallback(() => undoRedoManager.current.canUndo(), []);
  const canRedo = useCallback(() => undoRedoManager.current.canRedo(), []);

  // Core Operations
  const addRectangle = useCallback((rect: Rectangle) => {
    const activeLayer = state.activeLayerId || LayerManager.getDefaultLayer(state.layers).id;
    const rectWithId = { 
      ...rect, 
      id: `rect-${Date.now()}-${Math.random()}`,
      layerId: activeLayer
    };
    
    setState(prev => {
      // Push current state to history before making changes
      undoRedoManager.current.push(prev);
      
      return {
        ...prev,
        geometry: {
          ...prev.geometry,
          rectangles: [...prev.geometry.rectangles, rectWithId]
        }
      };
    });

    // Constitutional audit logging
    logDraftingAction(
      'rectangle_added',
      { x: rect.x, y: rect.y, width: rect.width, height: rect.height, type: rect.type },
      { id: rectWithId.id },
      'CHECKPOINT-RECTANGLE-ADD'
    );
  }, [state.activeLayerId, state.layers]);

  const addLine = useCallback((line: Line) => {
    try {
      // Validate and sanitize input
      const validatedLine = validateLine(line);
      
      // Check total element count
      const currentCount = state.geometry.rectangles.length +
        state.geometry.circles.length +
        state.geometry.lines.length +
        state.geometry.arcs.length +
        state.geometry.polygons.length;
      
      if (currentCount >= SAFETY_LIMITS.MAX_ELEMENTS) {
        throw new ValidationError(
          `Cannot add line: maximum element limit (${SAFETY_LIMITS.MAX_ELEMENTS}) reached`,
          'MAX_ELEMENTS_EXCEEDED'
        );
      }

      const activeLayer = state.activeLayerId || LayerManager.getDefaultLayer(state.layers).id;
      const lineWithId = { 
        ...validatedLine, 
        id: `line-${Date.now()}-${Math.random()}`,
        layerId: activeLayer
      };
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        return {
          ...prev,
          geometry: {
            ...prev.geometry,
            lines: [...prev.geometry.lines, lineWithId]
          }
        };
      });

      logDraftingAction(
        'line_added',
        { start: validatedLine.start, end: validatedLine.end },
        { id: lineWithId.id },
        'CHECKPOINT-LINE-ADD'
      );
    } catch (error) {
      console.error('Error adding line:', error);
      logDraftingAction(
        'line_add_failed',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        {},
        'CHECKPOINT-LINE-ADD-FAIL'
      );
      throw error;
    }
  }, [state.geometry, state.activeLayerId, state.layers]);

  const addCircle = useCallback((circle: Circle) => {
    try {
      // Validate and sanitize input
      const validatedCircle = validateCircle(circle);
      
      // Check total element count
      const currentCount = state.geometry.rectangles.length +
        state.geometry.circles.length +
        state.geometry.lines.length +
        state.geometry.arcs.length +
        state.geometry.polygons.length;
      
      if (currentCount >= SAFETY_LIMITS.MAX_ELEMENTS) {
        throw new ValidationError(
          `Cannot add circle: maximum element limit (${SAFETY_LIMITS.MAX_ELEMENTS}) reached`,
          'MAX_ELEMENTS_EXCEEDED'
        );
      }

      const activeLayer = state.activeLayerId || LayerManager.getDefaultLayer(state.layers).id;
      const circleWithId = { 
        ...validatedCircle, 
        id: `circle-${Date.now()}-${Math.random()}`,
        layerId: activeLayer
      };
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        return {
          ...prev,
          geometry: {
            ...prev.geometry,
            circles: [...prev.geometry.circles, circleWithId]
          }
        };
      });

      logDraftingAction(
        'circle_added',
        { cx: validatedCircle.cx, cy: validatedCircle.cy, r: validatedCircle.r },
        { id: circleWithId.id },
        'CHECKPOINT-CIRCLE-ADD'
      );
    } catch (error) {
      console.error('Error adding circle:', error);
      logDraftingAction(
        'circle_add_failed',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        {},
        'CHECKPOINT-CIRCLE-ADD-FAIL'
      );
      throw error;
    }
  }, [state.geometry, state.activeLayerId, state.layers]);

  const addArc = useCallback((arc: Arc) => {
    try {
      // Validate and sanitize input
      const validatedArc = validateArc(arc);
      
      // Check total element count
      const currentCount = state.geometry.rectangles.length +
        state.geometry.circles.length +
        state.geometry.lines.length +
        state.geometry.arcs.length +
        state.geometry.polygons.length;
      
      if (currentCount >= SAFETY_LIMITS.MAX_ELEMENTS) {
        throw new ValidationError(
          `Cannot add arc: maximum element limit (${SAFETY_LIMITS.MAX_ELEMENTS}) reached`,
          'MAX_ELEMENTS_EXCEEDED'
        );
      }

      const activeLayer = state.activeLayerId || LayerManager.getDefaultLayer(state.layers).id;
      const arcWithId = { 
        ...validatedArc, 
        id: `arc-${Date.now()}-${Math.random()}`,
        layerId: activeLayer
      };
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        return {
          ...prev,
          geometry: {
            ...prev.geometry,
            arcs: [...prev.geometry.arcs, arcWithId]
          }
        };
      });

      logDraftingAction(
        'arc_added',
        { cx: validatedArc.cx, cy: validatedArc.cy, r: validatedArc.r, startAngle: validatedArc.startAngle, endAngle: validatedArc.endAngle },
        { id: arcWithId.id },
        'CHECKPOINT-ARC-ADD'
      );
    } catch (error) {
      console.error('Error adding arc:', error);
      logDraftingAction(
        'arc_add_failed',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        {},
        'CHECKPOINT-ARC-ADD-FAIL'
      );
      throw error;
    }
  }, [state.geometry, state.activeLayerId, state.layers]);

  const addPolygon = useCallback((polygon: Polygon) => {
    try {
      // Validate and sanitize input
      const validatedPolygon = validatePolygon(polygon);
      
      // Check total element count
      const currentCount = state.geometry.rectangles.length +
        state.geometry.circles.length +
        state.geometry.lines.length +
        state.geometry.arcs.length +
        state.geometry.polygons.length;
      
      if (currentCount >= SAFETY_LIMITS.MAX_ELEMENTS) {
        throw new ValidationError(
          `Cannot add polygon: maximum element limit (${SAFETY_LIMITS.MAX_ELEMENTS}) reached`,
          'MAX_ELEMENTS_EXCEEDED'
        );
      }

      const activeLayer = state.activeLayerId || LayerManager.getDefaultLayer(state.layers).id;
      const polygonWithId = { 
        ...validatedPolygon, 
        id: `polygon-${Date.now()}-${Math.random()}`,
        layerId: activeLayer
      };
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        return {
          ...prev,
          geometry: {
            ...prev.geometry,
            polygons: [...prev.geometry.polygons, polygonWithId]
          }
        };
      });

      logDraftingAction(
        'polygon_added',
        { pointCount: validatedPolygon.points.length, closed: validatedPolygon.closed },
        { id: polygonWithId.id },
        'CHECKPOINT-POLYGON-ADD'
      );
    } catch (error) {
      console.error('Error adding polygon:', error);
      logDraftingAction(
        'polygon_add_failed',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        {},
        'CHECKPOINT-POLYGON-ADD-FAIL'
      );
      throw error;
    }
  }, [state.geometry, state.activeLayerId, state.layers]);

  const addSpline = useCallback((spline: Spline) => {
    try {
      // Validate and sanitize input
      const validatedSpline = validateSpline(spline);

      // Check total element count
      const currentCount = state.geometry.rectangles.length +
        state.geometry.circles.length +
        state.geometry.lines.length +
        state.geometry.arcs.length +
        state.geometry.polygons.length +
        state.geometry.splines.length;

      if (currentCount >= SAFETY_LIMITS.MAX_ELEMENTS) {
        throw new ValidationError(
          `Cannot add spline: maximum element limit (${SAFETY_LIMITS.MAX_ELEMENTS}) reached`,
          'MAX_ELEMENTS_EXCEEDED'
        );
      }

      const activeLayer = state.activeLayerId || LayerManager.getDefaultLayer(state.layers).id;
      const splineWithId = {
        ...validatedSpline,
        id: `spline-${Date.now()}-${Math.random()}`,
        layerId: activeLayer
      };

      setState(prev => {
        undoRedoManager.current.push(prev);

        return {
          ...prev,
          geometry: {
            ...prev.geometry,
            splines: [...prev.geometry.splines, splineWithId]
          }
        };
      });

      logDraftingAction(
        'spline_added',
        { controlPointCount: validatedSpline.controlPoints.length, closed: validatedSpline.closed },
        { id: splineWithId.id },
        'CHECKPOINT-SPLINE-ADD'
      );
    } catch (error) {
      console.error('Error adding spline:', error);
      logDraftingAction(
        'spline_add_failed',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        {},
        'CHECKPOINT-SPLINE-ADD-FAIL'
      );
      throw error;
    }
  }, [state.geometry, state.activeLayerId, state.layers]);

  const addAnnotation = useCallback((annotation: Annotation) => {
    const annotationWithId = { ...annotation, id: annotation.id || `annotation-${Date.now()}-${Math.random()}` };
    
    setState(prev => {
      undoRedoManager.current.push(prev);
      
      return {
        ...prev,
        annotations: [...prev.annotations, annotationWithId]
      };
    });

    logDraftingAction(
      'annotation_added',
      { text: annotation.text, position: annotation.position },
      { id: annotationWithId.id },
      'CHECKPOINT-ANNOTATION-ADD'
    );
  }, []);

  // Material-aware methods
  const addHardware = useCallback((hardware: HardwarePlacement) => {
    const hardwareWithId = { ...hardware, id: hardware.id || `hardware-${Date.now()}-${Math.random()}` };
    
    setState(prev => {
      undoRedoManager.current.push(prev);
      
      return {
        ...prev,
        hardware: [...prev.hardware, hardwareWithId]
      };
    });

    logDraftingAction(
      'hardware_added',
      { type: hardware.type, position: hardware.position },
      { id: hardwareWithId.id },
      'CHECKPOINT-HARDWARE-ADD'
    );
  }, []);

  const addStructuralElement = useCallback((element: StructuralElement) => {
    const elementWithId = { ...element, id: element.id || `structural-${Date.now()}-${Math.random()}` };
    
    setState(prev => {
      undoRedoManager.current.push(prev);
      
      return {
        ...prev,
        structuralElements: [...prev.structuralElements, elementWithId]
      };
    });

    logDraftingAction(
      'structural_element_added',
      { type: element.type, material: element.material, position: element.position },
      { id: elementWithId.id },
      'CHECKPOINT-STRUCTURAL-ADD'
    );
  }, []);

  const addMaterialAwareWindow = useCallback((window: MaterialAwareRectangle) => {
    const windowWithId = { ...window, id: window.id || `material-window-${Date.now()}-${Math.random()}` };
    
    setState(prev => {
      undoRedoManager.current.push(prev);
      
      return {
        ...prev,
        materialAwareWindows: [...prev.materialAwareWindows, windowWithId],
        // Also add to geometry as regular rectangle for rendering
        geometry: {
          ...prev.geometry,
          rectangles: [...prev.geometry.rectangles, {
            x: window.x,
            y: window.y,
            width: window.width,
            height: window.height,
            type: window.type,
            id: windowWithId.id
          }]
        }
      };
    });

    logDraftingAction(
      'material_aware_window_added',
      { 
        material: window.material, 
        systemPack: window.systemPackId,
        dimensions: { width: window.width, height: window.height }
      },
      { id: windowWithId.id },
      'CHECKPOINT-MATERIAL-WINDOW-ADD'
    );
  }, []);

  const convertRectangleToMaterialAware = useCallback((rectIndex: number, systemPackId: string) => {
    if (typeof rectIndex !== 'number' || rectIndex < 0 || !systemPackId || String(systemPackId).trim() === '') return;
    const spec = getMaterialSpec(systemPackId) ?? getDefaultMaterialSpec('aluminum');
    setState(prev => {
      if (rectIndex >= prev.geometry.rectangles.length) return prev;
      const rect = prev.geometry.rectangles[rectIndex];
      if (!rect) return prev;
      const existing = prev.materialAwareWindows.find(mw => mw.id === rect.id);
      if (existing) {
        return {
          ...prev,
          materialAwareWindows: prev.materialAwareWindows.map(mw =>
            mw.id === rect.id ? { ...mw, systemPackId } : mw
          )
        };
      }
      undoRedoManager.current.push(prev);
      const id = rect.id || `material-window-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const mw: MaterialAwareRectangle = {
        ...rect,
        id,
        material: spec.material,
        systemPackId,
        profileDepth: spec.profileDepth,
        glazingPocket: spec.glazingPocket,
        thermalBreak: spec.thermalBreak,
        constraints: { minWidth: 600, maxWidth: 3000, minHeight: 600, maxHeight: 2600 }
      };
      const newRectangles = prev.geometry.rectangles.filter((_, i) => i !== rectIndex);
      newRectangles.push({ x: mw.x, y: mw.y, width: mw.width, height: mw.height, type: mw.type, id });
      return {
        ...prev,
        geometry: { ...prev.geometry, rectangles: newRectangles },
        materialAwareWindows: [...prev.materialAwareWindows, mw]
      };
    });
    logDraftingAction('convert_rectangle_to_material_aware', { rectIndex, systemPackId }, {}, 'CHECKPOINT-CONVERT-MW');
  }, []);

  const resizeFrame = useCallback((rectIndex: number, widthMm: number, heightMm: number) => {
    if (rectIndex < 0 || !Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm <= 0 || heightMm <= 0) return;
    setState(prev => {
      if (rectIndex >= prev.geometry.rectangles.length) return prev;
      const rect = prev.geometry.rectangles[rectIndex];
      if (!rect) return prev;
      const mw = prev.materialAwareWindows.find((w) => w.id === rect.id);
      const minW = mw?.constraints?.minWidth ?? 100;
      const maxW = mw?.constraints?.maxWidth ?? 4000;
      const minH = mw?.constraints?.minHeight ?? 100;
      const maxH = mw?.constraints?.maxHeight ?? 4000;
      const w = Math.min(Math.max(widthMm, minW), maxW);
      const h = Math.min(Math.max(heightMm, minH), maxH);
      undoRedoManager.current.push(prev);
      const newRect = { ...rect, width: w, height: h };
      const newRectangles = [...prev.geometry.rectangles];
      newRectangles[rectIndex] = newRect;
      const newMaterialAwareWindows = mw
        ? prev.materialAwareWindows.map((x) => (x.id === rect.id ? { ...x, width: w, height: h } : x))
        : prev.materialAwareWindows;
      return {
        ...prev,
        geometry: { ...prev.geometry, rectangles: newRectangles },
        materialAwareWindows: newMaterialAwareWindows,
      };
    });
    logDraftingAction('resize_frame', { rectIndex, widthMm, heightMm }, {}, 'CHECKPOINT-RESIZE');
  }, []);

  const addSashToFrame = useCallback((materialWindowId: string) => {
    setState(prev => {
      const frame = prev.materialAwareWindows.find((w) => w.id === materialWindowId);
      if (!frame) return prev;
      undoRedoManager.current.push(prev);
      const grid: WindowGrid = {
        rows: 1,
        cols: 1,
        cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }],
        colWidths: [1],
        rowHeights: [1],
      };
      logDraftingAction('add_sash_to_frame', { materialWindowId }, {}, 'CHECKPOINT-ADD-SASH');
      return {
        ...prev,
        materialWindowGrids: {
          ...(prev.materialWindowGrids ?? {}),
          [materialWindowId]: grid,
        },
      };
    });
  }, []);

  const quickAddTwoSashes = useCallback((materialWindowId: string, orientation: 'horizontal' | 'vertical' = 'horizontal') => {
    setState(prev => {
      const frame = prev.materialAwareWindows.find((w) => w.id === materialWindowId);
      if (!frame) return prev;
      undoRedoManager.current.push(prev);
      const cells: GridCell[] =
        orientation === 'horizontal'
          ? [
              { id: '0-0', row: 0, col: 0, type: 'sash' },
              { id: '0-1', row: 0, col: 1, type: 'sash' },
            ]
          : [
              { id: '0-0', row: 0, col: 0, type: 'sash' },
              { id: '1-0', row: 1, col: 0, type: 'sash' },
            ];
      const grid: WindowGrid = {
        rows: orientation === 'horizontal' ? 1 : 2,
        cols: orientation === 'horizontal' ? 2 : 1,
        cells,
        colWidths: orientation === 'horizontal' ? [1, 1] : [1],
        rowHeights: orientation === 'horizontal' ? [1] : [1, 1],
      };
      logDraftingAction('quick_add_two_sashes', { materialWindowId, orientation }, {}, 'CHECKPOINT-QUICK-2-SASH');
      return {
        ...prev,
        materialWindowGrids: {
          ...(prev.materialWindowGrids ?? {}),
          [materialWindowId]: grid,
        },
      };
    });
  }, []);

  const assignGlazingToSash = useCallback((
    materialWindowId: string,
    cellId: string,
    glazing: { type: 'single' | 'double'; color?: string; georgianBars?: boolean }
  ) => {
    setState(prev => {
      const frame = prev.materialAwareWindows.find((w) => w.id === materialWindowId);
      if (!frame) return prev;
      undoRedoManager.current.push(prev);
      const byFrame = prev.materialWindowGlazing ?? {};
      const byCell = { ...(byFrame[materialWindowId] ?? {}), [cellId]: glazing };
      logDraftingAction('assign_glazing_to_sash', { materialWindowId, cellId, glazing }, {}, 'CHECKPOINT-GLAZING');
      return {
        ...prev,
        materialWindowGlazing: { ...byFrame, [materialWindowId]: byCell },
      };
    });
  }, []);

  /** Duplicate plain rectangle with 30mm offset. Gold-tier: preserves dimensions, undo support. */
  const duplicateRectangle = useCallback((rectIndex: number) => {
    if (rectIndex < 0) return;
    setState(prev => {
      if (rectIndex >= prev.geometry.rectangles.length) return prev;
      const rect = prev.geometry.rectangles[rectIndex];
      if (!rect) return prev;
      const isMaterialAware = prev.materialAwareWindows.some((mw) => mw.id === rect.id);
      if (isMaterialAware) return prev;
      undoRedoManager.current.push(prev);
      const offset = 30;
      const newId = `rect-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const duplicate: Rectangle = {
        ...rect,
        id: newId,
        x: rect.x + offset,
        y: rect.y + offset,
      };
      logDraftingAction('duplicate_rectangle', { rectIndex }, { duplicate }, 'CHECKPOINT-DUPLICATE');
      return {
        ...prev,
        geometry: {
          ...prev.geometry,
          rectangles: [...prev.geometry.rectangles, duplicate],
        },
      };
    });
  }, []);

  /** Duplicate material-aware frame with grid and glazing. Gold-tier: full fidelity copy, 30mm offset. */
  const duplicateMaterialAwareFrame = useCallback((materialWindowId: string) => {
    setState(prev => {
      const frame = prev.materialAwareWindows.find((w) => w.id === materialWindowId);
      if (!frame) return prev;
      undoRedoManager.current.push(prev);
      const offset = 30;
      const newId = `material-window-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const duplicateMw: MaterialAwareRectangle = {
        ...frame,
        id: newId,
        x: frame.x + offset,
        y: frame.y + offset,
      };
      const newRectangles = [...prev.geometry.rectangles];
      const rectIdx = newRectangles.findIndex((r) => (r).id === materialWindowId);
      if (rectIdx >= 0) {
        newRectangles.push({
          x: duplicateMw.x,
          y: duplicateMw.y,
          width: duplicateMw.width,
          height: duplicateMw.height,
          type: duplicateMw.type,
          id: newId,
        });
      } else {
        newRectangles.push({
          x: duplicateMw.x,
          y: duplicateMw.y,
          width: duplicateMw.width,
          height: duplicateMw.height,
          type: duplicateMw.type,
          id: newId,
        });
      }
      const oldGrid = prev.materialWindowGrids?.[materialWindowId];
      const cellIdMap: Record<string, string> = {};
      const newGrid: WindowGrid | undefined = oldGrid
        ? {
            ...oldGrid,
            cells: oldGrid.cells.map((c) => {
              const newCellId = `${c.row}-${c.col}-${Date.now()}`;
              cellIdMap[c.id] = newCellId;
              return { ...c, id: newCellId };
            }),
            manualMullions: oldGrid.manualMullions?.map((m) => ({
              ...m,
              id: `mullion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            })),
          }
        : undefined;
      const newGrids = { ...(prev.materialWindowGrids ?? {}) };
      if (newGrid) newGrids[newId] = newGrid;
      const oldGlazing = prev.materialWindowGlazing?.[materialWindowId];
      const newGlazingByFrame: Record<string, Record<string, { type: 'single' | 'double'; color?: string; georgianBars?: boolean }>> = {
        ...(prev.materialWindowGlazing ?? {}),
      };
      if (oldGlazing && Object.keys(cellIdMap).length > 0) {
        const newByCell: Record<string, { type: 'single' | 'double'; color?: string; georgianBars?: boolean }> = {};
        for (const [oldCellId, glazing] of Object.entries(oldGlazing)) {
          const newCellId = cellIdMap[oldCellId];
          if (newCellId) newByCell[newCellId] = glazing;
        }
        newGlazingByFrame[newId] = newByCell;
      }
      logDraftingAction('duplicate_material_aware_frame', { materialWindowId, newId }, {}, 'CHECKPOINT-DUPLICATE-MW');
      return {
        ...prev,
        geometry: { ...prev.geometry, rectangles: newRectangles },
        materialAwareWindows: [...prev.materialAwareWindows, duplicateMw],
        materialWindowGrids: newGrids,
        materialWindowGlazing: Object.keys(newGlazingByFrame).length > 0 ? newGlazingByFrame : prev.materialWindowGlazing,
      };
    });
  }, []);

  const addMullionToFrame = useCallback((
    materialWindowId: string,
    mullion: { type: 'vertical' | 'horizontal'; positionMm: number; positionPercent?: number; widthMm?: number; splitType?: 'absolute' | 'proportional' | 'clearance-based' }
  ) => {
    setState(prev => {
      const frame = prev.materialAwareWindows.find((w) => w.id === materialWindowId);
      if (!frame) return prev;
      undoRedoManager.current.push(prev);
      const position = mullion.splitType === 'proportional' && mullion.positionPercent != null ? mullion.positionPercent : mullion.positionMm;
      const newMullion: ManualMullion = {
        id: `mullion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: mullion.type,
        level: 'frame',
        position,
        ...(mullion.widthMm != null && mullion.widthMm > 0 ? { widthMm: mullion.widthMm } : {}),
        ...(mullion.splitType ? { splitType: mullion.splitType } : {}),
      };
      const existing = prev.materialWindowGrids?.[materialWindowId];
      let grid: WindowGrid;
      if (existing) {
        grid = {
          ...existing,
          manualMullions: [...(existing.manualMullions ?? []), newMullion],
        };
      } else {
        grid = {
          rows: 1,
          cols: 1,
          cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }],
          colWidths: [1],
          rowHeights: [1],
          manualMullions: [newMullion],
        };
      }
      logDraftingAction('add_mullion_to_frame', { materialWindowId, mullion: newMullion }, {}, 'CHECKPOINT-ADD-MULLION');
      return {
        ...prev,
        materialWindowGrids: {
          ...(prev.materialWindowGrids ?? {}),
          [materialWindowId]: grid,
        },
      };
    });
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

  const addMeasurement = useCallback((
    start: Point,
    end: Point,
    mode: 'distance' | 'angle' | 'area' | 'perimeter' | 'radius' = 'distance'
  ) => {
    const measurement = calculateMeasurement(start, end, mode, state.geometry);
    
    const dimension: Dimension = {
      id: `dimension-${Date.now()}-${Math.random()}`,
      start,
      end,
      value: measurement.value,
      label: measurement.label,
      unit: measurement.unit as 'mm' | 'cm' | 'm',
      layer: 'dimension',
      mode,
      formatted: measurement.formatted,
      precision: measurement.precision
    };

    setState(prev => {
      undoRedoManager.current.push(prev);
      
      return {
        ...prev,
        dimensions: [...prev.dimensions, dimension]
      };
    });

    logDraftingAction(
      'measurement_added',
      { mode, value: measurement.value, formatted: measurement.formatted },
      { id: dimension.id },
      'CHECKPOINT-MEASUREMENT-ADD'
    );
  }, [state.geometry]);

  const snapToGrid = useCallback((rect: Rectangle): Rectangle => {
    return snapToGridUtil(rect, 5); // 5mm grid
  }, []);

  const validateAgainstTemplates = useCallback((rect: Rectangle): Rectangle => {
    // Validate against active template constraints
    const template = state.activeTemplate;
    if (!template) {
      return rect;
    }

    const next = { ...rect };
    const minWidthByCell = template.constraints.cellMinWidth
      ? template.constraints.cellMinWidth * template.cols
      : 0;
    const minHeightByCell = template.constraints.cellMinHeight
      ? template.constraints.cellMinHeight * template.rows
      : 0;
    const minWidth = Math.max(template.constraints.minWidth, minWidthByCell);
    const minHeight = Math.max(template.constraints.minHeight, minHeightByCell);
    const maxWidth = Math.max(template.constraints.maxWidth, minWidth);
    const maxHeight = Math.max(template.constraints.maxHeight, minHeight);

    next.width = Math.min(Math.max(next.width, minWidth), maxWidth);
    next.height = Math.min(Math.max(next.height, minHeight), maxHeight);

    return next;
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
    await Promise.resolve(); // Satisfy require-await; validation is sync but API returns Promise for callers
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
  const hasGeometry = useCallback(() => 
    state.geometry.rectangles.length > 0 || 
    state.geometry.lines.length > 0 || 
    state.geometry.circles.length > 0 ||
    state.geometry.arcs.length > 0 ||
    state.geometry.polygons.length > 0,
    [state.geometry]
  );
  
  // Material-aware getters
  const getHardware = useCallback((): HardwarePlacement[] => state.hardware, [state.hardware]);
  const getStructuralElements = useCallback((): StructuralElement[] => state.structuralElements, [state.structuralElements]);
  const getMaterialAwareWindows = useCallback((): MaterialAwareRectangle[] => state.materialAwareWindows, [state.materialAwareWindows]);
  const getMaterialWindowGrids = useCallback((): Record<string, import('@/types/fabricator').WindowGrid> => state.materialWindowGrids ?? {}, [state.materialWindowGrids]);
  const getMaterialWindowGlazing = useCallback((): Record<string, Record<string, { type: 'single' | 'double'; color?: string }>> => state.materialWindowGlazing ?? {}, [state.materialWindowGlazing]);
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
  }, [state.geometry.rectangles]);
  
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
    setState(prev => ({ 
      ...prev, 
      selectedElement: index,
      selectedElements: [index] // Also update multi-select
    }));
  }, []);
  
  const selectElements = useCallback((indices: number[]) => {
    setState(prev => ({ 
      ...prev, 
      selectedElements: indices,
      selectedElement: indices.length === 1 ? indices[0] : null // Update single if only one
    }));
    
    logDraftingAction(
      'elements_selected',
      { count: indices.length, indices },
      {},
      'CHECKPOINT-MULTI-SELECT'
    );
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
      setState(prev => ({ 
        ...prev, 
        selectedElement: index,
        selectedElements: [index]
      }));
    }
  }, [state.geometry.rectangles]);
  
  const selectElementsInBox = useCallback((boxStart: Point, boxEnd: Point) => {
    // Use dynamic import to avoid circular dependencies
    Promise.resolve().then(async () => {
      const { findElementsInBox, elementRefsToIndices } = await import('../utils/boxSelectionUtils');
      const elements = findElementsInBox(state.geometry, { start: boxStart, end: boxEnd });
      const indices = elementRefsToIndices(elements, state.geometry);
      
      setState(prev => ({
        ...prev,
        selectedElements: indices,
        selectedElement: indices.length === 1 ? indices[0] : null
      }));
      
      if (indices.length > 0) {
        logDraftingAction(
          'box_selection',
          { count: indices.length, boxStart, boxEnd },
          { indices },
          'CHECKPOINT-BOX-SELECT'
        );
      }
    }).catch(err => {
      console.error('Error in box selection:', err);
    });
  }, [state.geometry]);
  
  const deleteSelected = useCallback(() => {
    if (state.selectedElement !== null) {
      const deletedRect = state.geometry.rectangles[state.selectedElement];
      const deletedId = deletedRect?.id;

      setState(prev => {
        undoRedoManager.current.push(prev);
        const newRectangles = prev.geometry.rectangles.filter((_, i) => i !== prev.selectedElement);
        const newMaterialAwareWindows = deletedId
          ? prev.materialAwareWindows.filter((mw) => mw.id !== deletedId)
          : prev.materialAwareWindows;
        return {
          ...prev,
          geometry: { ...prev.geometry, rectangles: newRectangles },
          materialAwareWindows: newMaterialAwareWindows,
          selectedElement: null
        };
      });

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
  
  const getSelectedElement = useCallback(() => state.selectedElement, [state.selectedElement]);
  
  const getSelectedElements = useCallback(() => state.selectedElements, [state.selectedElements]);
  
  // Update methods for geometry editing
  const updateRectangle = useCallback((index: number, rect: Rectangle) => {
    if (index < 0 || index >= state.geometry.rectangles.length) return;
    
    try {
      const validatedRect = validateRectangle(validateAgainstTemplates(rect));
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        const updated = [...prev.geometry.rectangles];
        updated[index] = validatedRect;
        
        return {
          ...prev,
          geometry: {
            ...prev.geometry,
            rectangles: updated
          }
        };
      });
      
      logDraftingAction(
        'rectangle_updated',
        { index, x: validatedRect.x, y: validatedRect.y, width: validatedRect.width, height: validatedRect.height },
        { id: validatedRect.id },
        'CHECKPOINT-RECTANGLE-UPDATE'
      );
    } catch (error) {
      console.error('Error updating rectangle:', error);
      throw error;
    }
  }, [state.geometry.rectangles.length, validateAgainstTemplates]);
  
  const updateCircle = useCallback((index: number, circle: Circle) => {
    if (index < 0 || index >= state.geometry.circles.length) return;
    
    try {
      const validatedCircle = validateCircle(circle);
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        const updated = [...prev.geometry.circles];
        updated[index] = validatedCircle;
        
        return {
          ...prev,
          geometry: {
            ...prev.geometry,
            circles: updated
          }
        };
      });
      
      logDraftingAction(
        'circle_updated',
        { index, cx: validatedCircle.cx, cy: validatedCircle.cy, r: validatedCircle.r },
        { id: validatedCircle.id },
        'CHECKPOINT-CIRCLE-UPDATE'
      );
    } catch (error) {
      console.error('Error updating circle:', error);
      throw error;
    }
  }, [state.geometry.circles.length]);
  
  const updateLine = useCallback((index: number, line: Line) => {
    if (index < 0 || index >= state.geometry.lines.length) return;
    
    try {
      const validatedLine = validateLine(line);
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        const updated = [...prev.geometry.lines];
        updated[index] = validatedLine;
        
        return {
          ...prev,
          geometry: {
            ...prev.geometry,
            lines: updated
          }
        };
      });
      
      logDraftingAction(
        'line_updated',
        { index, start: validatedLine.start, end: validatedLine.end },
        { id: validatedLine.id },
        'CHECKPOINT-LINE-UPDATE'
      );
    } catch (error) {
      console.error('Error updating line:', error);
      throw error;
    }
  }, [state.geometry.lines.length]);
  
  const updateArc = useCallback((index: number, arc: Arc) => {
    if (index < 0 || index >= state.geometry.arcs.length) return;
    
    try {
      const validatedArc = validateArc(arc);
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        const updated = [...prev.geometry.arcs];
        updated[index] = validatedArc;
        
        return {
          ...prev,
          geometry: {
            ...prev.geometry,
            arcs: updated
          }
        };
      });
      
      logDraftingAction(
        'arc_updated',
        { index, cx: validatedArc.cx, cy: validatedArc.cy, r: validatedArc.r },
        { id: validatedArc.id },
        'CHECKPOINT-ARC-UPDATE'
      );
    } catch (error) {
      console.error('Error updating arc:', error);
      throw error;
    }
  }, [state.geometry.arcs.length]);
  
  const updateHardware = useCallback((index: number, hardware: HardwarePlacement) => {
    if (index < 0 || index >= state.hardware.length) return;
    
    setState(prev => {
      undoRedoManager.current.push(prev);
      
      const updated = [...prev.hardware];
      updated[index] = hardware;
      
      return {
        ...prev,
        hardware: updated
      };
    });
    
    logDraftingAction(
      'hardware_updated',
      { index, type: hardware.type, position: hardware.position },
      { id: hardware.id },
      'CHECKPOINT-HARDWARE-UPDATE'
    );
  }, [state.hardware.length]);
  
  const updateStructuralElement = useCallback((index: number, element: StructuralElement) => {
    if (index < 0 || index >= state.structuralElements.length) return;
    
    setState(prev => {
      undoRedoManager.current.push(prev);
      
      const updated = [...prev.structuralElements];
      updated[index] = element;
      
      return {
        ...prev,
        structuralElements: updated
      };
    });
    
    logDraftingAction(
      'structural_element_updated',
      { index, type: element.type, position: element.position },
      { id: element.id },
      'CHECKPOINT-STRUCTURAL-UPDATE'
    );
  }, [state.structuralElements.length]);
  
  const getPreviewPoint = useCallback(() => state.previewPoint, [state.previewPoint]);
  
  const highlightIssues = useCallback((issues: string[]) => {
    console.log('Highlighting issues:', issues);
    // Implementation for visual issue highlighting
  }, []);
  
  const previewRectangle = useCallback((rect: Rectangle) => {
    setPreviewRect(rect);
  }, []);

  // Transform operations
  const mirrorSelected = useCallback((axis: 'horizontal' | 'vertical') => {
    const geometry = getGeometry();
    if (geometry.rectangles.length === 0 && 
        geometry.circles.length === 0 && 
        geometry.arcs.length === 0 && 
        geometry.polygons.length === 0 &&
        geometry.lines.length === 0) {
      return; // No geometry to transform
    }
    
    const center = getGeometryCenter(geometry);
    const transformed = transformGeometry(geometry, 'mirror', center, { axis });
    
    setState(prev => {
      undoRedoManager.current.push(prev);
      
      return {
        ...prev,
        geometry: transformed
      };
    });

    logDraftingAction(
      'mirror_applied',
      { axis, center },
      { selectedElement: state.selectedElement },
      'CHECKPOINT-MIRROR'
    );
  }, [state.selectedElement, getGeometry]);

  const rotateSelected = useCallback((angle: number) => {
    const geometry = getGeometry();
    if (geometry.rectangles.length === 0 && 
        geometry.circles.length === 0 && 
        geometry.arcs.length === 0 && 
        geometry.polygons.length === 0 &&
        geometry.lines.length === 0) {
      return; // No geometry to transform
    }
    
    const center = getGeometryCenter(geometry);
    const transformed = transformGeometry(geometry, 'rotate', center, { angle });
    
    setState(prev => {
      undoRedoManager.current.push(prev);
      
      return {
        ...prev,
        geometry: transformed
      };
    });

    logDraftingAction(
      'rotate_applied',
      { angle, center },
      { selectedElement: state.selectedElement },
      'CHECKPOINT-ROTATE'
    );
  }, [state.selectedElement, getGeometry]);

  const scaleSelected = useCallback((scaleX: number, scaleY: number = scaleX) => {
    const geometry = getGeometry();
    if (geometry.rectangles.length === 0 && 
        geometry.circles.length === 0 && 
        geometry.arcs.length === 0 && 
        geometry.polygons.length === 0 &&
        geometry.lines.length === 0) {
      return; // No geometry to transform
    }
    
    const center = getGeometryCenter(geometry);
    const transformed = transformGeometry(geometry, 'scale', center, { scaleX, scaleY });
    const constrained = state.activeTemplate
      ? {
          ...transformed,
          rectangles: transformed.rectangles.map(rect => validateRectangle(validateAgainstTemplates(rect)))
        }
      : transformed;
    
    setState(prev => {
      undoRedoManager.current.push(prev);
      
      return {
        ...prev,
        geometry: constrained
      };
    });

    logDraftingAction(
      'scale_applied',
      { scaleX, scaleY, center },
      { selectedElement: state.selectedElement },
      'CHECKPOINT-SCALE'
    );
  }, [state.selectedElement, getGeometry, state.activeTemplate, validateAgainstTemplates]);

  return {
    // State
    state,
    
    // Operations
    addRectangle,
    addLine,
    addCircle,
    addArc,
    addPolygon,
    addSpline,
    addAnnotation,
    startDimension,
    previewDimension,
    snapToGrid,
    validateAgainstTemplates,
    validateDesign,
    
    // Undo/Redo
    undo,
    redo,
    canUndo,
    canRedo,
    
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
    
    // Material-aware getters
    getHardware,
    getStructuralElements,
    getMaterialAwareWindows,
    getMaterialWindowGrids,
    getMaterialWindowGlazing,
    
    // Material-aware operations
    addHardware,
    addStructuralElement,
    addMaterialAwareWindow,
    convertRectangleToMaterialAware,
    resizeFrame,
    addSashToFrame,
    quickAddTwoSashes,
    addMullionToFrame,
    assignGlazingToSash,
    duplicateRectangle,
    duplicateMaterialAwareFrame,

    // Selection
    selectElement,
    selectElements,
    selectElementAt,
    selectElementsInBox,
    deleteSelected,
    clearSelection,
    isSelected,
    getSelectedElement,
    getSelectedElements,
    getPreviewPoint,
    highlightIssues,
    previewRectangle,
    
    // Update operations
    updateRectangle,
    updateCircle,
    updateLine,
    updateArc,
    updateHardware,
    updateStructuralElement,
    
    // Transform operations
    mirrorSelected,
    rotateSelected,
    scaleSelected,
    
    // Enhanced measurement
    addMeasurement,
    
    // Pattern/Array operations
    createRectangularArray: (rows: number, cols: number, rowSpacing: number, colSpacing: number, basePoint?: Point) => {
      const geometry = getGeometry();
      if (geometry.rectangles.length === 0 && 
          geometry.circles.length === 0 && 
          geometry.arcs.length === 0 && 
          geometry.polygons.length === 0 &&
          geometry.lines.length === 0) {
        return null;
      }
      
      const result = createRectangularArray(geometry, {
        rows,
        cols,
        rowSpacing,
        colSpacing,
        basePoint
      });
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        return {
          ...prev,
          geometry: {
            rectangles: [...prev.geometry.rectangles, ...result.geometry.rectangles],
            circles: [...prev.geometry.circles, ...result.geometry.circles],
            lines: [...prev.geometry.lines, ...result.geometry.lines],
            arcs: [...prev.geometry.arcs, ...result.geometry.arcs],
            polygons: [...prev.geometry.polygons, ...result.geometry.polygons],
            points: [...prev.geometry.points, ...result.geometry.points],
            splines: [...prev.geometry.splines, ...(result.geometry.splines || [])]
          }
        };
      });

      logDraftingAction(
        'rectangular_array_created',
        { rows, cols, rowSpacing, colSpacing, accuracy: result.accuracy },
        { validation: result.accuracy.validation },
        'CHECKPOINT-ARRAY-RECT'
      );
      
      return result;
    },
    
    createCircularArray: (center: Point, radius: number, count: number, startAngle?: number) => {
      const geometry = getGeometry();
      if (geometry.rectangles.length === 0 && 
          geometry.circles.length === 0 && 
          geometry.arcs.length === 0 && 
          geometry.polygons.length === 0 &&
          geometry.lines.length === 0) {
        return null;
      }
      
      const result = createCircularArray(geometry, {
        center,
        radius,
        count,
        startAngle
      });
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        return {
          ...prev,
          geometry: {
            rectangles: [...prev.geometry.rectangles, ...result.geometry.rectangles],
            circles: [...prev.geometry.circles, ...result.geometry.circles],
            lines: [...prev.geometry.lines, ...result.geometry.lines],
            arcs: [...prev.geometry.arcs, ...result.geometry.arcs],
            polygons: [...prev.geometry.polygons, ...result.geometry.polygons],
            points: [...prev.geometry.points, ...result.geometry.points],
            splines: [...prev.geometry.splines, ...(result.geometry.splines || [])]
          }
        };
      });

      logDraftingAction(
        'circular_array_created',
        { center, radius, count, accuracy: result.accuracy },
        { validation: result.accuracy.validation },
        'CHECKPOINT-ARRAY-CIRC'
      );
      
      return result;
    },
    
    createLinearArray: (startPoint: Point, endPoint: Point, count: number) => {
      const geometry = getGeometry();
      if (geometry.rectangles.length === 0 && 
          geometry.circles.length === 0 && 
          geometry.arcs.length === 0 && 
          geometry.polygons.length === 0 &&
          geometry.lines.length === 0) {
        return null;
      }
      
      const result = createLinearArray(geometry, {
        startPoint,
        endPoint,
        count
      });
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        return {
          ...prev,
          geometry: {
            rectangles: [...prev.geometry.rectangles, ...result.geometry.rectangles],
            circles: [...prev.geometry.circles, ...result.geometry.circles],
            lines: [...prev.geometry.lines, ...result.geometry.lines],
            arcs: [...prev.geometry.arcs, ...result.geometry.arcs],
            polygons: [...prev.geometry.polygons, ...result.geometry.polygons],
            points: [...prev.geometry.points, ...result.geometry.points],
            splines: [...prev.geometry.splines, ...(result.geometry.splines || [])]
          }
        };
      });

      logDraftingAction(
        'linear_array_created',
        { startPoint, endPoint, count, accuracy: result.accuracy },
        { validation: result.accuracy.validation },
        'CHECKPOINT-ARRAY-LIN'
      );
      
      return result;
    },
    
    createOffsetPattern: (offsetX: number, offsetY: number, count: number) => {
      const geometry = getGeometry();
      if (geometry.rectangles.length === 0 && 
          geometry.circles.length === 0 && 
          geometry.arcs.length === 0 && 
          geometry.polygons.length === 0 &&
          geometry.lines.length === 0) {
        return null;
      }
      
      const result = createOffsetPattern(geometry, {
        offsetX,
        offsetY,
        count
      });
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        return {
          ...prev,
          geometry: {
            rectangles: [...prev.geometry.rectangles, ...result.geometry.rectangles],
            circles: [...prev.geometry.circles, ...result.geometry.circles],
            lines: [...prev.geometry.lines, ...result.geometry.lines],
            arcs: [...prev.geometry.arcs, ...result.geometry.arcs],
            polygons: [...prev.geometry.polygons, ...result.geometry.polygons],
            points: [...prev.geometry.points, ...result.geometry.points],
            splines: [...prev.geometry.splines, ...(result.geometry.splines || [])]
          }
        };
      });

      logDraftingAction(
        'offset_pattern_created',
        { offsetX, offsetY, count, accuracy: result.accuracy },
        { validation: result.accuracy.validation },
        'CHECKPOINT-PATTERN-OFFSET'
      );
      
      return result;
    },
    
    getAccuracyMetrics,
    
    // Preview
    previewRect,
    
    // Layers system methods
    createLayer: useCallback((name: string, color: string) => {
      const result = LayerManager.createLayer(name, color, state.layers);
      if (result.success && result.layer) {
        setState(prev => ({
          ...prev,
          layers: [...prev.layers, result.layer!]
        }));
        
        logDraftingAction(
          'layer_created',
          { layerId: result.layer.id, name },
          { layer: result.layer },
          'CHECKPOINT-LAYER-CREATE'
        );
      }
      return result;
    }, [state.layers]),
    
    deleteLayer: useCallback((layerId: string) => {
      // Don't allow deleting default layers
      const layer = state.layers.find(l => l.id === layerId);
      if (layer && DEFAULT_LAYERS.some(dl => dl.id === layerId)) {
        return { success: false, error: 'Cannot delete default layers' };
      }
      
      // Check if layer is in use
      const geometry = state.geometry;
      const inUse = 
        geometry.rectangles.some(r => r.layerId === layerId) ||
        geometry.lines.some(l => l.layerId === layerId) ||
        geometry.circles.some(c => c.layerId === layerId) ||
        geometry.arcs.some(a => a.layerId === layerId) ||
        geometry.polygons.some(p => p.layerId === layerId);
      
      if (inUse) {
        return { success: false, error: 'Cannot delete layer that is in use' };
      }
      
      setState(prev => ({
        ...prev,
        layers: prev.layers.filter(l => l.id !== layerId),
        activeLayerId: prev.activeLayerId === layerId ? LayerManager.getDefaultLayer(prev.layers).id : prev.activeLayerId
      }));
      
      logDraftingAction(
        'layer_deleted',
        { layerId },
        {},
        'CHECKPOINT-LAYER-DELETE'
      );
      
      return { success: true };
    }, [state.layers, state.geometry]),
    
    updateLayer: useCallback((layerId: string, updates: Partial<Layer>) => {
      setState(prev => ({
        ...prev,
        layers: prev.layers.map(l => 
          l.id === layerId 
            ? { ...l, ...updates, updatedAt: new Date() }
            : l
        )
      }));
      
      logDraftingAction(
        'layer_updated',
        { layerId, updates },
        {},
        'CHECKPOINT-LAYER-UPDATE'
      );
    }, []),
    
    setActiveLayer: useCallback((layerId: string) => {
      const layer = state.layers.find(l => l.id === layerId);
      if (!layer) {
        return { success: false, error: 'Layer not found' };
      }
      
      setState(prev => ({
        ...prev,
        activeLayerId: layerId
      }));
      
      return { success: true };
    }, [state.layers]),
    
    toggleLayerVisibility: useCallback((layerId: string) => {
      setState(prev => ({
        ...prev,
        layers: prev.layers.map(l => 
          l.id === layerId ? { ...l, visible: !l.visible, updatedAt: new Date() } : l
        )
      }));
    }, []),
    
    toggleLayerLock: useCallback((layerId: string) => {
      setState(prev => ({
        ...prev,
        layers: prev.layers.map(l => 
          l.id === layerId ? { ...l, locked: !l.locked, updatedAt: new Date() } : l
        )
      }));
    }, []),
    
    getLayers: useCallback(() => state.layers, [state.layers]),
    getActiveLayer: useCallback(() => {
      return state.layers.find(l => l.id === state.activeLayerId) || LayerManager.getDefaultLayer(state.layers);
    }, [state.layers, state.activeLayerId]),
    
    // Blocks system methods
    createBlockFromSelection: useCallback((name: string, basePoint: Point, category: BlockDefinition['category'] = 'custom') => {
      const selectedIndices = state.selectedElements;
      if (selectedIndices.length === 0) {
        return { success: false, error: 'No elements selected' };
      }
      
      // Extract selected geometry
      const selectedGeometry: Geometry2D = {
        rectangles: [],
        points: [],
        lines: [],
        circles: [],
        arcs: [],

        polygons: [],
        splines: []
      };
      
      let globalIndex = 0;
      
      // Collect selected rectangles
      for (const rect of state.geometry.rectangles) {
        if (selectedIndices.includes(globalIndex)) {
          selectedGeometry.rectangles.push(rect);
        }
        globalIndex++;
      }
      
      // Collect selected circles
      for (const circle of state.geometry.circles) {
        if (selectedIndices.includes(globalIndex)) {
          selectedGeometry.circles.push(circle);
        }
        globalIndex++;
      }
      
      // Collect selected lines
      for (const line of state.geometry.lines) {
        if (selectedIndices.includes(globalIndex)) {
          selectedGeometry.lines.push(line);
        }
        globalIndex++;
      }
      
      // Collect selected arcs
      for (const arc of state.geometry.arcs) {
        if (selectedIndices.includes(globalIndex)) {
          selectedGeometry.arcs.push(arc);
        }
        globalIndex++;
      }
      
      // Collect selected polygons
      for (const polygon of state.geometry.polygons) {
        if (selectedIndices.includes(globalIndex)) {
          selectedGeometry.polygons.push(polygon);
        }
        globalIndex++;
      }
      
      const result = BlockManager.createBlockFromGeometry(
        name,
        selectedGeometry,
        basePoint,
        category,
        state.blockDefinitions
      );
      
      if (result.success && result.block) {
        setState(prev => ({
          ...prev,
          blockDefinitions: [...prev.blockDefinitions, result.block!]
        }));
        
        logDraftingAction(
          'block_created',
          { blockId: result.block.id, name, category },
          { block: result.block },
          'CHECKPOINT-BLOCK-CREATE'
        );
      }
      
      return result;
    }, [state.selectedElements, state.geometry, state.blockDefinitions]),
    
    insertBlock: useCallback((blockId: string, position: Point, scale: { x: number; y: number } = { x: 1, y: 1 }, rotation: number = 0) => {
      const block = BlockManager.getBlockById(state.blockDefinitions, blockId);
      if (!block) {
        return { success: false, error: 'Block not found' };
      }
      
      const scaleValidation = BlockManager.validateScale(scale);
      if (!scaleValidation.valid) {
        return { success: false, error: scaleValidation.error };
      }
      
      const rotationValidation = BlockManager.validateRotation(rotation);
      if (!rotationValidation.valid) {
        return { success: false, error: rotationValidation.error };
      }
      
      const instance: BlockInstance = {
        id: `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        blockDefinitionId: blockId,
        position,
        scale,
        rotation: rotationValidation.normalized || 0,
        layerId: state.activeLayerId || undefined
      };
      
      // Transform and add block geometry to main geometry
      const transformedGeometry = BlockManager.transformBlockGeometry(block, instance);
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        // Update block usage count
        const updatedBlocks = prev.blockDefinitions.map(b => 
          b.id === blockId ? { ...b, usageCount: b.usageCount + 1, updatedAt: new Date() } : b
        );
        
        return {
          ...prev,
          blockInstances: [...prev.blockInstances, instance],
          blockDefinitions: updatedBlocks,
          geometry: {
            rectangles: [...prev.geometry.rectangles, ...transformedGeometry.rectangles],
            points: [...prev.geometry.points, ...transformedGeometry.points],
            lines: [...prev.geometry.lines, ...transformedGeometry.lines],
            circles: [...prev.geometry.circles, ...transformedGeometry.circles],
            arcs: [...prev.geometry.arcs, ...transformedGeometry.arcs],
            polygons: [...prev.geometry.polygons, ...transformedGeometry.polygons],
            splines: [...prev.geometry.splines, ...(transformedGeometry.splines || [])]
          }
        };
      });
      
      logDraftingAction(
        'block_inserted',
        { blockId, instanceId: instance.id, position, scale, rotation },
        { instance },
        'CHECKPOINT-BLOCK-INSERT'
      );
      
      return { success: true, instance };
    }, [state.blockDefinitions, state.activeLayerId]),
    
    getBlockDefinitions: useCallback(() => state.blockDefinitions, [state.blockDefinitions]),
    getBlockInstances: useCallback(() => state.blockInstances, [state.blockInstances]),
    
    addBlock: useCallback((block: BlockDefinition) => {
      // Check for duplicate name
      const existing = state.blockDefinitions.find(b => b.name.toLowerCase() === block.name.toLowerCase());
      if (existing) {
        return { success: false, error: 'Block name already exists' };
      }
      
      setState(prev => {
        undoRedoManager.current.push(prev);
        
        return {
          ...prev,
          blockDefinitions: [...prev.blockDefinitions, block]
        };
      });
      
      logDraftingAction(
        'block_added',
        { blockId: block.id, blockName: block.name },
        { block },
        'CHECKPOINT-BLOCK-ADD'
      );
      
      return { success: true, block };
    }, [state.blockDefinitions]),
    
    deleteBlock: useCallback((blockId: string) => {
      // Check if block is in use
      const inUse = state.blockInstances.some(i => i.blockDefinitionId === blockId);
      if (inUse) {
        return { success: false, error: 'Cannot delete block that is in use' };
      }
      
      setState(prev => ({
        ...prev,
        blockDefinitions: prev.blockDefinitions.filter(b => b.id !== blockId)
      }));
      
      logDraftingAction(
        'block_deleted',
        { blockId },
        {},
        'CHECKPOINT-BLOCK-DELETE'
      );
      
      return { success: true };
    }, [state.blockInstances]),
    
    updateBlock: useCallback((blockId: string, updates: Partial<BlockDefinition>) => {
      setState(prev => ({
        ...prev,
        blockDefinitions: prev.blockDefinitions.map(b => 
          b.id === blockId ? { ...b, ...updates, updatedAt: new Date() } : b
        )
      }));
      
      logDraftingAction(
        'block_updated',
        { blockId, updates },
        {},
        'CHECKPOINT-BLOCK-UPDATE'
      );
    }, []),
    
    // Block placement methods (click-to-place)
    startPlacingBlock: useCallback((blockId: string) => {
      setState(prev => ({
        ...prev,
        placingBlockId: blockId
      }));
    }, []),
    
    cancelPlacingBlock: useCallback(() => {
      setState(prev => ({
        ...prev,
        placingBlockId: null
      }));
    }, []),
    
    getPlacingBlockId: useCallback(() => {
      return state.placingBlockId;
    }, [state.placingBlockId]),
    
    // Trim/Extend methods
    trimLine: useCallback((lineToTrim: Line, cuttingLine: Line) => {
      try {
        if (!lineToTrim || !cuttingLine || !lineToTrim.id) {
          throw new Error('Invalid line to trim');
        }
        
        const result = trimLineToLine(lineToTrim, cuttingLine);
        if (result.trimmed && result.newGeometry) {
          setState(prev => {
            undoRedoManager.current.push(prev);
            const newLines = prev.geometry.lines.map(l => 
              l.id === lineToTrim.id ? result.newGeometry as Line : l
            );
            return {
              ...prev,
              geometry: {
                ...prev.geometry,
                lines: newLines
              }
            };
          });
          
          logDraftingAction(
            'line_trimmed',
            { lineId: lineToTrim.id, intersectionPoint: result.intersectionPoint },
            { id: lineToTrim.id },
            'CHECKPOINT-LINE-TRIM'
          );
        }
        return result;
      } catch (error) {
        console.error('Error trimming line:', error);
        logDraftingAction(
          'line_trim_failed',
          { error: error instanceof Error ? error.message : 'Unknown error' },
          {},
          'CHECKPOINT-LINE-TRIM-FAIL'
        );
        throw error;
      }
    }, []),

    extendLine: useCallback((lineToExtend: Line, targetLine: Line) => {
      try {
        if (!lineToExtend || !targetLine || !lineToExtend.id) {
          throw new Error('Invalid line to extend');
        }
        
        const result = extendLineToLine(lineToExtend, targetLine);
        if (result.trimmed && result.newGeometry) {
          setState(prev => {
            undoRedoManager.current.push(prev);
            const newLines = prev.geometry.lines.map(l => 
              l.id === lineToExtend.id ? result.newGeometry as Line : l
            );
            return {
              ...prev,
              geometry: {
                ...prev.geometry,
                lines: newLines
              }
            };
          });
          
          logDraftingAction(
            'line_extended',
            { lineId: lineToExtend.id, intersectionPoint: result.intersectionPoint },
            { id: lineToExtend.id },
            'CHECKPOINT-LINE-EXTEND'
          );
        }
        return result;
      } catch (error) {
        console.error('Error extending line:', error);
        logDraftingAction(
          'line_extend_failed',
          { error: error instanceof Error ? error.message : 'Unknown error' },
          {},
          'CHECKPOINT-LINE-EXTEND-FAIL'
        );
        throw error;
      }
    }, []),

    // Fillet/Chamfer methods
    applyFilletToLines: useCallback((line1: Line, line2: Line, radius: number) => {
      try {
        if (!line1 || !line2 || !line1.id || !line2.id) {
          throw new Error('Invalid lines for fillet');
        }
        
        const result = applyFillet(line1, line2, radius);
        if (result.success) {
          setState(prev => {
            undoRedoManager.current.push(prev);
            const newLines = prev.geometry.lines.map(l => {
              if (l.id === line1.id) return { ...result.newLines[0], id: l.id };
              if (l.id === line2.id) return { ...result.newLines[1], id: l.id };
              return l;
            });
            const newArcs = result.arc ? [...prev.geometry.arcs, {
              id: `arc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              cx: result.arc.center.x,
              cy: result.arc.center.y,
              r: result.arc.radius,
              startAngle: result.arc.startAngle,
              endAngle: result.arc.endAngle
            }] : prev.geometry.arcs;
            return {
              ...prev,
              geometry: {
                ...prev.geometry,
                lines: newLines,
                arcs: newArcs
              }
            };
          });
          
          logDraftingAction(
            'fillet_applied',
            { line1Id: line1.id, line2Id: line2.id, radius },
            { line1Id: line1.id, line2Id: line2.id },
            'CHECKPOINT-FILLET-APPLY'
          );
        }
        return result;
      } catch (error) {
        console.error('Error applying fillet:', error);
        logDraftingAction(
          'fillet_apply_failed',
          { error: error instanceof Error ? error.message : 'Unknown error' },
          {},
          'CHECKPOINT-FILLET-APPLY-FAIL'
        );
        throw error;
      }
    }, []),

    applyChamferToLines: useCallback((line1: Line, line2: Line, distance1: number, distance2?: number) => {
      try {
        if (!line1 || !line2 || !line1.id || !line2.id) {
          throw new Error('Invalid lines for chamfer');
        }
        
        const result = applyChamfer(line1, line2, distance1, distance2);
        if (result.success) {
          setState(prev => {
            undoRedoManager.current.push(prev);
            const newLines = prev.geometry.lines.map(l => {
              if (l.id === line1.id) return { ...result.newLines[0], id: l.id };
              if (l.id === line2.id) return { ...result.newLines[1], id: l.id };
              return l;
            });
            if (result.chamferLine) {
              newLines.push({
                ...result.chamferLine,
                id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              });
            }
            return {
              ...prev,
              geometry: {
                ...prev.geometry,
                lines: newLines
              }
            };
          });
          
          logDraftingAction(
            'chamfer_applied',
            { line1Id: line1.id, line2Id: line2.id, distance1, distance2 },
            { line1Id: line1.id, line2Id: line2.id },
            'CHECKPOINT-CHAMFER-APPLY'
          );
        }
        return result;
      } catch (error) {
        console.error('Error applying chamfer:', error);
        logDraftingAction(
          'chamfer_apply_failed',
          { error: error instanceof Error ? error.message : 'Unknown error' },
          {},
          'CHECKPOINT-CHAMFER-APPLY-FAIL'
        );
        throw error;
      }
    }, []),

    // Offset method
    offsetGeometry: useCallback((elementId: string, elementType: 'line' | 'rectangle' | 'polygon' | 'arc', distance: number) => {
      try {
        if (!elementId || !elementType || !isFinite(distance)) {
          throw new Error('Invalid offset parameters');
        }
        
        setState(prev => {
          undoRedoManager.current.push(prev);
          
          if (elementType === 'line') {
            const line = prev.geometry.lines.find(l => l.id === elementId);
            if (line) {
              try {
                const offset = offsetLine(line, distance);
                const newLine = {
                  ...offset.left,
                  id: `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                };
                
                logDraftingAction(
                  'line_offset',
                  { elementId, distance, newLineId: newLine.id },
                  { id: elementId },
                  'CHECKPOINT-LINE-OFFSET'
                );
                
                return {
                  ...prev,
                  geometry: {
                    ...prev.geometry,
                    lines: [...prev.geometry.lines, newLine]
                  }
                };
              } catch (error) {
                console.error('Error offsetting line:', error);
                return prev;
              }
            }
          } else if (elementType === 'rectangle') {
            const rect = prev.geometry.rectangles.find(r => r.id === elementId);
            if (rect) {
              try {
                const offsetRect = offsetRectangle(rect, distance);
                const newRect = {
                  ...offsetRect,
                  id: `rect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                };
                
                logDraftingAction(
                  'rectangle_offset',
                  { elementId, distance, newRectId: newRect.id },
                  { id: elementId },
                  'CHECKPOINT-RECT-OFFSET'
                );
                
                return {
                  ...prev,
                  geometry: {
                    ...prev.geometry,
                    rectangles: [...prev.geometry.rectangles, newRect]
                  }
                };
              } catch (error) {
                console.error('Error offsetting rectangle:', error);
                return prev;
              }
            }
          } else if (elementType === 'polygon') {
            const polygon = prev.geometry.polygons.find(p => p.id === elementId);
            if (polygon) {
              try {
                const offsetPoly = offsetPolygon(polygon, distance);
                const newPoly = {
                  ...offsetPoly,
                  id: `polygon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                };
                
                logDraftingAction(
                  'polygon_offset',
                  { elementId, distance, newPolyId: newPoly.id },
                  { id: elementId },
                  'CHECKPOINT-POLYGON-OFFSET'
                );
                
                return {
                  ...prev,
                  geometry: {
                    ...prev.geometry,
                    polygons: [...prev.geometry.polygons, newPoly]
                  }
                };
              } catch (error) {
                console.error('Error offsetting polygon:', error);
                return prev;
              }
            }
          } else if (elementType === 'arc') {
            const arc = prev.geometry.arcs.find(a => a.id === elementId);
            if (arc) {
              try {
                const offsetArcResult = offsetArc(arc, distance);
                const newArc = {
                  ...offsetArcResult,
                  id: `arc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                };
                
                logDraftingAction(
                  'arc_offset',
                  { elementId, distance, newArcId: newArc.id },
                  { id: elementId },
                  'CHECKPOINT-ARC-OFFSET'
                );
                
                return {
                  ...prev,
                  geometry: {
                    ...prev.geometry,
                    arcs: [...prev.geometry.arcs, newArc]
                  }
                };
              } catch (error) {
                console.error('Error offsetting arc:', error);
                return prev;
              }
            }
          }
          
          return prev;
        });
      } catch (error) {
        console.error('Error in offsetGeometry:', error);
        logDraftingAction(
          'offset_failed',
          { error: error instanceof Error ? error.message : 'Unknown error' },
          {},
          'CHECKPOINT-OFFSET-FAIL'
        );
        throw error;
      }
    }, [])
  };
};

export type DraftingEngine = ReturnType<typeof useDraftingEngine>;


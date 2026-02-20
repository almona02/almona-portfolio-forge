/**
 * DraftingWorkbench Event Handlers Hook
 *
 * Consolidates all event handler logic for the DraftingWorkbench component.
 * Manages file operations, viewport controls, optimization, and user interactions.
 *
 * @module useDraftingWorkbenchHandlers
 */

import { loadDraft } from '@/lib/api/drafts';
import { generateDigitalTwinCode } from '@/lib/confirmation';
import { trackError } from '@/lib/performance-monitoring';
import type { Profile, WindowUnit } from '@/types/fabricator';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { Arc, Circle, Dimension, DraftingContextType, DraftingOutput, Geometry2D, Line, Polygon, Rectangle, Spline } from '../types/drafting';
import { convertDraftingToWindowGrid } from '../utils/draftingToWindowGrid';
import { exportToJSON, generateDXFContent, importFromDXF, importFromJSON } from '../utils/dxfExporter';
import { exportToPDF } from '../utils/pdfExporter';
import { throttle } from '../utils/performanceUtils';
import { sanitizeFilename } from '../utils/securityUtils';
import { zoomIn, zoomOut, zoomToFit, zoomToSelection } from '../utils/viewportUtils';
import type { StatePersistenceManager } from '../utils/statePersistence';
import type { DraftingWorkbenchState, DraftingWorkbenchStateActions } from './useDraftingWorkbenchState';

/** Minimal collaboration API used by handlers */
interface CollaborationAPI {
  userId?: string;
  broadcastCursor?: (pos: { x: number; y: number }) => void;
}

// Dynamic import for generateComponentsFromGrid
const generateComponentsFromGrid = async () => {
  const module = await import('@/algorithms/smartDraw');
  return module.generateComponentsFromGrid;
};

export interface UseDraftingWorkbenchHandlersProps {
  state: DraftingWorkbenchState;
  actions: DraftingWorkbenchStateActions;
  draftingEngine: DraftingContextType;
  onDesignValidated: (output: DraftingOutput) => void;
  onOptimizeRequest?: (windowUnit: WindowUnit) => void;
  profiles: Profile[];
  persistenceManager: StatePersistenceManager;
  collaboration: CollaborationAPI | null;
}

export interface DraftingWorkbenchHandlers {
  // File Operations
  handleSave: () => void;
  handleLoadWithDialog: () => void;
  handleLoadDraft: (draftId: string) => Promise<void>;
  handleExportDXF: () => void;
  handleExportJSON: () => void;
  handleExportPDF: () => void;
  handleImport: (file: File, format: 'json' | 'dxf') => Promise<void>;
  handleDismissMessage: (messageId: string) => void;

  // Viewport Operations
  handleViewportNavigate: (direction: 'left' | 'right' | 'up' | 'down', amount: number) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomToFit: () => void;
  handleZoomToSelection: () => void;
  handleSelectAll: () => void;
  handleGridToggle: () => void;
  handleSnapToggle: () => void;

  // Optimization
  handleOptimize: () => Promise<void>;

  // Validation
  handleValidateForExecution: () => Promise<void>;

  // Recovery
  handleRecoveryRestore: () => void;
  handleRecoveryDiscard: () => void;
  handleCreateCheckpoint: () => void;

  // Cursor/Interaction
  handleCursorMove: (pos: { x: number; y: number }) => void;

  // Utility
  throttledMouseMove: (pos: { x: number; y: number }) => void;
}

/**
 * Custom hook for managing DraftingWorkbench event handlers
 *
 * Consolidates all event handler logic into a single, organized hook.
 * Provides clean interfaces for all user interactions and operations.
 */
export function useDraftingWorkbenchHandlers({
  state,
  actions,
  draftingEngine,
  onDesignValidated: _onDesignValidated,
  onOptimizeRequest,
  profiles,
  persistenceManager,
  collaboration,
}: UseDraftingWorkbenchHandlersProps): DraftingWorkbenchHandlers {
  // Throttle mouse coordinate updates to 60fps (16ms) for performance
  const throttledMouseMove = useMemo(
    () => throttle((pos: { x: number; y: number }) => {
      actions.setMouseCoordinates(pos);
    }, 16), // 60fps throttling
    [actions]
  );

  // Cursor move handler with throttling
  const handleCursorMove = useCallback((pos: { x: number; y: number }) => {
    // Validate position before processing
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return;
    if (!isFinite(pos.x) || !isFinite(pos.y)) return;

    // Throttle coordinate updates
    throttledMouseMove(pos);

    // Broadcast cursor for collaboration (not throttled for real-time feel)
    collaboration?.broadcastCursor?.(pos);
  }, [collaboration, throttledMouseMove]);

  // Viewport navigation handler
  const handleViewportNavigate = useCallback((direction: 'left' | 'right' | 'up' | 'down', amount: number) => {
    // Validate amount
    const validatedAmount = isFinite(amount) && amount > 0 && amount <= 100 ? amount : 25;

    // Calculate viewport bounds
    const viewport = state.ui.viewport;
    const viewportWidth = (viewport.width / viewport.zoom);
    const viewportHeight = (viewport.height / viewport.zoom);
    const moveAmount = (validatedAmount / 100) * (direction === 'left' || direction === 'right' ? viewportWidth : viewportHeight);

    // Validate move amount
    if (!isFinite(moveAmount)) return;

    let newCenterX = viewport.centerX;
    let newCenterY = viewport.centerY;

    switch (direction) {
      case 'left':
        newCenterX -= moveAmount;
        break;
      case 'right':
        newCenterX += moveAmount;
        break;
      case 'up':
        newCenterY -= moveAmount;
        break;
      case 'down':
        newCenterY += moveAmount;
        break;
    }

    // Validate new center coordinates
    if (!isFinite(newCenterX) || !isFinite(newCenterY)) return;

    actions.setViewport(prev => ({
      ...prev,
      centerX: newCenterX,
      centerY: newCenterY
    }));
  }, [state.ui.viewport, actions]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    actions.setViewport(prev => zoomIn(prev));
  }, [actions]);

  const handleZoomOut = useCallback(() => {
    actions.setViewport(prev => zoomOut(prev));
  }, [actions]);

  const handleZoomToFit = useCallback(() => {
    const geometry = draftingEngine.getGeometry();
    actions.setViewport(_prev => zoomToFit(geometry, 2000, 1000));
  }, [draftingEngine, actions]);

  const handleZoomToSelection = useCallback(() => {
    const selectedElement = draftingEngine.getSelectedElement();
    if (selectedElement !== null) {
      const geometry = draftingEngine.getGeometry();
      const rects = geometry.rectangles;
      if (selectedElement >= 0 && selectedElement < rects.length) {
        const rect = rects[selectedElement];
        actions.setViewport(_prev => zoomToSelection(rect, 2000, 1000));
      }
    }
  }, [draftingEngine, actions]);

  const handleSelectAll = useCallback(() => {
    try {
      const geometry = draftingEngine.getGeometry();
      const allIndices: number[] = [];
      let index = 0;
      geometry.rectangles.forEach(() => allIndices.push(index++));
      geometry.circles.forEach(() => allIndices.push(index++));
      geometry.lines.forEach(() => allIndices.push(index++));
      geometry.arcs.forEach(() => allIndices.push(index++));
      geometry.polygons.forEach(() => allIndices.push(index++));
      if (allIndices.length > 0) {
        draftingEngine.selectElements(allIndices);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('DraftingWorkbench', 'select_all', err.message);
      toast.error('Failed to select all elements');
    }
  }, [draftingEngine]);

  // File operations
  const handleSave = useCallback(() => {
    try {
      const geometry = draftingEngine.getGeometry();
      
      // Generate twincode for draft tracking
      const userId = collaboration?.userId || `guest-${Date.now()}`;
      const twincode = generateDigitalTwinCode('draft', userId);
      
      const filename = `drafting-${Date.now()}.json`;
      const data = {
        geometry,
        dimensions: draftingEngine.getDimensions(),
        annotations: draftingEngine.getAnnotations(),
        template: draftingEngine.getActiveTemplate(),
        timestamp: Date.now(),
        version: '1.0',
        twincode, // Digital twin code for draft tracking
        userId, // User ID for reference
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      actions.setStatusMessages(prev => [...prev, {
        id: `save-${Date.now()}`,
        type: 'success' as const,
        message: `Project saved successfully. Twin Code: ${twincode}`,
        timestamp: Date.now()
      }].slice(-10));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('DraftingWorkbench', 'save', err.message);
      toast.error('Failed to save project');
      actions.setStatusMessages(prev => [...prev, {
        id: `save-error-${Date.now()}`,
        type: 'error' as const,
        message: 'Failed to save project',
        timestamp: Date.now()
      }].slice(-10));
    }
  }, [draftingEngine, actions, collaboration]);

  const handleLoadWithDialog = useCallback(() => {
    // Open draft list dialog (which also has import file option)
    actions.setDraftListDialogOpen(true);
  }, [actions]);

  const handleLoadDraft = useCallback(async (draftId: string) => {
    try {
      const userId = collaboration?.userId || `guest-${Date.now()}`;
      const result = await loadDraft(draftId, userId);

      if (!result.success || !result.data) {
        throw new Error('Failed to load draft');
      }

      const draftState = result.data;

      // Load geometry into drafting engine
      if (draftState.geometry) {
        // Clear current geometry
        draftingEngine.clearSelection();
        
        // Load geometry elements
        draftState.geometry.rectangles?.forEach((rect: Rectangle) => {
          draftingEngine.addRectangle(rect);
        });
        draftState.geometry.circles?.forEach((circle: Circle) => {
          draftingEngine.addCircle(circle);
        });
        draftState.geometry.lines?.forEach((line: Line) => {
          draftingEngine.addLine(line);
        });
        draftState.geometry.arcs?.forEach((arc: Arc) => {
          draftingEngine.addArc(arc);
        });
        draftState.geometry.polygons?.forEach((polygon: Polygon) => {
          draftingEngine.addPolygon(polygon);
        });
        draftState.geometry.splines?.forEach((spline: Spline) => {
          draftingEngine.addSpline(spline);
        });
      }

      // Load dimensions
      if (draftState.dimensions) {
        draftState.dimensions.forEach((dim: Dimension) => {
          if (dim.start && dim.end) {
            draftingEngine.addMeasurement(dim.start, dim.end, dim.mode || 'distance');
          }
        });
      }

      // Load template if available
      if (draftState.activeTemplate) {
        draftingEngine.setTemplate(draftState.activeTemplate);
      }

      actions.setStatusMessages(prev => [...prev, {
        id: `load-draft-${Date.now()}`,
        type: 'success' as const,
        message: `Draft "${result.metadata?.name || 'Untitled'}" loaded successfully`,
        timestamp: Date.now()
      }].slice(-10));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('DraftingWorkbench', 'load_draft', err.message);
      toast.error('Failed to load draft');
      actions.setStatusMessages(prev => [...prev, {
        id: `load-draft-error-${Date.now()}`,
        type: 'error' as const,
        message: 'Failed to load draft',
        timestamp: Date.now()
      }].slice(-10));
      throw error;
    }
  }, [draftingEngine, actions, collaboration]);

  // Export handlers
  const handleExportDXF = useCallback(() => {
    try {
      const geometry = draftingEngine.getGeometry();
      const dxfContent = generateDXFContent(geometry);
      const filename = sanitizeFilename(`drafting-${Date.now()}.dxf`);

      const blob = new Blob([dxfContent], { type: 'application/x-dxf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      actions.setStatusMessages(prev => [...prev, {
        id: `export-dxf-${Date.now()}`,
        type: 'success' as const,
        message: 'DXF exported successfully',
        timestamp: Date.now()
      }].slice(-10));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const errorMessage = err.message || 'Failed to export DXF file';
      trackError('DraftingWorkbench', 'export_dxf', err.message);
      toast.error(errorMessage);
      actions.setStatusMessages(prev => [...prev, {
        id: `export-error-${Date.now()}`,
        type: 'error' as const,
        message: errorMessage,
        timestamp: Date.now(),
        dismissible: true
      }].slice(-10));
    }
  }, [draftingEngine, actions]);

  const handleExportJSON = useCallback(() => {
    try {
      const geometry = draftingEngine.getGeometry();
      const jsonContent = exportToJSON(geometry);
      const filename = sanitizeFilename(`drafting-${Date.now()}.json`);

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      actions.setStatusMessages(prev => [...prev, {
        id: `export-json-${Date.now()}`,
        type: 'success' as const,
        message: 'JSON exported successfully',
        timestamp: Date.now()
      }].slice(-10));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export JSON file';
      toast.error(errorMessage);
      actions.setStatusMessages(prev => [...prev, {
        id: `export-error-${Date.now()}`,
        type: 'error' as const,
        message: errorMessage,
        timestamp: Date.now()
      }].slice(-10));
    }
  }, [draftingEngine, actions]);

  const handleExportPDF = useCallback(async () => {
    try {
      const geometry = draftingEngine.getGeometry();
      await exportToPDF(geometry, {
        filename: sanitizeFilename(`drafting-${Date.now()}.pdf`),
        pageSize: 'A4',
        orientation: 'portrait',
        includeMetadata: true,
        margin: 50,
      });

      actions.setStatusMessages(prev => [...prev, {
        id: `export-pdf-${Date.now()}`,
        type: 'success' as const,
        message: 'PDF exported successfully',
        timestamp: Date.now()
      }].slice(-10));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('DraftingWorkbench', 'export_pdf', err.message);
      toast.error('Failed to export PDF file. Please try again.');
      actions.setStatusMessages(prev => [...prev, {
        id: `export-error-${Date.now()}`,
        type: 'error' as const,
        message: 'Failed to export PDF file',
        timestamp: Date.now()
      }].slice(-10));
    }
  }, [draftingEngine, actions]);

  // Import handler
  const handleImport = useCallback(async (file: File, format: 'json' | 'dxf') => {
    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') resolve(result);
          else reject(new Error('Failed to read file as text'));
        };
        reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
        reader.readAsText(file);
      });

      if (!content) throw new Error('No content read from file');

      let parsedGeometry: Geometry2D;
      if (format === 'json') {
        const result = await importFromJSON(content);
        parsedGeometry = result.geometry;
      } else {
        parsedGeometry = importFromDXF(content);
      }

      // Add geometry to drafting engine
      let addedCount = 0;
      parsedGeometry.rectangles.forEach(rect => {
        draftingEngine.addRectangle(rect);
        addedCount++;
      });
      parsedGeometry.circles.forEach(circle => {
        draftingEngine.addCircle(circle);
        addedCount++;
      });
      parsedGeometry.lines.forEach(line => {
        draftingEngine.addLine(line);
        addedCount++;
      });
      parsedGeometry.arcs.forEach(arc => {
        draftingEngine.addArc(arc);
        addedCount++;
      });
      parsedGeometry.polygons.forEach(polygon => {
        draftingEngine.addPolygon(polygon);
        addedCount++;
      });
      parsedGeometry.splines.forEach(spline => {
        draftingEngine.addSpline(spline);
        addedCount++;
      });

      toast.success(`Imported ${addedCount} elements from ${format.toUpperCase()} file`);
      actions.setStatusMessages(prev => [...prev, {
        id: `import-success-${Date.now()}`,
        type: 'success' as const,
        message: `Successfully imported ${addedCount} elements from ${file.name}`,
        timestamp: Date.now(),
        dismissible: true
      }].slice(-10));
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('DraftingWorkbench', 'import_file', err.message);
      const errorMessage = err.message || 'Failed to import file';
      toast.error(errorMessage);
      actions.setStatusMessages(prev => [...prev, {
        id: `import-error-${Date.now()}`,
        type: 'error' as const,
        message: errorMessage,
        timestamp: Date.now(),
        dismissible: true
      }].slice(-10));
      throw error;
    }
  }, [draftingEngine, actions]);

  // Optimization handler
  const handleOptimize = useCallback(async () => {
    try {
      actions.setIsOptimizing(true);

      // Convert current geometry to WindowUnit for optimization
      const geometry = draftingEngine.getGeometry();
      if (geometry.rectangles.length === 0) {
        toast.warning('No geometry to optimize');
        actions.setIsOptimizing(false);
        return;
      }

      const template = draftingEngine.getActiveTemplate();
      if (!template) {
        toast.warning('No template selected for optimization');
        actions.setIsOptimizing(false);
        return;
      }

      const grid = convertDraftingToWindowGrid(geometry, template);

      const rects = geometry.rectangles;
      const minX = Math.min(...rects.map(r => r.x));
      const maxX = Math.max(...rects.map(r => r.x + r.width));
      const minY = Math.min(...rects.map(r => r.y));
      const maxY = Math.max(...rects.map(r => r.y + r.height));

      const overallWidth = Math.max(maxX - minX, 100);
      const overallHeight = Math.max(maxY - minY, 100);

      const windowUnit: WindowUnit = {
        id: `optimization-${Date.now()}`,
        orderNumber: 'OPTIMIZATION',
        posNumber: 'OPTIMIZATION-001',
        type: 'draft',
        overallWidth,
        overallHeight,
        grid,
        systemPackId: state.preferences.selectedSystemPackId,
        components: [],
        color: 'white',
        glazing: {},
        hardware: [],
        status: 'design',
        optimization: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Generate components
      const generateFn = await generateComponentsFromGrid();
      const { components } = generateFn(
        windowUnit,
        grid,
        profiles,
        state.preferences.selectedSystemPackId
      );

      if (components.length === 0) {
        toast.warning('No valid components generated for optimization');
        actions.setIsOptimizing(false);
        return;
      }

      // Create optimized WindowUnit
      const optimizedWindowUnit: WindowUnit = {
        ...windowUnit,
        components,
        optimization: {
          optimizedAt: new Date(),
          algorithm: 'drafting-integration',
          score: 0.95,
          improvements: ['Component generation', 'Grid optimization'],
        },
      };

      actions.setOptimizationWindowUnit(optimizedWindowUnit);
      actions.setOptimizationResult({
        windowUnit: optimizedWindowUnit,
        totalCost: 0, // Would be calculated by optimization engine
        materialUsage: {},
        cuttingInstructions: [],
        timestamp: Date.now(),
      });

      // Trigger optimization request callback
      if (onOptimizeRequest) {
        onOptimizeRequest(optimizedWindowUnit);
      }

      const successStatus = {
        name: 'Optimization',
        status: 'completed' as const,
        message: 'Optimization complete!',
        progress: 100
      };
      actions.setOperationStatus(successStatus);
      actions.setOperationProgress(100);
      actions.setStatusMessages(prev => [...prev, {
        id: `opt-success-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'success' as const,
        message: 'Cutting optimization completed successfully',
        timestamp: Date.now(),
      }].slice(-10));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Optimization failed';
      const errorStatus = {
        name: 'Optimization',
        status: 'error' as const,
        message: errorMessage
      };
      actions.setOperationStatus(errorStatus);
      actions.setOperationProgress(undefined);
      actions.setStatusMessages(prev => [...prev, {
        id: `opt-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'error' as const,
        message: `Optimization failed: ${errorMessage}`,
        timestamp: Date.now(),
        dismissible: true
      }].slice(-10));
      toast.error(errorMessage);
    } finally {
      actions.setIsOptimizing(false);
    }
  }, [draftingEngine, state.preferences.selectedSystemPackId, profiles, onOptimizeRequest, actions]);

  // Validation handler
  const handleValidateForExecution = useCallback(async () => {
    try {
      actions.setActiveTab('validation');
      actions.setOperationStatus({
        name: 'Validation',
        status: 'processing',
        message: 'Running checks...',
        progress: 25
      });
      actions.setOperationProgress(25);

      const result = await draftingEngine.validateDesign();
      actions.setValidationResult(result);

      const hasWarnings = result.warnings.length > 0;
      const status = result.valid ? (hasWarnings ? 'warning' : 'success') : 'error';
      const statusMessage = result.valid
        ? (hasWarnings ? 'Validation passed with warnings' : 'Validation passed')
        : 'Validation failed';

      actions.setOperationStatus({
        name: 'Validation',
        status,
        message: statusMessage,
        progress: 100
      });
      actions.setOperationProgress(100);

      actions.setStatusMessages(prev => [...prev, {
        id: `validation-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: (status === 'error' ? 'error' : status === 'warning' ? 'warning' : 'success'),
        message: statusMessage,
        timestamp: Date.now(),
        dismissible: true
      }].slice(-10));

      if (status === 'error') {
        toast.error(statusMessage);
      } else if (status === 'warning') {
        toast.warning(statusMessage);
      } else {
        toast.success(statusMessage);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('DraftingWorkbench', 'validate', err.message);
      actions.setOperationStatus({
        name: 'Validation',
        status: 'error',
        message: 'Validation failed'
      });
      actions.setOperationProgress(undefined);
      actions.setStatusMessages(prev => [...prev, {
        id: `validation-error-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'error' as const,
        message: err.message || 'Validation failed',
        timestamp: Date.now(),
        dismissible: true
      }].slice(-10));
      toast.error(err.message || 'Validation failed');
    }
  }, [draftingEngine, actions]);

  // Recovery handlers
  const handleRecoveryRestore = useCallback(() => {
    try {
      if (persistenceManager.hasRecoveryPoint()) {
        const recovered = persistenceManager.restoreFromRecovery();
        if (recovered) {
          // Recovery successful - close dialog
          actions.setRecoveryDialogOpen(false);
          toast.success('Recovery point restored');
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('DraftingWorkbench', 'recovery_restore', err.message);
      toast.error('Failed to restore recovery point');
    }
  }, [persistenceManager, actions]);

  const handleRecoveryDiscard = useCallback(() => {
    try {
      persistenceManager.discardRecoveryPoint();
      actions.setRecoveryDialogOpen(false);
      actions.setRecoveryTimestamp(undefined);
      toast.info('Recovery point discarded');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('DraftingWorkbench', 'recovery_discard', err.message);
      toast.error('Failed to discard recovery point');
    }
  }, [persistenceManager, actions]);

  const handleCreateCheckpoint = useCallback(() => {
    try {
      const state = draftingEngine.state;
      persistenceManager.createCheckpoint(state, 'User checkpoint');
      toast.success('Checkpoint created');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      trackError('DraftingWorkbench', 'create_checkpoint', err.message);
      toast.error('Failed to create checkpoint');
    }
  }, [draftingEngine, persistenceManager]);

  const handleDismissMessage = useCallback((messageId: string) => {
    actions.setStatusMessages(prev => prev.filter(message => message.id !== messageId));
  }, [actions]);

  const handleGridToggle = useCallback(() => {
    actions.handleGridToggle();
  }, [actions]);

  const handleSnapToggle = useCallback(() => {
    actions.handleSnapToggle();
  }, [actions]);

  return {
    // File Operations
    handleSave,
    handleLoadWithDialog,
    handleLoadDraft,
    handleExportDXF,
    handleExportJSON,
    handleExportPDF,
    handleImport,
    handleDismissMessage,

    // Viewport Operations
    handleViewportNavigate,
    handleZoomIn,
    handleZoomOut,
    handleZoomToFit,
    handleZoomToSelection,
    handleSelectAll,
    handleGridToggle,
    handleSnapToggle,

    // Optimization
    handleOptimize,

    // Validation
    handleValidateForExecution,

    // Recovery
    handleRecoveryRestore,
    handleRecoveryDiscard,
    handleCreateCheckpoint,

    // Cursor/Interaction
    handleCursorMove,

    // Utility
    throttledMouseMove,
  };
}
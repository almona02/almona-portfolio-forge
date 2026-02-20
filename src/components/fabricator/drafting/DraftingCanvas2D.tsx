import { useKeyboard } from '@/hooks/useKeyboard';
import { ConstitutionalProfiler } from '@/lib/performance/ConstitutionalProfiler';
import { DraftingContextMenu } from './components/DraftingContextMenu';
import { AddMullionDialog } from './components/AddMullionDialog';
import { AssignGlazingDialog } from './components/AssignGlazingDialog';
import { AssignSystemPackDialog } from './components/AssignSystemPackDialog';
import { SizeDialog } from './components/SizeDialog';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDraftingContext } from './DraftingContext';
import { OptimizedCanvasManager } from './OptimizedCanvasManager';
import { type OperationInfo, type StatusMessage } from './components/EnhancedStatusBar';
import { ToolPreviewOverlay } from './components/ToolPreviewOverlay';
import { ZoomControls } from './components/ZoomControls';
import type { ContextMenuTarget } from './hooks/useCanvasEvents';
import { useCanvasEvents } from './hooks/useCanvasEvents';
import { EventBatcher } from './performance/EventBatcher';
import { PredictivePreloader } from './performance/PredictivePreloader';
import type { DraftingTool, Line, Point, Viewport } from './types/drafting';
import type { MaterialType } from './types/materialAware';
import { getAddSashWarning as getAddSashWarningMsg, getDefineAsFrameWarning as getDefineAsFrameWarningMsg } from './utils/defineAsFrameValidation';
import { validatePoint } from './utils/inputValidator';
import type { PatternType } from './utils/patternUtils';
import { logToolOperation } from './utils/toolAuditTrail';
import {
  DEFAULT_VIEWPORT,
  resetViewport,
  screenToWorld,
  validateViewport,
  zoomIn,
  zoomOut,
  zoomToFit,
  zoomToSelection
} from './utils/viewportUtils';

interface DraftingCanvas2DProps {
  selectedTool?: DraftingTool;
  onToolSelect?: (tool: DraftingTool) => void;
  selectedMaterial?: MaterialType;
  selectedSystemPackId?: string;
  /** External viewport (controlled from parent) */
  viewport?: Viewport;
  /** Callback when viewport changes internally */
  onViewportChange?: (viewport: Viewport) => void;
  operationStatus?: OperationInfo;
  onOperationStatusChange?: (status: OperationInfo | undefined) => void;
  statusMessages?: StatusMessage[];
  onStatusMessageAdd?: (message: StatusMessage) => void;
  operationProgress?: number;
  onOperationProgressChange?: (progress: number | undefined) => void;
  collaborativeUsers?: Array<{ id: string; name: string; cursor?: Point }>;
  currentUserId?: string;
  onCursorMove?: (point: Point) => void;
  onSelectionChange?: (selection: number) => void;
  onMousePositionChange?: (point: Point) => void;
  onGridToggle?: () => void;
  onSnapToggle?: () => void;
  snapSpacing?: number;
  gridVisible?: boolean;
  snapEnabled?: boolean;
  /** Save current design and advance to next pose (quick entry). */
  onMoveToNext?: () => void;
  /** Open pose quick-edit modal (profile color, quantity). */
  onOpenPoseQuickEdit?: () => void;
}


export const DraftingCanvas2D: React.FC<DraftingCanvas2DProps> = ({
  selectedTool: externalSelectedTool,
  onToolSelect: externalOnToolSelect,
  selectedMaterial = 'aluminum',
  selectedSystemPackId,
  viewport: externalViewport,
  onViewportChange,
  // external interaction props removed to fix lints as they are no longer used by EnhancedStatusBar here
  collaborativeUsers: _collaborativeUsers = [],
  currentUserId: _currentUserId,
  onCursorMove: _onCursorMove,
  onSelectionChange: _onSelectionChange,
  onMousePositionChange: _onMousePositionChange,
  snapSpacing: _snapSpacingProp = 5,
  gridVisible: _gridVisibleProp = true,
  snapEnabled: _snapEnabledProp = true,
  onGridToggle: _onGridToggle,
  onSnapToggle: _onSnapToggle,
  onMoveToNext,
  onOpenPoseQuickEdit,
}) => {
  // TIER 0 OPTIMIZATION: Multi-Canvas Manager
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<OptimizedCanvasManager | null>(null);

  // Initialize Canvas Manager
  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize with default viewport
    managerRef.current = new OptimizedCanvasManager(containerRef.current, {
      x: externalViewport?.centerX || 0,
      y: externalViewport?.centerY || 0,
      scale: externalViewport?.zoom || 1,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    });

    // Resize Observer to handle window resizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef.current) {
          const { width, height } = entry.contentRect;
          managerRef.current?.updateDimensions(width, height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      // Cleanup manager if needed
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally run only on mount; externalViewport changes are handled by separate effect (line 117)
  }, []); // Run once on mount

  // Sync Viewport Changes


  // Sync Egyptian Template (Placeholder for state)
  useEffect(() => {
    // In a real scenario, we'd detect the template from the drawing state
    // For now, we default to standard Egyptian sliding if empty
    // managerRef.current?.setEgyptianTemplate('sliding_1x2_window'); 
  }, []);

  // Legacy state for compatibility with existing hooks

  const [, _setInternalSelectedTool] = useState<DraftingTool>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);

  // State Definitions
  const [, setHoveredElementIndex] = useState<number | null>(null);
  const [, setTextInputMode] = useState<{ position: Point; text: string } | null>(null);

  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [splinePoints, setSplinePoints] = useState<Point[]>([]);
  const [arcCenter, setArcCenter] = useState<Point | null>(null);
  const [arcEnd, setArcEnd] = useState<Point | null>(null);
  const [arcStartAngle, setArcStartAngle] = useState<number | null>(null);
  const [, setPatternConfigOpen] = useState(false);
  const [, setPatternType] = useState<PatternType | null>(null);
  const [linearArrayStart, setLinearArrayStart] = useState<Point | null>(null);

  // Block placement state
  const [blockPlacementScale, setBlockPlacementScale] = useState<number>(1.0);
  const [blockPlacementRotation, setBlockPlacementRotation] = useState<number>(0);

  // Edit tool states
  const [trimTargetLine, setTrimTargetLine] = useState<Line | null>(null);
  const [extendTargetLine, setExtendTargetLine] = useState<Line | null>(null);
  const [filletLine1, setFilletLine1] = useState<Line | null>(null);
  const [chamferLine1, setChamferLine1] = useState<Line | null>(null);

  // Rotation state
  const [isRotating, setIsRotating] = useState(false);
  const [rotationStart, setRotationStart] = useState<Point | null>(null);
  const [rotationCenter, setRotationCenter] = useState<Point | null>(null);
  const [rotationStartAngle, setRotationStartAngle] = useState<number | null>(null);

  // Box selection state
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [boxSelectStart, setBoxSelectStart] = useState<Point | null>(null);
  const [boxSelectEnd, setBoxSelectEnd] = useState<Point | null>(null);

  const [internalViewport, setInternalViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const viewport = externalViewport ?? internalViewport;

  const setViewport = useCallback((updater: Viewport | ((prev: Viewport) => Viewport)) => {
    try {
      const newViewport = typeof updater === 'function' ? updater(viewport) : updater;
      // Validate viewport before setting (Phase 3: Code Hardening)
      const validatedViewport = validateViewport(newViewport);

      // Prevent infinite loops and redundant updates
      if (
        Math.abs(validatedViewport.centerX - viewport.centerX) < 0.001 &&
        Math.abs(validatedViewport.centerY - viewport.centerY) < 0.001 &&
        Math.abs(validatedViewport.zoom - viewport.zoom) < 0.001
      ) {
        return;
      }

      if (externalViewport === undefined) {
        setInternalViewport(validatedViewport);
      }
      onViewportChange?.(validatedViewport);
    } catch (error) {
      console.error('Error setting viewport:', error);
      // Fallback to default viewport on error
      const fallbackViewport = validateViewport(DEFAULT_VIEWPORT);
      if (externalViewport === undefined) {
        setInternalViewport(fallbackViewport);
      }
      onViewportChange?.(fallbackViewport);
    }
  }, [externalViewport, viewport, onViewportChange]);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);

  /** Context-sensitive right-click: target element (or null for empty space). */
  const [contextMenuState, setContextMenuState] = useState<{
    open: boolean;
    clientX: number;
    clientY: number;
    target: ContextMenuTarget | null;
  }>({ open: false, clientX: 0, clientY: 0, target: null });

  /** Size dialog: open state and target rect index + current dimensions. */
  const [sizeDialogState, setSizeDialogState] = useState<{
    open: boolean;
    rectIndex: number | null;
    widthMm: number;
    heightMm: number;
  }>({ open: false, rectIndex: null, widthMm: 600, heightMm: 1200 });

  /** Assign System Pack dialog: open state and target rect index. */
  const [assignPackDialogOpen, setAssignPackDialogOpen] = useState(false);
  const [assignPackRectIndex, setAssignPackRectIndex] = useState<number | null>(null);

  /** Add Mullion dialog: open state and target frame id + dimensions. */
  const [addMullionOpen, setAddMullionOpen] = useState(false);
  const [addMullionFrameId, setAddMullionFrameId] = useState<string | null>(null);
  const [addMullionFrameWidthMm, setAddMullionFrameWidthMm] = useState(600);
  const [addMullionFrameHeightMm, setAddMullionFrameHeightMm] = useState(1200);

  /** Assign Glazing dialog (sash cell). */
  const [glazingDialogOpen, setGlazingDialogOpen] = useState(false);
  const [glazingFrameId, setGlazingFrameId] = useState<string | null>(null);
  const [glazingCellId, setGlazingCellId] = useState<string | null>(null);
  const [glazingInitialType, setGlazingInitialType] = useState<'single' | 'double'>('double');
  const [glazingInitialGeorgianBars, setGlazingInitialGeorgianBars] = useState(false);
  const [glazingInitialColor, setGlazingInitialColor] = useState('');

  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 1000, height: 1000 });

  // Track previous externalViewport to prevent infinite loops
  const prevExternalViewportRef = useRef<Viewport | undefined>(externalViewport);

  // Sync external viewport changes to internal state (for canvas size updates)
  useEffect(() => {
    if (externalViewport) {
      // Only update if viewport actually changed (deep comparison for viewport properties)
      const prev = prevExternalViewportRef.current;
      if (!prev ||
        prev.centerX !== externalViewport.centerX ||
        prev.centerY !== externalViewport.centerY ||
        prev.zoom !== externalViewport.zoom) {
        prevExternalViewportRef.current = externalViewport;
        // Only update internal if canvas size changed (viewport prop doesn't include canvas size)
        setInternalViewport((prev: Viewport) => ({
          ...externalViewport,
          width: prev.width,
          height: prev.height
        }));
      }
    } else {
      prevExternalViewportRef.current = undefined;
    }
  }, [externalViewport]);

  // Sync Viewport Changes
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setViewport({
        x: viewport.centerX,
        y: viewport.centerY,
        scale: viewport.zoom,
        width: containerRef.current?.clientWidth || 800,
        height: containerRef.current?.clientHeight || 600
      });
    }
  }, [viewport]);

  const drafting = useDraftingContext();

  // Get layers for rendering removed as it is now handled by the Manager


  // Use external tool selection if provided, otherwise use internal

  const handleToolSelect = useCallback((tool: DraftingTool) => {
    if (externalOnToolSelect) {
      externalOnToolSelect(tool);
    } else {
      _setInternalSelectedTool(tool);
    }
  }, [externalOnToolSelect]);

  // Integrated Keyboard System (Gold Tier)
  useKeyboard({
    'l': { action: () => handleToolSelect('line'), description: 'Line Tool' },
    'c': { action: () => handleToolSelect('circle'), description: 'Circle Tool' },
    'p l': { action: () => handleToolSelect('polygon'), description: 'Polyline' },
    'r e c': { action: () => handleToolSelect('rectangle'), description: 'Rectangle' },
    'r': { action: () => handleToolSelect('rectangle'), description: 'Rectangle' },
    'a': { action: () => handleToolSelect('arc'), description: 'Arc Tool' },
    'm': { action: () => handleToolSelect('mullion'), description: 'Mullion' },
    't': { action: () => handleToolSelect('text'), description: 'Text Tool' },
    'd': { action: () => handleToolSelect('dimension'), description: 'Dimension Tool' },
    'x': { action: () => handleToolSelect('trim'), description: 'Trim' },
    'escape': { action: () => drafting.clearSelection(), description: 'Clear Selection' },
    'delete': { action: () => drafting.deleteSelected(), description: 'Delete Selected' },
    'backspace': { action: () => drafting.deleteSelected(), description: 'Delete Selected' },
  }, { context: 'drafting', enable: true });

  // Track previous canvas size to prevent unnecessary updates
  const prevCanvasSizeRef = useRef<{ width: number; height: number } | null>(null);

  // Update canvas size on mount and resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newSize = { width: rect.width, height: rect.height };

        // Only update if size actually changed (prevent infinite loops)
        const prevSize = prevCanvasSizeRef.current;
        if (prevSize && prevSize.width === newSize.width && prevSize.height === newSize.height) {
          return;
        }

        prevCanvasSizeRef.current = newSize;
        setCanvasSize(newSize);

        // Update viewport width/height while preserving other properties
        if (externalViewport === undefined) {
          setInternalViewport((prev: Viewport) => {
            const newViewport = { ...prev, width: newSize.width, height: newSize.height };
            // Notify parent if callback provided
            onViewportChange?.(newViewport);
            return newViewport;
          });
        } else {
          // If external viewport is provided, only notify parent (don't update internal)
          if (onViewportChange) {
            const newViewport = { ...externalViewport, width: newSize.width, height: newSize.height };
            onViewportChange(newViewport);
          }
        }
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [externalViewport, onViewportChange]);

  // Convert mouse to world coordinates (use actual container size so cursor location is accurate)
  const getSVGPoint = useCallback((clientX: number, clientY: number): Point => {
    try {
      if (!containerRef.current) {
        return { x: 0, y: 0 };
      }

      const rect = containerRef.current.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;

      if (!isFinite(screenX) || !isFinite(screenY)) {
        return { x: 0, y: 0 };
      }

      // Use actual container pixel size so conversion matches the rendered viewport
      const w = rect.width;
      const h = rect.height;
      if (!(w > 0 && h > 0)) {
        return validatePoint({ x: viewport.centerX, y: viewport.centerY });
      }
      const effectiveViewport = { ...viewport, width: w, height: h };
      const worldPoint = screenToWorld(screenX, screenY, effectiveViewport, w, h);
      return validatePoint(worldPoint);
    } catch (error) {
      console.error('Error converting mouse to SVG coordinates:', error);
      return { x: 0, y: 0 };
    }
  }, [viewport]);



  // Handle hardware placement
  const handleHardwarePlacement = (point: Point, tool: DraftingTool) => {
    const geometry = drafting.getGeometry();
    const rectIndex = geometry.rectangles.findIndex(rect =>
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );

    if (rectIndex >= 0) {
      const rect = geometry.rectangles[rectIndex];
      let position: Point;
      let positionFromBottom: number | undefined;
      let positionFromTop: number | undefined;

      switch (tool) {
        case 'handle':
          positionFromBottom = 1100;
          position = { x: rect.x + rect.width / 2, y: Math.max(rect.y + 50, rect.y + rect.height - 1100) };
          break;
        case 'hinge':
          positionFromTop = 150;
          position = { x: rect.x + 50, y: rect.y + 150 };
          break;
        case 'lock':
          position = { x: rect.x + rect.width / 2, y: Math.max(rect.y + 50, rect.y + rect.height - 1100) };
          break;
        case 'roller':
          position = { x: rect.x + rect.width / 2, y: rect.y + rect.height - 50 };
          break;
        default:
          position = point;
      }

      const hardware = {
        id: `hardware-${Date.now()}-${Math.random()}`,
        type: tool as 'hinge' | 'handle' | 'lock' | 'roller',
        position,
        orientation: (tool === 'hinge' ? 'vertical' : 'horizontal'),
        specifications: {
          model: getDefaultHardwareModel(tool),
          egyptianStandard: true,
          positionFromBottom,
          positionFromTop
        }
      };

      drafting.addHardware(hardware);
      logToolOperation(tool, 'place_hardware', { point, rectIndex, hardwareType: tool }, { hardware });
    }
  };

  // Handle structural element placement
  const handleStructuralPlacement = (point: Point, tool: DraftingTool) => {
    const material = selectedMaterial || 'aluminum';
    const geometry = drafting.getGeometry();
    const allRects = geometry.rectangles;
    if (allRects.length === 0) return;

    const minX = Math.min(...allRects.map(r => r.x));
    const maxX = Math.max(...allRects.map(r => r.x + r.width));
    const minY = Math.min(...allRects.map(r => r.y));
    const maxY = Math.max(...allRects.map(r => r.y + r.height));

    let position: number;
    let dimensions: { width: number; height: number; depth: number };

    const hitRect = geometry.rectangles.find(r =>
      point.x >= r.x && point.x <= r.x + r.width &&
      point.y >= r.y && point.y <= r.y + r.height
    );

    let height: number, width: number;

    if (hitRect) {
      height = hitRect.height;
      width = hitRect.width;
    } else {
      height = maxY - minY;
      width = maxX - minX;
    }

    if (tool === 'mullion') {
      position = point.x;
      dimensions = { width: 50, depth: 60, height: height };
    } else {
      position = point.y;
      dimensions = { width: width, depth: 60, height: 50 };
    }

    const span = tool === 'mullion' ? height : width;
    const needsReinforcement = span > (material === 'aluminum' ? 2000 : 1800);

    const element = {
      id: `${tool}-${Date.now()}-${Math.random()}`,
      type: tool as 'mullion' | 'transom',
      material,
      position,
      dimensions,
      structuralType: (needsReinforcement ? 'structural' : 'standard') as 'structural' | 'standard' | 'corner' | 'thermal_break',
      reinforcement: needsReinforcement ? { type: (material === 'aluminum' ? 'aluminum' : 'steel'), dimensions: { width: 20, height: 20 } } : undefined
    };

    drafting.addStructuralElement(element);
    logToolOperation(tool, 'place_structural_element', { point, material, tool }, { element });
  };

  // Get default hardware model name
  const getDefaultHardwareModel = (tool: DraftingTool): string => {
    switch (tool) {
      case 'hinge': return 'Casement Hinge Standard';
      case 'handle': return 'Standard Window Handle';
      case 'lock': return 'Multi-Point Lock';
      case 'roller': return 'Standard Roller';
      default: return 'Standard';
    }
  };

  const {
    handleMouseDown,
    handleMouseMove: handleMouseMoveEvent,
    handleMouseUp,
    handleWheel: originalHandleWheel,
    mousePosition,
    findElementAtPoint,
  } = useCanvasEvents({
    viewport: externalViewport || DEFAULT_VIEWPORT,
    setViewport: (v) => onViewportChange?.(typeof v === 'function' ? v(externalViewport || DEFAULT_VIEWPORT) : v),
    canvasSize,
    selectedTool: externalSelectedTool || 'select',
    selectedMaterial,
    selectedSystemPackId,
    isPanning, setIsPanning,
    panStart, setPanStart,
    isRotating, setIsRotating,
    rotationStart, setRotationStart,
    rotationCenter, setRotationCenter,
    rotationStartAngle, setRotationStartAngle,
    isDrawing, setIsDrawing,
    startPoint, setStartPoint,
    currentPoint, setCurrentPoint,
    arcCenter, setArcCenter,
    arcEnd, setArcEnd,
    arcStartAngle, setArcStartAngle,
    polygonPoints, setPolygonPoints,
    splinePoints, setSplinePoints,
    setTextInputMode,
    blockPlacementScale, setBlockPlacementScale,
    blockPlacementRotation, setBlockPlacementRotation,
    setPatternType,
    setPatternConfigOpen,
    linearArrayStart, setLinearArrayStart,
    trimTargetLine, setTrimTargetLine,
    extendTargetLine, setExtendTargetLine,
    filletLine1, setFilletLine1,
    chamferLine1, setChamferLine1,
    isBoxSelecting, setIsBoxSelecting,
    boxSelectStart, setBoxSelectStart,
    boxSelectEnd, setBoxSelectEnd,
    setHoveredElementIndex,
    drafting,
    getSVGPoint,
    handleHardwarePlacement,
    handleStructuralPlacement,
    logToolOperation,
    svgRef: containerRef,
    onMousePositionChange: _onMousePositionChange
  });

  // TIER 0 PREDICTION ENGINE
  const preloaderRef = useRef<PredictivePreloader | null>(null);

  useEffect(() => {
    if (managerRef.current) {
      preloaderRef.current = new PredictivePreloader(managerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- managerRef.current is intentionally excluded; it's a mutable ref that doesn't trigger re-renders
  }, [managerRef.current]);

  const handleWheelEvent = useCallback((e: React.WheelEvent) => {
    // intercept for prediction
    if (preloaderRef.current && (e.ctrlKey || e.metaKey)) {
      preloaderRef.current.onZoomInteraction(e.deltaY, externalViewport?.zoom || 1);
    }

    // Delegate to standard handler (which expects native WheelEvent, but React wraps it)
    if (originalHandleWheel) {
      originalHandleWheel(e.nativeEvent);
    }
  }, [originalHandleWheel, externalViewport?.zoom]);

  // handleTextSubmit removed as it was only used by the unused onTextSubmit



  // Memoize selected element to avoid repeated calls
  const selectedElement = useMemo(() => drafting.getSelectedElement(), [drafting]);

  // Notify parent of viewport changes
  useEffect(() => {
    if (externalViewport === undefined) {
      onViewportChange?.(viewport);
    }
  }, [viewport, externalViewport, onViewportChange]);

  // Get geometry for zoom handlers
  const geometry = useMemo(() => drafting.getGeometry(), [drafting]);

  // CRITICAL FIX: Sync geometry and material window data (mullions, sash grids) to canvas manager.
  const materialAwareWindows = useMemo(() => drafting.getMaterialAwareWindows?.() ?? [], [drafting]);
  const materialWindowGrids = useMemo(() => drafting.getMaterialWindowGrids?.() ?? {}, [drafting]);
  useEffect(() => {
    if (!managerRef.current) return;
    managerRef.current.setGeometry(geometry);
    managerRef.current.setMaterialWindowData(materialAwareWindows, materialWindowGrids);
  }, [geometry, materialAwareWindows, materialWindowGrids]);

  // Memoize element count calculation
  // Memoize element count calculation (removed unused)

  // Memoize viewport bounds calculation removed as it was only used by culled geometry


  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    setViewport((prev: Viewport) => zoomIn(prev));
  }, [setViewport]);

  const handleZoomOut = useCallback(() => {
    setViewport((prev: Viewport) => zoomOut(prev));
  }, [setViewport]);

  const handleZoomToFit = useCallback(() => {
    setViewport((_prev: Viewport) => zoomToFit(geometry, canvasSize.width, canvasSize.height));
  }, [geometry, canvasSize, setViewport]);

  const handleZoomToSelection = useCallback(() => {
    if (selectedElement === null) return;
    const rects = geometry.rectangles;
    if (selectedElement >= 0 && selectedElement < rects.length) {
      const rect = rects[selectedElement];
      setViewport((_prev: Viewport) => zoomToSelection(rect, canvasSize.width, canvasSize.height));
    }
  }, [selectedElement, geometry, canvasSize, setViewport]);

  const handleResetViewport = useCallback(() => {
    setViewport(resetViewport(canvasSize.width, canvasSize.height));
  }, [canvasSize, setViewport]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      try {
        const point = getSVGPoint(e.clientX, e.clientY);
        const geom = drafting.getGeometry();
        const hitTarget = findElementAtPoint(point, geom);
        setContextMenuState({
          open: true,
          clientX: e.clientX,
          clientY: e.clientY,
          target: hitTarget,
        });
      } catch {
        setContextMenuState({
          open: true,
          clientX: e.clientX,
          clientY: e.clientY,
          target: null,
        });
      }
    },
    [getSVGPoint, drafting, findElementAtPoint]
  );

  const draftingApi = useMemo(
    () => ({
      getGeometry: drafting.getGeometry,
      getMaterialAwareWindows: drafting.getMaterialAwareWindows,
      deleteSelected: drafting.deleteSelected,
      clearSelection: drafting.clearSelection,
      selectElement: drafting.selectElement,
    }),
    [
      drafting.getGeometry,
      drafting.getMaterialAwareWindows,
      drafting.deleteSelected,
      drafting.clearSelection,
      drafting.selectElement,
    ]
  );

  const handleDefineAsFrame = useMemo(() => {
    if (!selectedSystemPackId || !drafting.convertRectangleToMaterialAware) return undefined;
    return (t: ContextMenuTarget) => {
      if (t.type === 'rectangle' && t.rectIndex !== undefined) {
        drafting.convertRectangleToMaterialAware(t.rectIndex, selectedSystemPackId);
      }
    };
  }, [selectedSystemPackId, drafting]);

  const handleContextMenuOpenChange = useCallback((open: boolean) => {
    setContextMenuState((prev) => ({ ...prev, open }));
  }, []);

  const getRectIndexForTarget = useCallback(
    (target: ContextMenuTarget | null): number | null => {
      if (!target || target.type !== 'rectangle') return null;
      if (target.rectIndex !== undefined) return target.rectIndex;
      if (target.materialWindowIndex !== undefined && drafting.getMaterialAwareWindows) {
        const mwList = drafting.getMaterialAwareWindows();
        const mw = mwList[target.materialWindowIndex] as { id?: string } | undefined;
        if (!mw?.id) return null;
        const geom = drafting.getGeometry();
        const rects = (geom.rectangles ?? []) as { id?: string }[];
        const idx = rects.findIndex((r) => r.id === mw.id);
        return idx >= 0 ? idx : null;
      }
      return null;
    },
    [drafting]
  );

  const getDefineAsFrameWarning = useCallback(
    (t: ContextMenuTarget | null): string | null => {
      if (!t || !selectedSystemPackId) return null;
      const rectIndex = getRectIndexForTarget(t);
      if (rectIndex === null) return null;
      const geom = drafting.getGeometry();
      const rects = geom.rectangles ?? [];
      const rect = rects[rectIndex] as { width?: number; height?: number } | undefined;
      const w = rect?.width ?? 0;
      const h = rect?.height ?? 0;
      return getDefineAsFrameWarningMsg(w, h, selectedSystemPackId);
    },
    [selectedSystemPackId, getRectIndexForTarget, drafting]
  );

  const getAddSashWarning = useCallback(
    (t: ContextMenuTarget | null): string | null => {
      if (!t?.id || !drafting.getMaterialAwareWindows) return null;
      const mwList = drafting.getMaterialAwareWindows();
      const frame = mwList.find((w: { id?: string }) => w.id === t.id) as { width?: number; height?: number } | undefined;
      if (!frame) return null;
      return getAddSashWarningMsg(frame.width ?? 0, frame.height ?? 0);
    },
    [drafting]
  );

  const handleDuplicate = useCallback(
    (target: ContextMenuTarget) => {
      if (!target) return;
      if (target.isMaterialAware && target.id) {
        drafting.duplicateMaterialAwareFrame?.(target.id);
      } else if (target.rectIndex !== undefined) {
        drafting.duplicateRectangle?.(target.rectIndex);
      } else if (target.materialWindowIndex !== undefined && drafting.getMaterialAwareWindows) {
        const mwList = drafting.getMaterialAwareWindows();
        const mw = mwList[target.materialWindowIndex] as { id?: string } | undefined;
        if (mw?.id) drafting.duplicateMaterialAwareFrame?.(mw.id);
      }
    },
    [drafting]
  );

  const handleSizeClick = useCallback(
    (target: ContextMenuTarget) => {
      const rectIndex = getRectIndexForTarget(target);
      if (rectIndex === null) return;
      const geom = drafting.getGeometry();
      const rects = geom.rectangles ?? [];
      const rect = rects[rectIndex] as { width?: number; height?: number } | undefined;
      const w = rect?.width ?? 600;
      const h = rect?.height ?? 1200;
      setSizeDialogState({ open: true, rectIndex, widthMm: w, heightMm: h });
    },
    [getRectIndexForTarget, drafting]
  );

  const handleSizeApply = useCallback(
    (widthMm: number, heightMm: number) => {
      const { rectIndex } = sizeDialogState;
      if (rectIndex === null || !drafting.resizeFrame) return;
      drafting.resizeFrame(rectIndex, widthMm, heightMm);
      setSizeDialogState((prev) => ({ ...prev, open: false, rectIndex: null }));
    },
    [sizeDialogState, drafting]
  );

  const handleAssignSystemPackClick = useCallback(
    (target: ContextMenuTarget) => {
      const rectIndex = getRectIndexForTarget(target);
      if (rectIndex === null) return;
      setAssignPackRectIndex(rectIndex);
      setAssignPackDialogOpen(true);
    },
    [getRectIndexForTarget]
  );

  const handleAssignSystemPackSelect = useCallback(
    (systemPackId: string) => {
      if (assignPackRectIndex === null || !drafting.convertRectangleToMaterialAware) return;
      drafting.convertRectangleToMaterialAware(assignPackRectIndex, systemPackId);
      setAssignPackRectIndex(null);
      setAssignPackDialogOpen(false);
    },
    [assignPackRectIndex, drafting]
  );

  const handleAddMullionClick = useCallback(
    (target: ContextMenuTarget) => {
      if (!target?.id || !drafting.getMaterialAwareWindows) return;
      const mwList = drafting.getMaterialAwareWindows();
      const frame = mwList.find((w: { id?: string }) => w.id === target.id) as { width: number; height: number } | undefined;
      if (!frame) return;
      setAddMullionFrameId(target.id);
      setAddMullionFrameWidthMm(frame.width ?? 600);
      setAddMullionFrameHeightMm(frame.height ?? 1200);
      setAddMullionOpen(true);
    },
    [drafting]
  );

  const handleAddMullionApply = useCallback(
    (params: { type: 'vertical' | 'horizontal'; positionMm: number; positionPercent?: number; widthMm?: number; splitType?: 'absolute' | 'proportional' | 'clearance-based' }) => {
      if (addMullionFrameId && drafting.addMullionToFrame) {
        drafting.addMullionToFrame(addMullionFrameId, params);
      }
      setAddMullionFrameId(null);
      setAddMullionOpen(false);
    },
    [addMullionFrameId, drafting]
  );

  const handleAssignGlazingClick = useCallback((target: ContextMenuTarget) => {
    if (target?.targetType !== 'sash' || !target.cellId) return;
    setGlazingFrameId(target.id);
    setGlazingCellId(target.cellId);
    const glazingByFrame = drafting.getMaterialWindowGlazing?.() ?? {};
    const cellGlazing = target.id ? glazingByFrame[target.id]?.[target.cellId] : undefined;
    setGlazingInitialType(cellGlazing?.type ?? 'double');
    setGlazingInitialColor(cellGlazing?.color ?? '');
    setGlazingInitialGeorgianBars(cellGlazing?.georgianBars ?? false);
    setGlazingDialogOpen(true);
  }, [drafting]);

  const handleAssignGlazingApply = useCallback(
    (params: { type: 'single' | 'double'; color?: string; georgianBars?: boolean }) => {
      if (glazingFrameId && glazingCellId && drafting.assignGlazingToSash) {
        drafting.assignGlazingToSash(glazingFrameId, glazingCellId, params);
      }
      setGlazingFrameId(null);
      setGlazingCellId(null);
      setGlazingDialogOpen(false);
    },
    [glazingFrameId, glazingCellId, drafting]
  );

  // Filters omitted as rendering is handled by the Multi-Canvas Manager


  // Event handlers omitted as primary interaction is handled via Canvas Manager and Hook events


  // --- Performance: Event Batching (60fps) ---
  const mouseMoveHandlerRef = useRef(handleMouseMoveEvent);
  useEffect(() => {
    mouseMoveHandlerRef.current = handleMouseMoveEvent;
  }, [handleMouseMoveEvent]);

  const mouseBatcher = useMemo(() => new EventBatcher((e) => {
    mouseMoveHandlerRef.current(e);
  }), []);

  useEffect(() => {
    return () => mouseBatcher.cancel();
  }, [mouseBatcher]);
  // -------------------------------------------

  // Constitutional Profiler integration


  return (
    <ConstitutionalProfiler
      id="DraftingCanvas"
      tier="Tier 0"
      egyptianTemplate="MultiLayer_V1"
    >
      <div
        ref={containerRef}
        className="relative w-full h-full bg-[#303030] overflow-hidden cursor-crosshair select-none"
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => mouseBatcher && mouseBatcher.schedule(e)}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onMouseLeave={() => {
          setIsDrawing(false);
          setIsPanning(false);
          setStartPoint(null);
          setCurrentPoint(null);
          setPanStart(null);
        }}
        onWheel={handleWheelEvent}
        tabIndex={0}
      >
        {/* Canvases are injected here by the Manager */}

        {/* Zoom Controls Overlay */}
        <div className="absolute top-4 right-4 z-20 pointer-events-auto">
          <ZoomControls
            viewport={viewport}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onZoomToFit={handleZoomToFit}
            onZoomToSelection={handleZoomToSelection}
            onReset={handleResetViewport}
          />
        </div>

        {/* Tool Preview Overlay (Mullion/Transom Ghosts + Drawing Preview) */}
        <ToolPreviewOverlay
          tool={externalSelectedTool || 'select'}
          mousePosition={mousePosition}
          viewport={viewport}
          isDrawing={isDrawing}
          startPoint={startPoint}
          currentPoint={currentPoint || mousePosition}
        />

        {/* Context-sensitive right-click menu (gold-tier: memoized, guarded, a11y) */}
        <DraftingContextMenu
          open={contextMenuState.open}
          clientX={contextMenuState.clientX}
          clientY={contextMenuState.clientY}
          target={contextMenuState.target}
          onOpenChange={handleContextMenuOpenChange}
          drafting={draftingApi}
          selectedSystemPackId={selectedSystemPackId}
          onResetView={handleResetViewport}
          onZoomToFit={handleZoomToFit}
          onMoveToNext={onMoveToNext}
          onOpenPoseQuickEdit={onOpenPoseQuickEdit}
          onSize={handleSizeClick}
          onDefineAsFrame={handleDefineAsFrame}
          getDefineAsFrameWarning={getDefineAsFrameWarning}
          onAssignSystemPack={handleAssignSystemPackClick}
          onAddSash={drafting.addSashToFrame ? (t) => { if (t?.id) drafting.addSashToFrame?.(t.id); } : undefined}
          onQuickAddTwoSashes={drafting.quickAddTwoSashes ? (t) => { if (t?.id) drafting.quickAddTwoSashes?.(t.id); } : undefined}
          getAddSashWarning={getAddSashWarning}
          onAddMullion={drafting.addMullionToFrame ? handleAddMullionClick : undefined}
          onAssignGlazing={handleAssignGlazingClick}
          onGlassColor={handleAssignGlazingClick}
          onGlassType={handleAssignGlazingClick}
          onDuplicate={handleDuplicate}
          onProperties={() => {}}
          onEgyptianStandards={() => {}}
        />
        <SizeDialog
          open={sizeDialogState.open}
          onOpenChange={(open) => setSizeDialogState((prev) => ({ ...prev, open, rectIndex: open ? prev.rectIndex : null }))}
          widthMm={sizeDialogState.widthMm}
          heightMm={sizeDialogState.heightMm}
          onApply={handleSizeApply}
        />
        <AssignSystemPackDialog
          open={assignPackDialogOpen}
          onOpenChange={(open) => { setAssignPackDialogOpen(open); if (!open) setAssignPackRectIndex(null); }}
          onSelect={handleAssignSystemPackSelect}
        />
        <AddMullionDialog
          open={addMullionOpen}
          onOpenChange={(open) => { setAddMullionOpen(open); if (!open) setAddMullionFrameId(null); }}
          frameWidthMm={addMullionFrameWidthMm}
          frameHeightMm={addMullionFrameHeightMm}
          onApply={handleAddMullionApply}
        />
        <AssignGlazingDialog
          open={glazingDialogOpen}
          onOpenChange={(open) => { setGlazingDialogOpen(open); if (!open) { setGlazingFrameId(null); setGlazingCellId(null); } }}
          initialType={glazingInitialType}
          initialColor={glazingInitialColor}
          initialGeorgianBars={glazingInitialGeorgianBars}
          onApply={handleAssignGlazingApply}
        />
      </div>
    </ConstitutionalProfiler >
  );
};
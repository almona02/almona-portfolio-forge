import { useKeyboard } from '@/hooks/useKeyboard';
import { ConstitutionalProfiler } from '@/lib/performance/ConstitutionalProfiler';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/shared/ui/ui/context-menu';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDraftingContext } from './DraftingContext';
import { OptimizedCanvasManager } from './OptimizedCanvasManager';
import { type OperationInfo, type StatusMessage } from './components/EnhancedStatusBar';
import { ToolPreviewOverlay } from './components/ToolPreviewOverlay';
import { ZoomControls } from './components/ZoomControls';
import { useCanvasEvents } from './hooks/useCanvasEvents';
import { EventBatcher } from './performance/EventBatcher';
import { PredictivePreloader } from './performance/PredictivePreloader';
import type { DraftingTool, Line, Point, Viewport } from './types/drafting';
import type { MaterialType } from './types/materialAware';
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
  onSnapToggle: _onSnapToggle
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
  useEffect(() => {
    if (managerRef.current && externalViewport) {
      managerRef.current.setViewport({
        x: externalViewport.centerX,
        y: externalViewport.centerY,
        scale: externalViewport.zoom,
        width: containerRef.current?.clientWidth || 800,
        height: containerRef.current?.clientHeight || 600
      });
    }
  }, [externalViewport]);

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

  // Convert mouse to SVG coordinates
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

      const worldPoint = screenToWorld(screenX, screenY, viewport, canvasSize.width, canvasSize.height);
      return validatePoint(worldPoint);
    } catch (error) {
      console.error('Error converting mouse to SVG coordinates:', error);
      return { x: 0, y: 0 };
    }
  }, [viewport, canvasSize]);



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
        orientation: (tool === 'hinge' ? 'vertical' : 'horizontal') as 'horizontal' | 'vertical',
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
      reinforcement: needsReinforcement ? { type: (material === 'aluminum' ? 'aluminum' : 'steel') as 'aluminum' | 'steel', dimensions: { width: 20, height: 20 } } : undefined
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
    mousePosition // NEW: Destructure mousePosition
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
      originalHandleWheel(e.nativeEvent as WheelEvent);
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

        {/* Tool Preview Overlay (Mullion/Transom Ghosts) */}
        <ToolPreviewOverlay
          tool={externalSelectedTool || 'select'}
          mousePosition={mousePosition}
          viewport={viewport}
        />

        {/* Context Menu Trigger Area */}
        <ContextMenu>
          <ContextMenuTrigger className="absolute inset-0 w-full h-full" />
          <ContextMenuContent>
            <ContextMenuItem>Properties</ContextMenuItem>
            <ContextMenuItem>Reset View</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem>Egyptian Standards...</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </ConstitutionalProfiler >
  );
};
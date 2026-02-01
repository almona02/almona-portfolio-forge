
import React, { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import type { Arc, DraftingTool, Geometry2D, Line, Point, Polygon, Rectangle, Viewport } from '../types/drafting';
import type { MaterialAwareRectangle, MaterialType } from '../types/materialAware';
import { elementRefsToIndices, findElementsInBox } from '../utils/boxSelectionUtils';
import { calculateCircleFromThreePoints } from '../utils/geometryUtils';
import { validatePoint } from '../utils/inputValidator';
import { findLineAtPoint } from '../utils/lineHitDetection';
import { getDefaultMaterialSpec, getMaterialSpec } from '../utils/materialSpecs';
import { PatternType } from '../utils/patternUtils';
import { zoomAtPoint } from '../utils/viewportUtils';

/**
 * Interface defining the dependencies required by the event handlers.
 */
interface UseCanvasEventsProps {
  // Canvas State
  viewport: Viewport;
  setViewport: (v: Viewport | ((prev: Viewport) => Viewport)) => void;
  canvasSize: { width: number; height: number };

  // Tool State
  selectedTool: DraftingTool;
  selectedMaterial: MaterialType;
  selectedSystemPackId?: string;

  // Interaction State
  isPanning: boolean;
  setIsPanning: (p: boolean) => void;
  panStart: Point | null;
  setPanStart: (p: Point | null) => void;
  
  isRotating: boolean;
  setIsRotating: (r: boolean) => void;
  rotationStart: Point | null;
  setRotationStart: (p: Point | null) => void;
  rotationCenter: Point | null;
  setRotationCenter: (p: Point | null) => void;
  rotationStartAngle: number | null;
  setRotationStartAngle: (a: number | null) => void;
  
  // Drawing State
  isDrawing: boolean;
  setIsDrawing: (d: boolean) => void;
  startPoint: Point | null;
  setStartPoint: (p: Point | null) => void;
  currentPoint: Point | null;
  setCurrentPoint: (p: Point | null) => void;
  
  // Specific Tool States
  arcCenter: Point | null; // Repurposed as Arc Start (P1)
  setArcCenter: (p: Point | null) => void;
  arcEnd: Point | null; // Arc End (P2)
  setArcEnd: (p: Point | null) => void;
  arcStartAngle: number | null; // Unused in 3-pt, but kept for compat if needed?
  setArcStartAngle: (a: number | null) => void;
  
  polygonPoints: Point[];
  setPolygonPoints: (pts: Point[]) => void;
  
  splinePoints: Point[];
  setSplinePoints: (pts: Point[]) => void;
  
  // Text Tool
  setTextInputMode: (val: { position: Point; text: string } | null) => void;
  
  // Block Placement
  blockPlacementScale: number;
  setBlockPlacementScale: (n: number) => void;
  blockPlacementRotation: number;
  setBlockPlacementRotation: (n: number) => void;
  
  // Patterns
  setPatternType: (t: PatternType) => void;
  setPatternConfigOpen: (b: boolean) => void;
  linearArrayStart: Point | null;
  setLinearArrayStart: (p: Point | null) => void;

  // Edit Tools State
  trimTargetLine: Line | null;
  setTrimTargetLine: (l: Line | null) => void;
  extendTargetLine: Line | null;
  setExtendTargetLine: (l: Line | null) => void;
  filletLine1: Line | null;
  setFilletLine1: (l: Line | null) => void;
  chamferLine1: Line | null;
  setChamferLine1: (l: Line | null) => void;

  // Selection/Modification States
  isBoxSelecting: boolean;
  setIsBoxSelecting: (b: boolean) => void;
  boxSelectStart: Point | null;
  setBoxSelectStart: (p: Point | null) => void;
  boxSelectEnd: Point | null;
  setBoxSelectEnd: (p: Point | null) => void;
  
  // NEW: Hover State
  setHoveredElementIndex: (i: number | null) => void;
  
  // NEW: Mouse Position Callback
  onMousePositionChange?: (point: Point) => void;

  // Context/API
  drafting: any; 
  
  // Utils/Helpers
  getSVGPoint: (x: number, y: number) => Point;
  handleHardwarePlacement: (point: Point, tool: DraftingTool) => void;
  handleStructuralPlacement: (point: Point, tool: DraftingTool) => void;
  logToolOperation: (tool: DraftingTool, operation: string, params: any, result?: any) => void;
  
  // Refs
  svgRef: React.RefObject<HTMLElement>;
  
  // Handlers

}

export const useCanvasEvents = ({
  viewport,
  setViewport,
  canvasSize,
  selectedTool,
  selectedMaterial,
  selectedSystemPackId,
  isPanning,
  setIsPanning,
  panStart,
  setPanStart,
  isRotating,
  setIsRotating,
  rotationStart: _rotationStart,
  setRotationStart,
  rotationCenter,
  setRotationCenter,
  rotationStartAngle,
  setRotationStartAngle,
  isDrawing,
  setIsDrawing,
  startPoint,
  setStartPoint,
  // currentPoint, // Unused
  setCurrentPoint,
  arcCenter, // Can be used as Start Point (p1)
  setArcCenter,
  arcEnd, // Used as End Point (p2) 
  setArcEnd,
  arcStartAngle: _arcStartAngle,
  setArcStartAngle,
  polygonPoints,
  setPolygonPoints,
  splinePoints,
  setSplinePoints,
  setTextInputMode,
  blockPlacementScale,
  setBlockPlacementScale,
  blockPlacementRotation,
  setBlockPlacementRotation,
  setPatternType,
  setPatternConfigOpen,
  linearArrayStart,
  setLinearArrayStart,
  trimTargetLine,
  setTrimTargetLine,
  extendTargetLine,
  setExtendTargetLine,
  filletLine1,
  setFilletLine1,
  chamferLine1,
  setChamferLine1,
  isBoxSelecting,
  setIsBoxSelecting,
  boxSelectStart,
  setBoxSelectStart,
  boxSelectEnd,
  setBoxSelectEnd,
  setHoveredElementIndex,
  onMousePositionChange: _onMousePositionChange,
  drafting,
  getSVGPoint,
  handleHardwarePlacement,
  handleStructuralPlacement,
  logToolOperation,
  svgRef
}: UseCanvasEventsProps) => {

  // --- Mouse Position State ---
  const [cursorPosition, setCursorPosition] = React.useState<Point | null>(null);

  // --- Helpers ---
   const getElementGlobalIndex = useCallback((elementRef: { id: string }, geometry: Geometry2D): number | null => {
    let globalIndex = 0;
    const allArrays = [
        geometry.rectangles, 
        geometry.circles, 
        geometry.lines, 
        geometry.arcs, 
        geometry.polygons, 
        geometry.splines
    ];
    
    for (const arr of allArrays) {
        for (let i = 0; i < arr.length; i++) {
            if ((arr[i] as any).id === elementRef.id) return globalIndex;
            globalIndex++;
        }
    }
    return null;
  }, []);

  const findElementAtPoint = useCallback((point: Point, geometry: Geometry2D): { id: string; type: 'line' | 'rectangle' | 'polygon' | 'arc' } | null => {
    // Check lines
    for (const line of geometry.lines) {
      const dist = Math.sqrt(Math.pow(point.x - line.start.x, 2) + Math.pow(point.y - line.start.y, 2)) + Math.sqrt(Math.pow(point.x - line.end.x, 2) + Math.pow(point.y - line.end.y, 2));
      const lineLength = Math.sqrt(Math.pow(line.end.x - line.start.x, 2) + Math.pow(line.end.y - line.start.y, 2));
      if (dist < lineLength * 1.1) return { id: line.id || '', type: 'line' };
    }
    // Check rectangles
    for (const rect of geometry.rectangles) {
      if (point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height) {
        return { id: rect.id || '', type: 'rectangle' };
      }
    }
    // Check polygons
    for (const polygon of geometry.polygons) {
       let inside = false;
        for (let i = 0, j = polygon.points.length - 1; i < polygon.points.length; j = i++) {
          const xi = polygon.points[i].x, yi = polygon.points[i].y;
          const xj = polygon.points[j].x, yj = polygon.points[j].y;
          const intersect = ((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        if (inside) return { id: polygon.id || '', type: 'polygon' };
    }
    // Check arcs
    for (const arc of geometry.arcs) {
      const dist = Math.sqrt(Math.pow(point.x - arc.cx, 2) + Math.pow(point.y - arc.cy, 2));
      if (Math.abs(dist - arc.r) < 5) return { id: arc.id || '', type: 'arc' };
    }
    return null;
  }, []);


  // --- Wheel Handler ---
 const handleWheel = useCallback((event: WheelEvent) => {
    const isZooming = event.ctrlKey || event.metaKey;
    if (isZooming) {
       event.preventDefault();
       event.stopPropagation();
    }

    if (!svgRef.current) return;
    try {
      const rect = svgRef.current.getBoundingClientRect();
      if (!isFinite(canvasSize.width) || canvasSize.width <= 0) return;

      if (isZooming) {
        const screenPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        if (!isFinite(screenPoint.x)) return;

        const deltaMultiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 600 : 1;
        const normalizedDelta = event.deltaY * deltaMultiplier;
        const zoomDelta = normalizedDelta * 0.0008; 
        const clampedZoomDelta = Math.max(-0.3, Math.min(0.3, zoomDelta));
        setViewport(prev => zoomAtPoint(prev, screenPoint, clampedZoomDelta, canvasSize.width, canvasSize.height));
      } else {
        // Standard scroll bubbling (Scroll Trap Fix)
         if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
             return; 
        }
      }
    } catch (_error) {
       // Ignore
    }
  }, [canvasSize, setViewport, svgRef]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      svg.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel, svgRef]);


  // --- Mouse Down ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (selectedTool === 'pan' || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (selectedTool === 'select' && e.target instanceof SVGElement) {
      const target = e.target as SVGElement;
      if (target.getAttribute('data-handle-type') === 'rotation') {
        e.preventDefault();
        e.stopPropagation();
        const selectedElement = drafting.getSelectedElements()[0]; // Simplified
        if (selectedElement !== undefined) {
          const geometry = drafting.getGeometry();
          // Assuming index
           if (typeof selectedElement === 'number' && selectedElement >= 0 && selectedElement < geometry.rectangles.length) {
            const rect = geometry.rectangles[selectedElement];
            const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
            const point = getSVGPoint(e.clientX, e.clientY);
            const startAngle = Math.atan2(point.y - center.y, point.x - center.x);
            setIsRotating(true);
            setRotationStart(point);
            setRotationCenter(center);
            setRotationStartAngle(startAngle);
            return;
          }
        }
      }
    }

    const point = getSVGPoint(e.clientX, e.clientY);

    switch (selectedTool) {
      case 'rectangle':
      case 'circle':
      case 'line':
        setStartPoint(point);
        // Use currentPoint for something if needed, or _ to ignore
    // const _currentPoint = getSVGPoint(e.clientX, e.clientY);
        setIsDrawing(true);
        break;

      case 'text':
        setTextInputMode({ position: point, text: '' });
        break;

       case 'arc':
        if (!arcCenter) {
           // Step 1: Set Start Point (p1)
           setArcCenter(point); 
           setArcEnd(null);
           setIsDrawing(true);
           toast.info('Click end point');
        } else if (!arcEnd) {
           // Step 2: Set End Point (p2)
           if (Math.abs(point.x - arcCenter.x) < 1 && Math.abs(point.y - arcCenter.y) < 1) return;
           setArcEnd(point);
           toast.info('Adjust curvature (Middle Point)');
        } else {
           // Step 3: Set Mid Point (p3) and Finish
           try {
               // Calculate circle from p1 (Start), p2 (End), p3 (Mid)
               const circle = calculateCircleFromThreePoints(arcCenter, arcEnd, point);
               
               if (!circle) {
                   toast.error('Points are collinear');
                   return;
               }
               
               // Logic to determine direction (CCW vs CW / Swap Start-End)
               // geometryUtils returns standard normalized angles [0, 2π]
               let { startAngle, endAngle } = circle;

               // Check if p3 (mid) is within the standard CCW sweep from Start to End
               // Calculate p3 angle
               const midAngle = Math.atan2(point.y - circle.cy, point.x - circle.cx);
               const midNorm = (midAngle + 2 * Math.PI) % (2 * Math.PI);
               
               // Calculate sweep
               let sweep = endAngle - startAngle;
               if (sweep < 0) sweep += 2 * Math.PI; // Normalize to [0, 2π]
               
               // Calculate mid relative to start
               let midRel = midNorm - startAngle;
               if (midRel < 0) midRel += 2 * Math.PI;
               
               // If midRel > sweep, then p3 is NOT in the CCW path.
               // This means we need the "other" arc (the major arc if sweep < 180, or minor if sweep > 180).
               // To achieve this in a system that draws Start->End CCW, we swap Start and End.
               // Swapping means we draw from Original End to Original Start CCW, which covers the complement.
               if (midRel > sweep) {
                   const temp = startAngle;
                   startAngle = endAngle;
                   endAngle = temp;
               }
               
               const arc: Arc = { 
                   cx: circle.cx, 
                   cy: circle.cy, 
                   r: circle.r, 
                   startAngle, 
                   endAngle 
               };
               
               drafting.addArc(arc);
               logToolOperation('arc', 'create_3pt_arc', { p1: arcCenter, p2: arcEnd, p3: point }, { arc });
           } catch (error) {
               console.error('Arc creation failed', error);
               toast.error('Failed to create arc');
           } finally {
               setArcCenter(null); setArcEnd(null); setIsDrawing(false);
           }
        }
        break;

      case 'polygon':
        if (polygonPoints.length === 0) setPolygonPoints([point]);
        else {
          const firstPoint = polygonPoints[0];
          const dist = Math.sqrt(Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2));
          if (dist < 20) {
            const polygon: Polygon = { points: polygonPoints, closed: true };
            drafting.addPolygon(polygon);
            logToolOperation('polygon', 'create_polygon', { points: polygonPoints }, { polygon });
            setPolygonPoints([]);
          } else {
            setPolygonPoints([...polygonPoints, point]);
          }
        }
        break;

      case 'spline':
        if (splinePoints.length === 0) { setSplinePoints([point]); setIsDrawing(true); }
        else setSplinePoints([...splinePoints, point]);
        break;

      case 'dimension':
        if (!startPoint) { setStartPoint(point); setIsDrawing(true); }
        else {
          const mode = e.shiftKey ? 'area' : e.ctrlKey || e.metaKey ? 'angle' : 'distance';
          drafting.addMeasurement(startPoint, point, mode);
          setStartPoint(null); setIsDrawing(false);
        }
        break;

      case 'select':
        const placingBlockId = (drafting as any).getPlacingBlockId?.() || null;
        if (placingBlockId) {
             // Block Placement Logic
             let validatedPoint: Point;
              try { validatedPoint = validatePoint(point); } catch (_error) { toast.error('Invalid placement position'); return; }
              const block = (drafting as any).getBlockDefinitions?.()?.find((b: any) => b.id === placingBlockId);
              if (!block) { toast.error('Block not found'); return; }
    
              const validatedScale = isFinite(blockPlacementScale) && blockPlacementScale > 0 ? blockPlacementScale : 1.0;
              const validatedRotation = isFinite(blockPlacementRotation) ? blockPlacementRotation : 0;
              
              try {
                const rotationRad = (validatedRotation * Math.PI) / 180;
                (drafting as any).insertBlock?.(placingBlockId, validatedPoint, { x: validatedScale, y: validatedScale }, rotationRad);
                toast.success('Block placed');
                (drafting as any).cancelPlacingBlock?.();
                setBlockPlacementScale(1.0); setBlockPlacementRotation(0);
              } catch (_error) { toast.error('Failed to place block'); }
              return;
        }

        const elementAtPoint = findElementAtPoint(point, drafting.getGeometry());
        if (!elementAtPoint && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          setIsBoxSelecting(true);
          setBoxSelectStart(point);
          setBoxSelectEnd(point);
        } else if (elementAtPoint) {
           const geometry = drafting.getGeometry();
           if (e.ctrlKey || e.metaKey || e.shiftKey) {
             const current = drafting.getSelectedElements();
             const elementIndex = getElementGlobalIndex(elementAtPoint, geometry);
             if (elementIndex !== null) {
               if (current.includes(elementIndex)) (drafting as any).selectElements?.(current.filter((i:any) => i !== elementIndex));
               else (drafting as any).selectElements?.([...current, elementIndex]);
             }
           } else {
             drafting.selectElementAt(point);
           }
        }
        break;

      case 'hinge': case 'handle': case 'lock': case 'roller':
        handleHardwarePlacement(point, selectedTool);
        break;
      case 'mullion': case 'transom':
        handleStructuralPlacement(point, selectedTool);
        break;

      case 'mirror':
        drafting.mirrorSelected(e.shiftKey ? 'vertical' : 'horizontal');
        break;
      case 'rotate':
        drafting.rotateSelected(e.shiftKey ? 45 : 90);
        break;
      case 'scale':
        drafting.scaleSelected(e.shiftKey ? 0.9 : 1.1);
        break;

      case 'array-rectangular': case 'array-circular': case 'pattern-offset':
        setPatternType(selectedTool.replace('array-', '').replace('pattern-', '') as PatternType);
        setPatternConfigOpen(true);
        break;

      case 'array-linear':
        if (!linearArrayStart) { setLinearArrayStart(point); setIsDrawing(true); }
        else { setPatternType('linear'); setPatternConfigOpen(true); }
        break;

      case 'trim':
        if (!trimTargetLine) {
           const l = findLineAtPoint(point, drafting.getGeometry().lines, 5);
           if (l) { setTrimTargetLine(l); toast.info('Click cutting line'); }
        } else {
           const cuttingLine = drafting.getGeometry().lines.find((l: Line) => {
              if (!l || l.id === trimTargetLine.id) return false;
              return findLineAtPoint(point, [l], 5) !== null;
           });
           if (cuttingLine) {
              try { drafting.trimLine(trimTargetLine, cuttingLine); toast.success('Line trimmed'); } 
              catch(_e) { toast.error('Failed trim'); }
              finally { setTrimTargetLine(null); }
           }
        }
        break;

      case 'extend':
         if (!extendTargetLine) {
            const l = findLineAtPoint(point, drafting.getGeometry().lines, 5);
            if (l) { setExtendTargetLine(l); toast.info('Click target line'); }
         } else {
            const targetLine = drafting.getGeometry().lines.find((l: Line) => {
               if (!l || l.id === extendTargetLine.id) return false;
               return findLineAtPoint(point, [l], 5) !== null;
            });
            if (targetLine) {
               try { drafting.extendLine(extendTargetLine, targetLine); toast.success('Line extended'); } 
               catch(_e) { toast.error('Failed extend'); }
               finally { setExtendTargetLine(null); }
            }
         }
         break;

      case 'fillet':
        if (!filletLine1) {
             const l = findLineAtPoint(point, drafting.getGeometry().lines, 5);
             if (l) { setFilletLine1(l); toast.info('Click second line'); }
        } else {
             const l2 = drafting.getGeometry().lines.find((l: Line) => {
                if (!l || l.id === filletLine1.id) return false;
                return findLineAtPoint(point, [l], 5) !== null;
             });
             if (l2) {
                 const r = prompt('Radius (mm):', '10');
                 if (r) {
                      try { drafting.applyFilletToLines(filletLine1, l2, parseFloat(r)); toast.success('Fillet applied'); }
                      catch(_e) { toast.error('Failed fillet'); }
                 }
                 setFilletLine1(null);
             }
        }
        break;

      case 'chamfer':
         if (!chamferLine1) {
              const l = findLineAtPoint(point, drafting.getGeometry().lines, 5);
              if (l) { setChamferLine1(l); toast.info('Click second line'); }
         } else {
              const l2 = drafting.getGeometry().lines.find((l: Line) => {
                 if (!l || l.id === chamferLine1.id) return false;
                 return findLineAtPoint(point, [l], 5) !== null;
              });
              if (l2) {
                  const d = prompt('Distance (mm):', '10');
                  if (d) {
                       try { drafting.applyChamferToLines(chamferLine1, l2, parseFloat(d)); toast.success('Chamfer applied'); }
                       catch(_e) { toast.error('Failed chamfer'); }
                  }
                  setChamferLine1(null);
              }
         }
         break;

      case 'offset':
         const el = findElementAtPoint(point, drafting.getGeometry());
         if (el) {
             const d = prompt('Distance (mm):', '50');
             if (d) {
                  try { drafting.offsetGeometry(el.id, el.type, parseFloat(d)); toast.success('Offset applied'); }
                  catch(_e) { toast.error('Failed offset'); }
             }
         }
         break;
    }
  }, [setIsRotating, setRotationStart, setRotationCenter, setRotationStartAngle, setIsPanning, setPanStart, 
      setIsBoxSelecting, setBoxSelectStart, setBoxSelectEnd, drafting, getSVGPoint, 
      startPoint, setStartPoint, selectedTool, logToolOperation, setIsDrawing,
      arcCenter, setArcCenter, arcEnd, setArcEnd, polygonPoints, setPolygonPoints,
      splinePoints, setSplinePoints, setTextInputMode, blockPlacementScale, setBlockPlacementScale, blockPlacementRotation, setBlockPlacementRotation,
      setPatternType, setPatternConfigOpen, linearArrayStart, setLinearArrayStart, trimTargetLine, setTrimTargetLine, extendTargetLine, setExtendTargetLine,
      filletLine1, setFilletLine1, chamferLine1, setChamferLine1, 
      handleHardwarePlacement, handleStructuralPlacement, findElementAtPoint, getElementGlobalIndex]);


  // --- Mouse Move ---
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStart) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setViewport(prev => ({ ...prev, centerX: prev.centerX - dx / prev.zoom, centerY: prev.centerY - dy / prev.zoom }));
        setPanStart({ x: e.clientX, y: e.clientY });
        return;
    }
    
    const point = getSVGPoint(e.clientX, e.clientY);
    
    // Always track cursor position for tool previews
    setCursorPosition(point);

    // Notify parent of mouse position change (optional, for status bar etc)
    if (_onMousePositionChange) {
        _onMousePositionChange(point);
    }
    
    if (isRotating && rotationCenter && rotationStartAngle !== null) {
        const currentAngle = Math.atan2(point.y - rotationCenter.y, point.x - rotationCenter.x);
        const deltaAngle = currentAngle - rotationStartAngle;
        const deltaDegrees = (deltaAngle * 180) / Math.PI;

        const selectedElement = drafting.getSelectedElement();
        if (selectedElement !== null) {
           const geometry = drafting.getGeometry();
           if (selectedElement >= 0 && selectedElement < geometry.rectangles.length) {
                const rect = geometry.rectangles[selectedElement];
                const currentRotation = rect.rotation || 0;
                const newRotation = ((currentRotation + deltaDegrees) % 360 + 360) % 360;
                const updatedRect: Rectangle = { ...rect, rotation: newRotation > 0 ? newRotation : undefined };
                drafting.updateRectangle(selectedElement, updatedRect);
                setRotationStartAngle(currentAngle);
           }
        }
        return;
    }

    if (isDrawing) setCurrentPoint(point);
    if (isBoxSelecting) setBoxSelectEnd(point);
    
     // Hover Logic
    if (selectedTool === 'select') {
         // Throttling for hover is less critical if the array is small, 
         // but for large geometry we might miss the throttle. 
         // For surgical split, this is acceptable.
         const hoveredIndex = drafting.getGeometry().rectangles.findIndex((rect: any) =>
          point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height
        );
        setHoveredElementIndex(hoveredIndex >= 0 ? hoveredIndex : null);
    } else {
        setHoveredElementIndex(null);
    }

  }, [isPanning, panStart, setViewport, getSVGPoint, isRotating, rotationCenter, rotationStartAngle, isDrawing, isBoxSelecting, setBoxSelectEnd, drafting, selectedTool, setHoveredElementIndex, setRotationStartAngle, _onMousePositionChange, setPanStart, setCursorPosition, setCurrentPoint]);


  // --- Mouse Up ---
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isRotating) {
        setIsRotating(false); setRotationStart(null); setRotationCenter(null); setRotationStartAngle(0);
        return;
    }
    if (isPanning) {
        setIsPanning(false); setPanStart(null);
        return;
    }
    
    if (isBoxSelecting && boxSelectStart && boxSelectEnd) {
       const point = getSVGPoint(e.clientX, e.clientY);
       const finalEnd = point;
       const boxWidth = Math.abs(finalEnd.x - boxSelectStart.x);
       const boxHeight = Math.abs(finalEnd.y - boxSelectStart.y);

       if (boxWidth > 5 && boxHeight > 5) {
          if (e.ctrlKey || e.metaKey || e.shiftKey) {
             const elements = findElementsInBox(drafting.getGeometry(), { start: boxSelectStart, end: finalEnd });
             const newIndices = elementRefsToIndices(elements, drafting.getGeometry());
             const current = drafting.getSelectedElements();
             const combined = [...new Set([...current, ...newIndices])];
             drafting.selectElements(combined);
          } else {
             drafting.selectElementsInBox(boxSelectStart, finalEnd);
          }
       } else {
          drafting.clearSelection();
       }
       setIsBoxSelecting(false); setBoxSelectStart(null); setBoxSelectEnd(null);
       return;
    }

    const point = getSVGPoint(e.clientX, e.clientY);
    
    if (isDrawing && startPoint) {
       if (selectedTool === 'rectangle') {
          const rect = {
             x: Math.min(startPoint.x, point.x), y: Math.min(startPoint.y, point.y),
             width: Math.abs(point.x - startPoint.x), height: Math.abs(point.y - startPoint.y)
          };
          const snapped = drafting.snapToGrid(rect);
          const validated = drafting.validateAgainstTemplates(snapped);
          
          if (validated.width > 10 && validated.height > 10) {
             if (selectedMaterial && selectedSystemPackId && ['aluminum', 'upvc'].includes(selectedMaterial)) {
                 const spec = getMaterialSpec(selectedSystemPackId) || getDefaultMaterialSpec(selectedMaterial as any);
                 const matRect: MaterialAwareRectangle = {
                     ...validated, material: selectedMaterial, systemPackId: selectedSystemPackId,
                     profileDepth: spec.profileDepth, glazingPocket: spec.glazingPocket, thermalBreak: spec.thermalBreak,
                     constraints: { minWidth: 600, maxWidth: 3000, minHeight: 600, maxHeight: 2600 },
                     type: 'fixed'
                 };
                 drafting.addMaterialAwareWindow(matRect);
                 logToolOperation('rectangle', 'create_mw', {rect: validated}, {window: matRect});
             } else {
                 drafting.addRectangle(validated);
                 logToolOperation('rectangle', 'create_rect', {rect: validated}, {rectangle: validated});
             }
          }
          setIsDrawing(false); setStartPoint(null); setCurrentPoint(null);
       } else if (selectedTool === 'circle') {
           const radius = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2));
           if (radius > 5) {
               drafting.addCircle({ cx: startPoint.x, cy: startPoint.y, r: radius });
               logToolOperation('circle', 'create_circle', {cx: startPoint.x, cy: startPoint.y, r: radius});
           }
           setIsDrawing(false); setStartPoint(null); setCurrentPoint(null);
       } else if (selectedTool === 'line') {
           const line: Line = { id: `line-${Date.now()}`, type: 'solid', start: startPoint, end: point };
           if (Math.sqrt(Math.pow(line.end.x - line.start.x, 2) + Math.pow(line.end.y - line.start.y, 2)) > 5) {
               drafting.addLine(line);
               logToolOperation('line', 'create_line', {line});
           }
           setIsDrawing(false); setStartPoint(null); setCurrentPoint(null);
       }
    }
  }, [isRotating, setIsRotating, setRotationStart, setRotationCenter, setRotationStartAngle, isPanning, setIsPanning, setPanStart, 
      isBoxSelecting, setIsBoxSelecting, boxSelectStart, setBoxSelectStart, boxSelectEnd, setBoxSelectEnd, drafting, getSVGPoint, 
      isDrawing, startPoint, setStartPoint, setCurrentPoint, selectedTool, selectedMaterial, selectedSystemPackId, logToolOperation, setIsDrawing]);


  // --- Key Down ---
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Spline Enter (Finish Spline)
    if (selectedTool === 'spline' && splinePoints.length >= 2 && e.key === 'Enter') {
      e.preventDefault();
      const spline: any = { // Spline type might need specific import or loose type
        controlPoints: splinePoints,
        closed: false
      };
      drafting.addSpline(spline);
      logToolOperation('spline', 'create_spline', { controlPoints: splinePoints }, { spline });
      setSplinePoints([]);
      setIsDrawing(false);
      return;
    }

    if (e.key === 'Escape') {
      setIsDrawing(false); setStartPoint(null); setCurrentPoint(null);
      setArcCenter(null); setArcEnd(null); setArcStartAngle(null);
      setPolygonPoints([]); setSplinePoints([]);
      setIsBoxSelecting(false); setBoxSelectStart(null); setBoxSelectEnd(null);
      setLinearArrayStart(null); setTrimTargetLine(null); setExtendTargetLine(null);
      setFilletLine1(null); setChamferLine1(null);
      drafting.clearSelection();
    } 
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      drafting.deleteSelected();
    }
    else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      if (e.shiftKey) drafting.redo();
      else drafting.undo();
    }
    else if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
       const panAm = 20 / viewport.zoom;
       if (e.key === 'ArrowLeft') setViewport(v => ({...v, centerX: v.centerX - panAm}));
       if (e.key === 'ArrowRight') setViewport(v => ({...v, centerX: v.centerX + panAm}));
       if (e.key === 'ArrowUp') setViewport(v => ({...v, centerY: v.centerY - panAm}));
       if (e.key === 'ArrowDown') setViewport(v => ({...v, centerY: v.centerY + panAm}));
    }
  }, [drafting, viewport.zoom, setViewport, setIsDrawing, setStartPoint, setCurrentPoint, setArcCenter, setArcStartAngle, setArcEnd, setPolygonPoints, setSplinePoints, setIsBoxSelecting, setBoxSelectStart, setBoxSelectEnd, setLinearArrayStart, setTrimTargetLine, setExtendTargetLine, setFilletLine1, setChamferLine1, selectedTool, splinePoints, logToolOperation]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleKeyDown,
    handleWheel,
    mousePosition: cursorPosition || { x: 0, y: 0 } 
  };
};

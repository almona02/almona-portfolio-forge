/**
 * Properties Panel Component
 * 
 * Gold-tier, context-sensitive property editor for all drafting elements.
 * Provides comprehensive editing capabilities with real-time validation.
 * 
 * @since UI/UX Gold-Tier Implementation
 */

import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
    AlertCircle,
    CheckCircle2,
    Circle,
    CircleDot,
    GripVertical,
    Hexagon,
    Info,
    Lock,
    Minus,
    Minus as MinusIcon, RotateCw,
    Square,
    Wrench
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDraftingContext } from '../DraftingContext';
import type {
    Arc,
    Circle as CircleType,
    Line,
    Rectangle
} from '../types/drafting';
import type { HardwarePlacement, MaterialType, StructuralElement } from '../types/materialAware';
import { ValidationError, validateDimension, validatePoint, validateRotation } from '../utils/inputValidator';
import { SNAP_SPACING_OPTIONS } from '../utils/snapUtils';
import { mirrorRectangle, scaleRectangle } from '../utils/transformUtils';

interface PropertiesPanelProps {
  className?: string;
}

const toNumStr = (v: unknown): string =>
    typeof v === 'number' || typeof v === 'string' ? String(v) : '';

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ className }) => {
  const drafting = useDraftingContext();
  const geometry = drafting.getGeometry();
  const selectedElement = drafting.getSelectedElement();
  const selectedElements = drafting.getSelectedElements();
  const materialAwareWindows = drafting.getMaterialAwareWindows();
  const hardware = drafting.getHardware();
  const structuralElements = drafting.getStructuralElements();
  
  // Check if multiple elements are selected
  const isMultiSelect = selectedElements.length > 1;
  
  // Determine what's selected
  // Map selectedElement index to actual element across all geometry types
  const selection = useMemo(() => {
    if (selectedElement === null) return null;
    
    let currentIndex = selectedElement;
    
    // Check rectangles
    if (currentIndex < geometry.rectangles.length) {
      const rect = geometry.rectangles[currentIndex];
      const materialWindow = materialAwareWindows.find(w => w.id === rect.id);
      return {
        type: 'rectangle' as const,
        element: rect,
        materialWindow,
        index: currentIndex
      };
    }
    currentIndex -= geometry.rectangles.length;
    
    // Check circles
    if (currentIndex < geometry.circles.length) {
      const circle = geometry.circles[currentIndex];
      return {
        type: 'circle' as const,
        element: circle,
        index: currentIndex
      };
    }
    currentIndex -= geometry.circles.length;
    
    // Check lines
    if (currentIndex < geometry.lines.length) {
      const line = geometry.lines[currentIndex];
      return {
        type: 'line' as const,
        element: line,
        index: currentIndex
      };
    }
    currentIndex -= geometry.lines.length;
    
    // Check arcs
    if (currentIndex < geometry.arcs.length) {
      const arc = geometry.arcs[currentIndex];
      return {
        type: 'arc' as const,
        element: arc,
        index: currentIndex
      };
    }
    currentIndex -= geometry.arcs.length;
    
    // Check polygons
    if (currentIndex < geometry.polygons.length) {
      const polygon = geometry.polygons[currentIndex];
      return {
        type: 'polygon' as const,
        element: polygon,
        index: currentIndex
      };
    }
    currentIndex -= geometry.polygons.length;
    
    // Check hardware
    if (currentIndex < hardware.length) {
      const hw = hardware[currentIndex];
      return {
        type: 'hardware' as const,
        element: hw,
        index: currentIndex
      };
    }
    currentIndex -= hardware.length;
    
    // Check structural elements
    if (currentIndex < structuralElements.length) {
      const struct = structuralElements[currentIndex];
      return {
        type: 'structural' as const,
        element: struct,
        index: currentIndex
      };
    }
    
    return null;
  }, [selectedElement, geometry, materialAwareWindows, hardware, structuralElements]);
  
  // Local state for editing
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  
  // Initialize edit values when selection changes
  useEffect(() => {
    if (!selection) {
      setEditValues({});
      setValidationErrors({});
      setIsDirty(false);
      return;
    }
    
    const values: Record<string, unknown> = {};
    
    switch (selection.type) {
      case 'rectangle':
        values.x = selection.element.x;
        values.y = selection.element.y;
        values.width = selection.element.width;
        values.height = selection.element.height;
        values.rotation = selection.element.rotation || 0;
        values.scaleX = 1; // Default scale
        values.scaleY = 1; // Default scale
        values.mirror = 'none'; // Default mirror
        values.type = selection.element.type || 'fixed';
        if (selection.materialWindow) {
          values.material = selection.materialWindow.material;
          values.systemPackId = selection.materialWindow.systemPackId;
        }
        break;
        
      case 'circle':
        values.cx = selection.element.cx;
        values.cy = selection.element.cy;
        values.r = selection.element.r;
        break;
        
      case 'line':
        values.startX = selection.element.start.x;
        values.startY = selection.element.start.y;
        values.endX = selection.element.end.x;
        values.endY = selection.element.end.y;
        values.type = selection.element.type || 'solid';
        break;
        
      case 'arc':
        values.cx = selection.element.cx;
        values.cy = selection.element.cy;
        values.r = selection.element.r;
        values.startAngle = (selection.element.startAngle * 180) / Math.PI; // Convert to degrees
        values.endAngle = (selection.element.endAngle * 180) / Math.PI;
        break;
        
      case 'polygon':
        // Polygon editing is complex, but allow rotation
        values.rotation = selection.element.rotation || 0;
        break;
        
      case 'hardware':
        values.x = selection.element.position.x;
        values.y = selection.element.position.y;
        values.type = selection.element.type;
        values.orientation = selection.element.orientation;
        break;
        
      case 'structural':
        values.position = selection.element.position;
        values.width = selection.element.dimensions.width;
        values.depth = selection.element.dimensions.depth;
        values.height = selection.element.dimensions.height;
        values.material = selection.element.material;
        values.type = selection.element.type;
        break;
    }
    
    setEditValues(values);
    setValidationErrors({});
    setIsDirty(false);
  }, [selection]);

  // Batch selection info
  const batchInfo = useMemo(() => {
    if (!isMultiSelect || selectedElements.length === 0) return null;
    
    const elements = selectedElements.map(index => {
      let currentIndex = index;
      
      if (currentIndex < geometry.rectangles.length) {
        return { type: 'rectangle' as const, index: currentIndex, element: geometry.rectangles[currentIndex] };
      }
      currentIndex -= geometry.rectangles.length;
      
      if (currentIndex < geometry.circles.length) {
        return { type: 'circle' as const, index: currentIndex, element: geometry.circles[currentIndex] };
      }
      currentIndex -= geometry.circles.length;
      
      if (currentIndex < geometry.lines.length) {
        return { type: 'line' as const, index: currentIndex, element: geometry.lines[currentIndex] };
      }
      currentIndex -= geometry.lines.length;
      
      if (currentIndex < geometry.arcs.length) {
        return { type: 'arc' as const, index: currentIndex, element: geometry.arcs[currentIndex] };
      }
      currentIndex -= geometry.arcs.length;
      
      if (currentIndex < geometry.polygons.length) {
        return { type: 'polygon' as const, index: currentIndex, element: geometry.polygons[currentIndex] };
      }
      
      return null;
    }).filter((e): e is NonNullable<typeof e> => e !== null);
    
    const typeCounts = elements.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      count: selectedElements.length,
      elements,
      typeCounts
    };
  }, [isMultiSelect, selectedElements, geometry]);

  // Validate and update value
  const updateValue = useCallback((key: string, value: unknown) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    
    // Validate
    try {
      if (key === 'x' || key === 'y' || key === 'startX' || key === 'startY' || key === 'endX' || key === 'endY' || key === 'cx' || key === 'cy') {
        const xVal = key.includes('x') || key === 'cx' ? value : editValues[key.includes('x') ? 'x' : 'y'];
        const yVal = key.includes('y') || key === 'cy' ? value : editValues[key.includes('y') ? 'y' : 'x'];
        validatePoint({ x: Number(xVal ?? 0), y: Number(yVal ?? 0) });
        setValidationErrors(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } else if (key === 'width' || key === 'height' || key === 'r' || key === 'depth') {
        validateDimension(Number(value ?? 0));
        setValidationErrors(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } else if (key === 'rotation') {
        validateRotation(Number(value ?? 0));
        setValidationErrors(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } else if (key === 'scaleX' || key === 'scaleY') {
        // Validate scale (0.01 - 100)
        const scaleValue = parseFloat(toNumStr(value));
        if (!isFinite(scaleValue) || scaleValue < 0.01 || scaleValue > 100) {
          setValidationErrors(prev => ({ 
            ...prev, 
            [key]: 'Scale must be between 0.01 and 100' 
          }));
        } else {
          setValidationErrors(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof ValidationError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'Validation error';
      setValidationErrors(prev => ({ ...prev, [key]: errorMessage }));
    }
  }, [editValues]);
  
  // Apply changes
  const applyChanges = useCallback(() => {
    if (!selection || !isDirty) return;
    
    try {
      switch (selection.type) {
        case 'rectangle': {
          const rotationValue = editValues.rotation !== undefined 
            ? parseFloat(toNumStr(editValues.rotation)) || 0 
            : selection.element.rotation || 0;
          
          // Normalize rotation to 0-360
          const normalizedRotation = ((rotationValue % 360) + 360) % 360;
          
          // Build base rectangle with position, size, and rotation
          const baseRect: Rectangle = {
            ...selection.element,
            x: parseFloat(toNumStr(editValues.x)) || selection.element.x,
            y: parseFloat(toNumStr(editValues.y)) || selection.element.y,
            width: parseFloat(toNumStr(editValues.width)) || selection.element.width,
            height: parseFloat(toNumStr(editValues.height)) || selection.element.height,
            rotation: normalizedRotation > 0 ? normalizedRotation : undefined,
            type: (editValues.type as Rectangle['type']) || selection.element.type || 'fixed'
          };
          
          // Apply transformations in order: scale -> mirror
          let rect = baseRect;
          const center = {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2
          };
          
          // Apply scale transformation if scale is not 1
          const scaleX = editValues.scaleX !== undefined ? parseFloat(toNumStr(editValues.scaleX)) : 1;
          const scaleY = editValues.scaleY !== undefined ? parseFloat(toNumStr(editValues.scaleY)) : 1;
          
          if ((scaleX !== 1 || scaleY !== 1) && isFinite(scaleX) && isFinite(scaleY) && scaleX > 0 && scaleY > 0) {
            rect = scaleRectangle(rect, center, scaleX, scaleY);
            // Update center after scale
            center.x = rect.x + rect.width / 2;
            center.y = rect.y + rect.height / 2;
          }
          
          // Apply mirror transformation
          if (editValues.mirror && editValues.mirror !== 'none') {
            rect = mirrorRectangle(rect, center, toNumStr(editValues.mirror) as 'horizontal' | 'vertical');
          }
          
          // Update rectangle
          drafting.updateRectangle(selection.index, rect);
          setIsDirty(false);
          break;
        }
        
        case 'circle': {
          const circle: CircleType = {
            ...selection.element,
            cx: parseFloat(editValues.cx) || selection.element.cx,
            cy: parseFloat(editValues.cy) || selection.element.cy,
            r: parseFloat(editValues.r) || selection.element.r
          };
          
          drafting.updateCircle(selection.index, circle);
          setIsDirty(false);
          break;
        }
        
        case 'line': {
          const line: Line = {
            ...selection.element,
            start: {
              x: parseFloat(toNumStr(editValues.startX)) || selection.element.start.x,
              y: parseFloat(toNumStr(editValues.startY)) || selection.element.start.y
            },
            end: {
              x: parseFloat(toNumStr(editValues.endX)) || selection.element.end.x,
              y: parseFloat(toNumStr(editValues.endY)) || selection.element.end.y
            },
            type: (editValues.type as Line['type']) || selection.element.type || 'solid'
          };
          
          drafting.updateLine(selection.index, line);
          setIsDirty(false);
          break;
        }
        
        case 'arc': {
          const arc: Arc = {
            ...selection.element,
            cx: parseFloat(toNumStr(editValues.cx)) || selection.element.cx,
            cy: parseFloat(toNumStr(editValues.cy)) || selection.element.cy,
            r: parseFloat(toNumStr(editValues.r)) || selection.element.r,
            startAngle: ((parseFloat(toNumStr(editValues.startAngle)) || 0) * Math.PI) / 180,
            endAngle: ((parseFloat(toNumStr(editValues.endAngle)) || 0) * Math.PI) / 180
          };
          
          drafting.updateArc(selection.index, arc);
          setIsDirty(false);
          break;
        }
        
        case 'hardware': {
          const hw: HardwarePlacement = {
            ...selection.element,
            position: {
              x: parseFloat(toNumStr(editValues.x)) || selection.element.position.x,
              y: parseFloat(toNumStr(editValues.y)) || selection.element.position.y
            },
            orientation: (editValues.orientation as HardwarePlacement['orientation']) || selection.element.orientation
          };
          
          drafting.updateHardware(selection.index, hw);
          setIsDirty(false);
          break;
        }
        
        case 'structural': {
          const pos = editValues.position as { x: number; y: number } | undefined;
          const struct: StructuralElement = {
            ...selection.element,
            position: (pos && typeof pos.x === 'number' && typeof pos.y === 'number') ? pos : selection.element.position,
            dimensions: {
              width: parseFloat(toNumStr(editValues.width)) || selection.element.dimensions.width,
              depth: parseFloat(toNumStr(editValues.depth)) || selection.element.dimensions.depth,
              height: parseFloat(toNumStr(editValues.height)) || selection.element.dimensions.height
            },
            material: (editValues.material as MaterialType) || selection.element.material
          };
          
          drafting.updateStructuralElement(selection.index, struct);
          setIsDirty(false);
          break;
        }
      }
    } catch (error) {
      console.error('Error applying changes:', error);
      setValidationErrors(prev => ({ ...prev, _general: error instanceof Error ? error.message : 'Failed to apply changes' }));
    }
  }, [selection, editValues, isDirty, drafting]);
  
  // Reset changes
  const resetChanges = useCallback(() => {
    if (!selection) return;
    
    // Re-initialize from selection
    const values: Record<string, unknown> = {};
    
    switch (selection.type) {
      case 'rectangle':
        values.x = selection.element.x;
        values.y = selection.element.y;
        values.width = selection.element.width;
        values.height = selection.element.height;
        break;
      case 'circle':
        values.cx = selection.element.cx;
        values.cy = selection.element.cy;
        values.r = selection.element.r;
        break;
      // ... other types
    }
    
    setEditValues(values);
    setValidationErrors({});
    setIsDirty(false);
  }, [selection]);
  
  // Render batch selection UI
  if (isMultiSelect && batchInfo) {
    return (
      <div className={`p-4 ${className || ''}`}>
        <Card>
          <CardHeader className="px-4 py-3 border-b border-slate-700/30">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-200">
              <Square className="h-5 w-5 text-amber-400" />
              Batch Selection
              <Badge variant="outline" className="ml-auto border-amber-600/30 text-amber-400 bg-amber-500/10 text-xs font-medium px-2 py-0.5">
                {batchInfo.count} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {batchInfo.count} elements selected. Batch operations available.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label>Selection Summary</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(batchInfo.typeCounts).map(([type, count]) => (
                  <Badge key={type} variant="outline" className="border-amber-600/30 text-amber-400">
                    {count} {type}{count > 1 ? 's' : ''}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Batch Operations</Label>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Clear selection
                    drafting.clearSelection();
                  }}
                  className="w-full border-amber-600/30 text-amber-400 hover:bg-amber-500/10"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selection) {
    return (
      <div className={`p-4 ${className || ''}`}>
        <Card>
          <CardHeader className="px-4 py-3 border-b border-slate-700/30">
            <CardTitle className="text-base font-semibold text-slate-200">Properties</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-sm text-slate-400 text-center py-8">
              <Info className="w-8 h-8 mx-auto mb-2 text-slate-500" />
              <p className="font-medium text-slate-300">No element selected</p>
              <p className="text-xs mt-1 text-slate-500">Select an element to edit its properties</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Get icon for element type
  const getElementIcon = () => {
    switch (selection.type) {
      case 'rectangle': return <Square className="w-4 h-4" />;
      case 'circle': return <Circle className="w-4 h-4" />;
      case 'line': return <Minus className="w-4 h-4" />;
      case 'arc': return <Circle className="w-4 h-4" style={{ strokeDasharray: '4,4', fill: 'none', stroke: 'currentColor' }} />;
      case 'polygon': return <Hexagon className="w-4 h-4" />;
      case 'hardware':
        switch (selection.element.type) {
          case 'hinge': return <Wrench className="w-4 h-4" />;
          case 'handle': return <GripVertical className="w-4 h-4" />;
          case 'lock': return <Lock className="w-4 h-4" />;
          case 'roller': return <CircleDot className="w-4 h-4" />;
          default: return <Info className="w-4 h-4" />;
        }
      case 'structural':
        return selection.element.type === 'mullion' 
          ? <MinusIcon className="w-4 h-4 rotate-90" />
          : <MinusIcon className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };
  
  return (
    <div className={`p-4 space-y-4 overflow-y-auto overflow-x-hidden ${className || ''}`} style={{ height: '100%', maxHeight: '100%' }}>
      <Card className="border-amber-600/20 bg-slate-900/50">
        <CardHeader className="border-b border-amber-600/20 bg-slate-800/30">
          <div className="flex items-center gap-2">
            <div className="text-amber-400">
              {getElementIcon()}
            </div>
            <CardTitle className="text-sm font-semibold capitalize text-slate-200">
              {selection.type === 'hardware' ? selection.element.type : selection.type} Properties
            </CardTitle>
            {selection.materialWindow && (
              <Badge variant="outline" className="ml-auto border-amber-600/30 text-amber-400 bg-amber-500/10 text-xs font-medium px-2 py-0.5">
                {selection.materialWindow.material}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Validation Errors */}
          {Object.keys(validationErrors).length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {Object.values(validationErrors).join(', ')}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Properties by Type */}
          <Tabs defaultValue="geometry" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/30 border border-amber-600/10">
              <TabsTrigger value="geometry" className="text-xs data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 data-[state=active]:border-amber-600/30">Geometry</TabsTrigger>
              {(selection.type === 'rectangle' && selection.materialWindow) && (
                <TabsTrigger value="material" className="text-xs data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 data-[state=active]:border-amber-600/30">Material</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="geometry" className="space-y-4 mt-4">
              {selection.type === 'rectangle' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="rect-x" className="text-xs text-slate-300">X Position (mm)</Label>
                      <Input
                        id="rect-x"
                        type="number"
                        value={editValues.x ?? ''}
                        onChange={(e) => updateValue('x', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                      />
                      {validationErrors.x && (
                        <p className="text-xs text-red-500">{validationErrors.x}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="rect-y" className="text-xs">Y Position (mm)</Label>
                      <Input
                        id="rect-y"
                        type="number"
                        value={editValues.y ?? ''}
                        onChange={(e) => updateValue('y', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                      />
                      {validationErrors.y && (
                        <p className="text-xs text-red-500">{validationErrors.y}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="rect-width" className="text-xs text-slate-300">Width (mm)</Label>
                      <Input
                        id="rect-width"
                        type="number"
                        value={editValues.width ?? ''}
                        onChange={(e) => updateValue('width', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                        min="10"
                      />
                      {validationErrors.width && (
                        <p className="text-xs text-red-500">{validationErrors.width}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="rect-height" className="text-xs text-slate-300">Height (mm)</Label>
                      <Input
                        id="rect-height"
                        type="number"
                        value={editValues.height ?? ''}
                        onChange={(e) => updateValue('height', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                        min="10"
                      />
                      {validationErrors.height && (
                        <p className="text-xs text-red-500">{validationErrors.height}</p>
                      )}
                    </div>
                  </div>
                    <div className="space-y-1">
                      <Label htmlFor="rect-rotation" className="text-xs text-slate-300">Rotation (°)</Label>
                      <Input
                        id="rect-rotation"
                        type="number"
                        value={editValues.rotation ?? 0}
                        onChange={(e) => updateValue('rotation', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                        min="0"
                        max="360"
                      />
                    {validationErrors.rotation && (
                      <p className="text-xs text-red-500">{validationErrors.rotation}</p>
                    )}
                  </div>
                  
                  {/* Transform Controls */}
                  <Card className="bg-slate-800/50 border-amber-600/20">
                    <CardHeader className="pb-2 border-b border-amber-600/10">
                      <CardTitle className="text-xs font-semibold flex items-center gap-2 text-amber-300">
                        <RotateCw className="h-3 w-3 text-amber-400" />
                        Transform
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="rect-scaleX" className="text-xs">Scale X</Label>
                          <Input
                            id="rect-scaleX"
                            type="number"
                            value={editValues.scaleX ?? 1}
                            onChange={(e) => updateValue('scaleX', e.target.value)}
                            className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                            step="0.01"
                            min="0.01"
                            max="100"
                          />
                          {validationErrors.scaleX && (
                            <p className="text-xs text-red-500">{validationErrors.scaleX}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="rect-scaleY" className="text-xs">Scale Y</Label>
                          <Input
                            id="rect-scaleY"
                            type="number"
                            value={editValues.scaleY ?? 1}
                            onChange={(e) => updateValue('scaleY', e.target.value)}
                            className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                            step="0.01"
                            min="0.01"
                            max="100"
                          />
                          {validationErrors.scaleY && (
                            <p className="text-xs text-red-500">{validationErrors.scaleY}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="rect-mirror" className="text-xs">Mirror</Label>
                        <Select
                          value={editValues.mirror || 'none'}
                          onValueChange={(value) => updateValue('mirror', value)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="horizontal">Horizontal</SelectItem>
                            <SelectItem value="vertical">Vertical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="space-y-1">
                      <Label htmlFor="rect-type" className="text-xs text-slate-300">Window Type</Label>
                    <select
                      id="rect-type"
                      value={editValues.type || 'fixed'}
                      onChange={(e) => updateValue('type', e.target.value)}
                      className="w-full h-8 text-xs border rounded px-2 bg-slate-800/50 border-slate-700/50 text-slate-200 focus:border-amber-600/50 focus:ring-amber-600/20"
                    >
                      <option value="fixed">Fixed</option>
                      <option value="casement">Casement</option>
                      <option value="tilt-turn">Tilt-Turn</option>
                      <option value="sliding">Sliding</option>
                      <option value="pivot">Pivot</option>
                    </select>
                  </div>
                </>
              )}
              
              {selection.type === 'circle' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="circle-cx" className="text-xs">Center X (mm)</Label>
                      <Input
                        id="circle-cx"
                        type="number"
                        value={editValues.cx ?? ''}
                        onChange={(e) => updateValue('cx', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="circle-cy" className="text-xs">Center Y (mm)</Label>
                      <Input
                        id="circle-cy"
                        type="number"
                        value={editValues.cy ?? ''}
                        onChange={(e) => updateValue('cy', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="circle-r" className="text-xs">Radius (mm)</Label>
                    <Input
                      id="circle-r"
                      type="number"
                      value={editValues.r ?? ''}
                      onChange={(e) => updateValue('r', e.target.value)}
                      className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                      step="1"
                      min="5"
                    />
                  </div>
                </>
              )}
              
              {selection.type === 'line' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Start Point</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="line-start-x" className="text-xs">X (mm)</Label>
                        <Input
                          id="line-start-x"
                          type="number"
                          value={editValues.startX ?? ''}
                          onChange={(e) => updateValue('startX', e.target.value)}
                          className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                          step="1"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="line-start-y" className="text-xs">Y (mm)</Label>
                        <Input
                          id="line-start-y"
                          type="number"
                          value={editValues.startY ?? ''}
                          onChange={(e) => updateValue('startY', e.target.value)}
                          className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                          step="1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">End Point</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="line-end-x" className="text-xs">X (mm)</Label>
                        <Input
                          id="line-end-x"
                          type="number"
                          value={editValues.endX ?? ''}
                          onChange={(e) => updateValue('endX', e.target.value)}
                          className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                          step="1"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="line-end-y" className="text-xs">Y (mm)</Label>
                        <Input
                          id="line-end-y"
                          type="number"
                          value={editValues.endY ?? ''}
                          onChange={(e) => updateValue('endY', e.target.value)}
                          className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                          step="1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="line-type" className="text-xs">Line Type</Label>
                    <select
                      id="line-type"
                      value={editValues.type || 'solid'}
                      onChange={(e) => updateValue('type', e.target.value)}
                      className="w-full h-8 text-xs border rounded px-2"
                    >
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                    </select>
                  </div>
                </>
              )}
              
              {selection.type === 'arc' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="arc-cx" className="text-xs">Center X (mm)</Label>
                      <Input
                        id="arc-cx"
                        type="number"
                        value={editValues.cx ?? ''}
                        onChange={(e) => updateValue('cx', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="arc-cy" className="text-xs">Center Y (mm)</Label>
                      <Input
                        id="arc-cy"
                        type="number"
                        value={editValues.cy ?? ''}
                        onChange={(e) => updateValue('cy', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="arc-r" className="text-xs">Radius (mm)</Label>
                    <Input
                      id="arc-r"
                      type="number"
                      value={editValues.r ?? ''}
                      onChange={(e) => updateValue('r', e.target.value)}
                      className="h-8 text-xs"
                      step="1"
                      min="5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="arc-start" className="text-xs">Start Angle (°)</Label>
                      <Input
                        id="arc-start"
                        type="number"
                        value={editValues.startAngle ?? ''}
                        onChange={(e) => updateValue('startAngle', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="arc-end" className="text-xs">End Angle (°)</Label>
                      <Input
                        id="arc-end"
                        type="number"
                        value={editValues.endAngle ?? ''}
                        onChange={(e) => updateValue('endAngle', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                      />
                    </div>
                  </div>
                </>
              )}
              
              {selection.type === 'hardware' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="hw-x" className="text-xs">X Position (mm)</Label>
                      <Input
                        id="hw-x"
                        type="number"
                        value={editValues.x ?? ''}
                        onChange={(e) => updateValue('x', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="hw-y" className="text-xs">Y Position (mm)</Label>
                      <Input
                        id="hw-y"
                        type="number"
                        value={editValues.y ?? ''}
                        onChange={(e) => updateValue('y', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="hw-orientation" className="text-xs">Orientation</Label>
                    <select
                      id="hw-orientation"
                      value={editValues.orientation || 'horizontal'}
                      onChange={(e) => updateValue('orientation', e.target.value)}
                      className="w-full h-8 text-xs border rounded px-2"
                    >
                      <option value="horizontal">Horizontal</option>
                      <option value="vertical">Vertical</option>
                    </select>
                  </div>
                </>
              )}
              
              {selection.type === 'structural' && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="struct-position" className="text-xs">Position (mm)</Label>
                    <Input
                      id="struct-position"
                      type="number"
                      value={editValues.position ?? ''}
                      onChange={(e) => updateValue('position', e.target.value)}
                      className="h-8 text-xs"
                      step="1"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="struct-width" className="text-xs">Width (mm)</Label>
                      <Input
                        id="struct-width"
                        type="number"
                        value={editValues.width ?? ''}
                        onChange={(e) => updateValue('width', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                        min="10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="struct-depth" className="text-xs">Depth (mm)</Label>
                      <Input
                        id="struct-depth"
                        type="number"
                        value={editValues.depth ?? ''}
                        onChange={(e) => updateValue('depth', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                        min="10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="struct-height" className="text-xs">Height (mm)</Label>
                      <Input
                        id="struct-height"
                        type="number"
                        value={editValues.height ?? ''}
                        onChange={(e) => updateValue('height', e.target.value)}
                        className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors"
                        step="1"
                        min="10"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="struct-material" className="text-xs">Material</Label>
                    <select
                      id="struct-material"
                      value={editValues.material || 'aluminum'}
                      onChange={(e) => updateValue('material', e.target.value)}
                      className="w-full h-8 text-xs border rounded px-2"
                    >
                      <option value="aluminum">Aluminum</option>
                      <option value="upvc">UPVC</option>
                    </select>
                  </div>
                </>
              )}
            </TabsContent>
            
            {selection.type === 'rectangle' && selection.materialWindow && (
              <TabsContent value="material" className="space-y-4 mt-4">
                <div className="space-y-1">
                  <Label htmlFor="material-type" className="text-xs">Material Type</Label>
                  <select
                    id="material-type"
                    value={editValues.material || selection.materialWindow.material}
                    onChange={(e) => updateValue('material', e.target.value)}
                    className="w-full h-8 text-xs border rounded px-2"
                    disabled
                  >
                    <option value="aluminum">Aluminum</option>
                    <option value="upvc">UPVC</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="system-pack" className="text-xs">System Pack</Label>
                  <Input
                    id="system-pack"
                    type="text"
                    value={editValues.systemPackId || selection.materialWindow.systemPackId}
                    className="h-8 text-xs"
                    disabled
                  />
                </div>
                <div className="p-2 bg-gray-50 rounded text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profile Depth:</span>
                    <span className="font-medium">{selection.materialWindow.profileDepth}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Glazing Pocket:</span>
                    <span className="font-medium">{selection.materialWindow.glazingPocket.depth}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thermal Break:</span>
                    <span className="font-medium">{selection.materialWindow.thermalBreak ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
          
          {/* Action Buttons */}
          {isDirty && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={applyChanges}
                size="sm"
                className="flex-1 h-8 text-xs"
                disabled={Object.keys(validationErrors).length > 0}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Apply
              </Button>
              <Button
                onClick={resetChanges}
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs"
              >
                Reset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Snap Spacing Selector Component
 * 
 * Allows users to select snap spacing for grid alignment.
 */
interface SnapSpacingSelectorProps {
  snapSpacing: number;
  onSnapSpacingChange: (spacing: number) => void;
}

export const SnapSpacingSelector: React.FC<SnapSpacingSelectorProps> = ({
  snapSpacing,
  onSnapSpacingChange
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="snap-spacing" className="text-xs text-slate-300">Snap Spacing (mm)</Label>
      <Select
        value={snapSpacing.toString()}
        onValueChange={(value) => onSnapSpacingChange(parseFloat(value))}
      >
        <SelectTrigger className="h-8 text-xs bg-slate-800/50 border-slate-700/50 focus:border-amber-600/50 focus:ring-amber-600/20 transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SNAP_SPACING_OPTIONS.map((option) => (
            <SelectItem key={option} value={option.toString()}>
              {option} mm
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};


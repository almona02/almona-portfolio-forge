// src/components/fabricator/drafting/DraftingCanvas2D.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useDraftingContext } from './DraftingContext';
import { SnapGrid } from './SnapGrid';
import { DimensionOverlay } from './DimensionOverlay';
import { EgyptianTemplateLibrary } from './EgyptianTemplateLibrary';
import type { Point, Rectangle, DraftingTool } from './types/drafting';

export const DraftingCanvas2D: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedTool, setSelectedTool] = useState<DraftingTool>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  
  const drafting = useDraftingContext();
  
  // Convert mouse to SVG coordinates
  const getSVGPoint = (clientX: number, clientY: number): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (ctm) {
      return pt.matrixTransform(ctm.inverse());
    }
    return { x: 0, y: 0 };
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    const point = getSVGPoint(e.clientX, e.clientY);
    
    switch (selectedTool) {
      case 'rectangle':
        setStartPoint(point);
        setCurrentPoint(point);
        setIsDrawing(true);
        break;
        
      case 'dimension':
        drafting.startDimension(point);
        break;
        
      case 'select':
        drafting.selectElementAt(point);
        break;
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const point = getSVGPoint(e.clientX, e.clientY);
    
    if (isDrawing && startPoint && selectedTool === 'rectangle') {
      setCurrentPoint(point);
      // Preview rectangle
      const rect: Rectangle = {
        x: Math.min(startPoint.x, point.x),
        y: Math.min(startPoint.y, point.y),
        width: Math.abs(point.x - startPoint.x),
        height: Math.abs(point.y - startPoint.y)
      };
      drafting.previewRectangle(rect);
    } else if (selectedTool === 'dimension') {
      drafting.previewDimension(point);
    }
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    const point = getSVGPoint(e.clientX, e.clientY);
    
    if (isDrawing && startPoint && selectedTool === 'rectangle') {
      const rect: Rectangle = {
        x: Math.min(startPoint.x, point.x),
        y: Math.min(startPoint.y, point.y),
        width: Math.abs(point.x - startPoint.x),
        height: Math.abs(point.y - point.y)
      };
      
      // Snap to grid and validate
      const snappedRect = drafting.snapToGrid(rect);
      const validatedRect = drafting.validateAgainstTemplates(snappedRect);
      
      // Only add if it has meaningful size
      if (validatedRect.width > 10 && validatedRect.height > 10) {
        drafting.addRectangle(validatedRect);
      }
      
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
    }
  };
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with input fields
      }
      
      switch (e.key) {
        case 'r': setSelectedTool('rectangle'); break;
        case 'd': setSelectedTool('dimension'); break;
        case 's': setSelectedTool('select'); break;
        case 'Delete': 
        case 'Backspace':
          drafting.deleteSelected(); 
          break;
        case 'Escape': 
          drafting.clearSelection(); 
          setIsDrawing(false);
          setStartPoint(null);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drafting]);
  
  const geometry = drafting.getGeometry();
  
  return (
    <div className="relative w-full h-full bg-white">
      {/* Tool Indicators */}
      <div className="absolute top-4 left-4 z-10">
        <div className="flex gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow">
          {(['rectangle', 'dimension', 'select'] as DraftingTool[]).map((tool) => (
            <button
              key={tool}
              className={`px-3 py-1 rounded text-sm ${
                selectedTool === tool 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setSelectedTool(tool)}
            >
              {tool.charAt(0).toUpperCase() + tool.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDrawing(false);
          setStartPoint(null);
          setCurrentPoint(null);
        }}
        viewBox="0 0 10000 10000"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid */}
        <SnapGrid spacing={50} width={10000} height={10000} />
        
        {/* Egyptian Template Overlay */}
        <EgyptianTemplateLibrary />
        
        {/* Background */}
        <rect width="100%" height="100%" fill="#f9fafb" />
        
        {/* Existing Geometry */}
        {geometry.rectangles.map((rect, i) => (
          <g key={rect.id || i}>
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill="white"
              stroke={drafting.isSelected(i) ? "#3b82f6" : "#d1d5db"}
              strokeWidth={drafting.isSelected(i) ? 3 : 1}
              className="cursor-move"
              onMouseDown={() => drafting.selectElement(i)}
            />
            
            {/* Cell type indicator */}
            <text
              x={rect.x + rect.width / 2}
              y={rect.y + rect.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs fill-gray-500 select-none pointer-events-none"
              fontSize="14"
            >
              {rect.type || 'Fixed'}
            </text>
          </g>
        ))}
        
        {/* Dimension Lines */}
        <DimensionOverlay />
        
        {/* Preview Rectangle (while drawing) */}
        {isDrawing && startPoint && currentPoint && (
          <rect
            x={Math.min(startPoint.x, currentPoint.x)}
            y={Math.min(startPoint.y, currentPoint.y)}
            width={Math.abs(currentPoint.x - startPoint.x)}
            height={Math.abs(currentPoint.y - startPoint.y)}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="4"
            className="pointer-events-none"
          />
        )}
      </svg>
      
      {/* Status Bar */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-gray-600">Tool:</span>
            <span className="ml-2 font-medium">{selectedTool}</span>
          </div>
          <div>
            <span className="text-gray-600">Elements:</span>
            <span className="ml-2 font-medium">
              {geometry.rectangles.length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Snap:</span>
            <span className="ml-2 font-medium">5mm Grid</span>
          </div>
        </div>
      </div>
    </div>
  );
};


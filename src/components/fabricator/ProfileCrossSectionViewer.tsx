/**
 * Profile Cross-Section Viewer
 * Displays profile cross-section image with annotation support
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { ZoomIn, ZoomOut, RotateCw, X } from 'lucide-react';

interface Annotation {
  id: string;
  type: 'point' | 'box' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
}

interface ProfileCrossSectionViewerProps {
  imageUrl?: string;
  annotations?: Annotation[];
  onAnnotationAdd?: (annotation: Omit<Annotation, 'id'>) => void;
  onAnnotationRemove?: (id: string) => void;
  readonly?: boolean;
}

export const ProfileCrossSectionViewer: React.FC<ProfileCrossSectionViewerProps> = ({
  imageUrl,
  annotations = [],
  onAnnotationAdd,
  onAnnotationRemove,
  readonly = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [_dragStart, _setDragStart] = useState({ x: 0, y: 0 });
  const [annotationMode, setAnnotationMode] = useState<'point' | 'box' | null>(null);
  const [drawingBox, setDrawingBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readonly || !annotationMode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / zoom;
    const y = (e.clientY - rect.top - panY) / zoom;

    if (annotationMode === 'point') {
      onAnnotationAdd?.({ type: 'point', x, y });
      setAnnotationMode(null);
    } else if (annotationMode === 'box') {
      setDrawingBox({ startX: x, startY: y, endX: x, endY: y });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && drawingBox && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const endX = (e.clientX - rect.left - panX) / zoom;
      const endY = (e.clientY - rect.top - panY) / zoom;
      setDrawingBox({ ...drawingBox, endX, endY });
    }
  };

  const handleMouseUp = () => {
    if (isDragging && drawingBox && onAnnotationAdd) {
      const width = Math.abs(drawingBox.endX - drawingBox.startX);
      const height = Math.abs(drawingBox.endY - drawingBox.startY);
      if (width > 5 && height > 5) {
        onAnnotationAdd({
          type: 'box',
          x: Math.min(drawingBox.startX, drawingBox.endX),
          y: Math.min(drawingBox.startY, drawingBox.endY),
          width,
          height,
        });
      }
      setDrawingBox(null);
      setIsDragging(false);
      setAnnotationMode(null);
    }
  };

  if (!imageUrl) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-8 text-center text-gray-400">
          <p>No image uploaded</p>
          <p className="text-sm mt-2">Upload a cross-section image to begin</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="p-4">
        {/* Controls */}
        {!readonly && (
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnnotationMode('point')}
              className={`text-gray-300 border-gray-600 hover:bg-gray-700 ${annotationMode === 'point' ? 'bg-blue-500/20 border-blue-500' : ''}`}
            >
              Add Point
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnnotationMode('box')}
              className={`text-gray-300 border-gray-600 hover:bg-gray-700 ${annotationMode === 'box' ? 'bg-blue-500/20 border-blue-500' : ''}`}
            >
              Add Box
            </Button>
            {annotationMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnnotationMode(null)}
                className="text-gray-400"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              <RotateCw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <span className="text-xs text-gray-400 ml-2">
              Zoom: {(zoom * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Image Viewer */}
        <div
          ref={canvasRef}
          className="relative bg-gray-900 border border-gray-700 rounded overflow-hidden"
          style={{ width: '100%', height: '500px', cursor: annotationMode ? 'crosshair' : 'move' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: 'top left',
              position: 'relative',
              width: '100%',
              height: '100%',
            }}
          >
            <img
              src={imageUrl}
              alt="Profile cross-section"
              className="max-w-full max-h-full object-contain"
              draggable={false}
            />

            {/* Annotations */}
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            >
              {annotations.map((annotation) => (
                <g key={annotation.id}>
                  {annotation.type === 'point' && (
                    <circle
                      cx={annotation.x}
                      cy={annotation.y}
                      r={5}
                      fill="#3b82f6"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  )}
                  {annotation.type === 'box' && annotation.width && annotation.height && (
                    <rect
                      x={annotation.x}
                      y={annotation.y}
                      width={annotation.width}
                      height={annotation.height}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="5,5"
                    />
                  )}
                </g>
              ))}

              {/* Drawing box preview */}
              {drawingBox && (
                <rect
                  x={Math.min(drawingBox.startX, drawingBox.endX)}
                  y={Math.min(drawingBox.startY, drawingBox.endY)}
                  width={Math.abs(drawingBox.endX - drawingBox.startX)}
                  height={Math.abs(drawingBox.endY - drawingBox.startY)}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                />
              )}
            </svg>
          </div>
        </div>

        {/* Annotation List */}
        {annotations.length > 0 && (
          <div className="mt-4 p-3 bg-gray-900 rounded border border-gray-700">
            <p className="text-xs text-gray-400 mb-2">Annotations ({annotations.length})</p>
            <div className="space-y-1">
              {annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="flex items-center justify-between p-2 bg-gray-800 rounded text-xs"
                >
                  <span className="text-gray-300">
                    {annotation.type} at ({annotation.x.toFixed(0)}, {annotation.y.toFixed(0)})
                  </span>
                  {!readonly && onAnnotationRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAnnotationRemove(annotation.id)}
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


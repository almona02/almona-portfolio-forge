import { memo } from 'react';
import { GeometryCircle } from '../components/GeometryCircle';
import { GeometryLine } from '../components/GeometryLine';
import { GeometryRectangle } from '../components/GeometryRectangle';
import { HardwareIcon } from '../components/HardwareIcon';
import { StructuralLine } from '../components/StructuralLine';
import type { StructuralElement } from '../types/materialAware';
import type { Annotation, Arc, Circle, DraftingTool, Line, Polygon, Rectangle, Spline } from '../types/drafting';
import { controlPointsToSVGPath } from '../utils/splineUtils';

interface GeometryCounts {
  rectangles: number;
  lines: number;
  circles: number;
  arcs: number;
  polygons: number;
  splines: number;
}

interface GeometryLayerProps {
  visibleGeometry: {
    rectangles: Rectangle[];
    lines: Line[];
    circles: Circle[];
    arcs: Arc[];
    polygons: Polygon[];
    splines: Spline[];
  };
  geometryCounts: GeometryCounts;
  annotations: Annotation[];
  structuralElements: StructuralElement[];
  hardwareElements: import('../types/materialAware').HardwarePlacement[];
  layerStyleMap: Map<string, { color: string; lineType: 'solid' | 'dashed' | 'dotted'; lineWeight: number; strokeDasharray: string; locked: boolean }>;
  selectedElementIndex: number | null;
  hoveredElementIndex: number | null;
  selectedTool: DraftingTool;
  viewportZoom: number;
  onSelectElement: (index: number) => void;
  onHoverElement: (index: number | null) => void;
}

export const GeometryLayer = memo(({
  visibleGeometry,
  geometryCounts,
  annotations,
  structuralElements,
  hardwareElements,
  layerStyleMap,
  selectedElementIndex,
  hoveredElementIndex,
  selectedTool,
  viewportZoom,
  onSelectElement,
  onHoverElement
}: GeometryLayerProps) => {

  const getLayerStyle = (layerId?: string) => {
    return layerStyleMap.get(layerId || '') || layerStyleMap.get('__default__')!;
  };

  const { rectangles, lines, circles, arcs, polygons, splines } = visibleGeometry;

  return (
    <g>
      {/* Rectangles */}
      {rectangles.map((rect, i) => {
        const isSelected = selectedElementIndex === i;
        const isHovered = hoveredElementIndex === i && !isSelected;
        const layerStyle = getLayerStyle(rect.layerId);
        
        return (
          <GeometryRectangle
            key={rect.id || `rect-${i}`}
            rect={rect}
            index={i}
            isSelected={isSelected}
            isHovered={isHovered}
            isLocked={layerStyle.locked}
            layerColor={layerStyle.color}
            layerLineWeight={layerStyle.lineWeight}
            layerStrokeDasharray={layerStyle.strokeDasharray}
            selectedTool={selectedTool}
            viewportZoom={viewportZoom}
            onMouseDown={() => !layerStyle.locked && selectedTool === 'select' && onSelectElement(i)}
            onMouseEnter={() => !layerStyle.locked && selectedTool === 'select' && onHoverElement(i)}
            onMouseLeave={() => hoveredElementIndex === i && onHoverElement(null)}
            onKeyDown={(e) => {
               if (selectedTool === 'select' && !layerStyle.locked && (e.key === 'Enter' || e.key === ' ')) {
                 e.preventDefault();
                 onSelectElement(i);
               }
            }}
          />
        );
      })}

      {/* Lines */}
      {lines.map((line, i) => {
        const isSelected = selectedElementIndex === i;
        const isHovered = hoveredElementIndex === i && !isSelected;
        const layerStyle = getLayerStyle(line.layerId);
        return (
          <GeometryLine
            key={line.id || `line-${i}`}
            line={line}
            index={i}
            isSelected={isSelected}
            isHovered={isHovered}
            isLocked={layerStyle.locked}
            layerColor={layerStyle.color}
            layerLineWeight={layerStyle.lineWeight}
            layerStrokeDasharray={layerStyle.strokeDasharray}
            selectedTool={selectedTool}
            onMouseDown={(e) => {
              if (selectedTool === 'select' && !layerStyle.locked) {
                e.stopPropagation();
                onSelectElement(i);
              }
            }}
            onMouseEnter={() => selectedTool === 'select' && !layerStyle.locked && onHoverElement(i)}
            onMouseLeave={() => hoveredElementIndex === i && onHoverElement(null)}
          />
        );
      })}

      {/* Circles */}
      {circles.map((circle, i) => {
        const layerStyle = getLayerStyle(circle.layerId);
        const isSelected = selectedElementIndex === i;
        const isHovered = hoveredElementIndex === i && !isSelected;
        return (
          <GeometryCircle
             key={circle.id || `circle-${i}`}
             circle={circle}
             index={i}
             isSelected={isSelected}
             isHovered={isHovered}
             isLocked={layerStyle.locked}
             layerColor={layerStyle.color}
             layerLineWeight={layerStyle.lineWeight}
             layerStrokeDasharray={layerStyle.strokeDasharray}
             selectedTool={selectedTool}
             onMouseDown={(e) => {
               if(selectedTool === 'select' && !layerStyle.locked) {
                 e.stopPropagation();
                 onSelectElement(i);
               }
             }}
             onMouseEnter={() => selectedTool === 'select' && !layerStyle.locked && onHoverElement(i)}
             onMouseLeave={() => hoveredElementIndex === i && onHoverElement(null)}
          />
        );
      })}

      {/* Arcs */}
      {arcs.map((arc, i) => {
         const layerStyle = getLayerStyle(arc.layerId);
         const isSelected = selectedElementIndex === i;
         const isHovered = hoveredElementIndex === i && !isSelected;
         const startX = arc.cx + Math.cos(arc.startAngle) * arc.r;
         const startY = arc.cy + Math.sin(arc.startAngle) * arc.r;
         const endX = arc.cx + Math.cos(arc.endAngle) * arc.r;
         const endY = arc.cy + Math.sin(arc.endAngle) * arc.r;
         
         let sweepAngle = arc.endAngle - arc.startAngle;
         if (sweepAngle < 0) sweepAngle += 2 * Math.PI;
         const largeArc = sweepAngle > Math.PI ? 1 : 0;

         const stroke = isSelected ? "#fbbf24" : isHovered ? "#fcd34d" : layerStyle.color;
         const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : layerStyle.lineWeight;

         return (
            <path
              key={arc.id || `arc-${i}`}
              d={`M ${startX} ${startY} A ${arc.r} ${arc.r} 0 ${largeArc} 1 ${endX} ${endY}`}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={layerStyle.strokeDasharray}
              fill="none"
              opacity={layerStyle.locked ? 0.6 : 1}
              className={layerStyle.locked || selectedTool !== 'select' ? "cursor-not-allowed" : "cursor-move"}
              pointerEvents={layerStyle.locked ? "none" : "auto"}
              onMouseDown={(e) => {
                if (selectedTool === 'select' && !layerStyle.locked) {
                  e.stopPropagation();
                  onSelectElement(i);
                }
              }}
              onMouseEnter={() => selectedTool === 'select' && !layerStyle.locked && onHoverElement(i)}
              onMouseLeave={() => hoveredElementIndex === i && onHoverElement(null)}
            />
         );
      })}

      {/* Annotations */}
      {annotations.map((annotation) => (
        <text
          key={annotation.id}
          x={annotation.position.x}
          y={annotation.position.y}
          fill="#1f2937"
          fontSize="14"
          className="select-none pointer-events-none"
        >
          {annotation.text}
        </text>
      ))}

      {/* Structural Elements */}
      {structuralElements.map((element) => (
        <StructuralLine
          key={element.id}
          element={element}
          canvasWidth={10000}
          canvasHeight={10000}
        />
      ))}

      {/* Hardware Elements */}
      {hardwareElements.map((hardware) => (
        <HardwareIcon
          key={hardware.id}
          hardware={hardware}
          scale={1}
        />
      ))}

      {/* Polygons */}
      {polygons.map((polygon, i) => {
        if (polygon.points.length < 2) return null;
        
        // Calculate global index: Rects + Circles + Lines + Arcs + i
        const globalIndex = geometryCounts.rectangles + geometryCounts.circles + geometryCounts.lines + geometryCounts.arcs + i;
        
        const layerStyle = getLayerStyle(polygon.layerId);
        const isSelected = selectedElementIndex === globalIndex;
        const isHovered = hoveredElementIndex === globalIndex && !isSelected;
        
        const pathData = polygon.points.map((p, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ') + (polygon.closed ? ' Z' : '');

        const stroke = isSelected ? "#fbbf24" : isHovered ? "#fcd34d" : layerStyle.color;
        const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : layerStyle.lineWeight;

        return (
          <path
            key={polygon.id || `poly-${i}`}
            d={pathData}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={layerStyle.strokeDasharray}
            fill="none"
            opacity={layerStyle.locked ? 0.6 : 1}
            className={layerStyle.locked || selectedTool !== 'select' ? "cursor-not-allowed" : "cursor-move"}
            pointerEvents={layerStyle.locked ? "none" : "auto"}
            onMouseDown={(e) => {
              if (selectedTool === 'select' && !layerStyle.locked) {
                e.stopPropagation();
                onSelectElement(globalIndex);
              }
            }}
            onMouseEnter={() => selectedTool === 'select' && !layerStyle.locked && onHoverElement(globalIndex)}
            onMouseLeave={() => hoveredElementIndex === globalIndex && onHoverElement(null)}
          />
        );
      })}

      {/* Splines */}
      {splines.map((spline, i) => {
        if (spline.controlPoints.length < 2) return null;

        // Calculate global index: Rects + Circles + Lines + Arcs + Polygons + i
        const globalIndex = geometryCounts.rectangles + geometryCounts.circles + geometryCounts.lines + geometryCounts.arcs + geometryCounts.polygons + i;
        
        const layerStyle = getLayerStyle(spline.layerId);
        const isSelected = selectedElementIndex === globalIndex;
        const isHovered = hoveredElementIndex === globalIndex && !isSelected;
        const pathData = controlPointsToSVGPath(spline.controlPoints, spline.closed || false);

        const stroke = isSelected ? "#fbbf24" : isHovered ? "#fcd34d" : layerStyle.color;
        const strokeWidth = isSelected ? 2.5 : isHovered ? 2 : layerStyle.lineWeight;

        return (
          <path
            key={spline.id || `spline-${i}`}
            d={pathData}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={layerStyle.strokeDasharray}
            fill="none"
            opacity={layerStyle.locked ? 0.6 : 1}
            className={layerStyle.locked || selectedTool !== 'select' ? "cursor-not-allowed" : "cursor-move"}
            pointerEvents={layerStyle.locked ? "none" : "auto"}
            onMouseDown={(e) => {
              if (selectedTool === 'select' && !layerStyle.locked) {
                e.stopPropagation();
                onSelectElement(globalIndex);
              }
            }}
            onMouseEnter={() => selectedTool === 'select' && !layerStyle.locked && onHoverElement(globalIndex)}
            onMouseLeave={() => hoveredElementIndex === globalIndex && onHoverElement(null)}
          />
        );
      })}
    </g>
  );
});

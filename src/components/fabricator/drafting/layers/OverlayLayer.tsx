import { memo } from 'react';
import type { Arc, Circle, DraftingTool, Geometry2D, Line, Point, Polygon, Rectangle } from '../types/drafting';
import { calculateCircleFromThreePoints } from '../utils/geometryUtils';
import { calculateMeasurement } from '../utils/measurementUtils';
import { controlPointsToSVGPath } from '../utils/splineUtils';

interface OverlayLayerProps {
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  selectedTool: DraftingTool;
  mousePosition: Point | null;

  // Box selection
  isBoxSelecting: boolean;
  boxSelectStart: Point | null;
  boxSelectEnd: Point | null;

  // Complex drawing states
  polygonPoints: Point[];
  splinePoints: Point[];
  arcCenter: Point | null; // repurposed as P1
  arcEnd: Point | null; // P2
  arcRadius: number | null; // Legacy/Unused for 3-pt? Keeping for now to avoid break if passed
  arcStartAngle: number | null;

  // Text Input
  textInputMode: { position: Point; text: string } | null;
  onTextInputChange: (text: string) => void;
  onTextSubmit: (text: string) => void;
  onTextCancel: () => void;

  // Block Placement
  activeBlock: {
    geometry: Geometry2D;
    scale: number;
    rotation: number;
  } | null;

  // For dimension measurement
  geometry: Geometry2D;
}

export const OverlayLayer = memo(({
  isDrawing,
  startPoint,
  currentPoint,
  selectedTool,
  mousePosition,
  isBoxSelecting,
  boxSelectStart,
  boxSelectEnd,
  polygonPoints,
  splinePoints,
  arcCenter,
  arcEnd,
  arcRadius: _arcRadius,
  arcStartAngle,
  textInputMode,
  onTextInputChange,
  onTextSubmit,
  onTextCancel,
  activeBlock,
  geometry
}: OverlayLayerProps) => {

  // Helper to transform points for block preview
  const transformPoint = (p: Point, scale: number, rotation: number, offset: Point): Point => {
    const rotationRad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);

    const scaledX = p.x * scale;
    const scaledY = p.y * scale;
    const rotatedX = scaledX * cos - scaledY * sin;
    const rotatedY = scaledX * sin + scaledY * cos;

    return {
      x: rotatedX + offset.x,
      y: rotatedY + offset.y
    };
  };

  return (
    <g className="overlay-layer">
      {/* Block Placement Preview */}
      {activeBlock && mousePosition && (() => {
        const { geometry: blockGeo, scale, rotation } = activeBlock;
        const rotationRad = (rotation * Math.PI) / 180;

        return (
          <g opacity={0.7}>
            {/* Rectangles */}
            {blockGeo.rectangles.map((rect: Rectangle, i: number) => {
              const topLeft = transformPoint({ x: rect.x, y: rect.y }, scale, rotation, mousePosition);
              const width = rect.width * scale;
              const height = rect.height * scale;
              // To rotate rect around placement center (mousePosition), we actually need to transform the rect relative to 0,0 then add mousePosition?
              // The original code was: `transformPoint` did the full transform including adding mousePosition.
              // And it applied a group transform for rotation?
              // Original:
              // const topLeft = transformPoint({ x: rect.x, y: rect.y }); // This included `mousePosition` add.
              // const centerX = topLeft.x + width / 2;
              // const centerY = topLeft.y + height / 2;
              // Transform: `translate(${centerX}, ${centerY}) rotate(${rotation}) translate(${-centerX}, ${-centerY})`
              // Wait, `transformPoint` includes rotation!
              // Original Lines 909-918:
              /*
                const transformPoint = (p: Point): Point => {
                   const scaledX = p.x * blockPlacementScale;
                   // ...
                   const rotatedX = scaledX * cos - scaledY * sin;
                   // ...
                   return { x: rotatedX + mousePosition.x, ... };
                };
              */
              // So the points are ALREADY rotated.
              // THEN why does it do `rotate(${blockPlacementRotation})` on the group in line 931?
              // Ah, `rect` element cannot be rotated by points alone, it needs a transform for orientation if it's axis aligned.
              // If the points are rotated, the rect is no longer axis aligned (unless 90 deg).
              // The original code seems to Double Rotate? Or `transformPoint` finds the top-left corner position, and `rotate` rotates the shape?
              // If `transformPoint` rotates the top-left, `rect` draws from top-left.
              // If we rotate the `rect` group around its center, we get the orientation.
              // Let's copy the logic exactly.

              const centerX = topLeft.x + width / 2;
              const centerY = topLeft.y + height / 2;

              return (
                <g key={`preview-rect-${i}`} transform={`translate(${centerX}, ${centerY}) rotate(${rotation}) translate(${-centerX}, ${-centerY})`}>
                  <rect
                    x={topLeft.x}
                    y={topLeft.y}
                    width={width}
                    height={height}
                    fill="rgba(59, 130, 246, 0.1)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="4,4"
                    className="pointer-events-none"
                  />
                </g>
              );
            })}

            {/* Circles */}
            {blockGeo.circles.map((circle: Circle, i: number) => {
              const center = transformPoint({ x: circle.cx, y: circle.cy }, scale, rotation, mousePosition);
              const radius = circle.r * scale;
              return (
                <circle
                  key={`preview-circle-${i}`}
                  cx={center.x}
                  cy={center.y}
                  r={radius}
                  fill="rgba(59, 130, 246, 0.1)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  className="pointer-events-none"
                />
              );
            })}

            {/* Lines */}
            {blockGeo.lines.map((line: Line, i: number) => {
              const start = transformPoint(line.start, scale, rotation, mousePosition);
              const end = transformPoint(line.end, scale, rotation, mousePosition);
              return (
                <line
                  key={`preview-line-${i}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  className="pointer-events-none"
                />
              );
            })}

            {/* Arcs */}
            {blockGeo.arcs.map((arc: Arc, i: number) => {
              const center = transformPoint({ x: arc.cx, y: arc.cy }, scale, rotation, mousePosition);
              const radius = arc.r * scale;
              const startAngle = arc.startAngle + rotationRad;
              const endAngle = arc.endAngle + rotationRad;

              const startX = center.x + radius * Math.cos(startAngle);
              const startY = center.y + radius * Math.sin(startAngle);
              const endX = center.x + radius * Math.cos(endAngle);
              const endY = center.y + radius * Math.sin(endAngle);

              const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
              const sweep = endAngle > startAngle ? 1 : 0;

              return (
                <path
                  key={`preview-arc-${i}`}
                  d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  className="pointer-events-none"
                />
              );
            })}

            {/* Polygons */}
            {blockGeo.polygons.map((polygon: Polygon, i: number) => {
              const transformedPoints = polygon.points.map(p => transformPoint(p, scale, rotation, mousePosition));
              const pathData = transformedPoints.map((p, idx) =>
                `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
              ).join(' ') + (polygon.closed ? ' Z' : '');

              return (
                <path
                  key={`preview-polygon-${i}`}
                  d={pathData}
                  fill="rgba(59, 130, 246, 0.1)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  className="pointer-events-none"
                />
              );
            })}

            {/* Insertion Point */}
            <circle
              cx={mousePosition.x}
              cy={mousePosition.y}
              r={4}
              fill="#3b82f6"
              stroke="white"
              strokeWidth={2}
              className="pointer-events-none"
            />
          </g>
        );
      })()}

      {/* Preview Drawing Primitives */}
      {isDrawing && startPoint && currentPoint && (
        <>
          {selectedTool === 'rectangle' && (
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

          {selectedTool === 'circle' && (
            <circle
              cx={startPoint.x}
              cy={startPoint.y}
              r={Math.sqrt(Math.pow(currentPoint.x - startPoint.x, 2) + Math.pow(currentPoint.y - startPoint.y, 2))}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="4"
              className="pointer-events-none"
            />
          )}

          {selectedTool === 'line' && (
            <line
              x1={startPoint.x}
              y1={startPoint.y}
              x2={currentPoint.x}
              y2={currentPoint.y}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="4"
              className="pointer-events-none"
            />
          )}

          {selectedTool === 'dimension' && (() => {
            const mode = 'distance';
            const measurement = calculateMeasurement(startPoint, currentPoint, mode, geometry);
            const midX = (startPoint.x + currentPoint.x) / 2;
            const midY = (startPoint.y + currentPoint.y) / 2;
            const angle = Math.atan2(currentPoint.y - startPoint.y, currentPoint.x - startPoint.x);
            const offset = 15;
            const textX = midX + Math.cos(angle + Math.PI / 2) * offset;
            const textY = midY + Math.sin(angle + Math.PI / 2) * offset;

            return (
              <g>
                <line
                  x1={startPoint.x}
                  y1={startPoint.y}
                  x2={currentPoint.x}
                  y2={currentPoint.y}
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="2,2"
                  opacity="0.7"
                  className="pointer-events-none"
                />
                <rect
                  x={textX - 30}
                  y={textY - 8}
                  width={60}
                  height={16}
                  fill="white"
                  fillOpacity="0.9"
                  stroke="#3b82f6"
                  strokeWidth="1"
                  rx="2"
                  className="pointer-events-none"
                />
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#3b82f6"
                  fontSize="11"
                  fontWeight="600"
                  className="pointer-events-none"
                >
                  {measurement.formatted}
                </text>
              </g>
            );
          })()}
        </>
      )}

      {/* Arc Preview (3-Point) */}
      {selectedTool === 'arc' && (() => {
        if (!arcCenter) return null; // No point set
        if (!currentPoint) return null;

        if (!arcEnd) {
          // Phase 1: Drawing P1 -> P2 line (user is selecting End point)
          return (
            <line
              x1={arcCenter.x} y1={arcCenter.y}
              x2={currentPoint.x} y2={currentPoint.y}
              stroke="#3b82f6"
              strokeWidth="1"
              strokeDasharray="4"
              opacity={0.6}
            />
          );
        } else {
          // Phase 2: Drawing Arc P1 -> P2 passing through Mouse (P3)
          const circle = calculateCircleFromThreePoints(arcCenter, arcEnd, currentPoint);
          if (!circle) {
            // Linear / Collinear - draw line preview?
            return (
              <line
                x1={arcCenter.x} y1={arcCenter.y}
                x2={arcEnd.x} y2={arcEnd.y}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="4"
              />
            );
          }

          // Determine directivity (same logic as useCanvasEvents)
          const normalize = (a: number) => (a + 2 * Math.PI) % (2 * Math.PI);
          let s = normalize(circle.startAngle);
          let e = normalize(circle.endAngle);
          const mid = normalize(Math.atan2(currentPoint.y - circle.cy, currentPoint.x - circle.cx));

          let isInside = false;
          if (s <= e) isInside = mid >= s && mid <= e;
          else isInside = mid >= s || mid <= e;

          if (!isInside) {
            // Swap for visualization
            const temp = s; s = e; e = temp;
          }

          let sweep = e - s;
          if (sweep < 0) sweep += 2 * Math.PI;
          const largeArc = sweep > Math.PI ? 1 : 0;

          const startX = circle.cx + Math.cos(s) * circle.r;
          const startY = circle.cy + Math.sin(s) * circle.r;
          const endX = circle.cx + Math.cos(e) * circle.r;
          const endY = circle.cy + Math.sin(e) * circle.r;

          return (
            <path
              d={`M ${startX} ${startY} A ${circle.r} ${circle.r} 0 ${largeArc} 1 ${endX} ${endY}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="4"
              className="pointer-events-none"
            />
          );
        }
      })()}

      {/* Arc Indicators */}
      {arcCenter && selectedTool === 'arc' && (
        <>
          <circle cx={arcCenter.x} cy={arcCenter.y} r={4} fill="#3b82f6" />
          {arcStartAngle !== null && (
            <circle
              cx={arcCenter.x + Math.cos(arcStartAngle) * 30}
              cy={arcCenter.y + Math.sin(arcStartAngle) * 30}
              r={4}
              fill="#3b82f6"
            />
          )}
        </>
      )}

      {/* Polygon Preview */}
      {polygonPoints.length > 0 && selectedTool === 'polygon' && (
        <g>
          {polygonPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="#3b82f6" />
          ))}
          {polygonPoints.length > 1 && (
            <polyline
              points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="4"
              className="pointer-events-none"
            />
          )}
          {currentPoint && (
            <line
              x1={polygonPoints[polygonPoints.length - 1].x}
              y1={polygonPoints[polygonPoints.length - 1].y}
              x2={currentPoint.x}
              y2={currentPoint.y}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="4"
              className="pointer-events-none"
            />
          )}
        </g>
      )}

      {/* Spline Preview */}
      {splinePoints.length > 0 && selectedTool === 'spline' && (() => {
        const pathData = splinePoints.length > 1 ? controlPointsToSVGPath(splinePoints, false) : '';
        return (
          <g>
            {splinePoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={4} fill="#3b82f6" />
            ))}
            {splinePoints.length > 1 && pathData && (
              <path
                d={pathData}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="4"
                className="pointer-events-none"
              />
            )}
            {currentPoint && splinePoints.length === 1 && (
              <circle cx={currentPoint.x} cy={currentPoint.y} r={4} fill="#3b82f6" opacity={0.5} />
            )}
          </g>
        );
      })()}

      {/* Box Selection */}
      {isBoxSelecting && boxSelectStart && boxSelectEnd && (
        <rect
          x={Math.min(boxSelectStart.x, boxSelectEnd.x)}
          y={Math.min(boxSelectStart.y, boxSelectEnd.y)}
          width={Math.abs(boxSelectEnd.x - boxSelectStart.x)}
          height={Math.abs(boxSelectEnd.y - boxSelectStart.y)}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4,4"
          className="pointer-events-none"
        />
      )}

      {/* Text Input Mode */}
      {textInputMode && (
        <foreignObject
          x={textInputMode.position.x}
          y={textInputMode.position.y}
          width="200"
          height="30"
        >
          <input
            type="text"
            autoFocus
            value={textInputMode.text}
            onChange={(e) => onTextInputChange(e.target.value)}
            onBlur={() => onTextSubmit(textInputMode.text)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onTextSubmit(textInputMode.text);
              else if (e.key === 'Escape') onTextCancel();
            }}
            className="px-2 py-1 border border-amber-600/30 rounded text-sm bg-slate-900/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            placeholder="Enter text..."
          />
        </foreignObject>
      )}

    </g>
  );
});

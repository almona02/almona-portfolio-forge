// src/components/fabricator/drafting/utils/dxfImporter.ts

/**
 * DXF Import Utilities
 * 
 * Gold-tier DXF import functionality for CAD file compatibility.
 * Supports basic DXF entity types: LINE, CIRCLE, ARC, POLYLINE.
 * 
 * Precision: Maintains 0.01mm precision during import
 * Performance: Optimized for large DXF files
 */

import type { Arc, Circle, Geometry2D, Line, Point } from '../types/drafting';
import { normalizeCoordinate, roundToPrecision } from './precisionUtils';

/**
 * DXF Group Code Types
 */
const DXF_GROUP_CODES = {
  ENTITY_TYPE: '0',
  LAYER: '8',
  X_COORD: '10',
  Y_COORD: '20',
  Z_COORD: '30',
  RADIUS: '40',
  START_ANGLE: '50',
  END_ANGLE: '51',
  CLOSED_FLAG: '70',
  VERTEX_COUNT: '66',
} as const;

/**
 * DXF Entity Types
 */
const DXF_ENTITY_TYPES = {
  LINE: 'LINE',
  CIRCLE: 'CIRCLE',
  ARC: 'ARC',
  POLYLINE: 'POLYLINE',
  LWPOLYLINE: 'LWPOLYLINE',
  VERTEX: 'VERTEX',
  SEQEND: 'SEQEND',
} as const;

/**
 * Parse DXF file content and extract geometry
 * 
 * @param dxfContent - DXF file content as string
 * @returns Geometry2D object with extracted geometry
 */
export function importFromDXF(dxfContent: string): Geometry2D {
  if (!dxfContent || typeof dxfContent !== 'string') {
    throw new Error('DXF content must be a non-empty string');
  }

  if (dxfContent.length > 100 * 1024 * 1024) { // 100MB limit
    throw new Error('DXF file is too large (maximum 100MB)');
  }

  const lines = dxfContent.split(/\r?\n/);
  const geometry: Geometry2D = {
    rectangles: [],
    lines: [],
    circles: [],
    arcs: [],
    polygons: [],
    splines: [],
    points: []
  };

  let i = 0;
  let inEntitiesSection = false;
  let currentPolyline: Point[] = [];
  let isPolylineClosed = false;

  // Find ENTITIES section
  while (i < lines.length) {
    const line = lines[i].trim();
    
    if (line === '0' && i + 1 < lines.length && lines[i + 1].trim() === 'SECTION') {
      i += 2;
      if (i < lines.length && lines[i].trim() === '2' && i + 1 < lines.length) {
        i++;
        if (lines[i].trim() === 'ENTITIES') {
          inEntitiesSection = true;
          i++;
          break;
        }
      }
    }
    i++;
  }

  if (!inEntitiesSection) {
    throw new Error('DXF file does not contain ENTITIES section');
  }

  // Parse entities
  while (i < lines.length && inEntitiesSection) {
    const code = lines[i]?.trim();
    const value = i + 1 < lines.length ? lines[i + 1]?.trim() : '';

    if (code === '0') {
      // Process any pending polyline
      if (currentPolyline.length > 0) {
        if (currentPolyline.length >= 2) {
          if (isPolylineClosed && currentPolyline.length >= 3) {
            // Convert closed polyline to polygon
            geometry.polygons.push({
              points: currentPolyline.map(p => ({
                x: normalizeCoordinate(p.x),
                y: normalizeCoordinate(p.y)
              })),
              closed: true
            });
          } else {
            // Convert to lines
            for (let j = 0; j < currentPolyline.length - 1; j++) {
              geometry.lines.push({
                start: {
                  x: normalizeCoordinate(currentPolyline[j].x),
                  y: normalizeCoordinate(currentPolyline[j].y)
                },
                end: {
                  x: normalizeCoordinate(currentPolyline[j + 1].x),
                  y: normalizeCoordinate(currentPolyline[j + 1].y)
                },
                type: 'solid',
                id: `line-${Date.now()}-${Math.random()}`
              });
            }
          }
        }
        currentPolyline = [];
        isPolylineClosed = false;
      }

      if (value === 'ENDSEC') {
        inEntitiesSection = false;
        break;
      }

      // Parse entity based on type
      i += 2;
      const entityType = value;

      if (entityType === DXF_ENTITY_TYPES.LINE) {
        const line = parseLine(lines, i);
        if (line) {
          geometry.lines.push(line);
        }
      } else if (entityType === DXF_ENTITY_TYPES.CIRCLE) {
        const circle = parseCircle(lines, i);
        if (circle) {
          geometry.circles.push(circle);
        }
      } else if (entityType === DXF_ENTITY_TYPES.ARC) {
        const arc = parseArc(lines, i);
        if (arc) {
          geometry.arcs.push(arc);
        }
      } else if (entityType === DXF_ENTITY_TYPES.POLYLINE || entityType === DXF_ENTITY_TYPES.LWPOLYLINE) {
        const result = parsePolyline(lines, i, entityType);
        if (result) {
          if (result.closed && result.points.length >= 3) {
            geometry.polygons.push({
              points: result.points,
              closed: true
            });
          } else if (result.points.length >= 2) {
            // Convert to lines
            for (let j = 0; j < result.points.length - 1; j++) {
              geometry.lines.push({
                start: result.points[j],
                end: result.points[j + 1],
                type: 'solid',
                id: `line-${Date.now()}-${Math.random()}`
              });
            }
          }
        }
      } else if (entityType === DXF_ENTITY_TYPES.VERTEX) {
        // Vertex for POLYLINE (handled in parsePolyline)
        i -= 2; // Back up to let parsePolyline handle it
        const result = parsePolyline(lines, i, DXF_ENTITY_TYPES.POLYLINE);
        if (result) {
          if (result.closed && result.points.length >= 3) {
            geometry.polygons.push({
              points: result.points,
              closed: true
            });
          } else if (result.points.length >= 2) {
            for (let j = 0; j < result.points.length - 1; j++) {
              geometry.lines.push({
                start: result.points[j],
                end: result.points[j + 1],
                type: 'solid',
                id: `line-${Date.now()}-${Math.random()}`
              });
            }
          }
        }
      }
    } else {
      i++;
    }
  }

  return geometry;
}

/**
 * Parse a LINE entity from DXF
 */
function parseLine(lines: string[], startIndex: number): Line | null {
  let x1: number | null = null;
  let y1: number | null = null;
  let x2: number | null = null;
  let y2: number | null = null;

  for (let i = startIndex; i < Math.min(startIndex + 20, lines.length); i++) {
    const code = lines[i]?.trim();
    const value = i + 1 < lines.length ? lines[i + 1]?.trim() : '';

    if (code === '0') break; // New entity

    if (code === DXF_GROUP_CODES.X_COORD) {
      const val = parseFloat(value);
      if (!isFinite(val)) continue;
      if (x1 === null) x1 = val;
      else if (x2 === null) x2 = val;
    } else if (code === DXF_GROUP_CODES.Y_COORD) {
      const val = parseFloat(value);
      if (!isFinite(val)) continue;
      if (y1 === null) y1 = val;
      else if (y2 === null) y2 = val;
    } else if (code === '11') { // End point X
      const val = parseFloat(value);
      if (isFinite(val)) x2 = val;
    } else if (code === '21') { // End point Y
      const val = parseFloat(value);
      if (isFinite(val)) y2 = val;
    }
  }

  if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
    return {
      start: {
        x: normalizeCoordinate(x1),
        y: normalizeCoordinate(y1)
      },
      end: {
        x: normalizeCoordinate(x2),
        y: normalizeCoordinate(y2)
      },
      type: 'solid',
      id: `line-${Date.now()}-${Math.random()}`
    };
  }

  return null;
}

/**
 * Parse a CIRCLE entity from DXF
 */
function parseCircle(lines: string[], startIndex: number): Circle | null {
  let cx: number | null = null;
  let cy: number | null = null;
  let r: number | null = null;

  for (let i = startIndex; i < Math.min(startIndex + 20, lines.length); i++) {
    const code = lines[i]?.trim();
    const value = i + 1 < lines.length ? lines[i + 1]?.trim() : '';

    if (code === '0') break; // New entity

    if (code === DXF_GROUP_CODES.X_COORD) {
      const val = parseFloat(value);
      if (isFinite(val)) cx = val;
    } else if (code === DXF_GROUP_CODES.Y_COORD) {
      const val = parseFloat(value);
      if (isFinite(val)) cy = val;
    } else if (code === DXF_GROUP_CODES.RADIUS) {
      const val = parseFloat(value);
      if (isFinite(val) && val > 0) r = val;
    }
  }

  if (cx !== null && cy !== null && r !== null && r > 0) {
    return {
      cx: normalizeCoordinate(cx),
      cy: normalizeCoordinate(cy),
      r: roundToPrecision(r),
      id: `circle-${Date.now()}-${Math.random()}`
    };
  }

  return null;
}

/**
 * Parse an ARC entity from DXF
 */
function parseArc(lines: string[], startIndex: number): Arc | null {
  let cx: number | null = null;
  let cy: number | null = null;
  let r: number | null = null;
  let startAngle: number | null = null;
  let endAngle: number | null = null;

  for (let i = startIndex; i < Math.min(startIndex + 30, lines.length); i++) {
    const code = lines[i]?.trim();
    const value = i + 1 < lines.length ? lines[i + 1]?.trim() : '';

    if (code === '0') break; // New entity

    if (code === DXF_GROUP_CODES.X_COORD) {
      const val = parseFloat(value);
      if (isFinite(val)) cx = val;
    } else if (code === DXF_GROUP_CODES.Y_COORD) {
      const val = parseFloat(value);
      if (isFinite(val)) cy = val;
    } else if (code === DXF_GROUP_CODES.RADIUS) {
      const val = parseFloat(value);
      if (isFinite(val) && val > 0) r = val;
    } else if (code === DXF_GROUP_CODES.START_ANGLE) {
      const val = parseFloat(value);
      if (isFinite(val)) startAngle = (val * Math.PI) / 180; // Convert to radians
    } else if (code === DXF_GROUP_CODES.END_ANGLE) {
      const val = parseFloat(value);
      if (isFinite(val)) endAngle = (val * Math.PI) / 180; // Convert to radians
    }
  }

  if (cx !== null && cy !== null && r !== null && r > 0 && startAngle !== null && endAngle !== null) {
    // Normalize angles to [0, 2π)
    const normalizedStart = ((startAngle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    const normalizedEnd = ((endAngle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);

    return {
      cx: normalizeCoordinate(cx),
      cy: normalizeCoordinate(cy),
      r: roundToPrecision(r),
      startAngle: roundToPrecision(normalizedStart, 0.0001), // High precision for angles
      endAngle: roundToPrecision(normalizedEnd, 0.0001),
      id: `arc-${Date.now()}-${Math.random()}`
    };
  }

  return null;
}

/**
 * Parse a POLYLINE entity from DXF
 */
function parsePolyline(lines: string[], startIndex: number, entityType: string): { points: Point[]; closed: boolean } | null {
  const points: Point[] = [];
  let isClosed = false;
  let i = startIndex;

  // Read polyline header
  for (; i < Math.min(startIndex + 30, lines.length); i++) {
    const code = lines[i]?.trim();
    const value = i + 1 < lines.length ? lines[i + 1]?.trim() : '';

    if (code === '0' && (value === DXF_ENTITY_TYPES.VERTEX || value === DXF_ENTITY_TYPES.SEQEND)) {
      break;
    }

    if (code === DXF_GROUP_CODES.CLOSED_FLAG) {
      const flag = parseInt(value, 10);
      isClosed = (flag & 1) !== 0; // Bit 0 = closed flag
    }
  }

  // For LWPOLYLINE, points are in the header
  if (entityType === DXF_ENTITY_TYPES.LWPOLYLINE) {
    let currentPoint: { x: number | null; y: number | null } = { x: null, y: null };

    for (let j = startIndex; j < Math.min(startIndex + 200, lines.length); j++) {
      const code = lines[j]?.trim();
      const value = j + 1 < lines.length ? lines[j + 1]?.trim() : '';

      if (code === '0') break;

      if (code === DXF_GROUP_CODES.X_COORD) {
        const val = parseFloat(value);
        if (isFinite(val)) {
          if (currentPoint.x !== null && currentPoint.y !== null) {
            points.push({
              x: normalizeCoordinate(currentPoint.x),
              y: normalizeCoordinate(currentPoint.y)
            });
          }
          currentPoint = { x: val, y: null };
        }
      } else if (code === DXF_GROUP_CODES.Y_COORD) {
        const val = parseFloat(value);
        if (isFinite(val)) {
          currentPoint.y = val;
          if (currentPoint.x !== null) {
            points.push({
              x: normalizeCoordinate(currentPoint.x),
              y: normalizeCoordinate(currentPoint.y)
            });
            currentPoint = { x: null, y: null };
          }
        }
      }
    }

    // Add last point if exists
    if (currentPoint.x !== null && currentPoint.y !== null) {
      points.push({
        x: normalizeCoordinate(currentPoint.x),
        y: normalizeCoordinate(currentPoint.y)
      });
    }

    return points.length >= 2 ? { points, closed: isClosed } : null;
  }

  // For POLYLINE, read VERTEX entities
  while (i < lines.length) {
    const code = lines[i]?.trim();
    const value = i + 1 < lines.length ? lines[i + 1]?.trim() : '';

    if (code === '0' && value === DXF_ENTITY_TYPES.SEQEND) {
      break;
    }

    if (code === '0' && value === DXF_ENTITY_TYPES.VERTEX) {
      i += 2;
      let x: number | null = null;
      let y: number | null = null;

      for (let j = i; j < Math.min(i + 20, lines.length); j++) {
        const vCode = lines[j]?.trim();
        const vValue = j + 1 < lines.length ? lines[j + 1]?.trim() : '';

        if (vCode === '0') break;

        if (vCode === DXF_GROUP_CODES.X_COORD) {
          const val = parseFloat(vValue);
          if (isFinite(val)) x = val;
        } else if (vCode === DXF_GROUP_CODES.Y_COORD) {
          const val = parseFloat(vValue);
          if (isFinite(val)) y = val;
        }
      }

      if (x !== null && y !== null) {
        points.push({
          x: normalizeCoordinate(x),
          y: normalizeCoordinate(y)
        });
      }

      // Find next entity
      while (i < lines.length) {
        if (lines[i]?.trim() === '0') break;
        i++;
      }
    } else {
      i++;
    }
  }

  return points.length >= 2 ? { points, closed: isClosed } : null;
}

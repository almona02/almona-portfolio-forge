/**
 * PDF Exporter for Drafting Workbench
 * 
 * Exports drafting geometry to PDF format using vector paths (CAD-style export)
 * 
 * Features:
 * - Vector-based export (scalable, precise)
 * - Supports all geometry types (rectangles, circles, lines, arcs, polygons)
 * - Preserves coordinate system (mm-based)
 * - Layout and scaling options
 * - Constitutional: Tier 0 (visual export only, no execution logic)
 * 
 * @module pdfExporter
 */

import type { Arc, Circle, Geometry2D, Line, Polygon, Rectangle, Spline } from '../types/drafting';
import { sanitizeFilename } from './securityUtils';
import { generateBezierSegments } from './splineUtils';

// Lazy load pdf-lib to reduce initial bundle size
let PDFDocument: any, rgb: any, StandardFonts: any;

/**
 * PDF export options
 */
export interface PDFExportOptions {
  /** Filename (without .pdf extension) */
  filename?: string;
  /** Scale mode: 'fit' (fit to page), 'actual' (1:1 scale), or number (custom scale factor) */
  scale?: 'fit' | 'actual' | number;
  /** Page size: 'A4', 'A3', 'Letter', or [width, height] in points */
  pageSize?: 'A4' | 'A3' | 'Letter' | [number, number];
  /** Orientation: 'portrait' or 'landscape' */
  orientation?: 'portrait' | 'landscape';
  /** Include metadata (title, date, etc.) */
  includeMetadata?: boolean;
  /** Margin in points (default: 50) */
  margin?: number;
}

/**
 * Page size definitions (in points)
 */
const PAGE_SIZES = {
  A4: [595, 842] as [number, number],
  A3: [842, 1191] as [number, number],
  Letter: [612, 792] as [number, number],
};

/**
 * Calculate bounding box of geometry
 */
function calculateBoundingBox(geometry: Geometry2D): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const allPoints: Array<{ x: number; y: number }> = [];

  // Collect points from all geometry types
  geometry.rectangles.forEach(rect => {
    allPoints.push({ x: rect.x, y: rect.y });
    allPoints.push({ x: rect.x + rect.width, y: rect.y });
    allPoints.push({ x: rect.x + rect.width, y: rect.y + rect.height });
    allPoints.push({ x: rect.x, y: rect.y + rect.height });
  });

  geometry.circles.forEach(circle => {
    allPoints.push({ x: circle.cx - circle.r, y: circle.cy - circle.r });
    allPoints.push({ x: circle.cx + circle.r, y: circle.cy + circle.r });
  });

  geometry.lines.forEach(line => {
    allPoints.push(line.start);
    allPoints.push(line.end);
  });

  geometry.arcs.forEach(arc => {
    // Approximate arc bounds (simple bounding box)
    allPoints.push({ x: arc.cx - arc.r, y: arc.cy - arc.r });
    allPoints.push({ x: arc.cx + arc.r, y: arc.cy + arc.r });
  });

  geometry.polygons.forEach(polygon => {
    polygon.points.forEach(point => allPoints.push(point));
  });

  geometry.splines.forEach(spline => {
    spline.controlPoints.forEach(point => allPoints.push(point));
  });

  geometry.points.forEach(point => allPoints.push(point));

  if (allPoints.length === 0) {
    return null;
  }

  const xs = allPoints.map(p => p.x);
  const ys = allPoints.map(p => p.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

/**
 * Calculate scale and offset for geometry
 */
function calculateLayout(
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number },
  pageWidth: number,
  pageHeight: number,
  margin: number,
  scaleMode: 'fit' | 'actual' | number
): { scale: number; offsetX: number; offsetY: number } {
  const geometryWidth = boundingBox.maxX - boundingBox.minX;
  const geometryHeight = boundingBox.maxY - boundingBox.minY;

  if (geometryWidth === 0 || geometryHeight === 0) {
    return { scale: 1, offsetX: margin, offsetY: margin };
  }

  const availableWidth = pageWidth - (margin * 2);
  const availableHeight = pageHeight - (margin * 2);

  let scale: number;

  if (scaleMode === 'fit') {
    // Fit to page
    const scaleX = availableWidth / geometryWidth;
    const scaleY = availableHeight / geometryHeight;
    scale = Math.min(scaleX, scaleY, 10); // Max 10x scale to prevent issues
  } else if (scaleMode === 'actual') {
    // 1:1 scale (1mm = 1 point, but PDF uses points, so 1mm ≈ 2.83465 points)
    // For drafting, we'll use 1mm = 1 point for simplicity (can be adjusted)
    scale = 1;
  } else {
    // Custom scale
    scale = scaleMode;
  }

  // Center geometry on page
  const scaledWidth = geometryWidth * scale;
  const scaledHeight = geometryHeight * scale;
  const offsetX = margin + (availableWidth - scaledWidth) / 2;
  const offsetY = margin + (availableHeight - scaledHeight) / 2;

  return { scale, offsetX, offsetY };
}

/**
 * Convert rectangle to PDF rectangle
 */
function drawRectangle(
  page: any,
  rect: Rectangle,
  scale: number,
  offsetX: number,
  offsetY: number,
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
): void {
  try {
    const x = (rect.x - boundingBox.minX) * scale + offsetX;
    const y = (rect.y - boundingBox.minY) * scale + offsetY;
    const width = rect.width * scale;
    const height = rect.height * scale;

    // PDF coordinates: origin is bottom-left, Y increases upward
    // Our coordinates: origin is top-left, Y increases downward
    // Need to flip Y coordinate
    const pageHeight = page.getHeight();
    const pdfY = pageHeight - (y + height);

    page.drawRectangle({
      x,
      y: pdfY,
      width,
      height,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });
  } catch (error) {
    console.warn('Failed to draw rectangle:', error);
  }
}

/**
 * Convert circle to PDF circle
 */
function drawCircle(
  page: any,
  circle: Circle,
  scale: number,
  offsetX: number,
  offsetY: number,
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
): void {
  try {
    const cx = (circle.cx - boundingBox.minX) * scale + offsetX;
    const cy = (circle.cy - boundingBox.minY) * scale + offsetY;
    const radius = circle.r * scale;

    // PDF coordinates: origin is bottom-left, Y increases upward
    const pageHeight = page.getHeight();
    const pdfCy = pageHeight - cy;

    // pdf-lib drawCircle uses diameter for size parameter
    page.drawCircle({
      x: cx,
      y: pdfCy,
      size: radius * 2, // pdf-lib uses diameter (radius * 2)
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });
  } catch (error) {
    console.warn('Failed to draw circle:', error);
  }
}

/**
 * Convert line to PDF line
 */
function drawLine(
  page: any,
  line: Line,
  scale: number,
  offsetX: number,
  offsetY: number,
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
): void {
  try {
    const x1 = (line.start.x - boundingBox.minX) * scale + offsetX;
    const y1 = (line.start.y - boundingBox.minY) * scale + offsetY;
    const x2 = (line.end.x - boundingBox.minX) * scale + offsetX;
    const y2 = (line.end.y - boundingBox.minY) * scale + offsetY;

    // PDF coordinates: origin is bottom-left, Y increases upward
    const pageHeight = page.getHeight();
    const pdfY1 = pageHeight - y1;
    const pdfY2 = pageHeight - y2;

    page.drawLine({
      start: { x: x1, y: pdfY1 },
      end: { x: x2, y: pdfY2 },
      thickness: line.type === 'dashed' ? 0.5 : 0.5,
      color: rgb(0, 0, 0),
      // Note: pdf-lib doesn't support dashed lines directly, would need SVG path
      // For now, draw as solid line
    });
  } catch (error) {
    console.warn('Failed to draw line:', error);
  }
}

/**
 * Convert arc to PDF path (using line approximation)
 * Note: pdf-lib doesn't have native arc support, so we approximate with lines
 */
function drawArc(
  page: any,
  arc: Arc,
  scale: number,
  offsetX: number,
  offsetY: number,
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
): void {
  try {
    const cx = (arc.cx - boundingBox.minX) * scale + offsetX;
    const cy = (arc.cy - boundingBox.minY) * scale + offsetY;
    const radius = arc.r * scale;

    // PDF coordinates: origin is bottom-left, Y increases upward
    const pageHeight = page.getHeight();
    const pdfCy = pageHeight - cy;

    // Approximate arc with multiple line segments
    const numSegments = Math.max(8, Math.ceil(Math.abs(arc.endAngle - arc.startAngle) / (Math.PI / 4)) * 4);
    const angleStep = (arc.endAngle - arc.startAngle) / numSegments;

    for (let i = 0; i < numSegments; i++) {
      const angle1 = arc.startAngle + (i * angleStep);
      const angle2 = arc.startAngle + ((i + 1) * angleStep);

      const x1 = cx + radius * Math.cos(angle1);
      const y1 = pdfCy - radius * Math.sin(angle1);
      const x2 = cx + radius * Math.cos(angle2);
      const y2 = pdfCy - radius * Math.sin(angle2);

      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
    }
  } catch (error) {
    console.warn('Failed to draw arc:', error);
  }
}

/**
 * Convert polygon to PDF path
 */
function drawPolygon(
  page: any,
  polygon: Polygon,
  scale: number,
  offsetX: number,
  offsetY: number,
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
): void {
  try {
    if (polygon.points.length < 2) return;

    const pageHeight = page.getHeight();
    
    // Draw polygon as connected lines
    for (let i = 0; i < polygon.points.length; i++) {
      const point1 = polygon.points[i];
      const point2 = polygon.points[(i + 1) % polygon.points.length];
      
      const x1 = (point1.x - boundingBox.minX) * scale + offsetX;
      const y1 = (point1.y - boundingBox.minY) * scale + offsetY;
      const pdfY1 = pageHeight - y1;
      
      const x2 = (point2.x - boundingBox.minX) * scale + offsetX;
      const y2 = (point2.y - boundingBox.minY) * scale + offsetY;
      const pdfY2 = pageHeight - y2;

      // Draw line if polygon is closed or if not the last segment
      if (polygon.closed || i < polygon.points.length - 1) {
        page.drawLine({
          start: { x: x1, y: pdfY1 },
          end: { x: x2, y: pdfY2 },
          thickness: 0.5,
          color: rgb(0, 0, 0),
        });
      }
    }
  } catch (error) {
    console.warn('Failed to draw polygon:', error);
  }
}

/**
 * Convert spline to PDF path using cubic bezier curves
 */
function drawSpline(
  page: any,
  spline: Spline,
  scale: number,
  offsetX: number,
  offsetY: number,
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number }
): void {
  try {
    if (spline.controlPoints.length < 2) return;

    const pageHeight = page.getHeight();
    const segments = generateBezierSegments(spline.controlPoints);

    if (segments.length === 0) return;

    // Draw bezier segments using lines (pdf-lib doesn't have native bezier support in drawPath)
    // Approximate bezier curves with multiple line segments
    const numSteps = 20; // Number of steps per bezier segment

    for (const seg of segments) {
      const points: Array<{ x: number; y: number }> = [];
      
      for (let i = 0; i <= numSteps; i++) {
        const t = i / numSteps;
        // Cubic bezier formula: (1-t)^3*P0 + 3*(1-t)^2*t*P1 + 3*(1-t)*t^2*P2 + t^3*P3
        const mt = 1 - t;
        const x = mt * mt * mt * seg.p0.x + 3 * mt * mt * t * seg.p1.x + 3 * mt * t * t * seg.p2.x + t * t * t * seg.p3.x;
        const y = mt * mt * mt * seg.p0.y + 3 * mt * mt * t * seg.p1.y + 3 * mt * t * t * seg.p2.y + t * t * t * seg.p3.y;
        
        const pdfX = (x - boundingBox.minX) * scale + offsetX;
        const pdfY = (y - boundingBox.minY) * scale + offsetY;
        const pdfYCoord = pageHeight - pdfY;
        
        points.push({ x: pdfX, y: pdfYCoord });
      }

      // Draw as connected lines
      for (let i = 0; i < points.length - 1; i++) {
        page.drawLine({
          start: points[i],
          end: points[i + 1],
          thickness: 0.5,
          color: rgb(0, 0, 0),
        });
      }
    }

    // Close if needed
    if (spline.closed && segments.length > 0) {
      const lastSeg = segments[segments.length - 1];
      const firstSeg = segments[0];
      const lastPoint = {
        x: (lastSeg.p3.x - boundingBox.minX) * scale + offsetX,
        y: pageHeight - ((lastSeg.p3.y - boundingBox.minY) * scale + offsetY)
      };
      const firstPoint = {
        x: (firstSeg.p0.x - boundingBox.minX) * scale + offsetX,
        y: pageHeight - ((firstSeg.p0.y - boundingBox.minY) * scale + offsetY)
      };
      page.drawLine({
        start: lastPoint,
        end: firstPoint,
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
    }
  } catch (error) {
    console.warn('Failed to draw spline:', error);
  }
}

/**
 * Generate PDF document from geometry
 */
async function generatePDF(geometry: Geometry2D, options: PDFExportOptions = {}): Promise<Uint8Array> {
  // Lazy load pdf-lib
  if (!PDFDocument) {
    const mod = await import('pdf-lib');
    PDFDocument = mod.PDFDocument;
    rgb = mod.rgb;
    StandardFonts = mod.StandardFonts;
  }

  const pdfDoc = await PDFDocument.create();

  // Determine page size
  const pageSizeDef = typeof options.pageSize === 'string' 
    ? PAGE_SIZES[options.pageSize] 
    : options.pageSize || PAGE_SIZES.A4;
  
  const [pageWidth, pageHeight] = options.orientation === 'landscape'
    ? [pageSizeDef[1], pageSizeDef[0]]
    : pageSizeDef;

  const margin = options.margin ?? 50;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Calculate bounding box
  const boundingBox = calculateBoundingBox(geometry);
  if (!boundingBox) {
    // Empty geometry - just add a message
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText('No geometry to export', {
      x: margin,
      y: pageHeight - margin - 20,
      size: 12,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    return await pdfDoc.save();
  }

  // Calculate layout (scale and offset)
  const { scale, offsetX, offsetY } = calculateLayout(
    boundingBox,
    pageWidth,
    pageHeight,
    margin,
    options.scale || 'fit'
  );

  // Embed fonts (for metadata and annotations)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Add metadata (if requested)
  if (options.includeMetadata) {
    const title = 'Drafting Export';
    const date = new Date().toLocaleDateString();
    
    page.drawText(title, {
      x: margin,
      y: pageHeight - margin - 20,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`Generated: ${date}`, {
      x: margin,
      y: pageHeight - margin - 40,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Draw geometry
  geometry.rectangles.forEach(rect => {
    drawRectangle(page, rect, scale, offsetX, offsetY, boundingBox);
  });

  geometry.circles.forEach(circle => {
    drawCircle(page, circle, scale, offsetX, offsetY, boundingBox);
  });

  geometry.lines.forEach(line => {
    drawLine(page, line, scale, offsetX, offsetY, boundingBox);
  });

  geometry.arcs.forEach(arc => {
    drawArc(page, arc, scale, offsetX, offsetY, boundingBox);
  });

  geometry.polygons.forEach(polygon => {
    drawPolygon(page, polygon, scale, offsetX, offsetY, boundingBox);
  });

  geometry.splines.forEach(spline => {
    drawSpline(page, spline, scale, offsetX, offsetY, boundingBox);
  });

  // Note: Dimensions and annotations are not part of Geometry2D structure
  // They would need to be passed separately if needed in the future

  return await pdfDoc.save();
}

/**
 * Export drafting geometry to PDF format
 * 
 * Constitutional: Tier 0 (visual export only, no execution logic)
 * 
 * @param geometry - Geometry2D to export
 * @param options - PDF export options
 * @throws Error if export fails
 */
export async function exportToPDF(
  geometry: Geometry2D,
  options: PDFExportOptions = {}
): Promise<void> {
  try {
    // Generate PDF
    const pdfBytes = await generatePDF(geometry, options);

    // Sanitize filename
    const defaultFilename = `drafting-${Date.now()}`;
    const filename = options.filename || defaultFilename;
    const sanitizedFilename = sanitizeFilename(filename, 'drafting');
    const finalFilename = sanitizedFilename.endsWith('.pdf') 
      ? sanitizedFilename 
      : `${sanitizedFilename}.pdf`;

    // Create blob and download
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to export PDF file';
    console.error('Error exporting PDF:', error);
    throw new Error(errorMessage);
  }
}

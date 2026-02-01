// src/components/fabricator/drafting/utils/dxfExporter.ts
import type { Geometry2D } from '../types/drafting';
import { sanitizeFilename } from './securityUtils';

/**
 * Export drafting geometry to DXF format
 * DXF (Drawing Exchange Format) is a CAD data file format
 * This implementation creates a basic DXF file compatible with AutoCAD and other CAD software
 */
export function exportToDXF(geometry: Geometry2D, filename: string = 'drafting.dxf'): void {
  const dxfContent = generateDXF(geometry);
  
  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(filename, 'drafting');
  const finalFilename = sanitizedFilename.endsWith('.dxf') ? sanitizedFilename : `${sanitizedFilename}.dxf`;
  
  // Create blob and download
  try {
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting DXF:', error);
    throw new Error('Failed to export DXF file');
  }
}

/**
 * Generate DXF file content from geometry
 */
function generateDXF(geometry: Geometry2D): string {
  const lines: string[] = [];
  
  // DXF Header
  lines.push('0');
  lines.push('SECTION');
  lines.push('2');
  lines.push('HEADER');
  lines.push('9');
  lines.push('$ACADVER');
  lines.push('1');
  lines.push('AC1015'); // AutoCAD 2000 format
  lines.push('0');
  lines.push('ENDSEC');
  
  // DXF Tables
  lines.push('0');
  lines.push('SECTION');
  lines.push('2');
  lines.push('TABLES');
  lines.push('0');
  lines.push('TABLE');
  lines.push('2');
  lines.push('LAYER');
  lines.push('5');
  lines.push('2');
  lines.push('100');
  lines.push('AcDbSymbolTable');
  lines.push('70');
  lines.push('1');
  lines.push('0');
  lines.push('LAYER');
  lines.push('5');
  lines.push('10');
  lines.push('100');
  lines.push('AcDbSymbolTableRecord');
  lines.push('100');
  lines.push('AcDbLayerTableRecord');
  lines.push('2');
  lines.push('0');
  lines.push('70');
  lines.push('0');
  lines.push('62');
  lines.push('7');
  lines.push('6');
  lines.push('CONTINUOUS');
  lines.push('0');
  lines.push('ENDTAB');
  lines.push('0');
  lines.push('ENDSEC');
  
  // DXF Entities Section
  lines.push('0');
  lines.push('SECTION');
  lines.push('2');
  lines.push('ENTITIES');
  
  // Export Rectangles as POLYLINE
  geometry.rectangles.forEach((rect) => {
    const x1 = rect.x;
    const y1 = rect.y;
    const x2 = rect.x + rect.width;
    const y2 = rect.y;
    const x3 = rect.x + rect.width;
    const y3 = rect.y + rect.height;
    const x4 = rect.x;
    const y4 = rect.y + rect.height;
    
    lines.push('0');
    lines.push('POLYLINE');
    lines.push('8');
    lines.push('0');
    lines.push('66');
    lines.push('1');
    lines.push('70');
    lines.push('1'); // Closed polyline
    
    // Vertex 1
    lines.push('0');
    lines.push('VERTEX');
    lines.push('8');
    lines.push('0');
    lines.push('10');
    lines.push(x1.toString());
    lines.push('20');
    lines.push(y1.toString());
    lines.push('30');
    lines.push('0.0');
    
    // Vertex 2
    lines.push('0');
    lines.push('VERTEX');
    lines.push('8');
    lines.push('0');
    lines.push('10');
    lines.push(x2.toString());
    lines.push('20');
    lines.push(y2.toString());
    lines.push('30');
    lines.push('0.0');
    
    // Vertex 3
    lines.push('0');
    lines.push('VERTEX');
    lines.push('8');
    lines.push('0');
    lines.push('10');
    lines.push(x3.toString());
    lines.push('20');
    lines.push(y3.toString());
    lines.push('30');
    lines.push('0.0');
    
    // Vertex 4
    lines.push('0');
    lines.push('VERTEX');
    lines.push('8');
    lines.push('0');
    lines.push('10');
    lines.push(x4.toString());
    lines.push('20');
    lines.push(y4.toString());
    lines.push('30');
    lines.push('0.0');
    
    // Seqend
    lines.push('0');
    lines.push('SEQEND');
  });
  
  // Export Lines
  geometry.lines.forEach((line) => {
    lines.push('0');
    lines.push('LINE');
    lines.push('8');
    lines.push('0');
    lines.push('10');
    lines.push(line.start.x.toString());
    lines.push('20');
    lines.push(line.start.y.toString());
    lines.push('30');
    lines.push('0.0');
    lines.push('11');
    lines.push(line.end.x.toString());
    lines.push('21');
    lines.push(line.end.y.toString());
    lines.push('31');
    lines.push('0.0');
  });
  
  // Export Circles
  geometry.circles.forEach((circle) => {
    lines.push('0');
    lines.push('CIRCLE');
    lines.push('8');
    lines.push('0');
    lines.push('10');
    lines.push(circle.cx.toString());
    lines.push('20');
    lines.push(circle.cy.toString());
    lines.push('30');
    lines.push('0.0');
    lines.push('40');
    lines.push(circle.r.toString());
  });
  
  // Export Arcs
  geometry.arcs.forEach((arc) => {
    const startAngleDeg = (arc.startAngle * 180) / Math.PI;
    const endAngleDeg = (arc.endAngle * 180) / Math.PI;
    
    lines.push('0');
    lines.push('ARC');
    lines.push('8');
    lines.push('0');
    lines.push('10');
    lines.push(arc.cx.toString());
    lines.push('20');
    lines.push(arc.cy.toString());
    lines.push('30');
    lines.push('0.0');
    lines.push('40');
    lines.push(arc.r.toString());
    lines.push('50');
    lines.push(startAngleDeg.toString());
    lines.push('51');
    lines.push(endAngleDeg.toString());
  });
  
  // Export Polygons as POLYLINE
  geometry.polygons.forEach((polygon) => {
    if (polygon.points.length < 2) return;
    
    lines.push('0');
    lines.push('POLYLINE');
    lines.push('8');
    lines.push('0');
    lines.push('66');
    lines.push('1');
    lines.push('70');
    lines.push(polygon.closed ? '1' : '0');
    
    polygon.points.forEach((point) => {
      lines.push('0');
      lines.push('VERTEX');
      lines.push('8');
      lines.push('0');
      lines.push('10');
      lines.push(point.x.toString());
      lines.push('20');
      lines.push(point.y.toString());
      lines.push('30');
      lines.push('0.0');
    });
    
    lines.push('0');
    lines.push('SEQEND');
  });

  // Export Splines as POLYLINE (approximation) or SPLINE entity
  // Using POLYLINE approximation for better compatibility
  geometry.splines.forEach((spline) => {
    if (spline.controlPoints.length < 2) return;

    // Approximate spline as polyline with multiple vertices
    // For simplicity, use control points directly as vertices
    // A more accurate approach would sample the bezier curve, but this is acceptable for DXF
    const points = spline.controlPoints;
    
    lines.push('0');
    lines.push('POLYLINE');
    lines.push('8');
    lines.push('0');
    lines.push('66');
    lines.push('1');
    lines.push('70');
    lines.push(spline.closed ? '1' : '0'); // Closed flag
    
    points.forEach((point) => {
      lines.push('0');
      lines.push('VERTEX');
      lines.push('8');
      lines.push('0');
      lines.push('10');
      lines.push(point.x.toString());
      lines.push('20');
      lines.push(point.y.toString());
      lines.push('30');
      lines.push('0.0');
    });
    
    lines.push('0');
    lines.push('SEQEND');
  });
  
  // End Entities Section
  lines.push('0');
  lines.push('ENDSEC');
  
  // DXF EOF
  lines.push('0');
  lines.push('EOF');
  
  return lines.join('\n');
}

/**
 * Export to JSON format (for ALMONA internal use)
 */
export function exportToJSON(geometry: Geometry2D, metadata?: any): string {
  const exportData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    geometry,
    metadata: metadata || {}
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import from DXF format
 * Re-exported from dxfImporter for convenience
 */
export { importFromDXF } from './dxfImporter';

/**
 * Import from JSON format with validation
 */
export async function importFromJSON(jsonString: string): Promise<{ geometry: Geometry2D; metadata?: any }> {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new Error('JSON string is required');
  }

  if (jsonString.length > 50 * 1024 * 1024) { // 50MB limit
    throw new Error('File is too large (maximum 50MB)');
  }

  let data: any;
  try {
    data = JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file structure: must be an object');
  }

  if (!data.geometry || typeof data.geometry !== 'object') {
    throw new Error('Invalid file structure: geometry is required');
  }

  // Import validation function (will be used if available)
  try {
    const { validateGeometry } = await import('./inputValidator');
    const validatedGeometry = validateGeometry(data.geometry);
    return {
      geometry: validatedGeometry,
      metadata: data.metadata
    };
  } catch (validationError) {
    // If validation fails, still return but log warning
    console.warn('Geometry validation failed:', validationError);
    return {
      geometry: data.geometry,
      metadata: data.metadata
    };
  }
}


/**
 * DXFExportGenerator - DXF format-specific generator
 * Phase 2: Professional Report Generation System
 * Week 3: Enterprise Automation & Customization
 * 
 * Generates AutoCAD-compatible DXF files with QR codes and barcodes for CNC machine integration
 */

import { DXFExportOptions, QRCodeData } from './types';
import { WindowUnit, OptimizationResult, CuttingPlan } from '@/types/fabricator';
import { cuttingListGenerator } from '../reports/CuttingListGenerator';
import { qrBarcodeGenerator } from './QRBarcodeGenerator';

// Lazy import dxf-writer
let DxfWriter: any;

/**
 * DXF export generator
 * Creates AutoCAD-compatible DXF files from cutting optimization data
 */
export class DXFExportGenerator {
  /**
   * Generate DXF export
   */
  async generate(
    project: WindowUnit,
    optimization: OptimizationResult | null,
    options: DXFExportOptions
  ): Promise<Blob> {
    if (!optimization) {
      throw new Error('Optimization data required for DXF export');
    }

    // Lazy load dxf-writer
    if (!DxfWriter) {
      const dxfModule = await import('dxf-writer');
      DxfWriter = dxfModule.default || dxfModule.DxfWriter;
    }

    const units = options.units || 'mm';
    const scale = options.scale || 1;
    const layerName = options.layerName || 'CUTTING_PLAN';

    // Generate report data
    const reportData = cuttingListGenerator.generateReportData(project, optimization);

    // Create DXF writer
    const dxf = new DxfWriter();
    
    // Set units
    if (units === 'mm') {
      dxf.setUnits('Metric');
    } else {
      dxf.setUnits('Imperial');
    }

    // Add header information
    this.addHeader(dxf, project, options);

    // Add cutting plans
    reportData.cuttingPlans.forEach((plan, index) => {
      this.addCuttingPlan(dxf, plan, index + 1, layerName, scale, options);
    });

    // Add annotations if requested
    if (options.includeAnnotations) {
      this.addAnnotations(dxf, reportData, options);
    }

    // Add QR code and barcode data if requested
    if (options.includeQRCode) {
      this.addQRCodeData(dxf, project, options);
      this.addBarcodeData(dxf, reportData, options);
    }

    // Generate DXF content
    const dxfContent = dxf.toDxfString();

    // Create blob
    return new Blob([dxfContent], { type: 'application/dxf' });
  }

  /**
   * Add QR code data as annotation
   */
  private addQRCodeData(dxf: any, project: WindowUnit, options: DXFExportOptions): void {
    const qrLayer = 'QR_CODE';
    const qrData: QRCodeData = {
      projectId: project.id,
      orderNumber: project.orderNumber,
      generatedAt: new Date(),
      reportType: 'cutting_list',
      url: `${window.location.origin}/projects/${project.id}`
    };

    // Add QR code information as text annotation
    const payload = JSON.stringify({
      projectId: qrData.projectId,
      orderNumber: qrData.orderNumber,
      url: qrData.url,
      generatedAt: qrData.generatedAt.toISOString()
    });

    // Add QR code data as text (DXF doesn't support images directly)
    dxf.drawText(
      `QR_CODE_DATA: ${payload}`,
      0,
      -100,
      0,
      qrLayer,
      8
    );

    // Add URL for reference
    dxf.drawText(
      `PROJECT_URL: ${qrData.url}`,
      0,
      -115,
      0,
      qrLayer,
      8
    );
  }

  /**
   * Add barcode data for components
   */
  private addBarcodeData(dxf: any, reportData: any, options: DXFExportOptions): void {
    const barcodeLayer = 'BARCODES';
    let yOffset = -130;

    dxf.drawText(
      'COMPONENT_BARCODES:',
      0,
      yOffset,
      0,
      barcodeLayer,
      8
    );

    yOffset -= 15;

    reportData.cuttingPlans.forEach((plan: any) => {
      plan.cuts.forEach((cut: any) => {
        const barcodeData = qrBarcodeGenerator.generateBarcodeData({
          sku: `SKU-${cut.componentId}`,
          componentId: cut.componentId,
          partNumber: cut.componentType,
          dimensions: `${cut.length}mm`
        });

        dxf.drawText(
          `${cut.componentId}: ${barcodeData}`,
          0,
          yOffset,
          0,
          barcodeLayer,
          6
        );

        yOffset -= 12;
      });
    });
  }

  /**
   * Add header information to DXF
   */
  private addHeader(dxf: any, project: WindowUnit, options: DXFExportOptions): void {
    // Add text layer for project information
    const headerLayer = 'HEADER';
    
    // Project title
    dxf.drawText(
      `Project: ${project.orderNumber}`,
      0,
      0,
      0,
      headerLayer,
      10 // Text height
    );

    // Project type
    dxf.drawText(
      `Type: ${project.type}`,
      0,
      -20,
      0,
      headerLayer,
      8
    );

    // Dimensions
    dxf.drawText(
      `Dimensions: ${project.overallWidth} x ${project.overallHeight} mm`,
      0,
      -35,
      0,
      headerLayer,
      8
    );
  }

  /**
   * Add cutting plan to DXF
   */
  private addCuttingPlan(
    dxf: any,
    plan: any,
    planNumber: number,
    layerName: string,
    scale: number,
    options: DXFExportOptions
  ): void {
    // Calculate Y offset for each plan (stack vertically)
    const yOffset = -(planNumber - 1) * (plan.stockLength * scale + 100);

    // Draw stock piece outline
    const stockWidth = plan.stockLength * scale;
    const stockHeight = 50 * scale; // Fixed height for visualization

    // Draw rectangle for stock piece
    dxf.drawLine(
      0,
      yOffset,
      0,
      stockWidth,
      yOffset,
      0,
      layerName
    );
    dxf.drawLine(
      stockWidth,
      yOffset,
      0,
      stockWidth,
      yOffset + stockHeight,
      0,
      layerName
    );
    dxf.drawLine(
      stockWidth,
      yOffset + stockHeight,
      0,
      0,
      yOffset + stockHeight,
      0,
      layerName
    );
    dxf.drawLine(
      0,
      yOffset + stockHeight,
      0,
      0,
      yOffset,
      0,
      layerName
    );

    // Draw cuts
    let currentPosition = 0;
    plan.cuts.forEach((cut: any, index: number) => {
      const cutX = currentPosition * scale;
      const cutWidth = cut.length * scale;

      // Draw cut line
      dxf.drawLine(
        cutX,
        yOffset,
        0,
        cutX,
        yOffset + stockHeight,
        0,
        `${layerName}_CUTS`
      );

      // Add cut label if annotations enabled
      if (options.includeAnnotations) {
        dxf.drawText(
          `${cut.length.toFixed(0)}mm`,
          cutX + cutWidth / 2,
          yOffset + stockHeight / 2,
          0,
          `${layerName}_LABELS`,
          6
        );
      }

      currentPosition += cut.length;
    });

    // Draw waste segments (different color/layer)
    // This is a simplified version - full implementation would track waste precisely
    if (plan.waste > 0) {
      const wasteLayer = `${layerName}_WASTE`;
      // Waste visualization would go here
    }
  }

  /**
   * Add annotations to DXF
   */
  private addAnnotations(dxf: any, reportData: any, options: DXFExportOptions): void {
    const annotationLayer = 'ANNOTATIONS';

    // Add summary information
    const summaryY = -(reportData.cuttingPlans.length * 600 + 50);

    dxf.drawText(
      `Total Stock Pieces: ${reportData.summary.totalStockPieces}`,
      0,
      summaryY,
      0,
      annotationLayer,
      8
    );

    dxf.drawText(
      `Total Material Used: ${reportData.summary.totalMaterialUsed.toFixed(2)} mm`,
      0,
      summaryY - 15,
      0,
      annotationLayer,
      8
    );

    dxf.drawText(
      `Total Waste: ${reportData.summary.totalWaste.toFixed(2)} mm`,
      0,
      summaryY - 30,
      0,
      annotationLayer,
      8
    );

    dxf.drawText(
      `Average Utilization: ${reportData.summary.averageUtilization.toFixed(1)}%`,
      0,
      summaryY - 45,
      0,
      annotationLayer,
      8
    );
  }
}


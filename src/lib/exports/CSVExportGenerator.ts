/**
 * CSVExportGenerator - CSV format-specific generator
 * Phase 2: Professional Report Generation System
 * Week 3: Enterprise Automation & Customization
 * 
 * Generates Excel-compatible CSV files with QR codes, barcodes, and proper formatting
 */

import { CSVExportOptions, QRCodeData } from './types';
import { WindowUnit, OptimizationResult, CuttingPlan } from '@/types/fabricator';
import { cuttingListGenerator } from '../reports/CuttingListGenerator';
import { qrBarcodeGenerator } from './QRBarcodeGenerator';
import { formatNumber, formatUnit, formatDate, getLocaleConfig, Locale } from '../localization/formatUtils';

/**
 * CSV export generator
 * Creates Excel-compatible CSV files from cutting optimization data
 */
export class CSVExportGenerator {
  /**
   * Generate CSV export
   */
  async generate(
    project: WindowUnit,
    optimization: OptimizationResult | null,
    options: CSVExportOptions
  ): Promise<Blob> {
    if (!optimization) {
      throw new Error('Optimization data required for CSV export');
    }

    const locale = (options.language || 'en') as Locale;
    const localeConfig = getLocaleConfig(locale);
    const delimiter = options.delimiter || (localeConfig.decimalSeparator === ',' ? ';' : ',');
    const decimalSeparator = options.decimalSeparator || localeConfig.decimalSeparator;
    const includeHeaders = options.includeHeaders !== false;

    // Generate report data
    const reportData = cuttingListGenerator.generateReportData(project, optimization);

    // Build CSV content
    const rows: string[] = [];

    // Headers
    if (includeHeaders) {
      rows.push(this.buildHeaderRow(delimiter, locale));
    }

    // Project information
    rows.push(this.buildProjectInfoRow(project, delimiter));
    rows.push([]); // Empty row

    // Summary row
    rows.push(this.buildSummaryRow(reportData.summary, delimiter, decimalSeparator));
    rows.push([]); // Empty row

    // Cutting plans
    reportData.cuttingPlans.forEach((plan, planIndex) => {
      // Plan header
      rows.push(this.buildPlanHeaderRow(plan, planIndex + 1, delimiter));
      
      // Cuts
      plan.cuts.forEach((cut, cutIndex) => {
        rows.push(this.buildCutRow(cut, cutIndex + 1, delimiter, decimalSeparator, locale));
      });

      // Plan summary
      rows.push(this.buildPlanSummaryRow(plan, delimiter, decimalSeparator));
      rows.push([]); // Empty row between plans
    });

    // Add QR code and barcode data if requested
    if (options.includeQRCode) {
      rows.push([]); // Empty row
      rows.push(this.buildQRCodeRow(project, delimiter));
    }

    // Add barcode data for components
    if (options.includeQRCode) {
      rows.push([]); // Empty row
      rows.push(['BARCODES']);
      rows.push(['Component ID', 'SKU', 'Barcode']);
      reportData.cuttingPlans.forEach((plan) => {
        plan.cuts.forEach((cut) => {
          const barcodeData = qrBarcodeGenerator.generateBarcodeData({
            sku: `SKU-${cut.componentId}`,
            componentId: cut.componentId,
            partNumber: cut.componentType,
            dimensions: `${cut.length}mm`
          });
          rows.push([cut.componentId, `SKU-${cut.componentId}`, barcodeData]);
        });
      });
    }

    // Convert to CSV string
    const csvContent = rows.map((row) => this.escapeRow(row, delimiter)).join('\n');

    // Add BOM (Byte Order Mark) for Excel compatibility if needed
    const bom = options.excelCompatible !== false ? '\uFEFF' : '';
    const finalContent = bom + csvContent;

    // Create blob with proper encoding
    // Use UTF-8 with BOM for Excel compatibility
    const encoder = new TextEncoder();
    const encoded = encoder.encode(finalContent);
    
    return new Blob([encoded], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Build QR code row with project information
   */
  private buildQRCodeRow(project: WindowUnit, delimiter: string): string[] {
    const qrData: QRCodeData = {
      projectId: project.id,
      orderNumber: project.orderNumber,
      generatedAt: new Date(),
      reportType: 'cutting_list',
      url: `${window.location.origin}/projects/${project.id}`
    };

    // Generate QR code payload (same as what would be in the QR code)
    const payload = JSON.stringify({
      projectId: qrData.projectId,
      orderNumber: qrData.orderNumber,
      url: qrData.url,
      generatedAt: qrData.generatedAt.toISOString()
    });

    return [
      'QR_CODE_DATA',
      payload,
      `Scan this QR code or visit: ${qrData.url}`
    ];
  }

  /**
   * Build header row with localization
   */
  private buildHeaderRow(delimiter: string, locale: Locale = 'en'): string[] {
    const labels = {
      en: ['Plan', 'Sequence', 'Length (mm)', 'Angle (deg)', 'Component ID', 'Position (mm)', 'Waste (mm)', 'Utilization (%)'],
      tr: ['Plan', 'Sıra', 'Uzunluk (mm)', 'Açı (derece)', 'Bileşen Kimliği', 'Pozisyon (mm)', 'Atık (mm)', 'Kullanım (%)'],
      ar: ['الخطة', 'التسلسل', 'الطول (مم)', 'الزاوية (درجة)', 'معرف المكون', 'الموضع (مم)', 'الهدر (مم)', 'الاستخدام (%)'],
    };
    
    return labels[locale] || labels.en;
  }

  /**
   * Build project information row
   */
  private buildProjectInfoRow(project: WindowUnit, delimiter: string): string[] {
    return [
      `Project: ${project.orderNumber}`,
      `Type: ${project.type}`,
      `Dimensions: ${project.overallWidth} x ${project.overallHeight} mm`,
      `Status: ${project.status}`,
    ];
  }

  /**
   * Build summary row
   */
  private buildSummaryRow(
    summary: any,
    delimiter: string,
    decimalSeparator: string
  ): string[] {
    return [
      'SUMMARY',
      `Total Stock Pieces: ${summary.totalStockPieces}`,
      `Total Material Used: ${this.formatNumberValue(summary.totalMaterialUsed, decimalSeparator, locale)} mm`,
      `Total Waste: ${this.formatNumberValue(summary.totalWaste, decimalSeparator, locale)} mm`,
      `Average Utilization: ${this.formatNumberValue(summary.averageUtilization, decimalSeparator, locale)} %`,
      `Total Cost: ${this.formatNumberValue(summary.totalCost, decimalSeparator, locale)}`,
    ];
  }

  /**
   * Build plan header row
   */
  private buildPlanHeaderRow(plan: any, planNumber: number, delimiter: string): string[] {
    return [
      `PLAN ${planNumber}`,
      `Profile: ${plan.profile.name}`,
      `Stock Length: ${plan.stockLength} mm`,
      `Utilization: ${plan.utilization.toFixed(1)}%`,
      `Waste: ${plan.waste.toFixed(1)} mm`,
    ];
  }

  /**
   * Build cut row
   */
  private buildCutRow(
    cut: any,
    sequence: number,
    delimiter: string,
    decimalSeparator: string,
    locale: Locale = 'en'
  ): string[] {
    return [
      '', // Plan column (empty for cuts)
      sequence.toString(),
      this.formatNumberValue(cut.length, decimalSeparator, locale),
      this.formatNumberValue(cut.angle, decimalSeparator, locale),
      cut.componentId,
      this.formatNumberValue(cut.position, decimalSeparator, locale),
      this.formatNumberValue(cut.waste, decimalSeparator, locale),
      '', // Utilization column (empty for individual cuts)
    ];
  }

  /**
   * Build plan summary row
   */
  private buildPlanSummaryRow(
    plan: any,
    delimiter: string,
    decimalSeparator: string
  ): string[] {
    return [
      'PLAN SUMMARY',
      `Cuts: ${plan.cuts.length}`,
      `Total Length: ${this.formatNumberValue(
        plan.cuts.reduce((sum: number, c: any) => sum + c.length, 0),
        decimalSeparator,
        locale
      )} mm`,
      `Waste: ${this.formatNumberValue(plan.waste, decimalSeparator, locale)} mm`,
      `Utilization: ${this.formatNumberValue(plan.utilization, decimalSeparator, locale)}%`,
    ];
  }

  /**
   * Escape CSV row
   */
  private escapeRow(row: string[], delimiter: string): string {
    return row
      .map((cell) => {
        // Escape quotes and wrap in quotes if contains delimiter, newline, or quote
        if (cell.includes(delimiter) || cell.includes('\n') || cell.includes('"')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      })
      .join(delimiter);
  }

  /**
   * Format number with specified decimal separator
   */
  private formatNumberValue(value: number, decimalSeparator: string, locale: Locale = 'en'): string {
    return formatNumber(value, locale, 2);
  }
}


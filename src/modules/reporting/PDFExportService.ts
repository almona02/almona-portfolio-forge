/**
 * PDFExportService - Handles PDF generation and branding
 * Creates branded PDF reports for projects and cutting lists
 */

// Lazy import pdf-lib to reduce initial bundle size
let PDFDocument: any, rgb: any, StandardFonts: any;
import { WindowUnit, OptimizationResult, CuttingPlan } from '@/types/fabricator';
import { Quote } from '@/modules/commercial/QuotingEngine';

export interface CompanyBranding {
  logo?: string; // Base64 or URL
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface PDFOptions {
  branding: CompanyBranding;
  include3DPreview?: boolean;
  includeCuttingList?: boolean;
  includeAccessories?: boolean;
  includeGlazing?: boolean;
  includeAssemblyGuide?: boolean;
}

export class PDFExportService {
  private pdfDoc: any;
  private branding: CompanyBranding;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private currentPage: any;
  private font: any;
  private boldFont: any;
  private pageNumber: number = 1;

  constructor(branding: CompanyBranding) {
    this.branding = branding;
    this.pageWidth = 595; // A4 width in points
    this.pageHeight = 842; // A4 height in points
    this.margin = 50;
    this.currentY = this.margin;
  }

  private async initialize() {
    if (!PDFDocument) {
      const mod = await import('pdf-lib');
      PDFDocument = mod.PDFDocument;
      rgb = mod.rgb;
      StandardFonts = mod.StandardFonts;
    }

    this.pdfDoc = await PDFDocument.create();
    this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
    this.font = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
    this.boldFont = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);
    this.pageNumber = 1;
  }

  /**
   * Generate Project Quotation PDF
   */
  async generateQuotationPDF(
    project: WindowUnit,
    quote: Quote,
    options: PDFOptions
  ): Promise<Blob> {
    await this.initialize();
    this.currentY = this.margin;

    // Header with branding
    await this.addHeader();

    // Project Information
    await this.addSectionTitle('Project Quotation');
    await this.addProjectInfo(project, quote);

    // Quote Line Items
    await this.addSectionTitle('Quote Details');
    await this.addQuoteLineItems(quote);

    // Summary
    await this.addQuoteSummary(quote);

    // Footer
    await this.addFooter();

    const pdfBytes = await this.pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  /**
   * Generate Cutting List PDF
   */
  async generateCuttingListPDF(
    project: WindowUnit,
    optimization: OptimizationResult,
    options: PDFOptions
  ): Promise<Blob> {
    await this.initialize();
    this.currentY = this.margin;

    // Header
    await this.addHeader();

    // Project Information
    await this.addSectionTitle('Cutting List');
    await this.addProjectInfo(project);

    // Cutting Plans
    await this.addSectionTitle('Cutting Plans');
    for (const [index, plan] of optimization.cuttingPlan.entries()) {
      if (this.currentY > this.pageHeight - 100) {
        this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
        this.currentY = this.margin;
        this.pageNumber++;
      }
      await this.addCuttingPlan(plan, index + 1);
    }

    // Summary
    await this.addCuttingSummary(optimization);

    // Footer
    await this.addFooter();

    const pdfBytes = await this.pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  /**
   * Generate Complete Project Report
   */
  async generateCompleteReport(
    project: WindowUnit,
    optimization: OptimizationResult,
    quote: Quote,
    options: PDFOptions
  ): Promise<Blob> {
    await this.initialize();
    this.currentY = this.margin;

    // Header
    await this.addHeader();

    // Table of Contents
    await this.addTableOfContents();

    // Project Information
    await this.addPageBreak();
    await this.addSectionTitle('Project Information');
    await this.addProjectInfo(project, quote);

    // Cutting List
    if (options.includeCuttingList) {
      await this.addPageBreak();
      await this.addSectionTitle('Cutting List');
      for (const [index, plan] of optimization.cuttingPlan.entries()) {
        if (this.currentY > this.pageHeight - 100) {
          this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
          this.currentY = this.margin;
          this.pageNumber++;
        }
        await this.addCuttingPlan(plan, index + 1);
      }
    }

    // Accessories & Hardware
    if (options.includeAccessories && project.hardware) {
      await this.addPageBreak();
      await this.addSectionTitle('Accessories & Hardware');
      await this.addHardwareList(project.hardware);
    }

    // Glass & Glazing
    if (options.includeGlazing && project.glazing) {
      await this.addPageBreak();
      await this.addSectionTitle('Glass & Glazing Report');
      await this.addGlazingInfo(project.glazing);
    }

    // Assembly Guide
    if (options.includeAssemblyGuide) {
      await this.addPageBreak();
      await this.addSectionTitle('Assembly & Installation Guide');
      await this.addAssemblyGuide(project);
    }

    // Quote Summary
    await this.addPageBreak();
    await this.addSectionTitle('Quotation Summary');
    await this.addQuoteSummary(quote);

    // Footer
    await this.addFooter();

    const pdfBytes = await this.pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

  private async addHeader() {
    // Company Name
    this.currentPage.drawText(this.branding.companyName, {
      x: this.margin,
      y: this.pageHeight - this.currentY,
      size: 18,
      font: this.boldFont,
      color: this.hexToRgb(this.branding.primaryColor || '#FF6B35'),
    });
    this.currentY += 20;

    // Company Details
    const details: string[] = [];
    if (this.branding.address) details.push(this.branding.address);
    if (this.branding.phone) details.push(`Phone: ${this.branding.phone}`);
    if (this.branding.email) details.push(`Email: ${this.branding.email}`);
    if (this.branding.website) details.push(`Website: ${this.branding.website}`);

    details.forEach((detail) => {
      this.currentPage.drawText(detail, {
        x: this.margin,
        y: this.pageHeight - this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0.4, 0.4, 0.4),
      });
      this.currentY += 12;
    });

    this.currentY += 10;
  }

  private async addFooter() {
    const footerY = 30;
    this.currentPage.drawText(
      `Generated on ${new Date().toLocaleDateString()}`,
      {
        x: this.margin,
        y: footerY,
        size: 8,
        font: this.font,
        color: rgb(0.6, 0.6, 0.6),
      }
    );
    this.currentPage.drawText(`Page ${this.pageNumber}`, {
      x: this.pageWidth - this.margin,
      y: footerY,
      size: 8,
      font: this.font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  private async addSectionTitle(title: string) {
    if (this.currentY > this.pageHeight - 100) {
      this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
      this.currentY = this.margin;
      this.pageNumber++;
    }

    this.currentPage.drawText(title, {
      x: this.margin,
      y: this.pageHeight - this.currentY,
      size: 16,
      font: this.boldFont,
      color: this.hexToRgb(this.branding.primaryColor || '#FF6B35'),
    });
    this.currentY += 20;

    // Underline
    const color = this.hexToRgb(this.branding.primaryColor || '#FF6B35');
    this.currentPage.drawLine({
      start: { x: this.margin, y: this.pageHeight - this.currentY },
      end: { x: this.pageWidth - this.margin, y: this.pageHeight - this.currentY },
      thickness: 1,
      color: rgb(color[0] / 255, color[1] / 255, color[2] / 255),
    });
    this.currentY += 15;
  }

  private async addProjectInfo(project: WindowUnit, quote?: Quote) {
    const info: Array<[string, string]> = [
      ['Order Number:', project.orderNumber],
      ['Position Number:', project.posNumber],
      ['Window Type:', project.type],
      ['Dimensions:', `${project.overallWidth}mm × ${project.overallHeight}mm`],
      ['Color:', project.color],
      ['Status:', project.status],
    ];

    if (quote) {
      info.push(['Quote Number:', quote.quoteNumber]);
      info.push(['Valid Until:', quote.validUntil.toLocaleDateString()]);
    }

    info.forEach(([label, value]) => {
      if (this.currentY > this.pageHeight - 50) {
        this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
        this.currentY = this.margin;
        this.pageNumber++;
      }

      this.currentPage.drawText(label, {
        x: this.margin,
        y: this.pageHeight - this.currentY,
        size: 10,
        font: this.boldFont,
        color: rgb(0, 0, 0),
      });
      this.currentPage.drawText(String(value), {
        x: this.margin + 120,
        y: this.pageHeight - this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentY += 15;
    });

    this.currentY += 10;
  }

  private async addQuoteLineItems(quote: Quote) {
    const headers = ['Description', 'Qty', 'Unit Price', 'Total'];
    const colWidths = [300, 60, 80, 80];
    const startX = this.margin;

    // Headers
    this.currentPage.drawText(headers[0], {
      x: startX,
      y: this.pageHeight - this.currentY,
      size: 10,
      font: this.boldFont,
      color: rgb(0, 0, 0),
    });
    headers.slice(1).forEach((header, i) => {
      this.currentPage.drawText(header, {
        x: startX + colWidths[0] + colWidths.slice(1, i + 1).reduce((a, b) => a + b, 0),
        y: this.pageHeight - this.currentY,
        size: 10,
        font: this.boldFont,
        color: rgb(0, 0, 0),
      });
    });
    this.currentY += 20;

    // Line items
    quote.lineItems.forEach((item) => {
      if (this.currentY > this.pageHeight - 50) {
        this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
        this.currentY = this.margin;
        this.pageNumber++;
      }

      this.currentPage.drawText(item.description.substring(0, 40), {
        x: startX,
        y: this.pageHeight - this.currentY,
        size: 9,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentPage.drawText(item.quantity.toString(), {
        x: startX + colWidths[0],
        y: this.pageHeight - this.currentY,
        size: 9,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentPage.drawText(`$${item.unitPrice.toFixed(2)}`, {
        x: startX + colWidths[0] + colWidths[1],
        y: this.pageHeight - this.currentY,
        size: 9,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentPage.drawText(`$${item.totalPrice.toFixed(2)}`, {
        x: startX + colWidths[0] + colWidths[1] + colWidths[2],
        y: this.pageHeight - this.currentY,
        size: 9,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentY += 15;
    });

    this.currentY += 10;
  }

  private async addQuoteSummary(quote: Quote) {
    const summaryY = this.currentY;

    this.currentPage.drawText('Subtotal:', {
      x: this.pageWidth - this.margin - 150,
      y: this.pageHeight - summaryY,
      size: 11,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    this.currentPage.drawText(`$${quote.subtotal.toFixed(2)}`, {
      x: this.pageWidth - this.margin,
      y: this.pageHeight - summaryY,
      size: 11,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    this.currentY += 15;

    this.currentPage.drawText(`Tax (${quote.taxRate}%):`, {
      x: this.pageWidth - this.margin - 150,
      y: this.pageHeight - this.currentY,
      size: 11,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    this.currentPage.drawText(`$${quote.taxAmount.toFixed(2)}`, {
      x: this.pageWidth - this.margin,
      y: this.pageHeight - this.currentY,
      size: 11,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    this.currentY += 15;

    if (quote.discount > 0) {
      this.currentPage.drawText('Discount:', {
        x: this.pageWidth - this.margin - 150,
        y: this.pageHeight - this.currentY,
        size: 11,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentPage.drawText(`-$${quote.discount.toFixed(2)}`, {
        x: this.pageWidth - this.margin,
        y: this.pageHeight - this.currentY,
        size: 11,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentY += 15;
    }

    this.currentPage.drawText('Total:', {
      x: this.pageWidth - this.margin - 150,
      y: this.pageHeight - this.currentY,
      size: 14,
      font: this.boldFont,
      color: this.hexToRgb(this.branding.primaryColor || '#FF6B35'),
    });
    this.currentPage.drawText(`$${quote.total.toFixed(2)}`, {
      x: this.pageWidth - this.margin,
      y: this.pageHeight - this.currentY,
      size: 14,
      font: this.boldFont,
      color: this.hexToRgb(this.branding.primaryColor || '#FF6B35'),
    });
    this.currentY += 20;
  }

  private async addCuttingPlan(plan: CuttingPlan, index: number) {
    this.currentPage.drawText(`Plan ${index}: ${plan.profile.name}`, {
      x: this.margin,
      y: this.pageHeight - this.currentY,
      size: 12,
      font: this.boldFont,
      color: rgb(0, 0, 0),
    });
    this.currentY += 15;

    const details = [
      `Stock Length: ${plan.stockLength}mm`,
      `Utilization: ${plan.utilization.toFixed(1)}%`,
      `Waste: ${plan.totalWaste.toFixed(2)}mm`,
    ];

    details.forEach((detail) => {
      this.currentPage.drawText(detail, {
        x: this.margin,
        y: this.pageHeight - this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentY += 12;
    });

    this.currentPage.drawText('Cuts:', {
      x: this.margin,
      y: this.pageHeight - this.currentY,
      size: 10,
      font: this.boldFont,
      color: rgb(0, 0, 0),
    });
    this.currentY += 12;

    plan.cuts.forEach((cut, cutIndex) => {
      this.currentPage.drawText(
        `  ${cutIndex + 1}. Length: ${cut.length}mm, Angle: ${cut.angle}°`,
        {
          x: this.margin + 10,
          y: this.pageHeight - this.currentY,
          size: 9,
          font: this.font,
          color: rgb(0, 0, 0),
        }
      );
      this.currentY += 12;
    });

    this.currentY += 10;
  }

  private async addCuttingSummary(optimization: OptimizationResult) {
    await this.addSectionTitle('Cutting Summary');

    const summary: Array<[string, string]> = [
      ['Nesting Efficiency:', `${optimization.nestingEfficiency.toFixed(1)}%`],
      ['Waste Percentage:', `${optimization.wastePercentage.toFixed(1)}%`],
      ['Estimated Production Time:', `${optimization.estimatedProductionTime.toFixed(1)} minutes`],
      ['Total Material Cost:', `$${optimization.costBreakdown.materialCost.toFixed(2)}`],
      ['Total Cost:', `$${optimization.costBreakdown.totalCost.toFixed(2)}`],
    ];

    summary.forEach(([label, value]) => {
      this.currentPage.drawText(label, {
        x: this.margin,
        y: this.pageHeight - this.currentY,
        size: 10,
        font: this.boldFont,
        color: rgb(0, 0, 0),
      });
      this.currentPage.drawText(value, {
        x: this.margin + 150,
        y: this.pageHeight - this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentY += 15;
    });
  }

  private async addHardwareList(hardware: any[]) {
    hardware.forEach((item) => {
      if (this.currentY > this.pageHeight - 50) {
        this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
        this.currentY = this.margin;
        this.pageNumber++;
      }

      this.currentPage.drawText(`• ${item.name} (${item.type}) - Qty: ${item.quantity}`, {
        x: this.margin,
        y: this.pageHeight - this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentY += 15;
    });
  }

  private async addGlazingInfo(glazing: any) {
    const info: Array<[string, string]> = [['Type:', glazing.type]];
    if (glazing.thickness) info.push(['Thickness:', `${glazing.thickness}mm`]);
    if (glazing.spacer) info.push(['Spacer:', `${glazing.spacer}mm`]);
    if (glazing.gasFill) info.push(['Gas Fill:', glazing.gasFill]);

    info.forEach(([label, value]) => {
      this.currentPage.drawText(label, {
        x: this.margin,
        y: this.pageHeight - this.currentY,
        size: 10,
        font: this.boldFont,
        color: rgb(0, 0, 0),
      });
      this.currentPage.drawText(value, {
        x: this.margin + 80,
        y: this.pageHeight - this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentY += 15;
    });
  }

  private async addAssemblyGuide(project: WindowUnit) {
    const steps = [
      '1. Prepare all components according to cutting list',
      '2. Assemble frame components with proper corner connections',
      '3. Install hardware (hinges, locks, handles)',
      '4. Insert glazing unit',
      '5. Install weather seals',
      '6. Quality check and final adjustments',
    ];

    steps.forEach((step) => {
      if (this.currentY > this.pageHeight - 50) {
        this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
        this.currentY = this.margin;
        this.pageNumber++;
      }

      this.currentPage.drawText(step, {
        x: this.margin,
        y: this.pageHeight - this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentY += 15;
    });
  }

  private async addTableOfContents() {
    this.currentPage.drawText('Table of Contents', {
      x: this.margin,
      y: this.pageHeight - this.currentY,
      size: 14,
      font: this.boldFont,
      color: rgb(0, 0, 0),
    });
    this.currentY += 20;

    const contents = [
      '1. Project Information',
      '2. Cutting List',
      '3. Accessories & Hardware',
      '4. Glass & Glazing',
      '5. Assembly Guide',
      '6. Quotation Summary',
    ];

    contents.forEach((item) => {
      this.currentPage.drawText(item, {
        x: this.margin,
        y: this.pageHeight - this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentY += 15;
    });
  }

  private async addPageBreak() {
    this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
    this.currentY = this.margin;
    this.pageNumber++;
    await this.addHeader();
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [255, 107, 53]; // Default orange
  }
}

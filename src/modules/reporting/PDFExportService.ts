/**
 * PDFExportService - Handles PDF generation and branding
 * Creates branded PDF reports for projects and cutting lists
 */

// Lazy import pdf-lib to reduce initial bundle size
let PDFDocument: any, rgb: any, StandardFonts: any;
import { generatePatternVisualization, generateWindowUnitsRow } from '@/lib/exports/windowSnapshotGenerator';
import { supabase } from '@/lib/supabase';
import { Quote } from '@/modules/commercial/QuotingEngine';
import { CuttingPlan, OptimizationResult, WindowUnit } from '@/types/fabricator';

export interface CompanyBranding {
  logo?: string; // Base64 or URL
  companyName: string;
  // Optional workshop / production line name for cockpit & workspace headers
  workshopName?: string;
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
  layoutThumbnailUrl?: string;
  includePatternVisualization?: boolean;
  windowUnits?: WindowUnit[];
  includeBarDrawings?: boolean;
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

  private async embedImageFromUrl(url: string) {
    try {
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      try {
        return await this.pdfDoc.embedPng(buffer);
      } catch {
        return await this.pdfDoc.embedJpg(buffer);
      }
    } catch {
      return null;
    }
  }

  /**
   * Embed SVG image from data URL
   * Converts SVG data URL to PNG for PDF embedding
   */
  private async embedSVGFromDataUrl(dataUrl: string): Promise<any> {
    try {
      // Extract base64 data from data URL
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) return null;

      // Decode base64 to get SVG string
      // const _svgString = atob(base64Data);
      
      // Create a temporary image element to convert SVG to PNG
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = async () => {
          try {
            // Create canvas to render SVG
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 800;
            canvas.height = img.height || 600;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }
            ctx.drawImage(img, 0, 0);
            
            // Convert canvas to blob, then to array buffer
            canvas.toBlob(async (blob) => {
              if (!blob) {
                reject(new Error('Failed to convert canvas to blob'));
                return;
              }
              const arrayBuffer = await blob.arrayBuffer();
              try {
                const pngImage = await this.pdfDoc.embedPng(arrayBuffer);
                resolve(pngImage);
              } catch {
                reject(new Error('Failed to embed PNG'));
              }
            }, 'image/png');
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Failed to load SVG image'));
        img.src = dataUrl;
      });
    } catch (error) {
      console.error('Failed to embed SVG:', error);
      return null;
    }
  }

  private async drawImageBlock(url: string, label: string, width = 80, height = 80) {
    const image = await this.embedImageFromUrl(url);
    if (!image) return;

    if (this.currentY > this.pageHeight - height - 80) {
      this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
      this.currentY = this.margin;
      this.pageNumber++;
    }

    this.currentPage.drawImage(image, {
      x: this.margin,
      y: this.pageHeight - this.currentY - height,
      width,
      height,
    });

    this.currentPage.drawText(label, {
      x: this.margin + width + 10,
      y: this.pageHeight - this.currentY - 20,
      size: 10,
      font: this.font,
      color: rgb(0.3, 0.3, 0.3),
    });

    this.currentY += height + 20;
  }

  private async resolveProfileThumbnail(project: WindowUnit): Promise<string | null> {
    try {
      const ids =
        project.components
          ?.map((c: any) => c?.profile?.id)
          .filter((id?: string) => !!id) || [];
      if (!ids.length) return null;
      const { data, error } = await supabase
        .from('fabricator_profiles')
        .select('id, thumbnail_url')
        .in('id', ids)
        .limit(ids.length);
      if (error || !data || !data.length) return null;
      interface ProfileRow {
        id: string;
        thumbnail_url?: string | null;
      }
      const found = (data as ProfileRow[]).find((row) => row.thumbnail_url);
      return (found?.thumbnail_url) || null;
    } catch {
      return null;
    }
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
    
    // Prestige: 3D Window Visualization & Pattern
    const includePattern = options.includePatternVisualization !== false; // Default: true
    
    if (includePattern) {
      await this.addSectionTitle('Design Visualization');
      
      // Multi-unit row visualization (if multiple units provided)
      if (options.windowUnits && options.windowUnits.length > 1) {
        const unitsRow = await generateWindowUnitsRow(options.windowUnits, {
          width: this.pageWidth - (this.margin * 2),
          height: 300,
        });
        
        if (unitsRow) {
          const rowImage = await this.embedSVGFromDataUrl(unitsRow);
          if (rowImage) {
            if (this.currentY > this.pageHeight - 350) {
              this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
              this.currentY = this.margin;
              this.pageNumber++;
            }
            
            const imageWidth = this.pageWidth - (this.margin * 2);
            const imageHeight = 300;
            const imageX = this.margin;
            const imageY = this.pageHeight - this.currentY - imageHeight;
            
            this.currentPage.drawImage(rowImage, {
              x: imageX,
              y: imageY,
              width: imageWidth,
              height: imageHeight,
            });
            
            const prestigeColor = this.hexToRgb(this.branding.primaryColor || '#F59E0B');
            this.currentPage.drawText(`Window Units Layout (${options.windowUnits.length} units)`, {
              x: imageX,
              y: imageY - 15,
              size: 11,
              font: this.boldFont,
              color: rgb(prestigeColor[0] / 255, prestigeColor[1] / 255, prestigeColor[2] / 255),
            });
            
            this.currentY += imageHeight + 30;
          }
        }
      } else {
        // Single unit pattern visualization
        const patternVisualization = generatePatternVisualization(project, {
          width: 500,
          height: 350,
          showLabels: true,
        });
        
        if (patternVisualization) {
          const patternImage = await this.embedSVGFromDataUrl(patternVisualization);
          if (patternImage) {
            if (this.currentY > this.pageHeight - 400) {
              this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
              this.currentY = this.margin;
              this.pageNumber++;
            }
            
            // Draw pattern visualization with prestige styling
            const imageWidth = 500;
            const imageHeight = 350;
            const imageX = this.margin;
            const imageY = this.pageHeight - this.currentY - imageHeight;
            
            this.currentPage.drawImage(patternImage, {
              x: imageX,
              y: imageY,
              width: imageWidth,
              height: imageHeight,
            });
            
            // Add caption with prestige styling
            const prestigeColor = this.hexToRgb(this.branding.primaryColor || '#F59E0B');
            this.currentPage.drawText('Window Pattern Layout', {
              x: imageX,
              y: imageY - 15,
              size: 11,
              font: this.boldFont,
              color: rgb(prestigeColor[0] / 255, prestigeColor[1] / 255, prestigeColor[2] / 255),
            });
            
            this.currentY += imageHeight + 30;
          }
        }
      }
      
      // 3D Preview (if available)
      if (options.layoutThumbnailUrl) {
        await this.drawImageBlock(options.layoutThumbnailUrl, '3D Window Preview', 200, 150);
      }
    }

    // Scope & Technical Summary
    if (quote.projectScope || quote.technicalSummary) {
      await this.addSectionTitle('Scope of Work & Technical Specifications');
      await this.addScopeAndTechnicalSections(project, quote);
    }

    // Quote Line Items
    await this.addSectionTitle('Quote Details');
    await this.addQuoteLineItems(quote);

    // Summary & Commercial Terms
    await this.addQuoteSummary(quote);
    if (quote.paymentTerms || quote.warranty || quote.generalTerms) {
      await this.addSectionTitle('Commercial Terms & Conditions');
      await this.addCommercialSections(quote);
    }

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

    const fallbackProfileThumb = await this.resolveProfileThumbnail(project);

    // Header
    await this.addHeader();

    // Project Information
    await this.addSectionTitle('Cutting List');
    await this.addProjectInfo(project);
    
    // Prestige: Window Pattern Visualization
    const includePattern = options.includePatternVisualization !== false; // Default: true
    
    if (includePattern) {
      await this.addSectionTitle('Window Design Pattern');
      
      // Generate pattern visualization
      const patternVisualization = generatePatternVisualization(project, {
        width: 500,
        height: 350,
        showLabels: true,
      });
      
      if (patternVisualization) {
        const patternImage = await this.embedSVGFromDataUrl(patternVisualization);
        if (patternImage) {
          if (this.currentY > this.pageHeight - 400) {
            this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
            this.currentY = this.margin;
            this.pageNumber++;
          }
          
          // Draw pattern visualization with prestige styling
          const imageWidth = 500;
          const imageHeight = 350;
          const imageX = this.margin;
          const imageY = this.pageHeight - this.currentY - imageHeight;
          
          this.currentPage.drawImage(patternImage, {
            x: imageX,
            y: imageY,
            width: imageWidth,
            height: imageHeight,
          });
          
          // Add caption with prestige styling
          const prestigeColor = this.hexToRgb(this.branding.primaryColor || '#F59E0B');
          this.currentPage.drawText('Window Pattern Layout', {
            x: imageX,
            y: imageY - 15,
            size: 11,
            font: this.boldFont,
            color: rgb(prestigeColor[0] / 255, prestigeColor[1] / 255, prestigeColor[2] / 255),
          });
          
          this.currentY += imageHeight + 30;
        }
      }
    }
    
    // Profile Visual
    const profileThumb =
      (project.components && project.components[0] && (project.components[0].profile as any)?.thumbnailUrl) ||
      (project.components && project.components[0] && (project.components[0].profile as any)?.thumbnail_url) ||
      fallbackProfileThumb ||
      null;
    if (profileThumb) {
      await this.addSectionTitle('Profile Visual');
      await this.drawImageBlock(profileThumb, 'Profile thumbnail', 150, 150);
    }

    // Cutting Plans
    await this.addSectionTitle('Cutting Plans');
    for (const [index, plan] of optimization.cuttingPlan.entries()) {
      if (this.currentY > this.pageHeight - 100) {
        this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
        this.currentY = this.margin;
        this.pageNumber++;
      }
      await this.addCuttingPlan(plan, index + 1, options);
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
        await this.addCuttingPlan(plan, index + 1, options);
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
    const primaryColor = this.hexToRgb(this.branding.primaryColor || '#FF6B35');
    this.currentPage.drawText(this.branding.companyName, {
      x: this.margin,
      y: this.pageHeight - this.currentY,
      size: 18,
      font: this.boldFont,
      color: rgb(primaryColor[0] / 255, primaryColor[1] / 255, primaryColor[2] / 255),
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

    const sectionColor = this.hexToRgb(this.branding.primaryColor || '#FF6B35');
    this.currentPage.drawText(title, {
      x: this.margin,
      y: this.pageHeight - this.currentY,
      size: 16,
      font: this.boldFont,
      color: rgb(sectionColor[0] / 255, sectionColor[1] / 255, sectionColor[2] / 255),
    });
    this.currentY += 20;

    // Underline
    const color = sectionColor;
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

    const totalColor = this.hexToRgb(this.branding.primaryColor || '#FF6B35');
    this.currentPage.drawText('Total:', {
      x: this.pageWidth - this.margin - 150,
      y: this.pageHeight - this.currentY,
      size: 14,
      font: this.boldFont,
      color: rgb(totalColor[0] / 255, totalColor[1] / 255, totalColor[2] / 255),
    });
    this.currentPage.drawText(`$${quote.total.toFixed(2)}`, {
      x: this.pageWidth - this.margin,
      y: this.pageHeight - this.currentY,
      size: 14,
      font: this.boldFont,
      color: rgb(totalColor[0] / 255, totalColor[1] / 255, totalColor[2] / 255),
    });
    this.currentY += 20;
  }

  /**
   * Scope of work & technical summary section
   */
  private async addScopeAndTechnicalSections(_project: WindowUnit, quote: Quote) {
    const scope = quote.projectScope;
    const tech = quote.technicalSummary;

    if (scope) {
      const scopeItems: string[] = [];
      scopeItems.push(scope.scopeOfSupply);
      if (scope.buildingType) {
        scopeItems.push(`Building type: ${scope.buildingType}`);
      }
      if (scope.siteAddress) {
        scopeItems.push(`Site: ${scope.siteAddress}`);
      }
      if (scope.exclusions && scope.exclusions.length > 0) {
        scopeItems.push('Exclusions:');
        scope.exclusions.forEach((ex) => scopeItems.push(`- ${ex}`));
      }
      if (scope.notes) {
        scopeItems.push(scope.notes);
      }

      scopeItems.forEach((line) => {
        if (this.currentY > this.pageHeight - 50) {
          this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
          this.currentY = this.margin;
          this.pageNumber++;
        }
        this.currentPage.drawText(line, {
          x: this.margin,
          y: this.pageHeight - this.currentY,
          size: 10,
          font: this.font,
          color: rgb(0, 0, 0),
        });
        this.currentY += 14;
      });

      this.currentY += 10;
    }

    if (tech) {
      const systemsLabel =
        tech.systems && tech.systems.length > 0
          ? `Systems: ${tech.systems.join(', ')}`
          : undefined;

      const lines: string[] = [];
      if (systemsLabel) lines.push(systemsLabel);
      if (tech.glazingSummary) lines.push(`Glazing: ${tech.glazingSummary}`);
      if (tech.finishSummary) lines.push(`Finish: ${tech.finishSummary}`);
      if (tech.hardwareSummary) lines.push(`Hardware: ${tech.hardwareSummary}`);
      if (tech.performanceSummary) lines.push(`Performance: ${tech.performanceSummary}`);

      lines.forEach((line) => {
        if (this.currentY > this.pageHeight - 50) {
          this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
          this.currentY = this.margin;
          this.pageNumber++;
        }
        this.currentPage.drawText(line, {
          x: this.margin,
          y: this.pageHeight - this.currentY,
          size: 10,
          font: this.font,
          color: rgb(0, 0, 0),
        });
        this.currentY += 14;
      });

      this.currentY += 10;
    }
  }

  /**
   * Payment terms, warranty and general terms
   */
  private async addCommercialSections(quote: Quote) {
    const { paymentTerms, warranty, generalTerms } = quote;

    if (paymentTerms) {
      await this.addSubSectionTitle('Payment Terms');

      const lines: string[] = [];
      lines.push(`Currency: ${paymentTerms.currency}`);
      if (paymentTerms.depositPercentage !== undefined) {
        lines.push(`Deposit: ${paymentTerms.depositPercentage}% on order confirmation`);
      }
      if (paymentTerms.milestones && paymentTerms.milestones.length > 0) {
        lines.push('Milestone payments:');
        paymentTerms.milestones.forEach((m) => {
          const detail =
            m.percentage !== undefined
              ? `${m.label}: ${m.percentage}%`
              : m.fixedAmount !== undefined
              ? `${m.label}: ${paymentTerms.currency} ${m.fixedAmount.toFixed(2)}`
              : m.label;
          lines.push(`- ${detail}`);
        });
      }
      if (paymentTerms.paymentMethods && paymentTerms.paymentMethods.length > 0) {
        lines.push(`Payment methods: ${paymentTerms.paymentMethods.join(', ')}`);
      }
      if (paymentTerms.latePaymentPolicy) {
        lines.push(`Late payment: ${paymentTerms.latePaymentPolicy}`);
      }
      if (paymentTerms.validityDays !== undefined) {
        lines.push(`Offer validity: ${paymentTerms.validityDays} days from issue date`);
      }
      if (paymentTerms.bankDetails) {
        lines.push(`Bank details: ${paymentTerms.bankDetails}`);
      }

      this.renderBulletLines(lines);
      this.currentY += 10;
    }

    if (warranty) {
      await this.addSubSectionTitle('Warranty & After-Sales');

      const lines: string[] = [];
      if (warranty.profilesYears !== undefined) {
        lines.push(`Profiles & finish: ${warranty.profilesYears} years`);
      }
      if (warranty.hardwareYears !== undefined) {
        lines.push(`Hardware: ${warranty.hardwareYears} years`);
      }
      if (warranty.glazingYears !== undefined) {
        lines.push(`Glazing: ${warranty.glazingYears} years`);
      }
      if (warranty.workmanshipYears !== undefined) {
        lines.push(`Workmanship: ${warranty.workmanshipYears} years`);
      }
      if (warranty.notes) {
        lines.push(warranty.notes);
      }

      this.renderBulletLines(lines);
      this.currentY += 10;
    }

    if (generalTerms) {
      await this.addSubSectionTitle('General Terms & Conditions');

      const lines: string[] = [];
      if (generalTerms.validityDays !== undefined) {
        lines.push(`Offer validity: ${generalTerms.validityDays} days from issue date.`);
      }
      if (generalTerms.cancellationPolicy) {
        lines.push(`Cancellation: ${generalTerms.cancellationPolicy}`);
      }
      if (generalTerms.priceAdjustmentClause) {
        lines.push(`Price adjustment: ${generalTerms.priceAdjustmentClause}`);
      }
      if (generalTerms.forceMajeureClause) {
        lines.push(`Force majeure: ${generalTerms.forceMajeureClause}`);
      }
      if (generalTerms.jurisdiction) {
        lines.push(`Jurisdiction: ${generalTerms.jurisdiction}`);
      }
      if (generalTerms.disputeResolution) {
        lines.push(`Dispute resolution: ${generalTerms.disputeResolution}`);
      }

      this.renderBulletLines(lines);
      this.currentY += 10;
    }
  }

  private renderBulletLines(lines: string[]) {
    lines.forEach((line) => {
      if (!line) return;
      if (this.currentY > this.pageHeight - 50) {
        this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
        this.currentY = this.margin;
        this.pageNumber++;
      }
      const text = line.startsWith('-') ? line : `• ${line}`;
      this.currentPage.drawText(text, {
        x: this.margin,
        y: this.pageHeight - this.currentY,
        size: 10,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.currentY += 14;
    });
  }

  private async addSubSectionTitle(title: string) {
    if (this.currentY > this.pageHeight - 60) {
      this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
      this.currentY = this.margin;
      this.pageNumber++;
    }

    this.currentPage.drawText(title, {
      x: this.margin,
      y: this.pageHeight - this.currentY,
      size: 12,
      font: this.boldFont,
      color: rgb(0, 0, 0),
    });
    this.currentY += 16;
  }

  private async addCuttingPlan(plan: CuttingPlan, index: number, options?: PDFOptions) {
    // Prestige: Enhanced cutting plan with bar drawing visualization
    const prestigeColor = this.hexToRgb(this.branding.primaryColor || '#F59E0B');
    
    this.currentPage.drawText(`Plan ${index}: ${plan.profile.name}`, {
      x: this.margin,
      y: this.pageHeight - this.currentY,
      size: 14,
      font: this.boldFont,
      color: rgb(prestigeColor[0] / 255, prestigeColor[1] / 255, prestigeColor[2] / 255),
    });
    this.currentY += 20;

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

    // Prestige: Add bar drawing visualization (if enabled)
    const includeBarDrawings = options?.includeBarDrawings !== false; // Default: true
    if (includeBarDrawings) {
      this.currentY += 10;
      await this.addBarDrawingVisualization(plan);
      this.currentY += 10;
    }

    this.currentPage.drawText('Cuts:', {
      x: this.margin,
      y: this.pageHeight - this.currentY,
      size: 10,
      font: this.boldFont,
      color: rgb(0, 0, 0),
    });
    this.currentY += 12;

    plan.cuts.forEach((cut, cutIndex) => {
      const isMiter45 = cut.angle === 45;
      const angleLabel = isMiter45 ? `${cut.angle}° miter` : `${cut.angle}°`;

      this.currentPage.drawText(
        `  ${cutIndex + 1}. Length: ${cut.length}mm, Angle: ${angleLabel}`,
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

  /**
   * Add bar drawing visualization for a cutting plan
   * Creates a visual representation of the stock bar with cuts
   */
  private async addBarDrawingVisualization(plan: CuttingPlan) {
    if (this.currentY > this.pageHeight - 200) {
      this.currentPage = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
      this.currentY = this.margin;
      this.pageNumber++;
    }

    const barWidth = this.pageWidth - (this.margin * 2);
    const barHeight = 60;
    const startX = this.margin;
    const startY = this.pageHeight - this.currentY - barHeight;
    const stockLength = plan.stockLength || 6000;

    // Draw stock bar outline
    const prestigeColor = this.hexToRgb(this.branding.primaryColor || '#F59E0B');
    this.currentPage.drawRectangle({
      x: startX,
      y: startY,
      width: barWidth,
      height: barHeight,
      borderColor: rgb(prestigeColor[0] / 255, prestigeColor[1] / 255, prestigeColor[2] / 255),
      borderWidth: 2,
      borderOpacity: 0.8,
    });

    // Draw cuts
    let currentPosition = 0;
    const cutColors = [
      rgb(0.23, 0.51, 0.96), // Blue
      rgb(0.02, 0.71, 0.83), // Cyan #06B6D4
      rgb(0.06, 0.73, 0.51), // Green
      rgb(0.96, 0.62, 0.04), // Amber
      rgb(0.94, 0.27, 0.27), // Red
    ];

    plan.cuts.forEach((cut, index) => {
      const cutWidth = (cut.length / stockLength) * barWidth;
      const cutX = startX + (currentPosition / stockLength) * barWidth;
      
      // Draw cut rectangle
      const cutColor = cutColors[index % cutColors.length];
      this.currentPage.drawRectangle({
        x: cutX,
        y: startY + 5,
        width: cutWidth - 2,
        height: barHeight - 10,
        color: cutColor,
        opacity: 0.7,
      });

      // Draw cut label if space allows
      if (cutWidth > 30) {
        this.currentPage.drawText(`${cut.length}mm`, {
          x: cutX + cutWidth / 2 - 15,
          y: startY + barHeight / 2 - 5,
          size: 8,
          font: this.font,
          color: rgb(1, 1, 1),
        });
      }

      // Draw cut line marker
      if (index < plan.cuts.length - 1) {
        this.currentPage.drawLine({
          start: { x: cutX + cutWidth, y: startY },
          end: { x: cutX + cutWidth, y: startY + barHeight },
          thickness: 1,
          color: rgb(0.94, 0.27, 0.27), // Red for cut lines
          opacity: 0.6,
        });
      }

      currentPosition += cut.length;
    });

    // Draw waste segment (if any)
    const totalCutLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
    const wasteLength = stockLength - totalCutLength;
    if (wasteLength > 1) {
      const wasteWidth = (wasteLength / stockLength) * barWidth;
      const wasteX = startX + (totalCutLength / stockLength) * barWidth;
      
      this.currentPage.drawRectangle({
        x: wasteX,
        y: startY + 5,
        width: wasteWidth - 2,
        height: barHeight - 10,
        color: rgb(0.86, 0.15, 0.15), // Red for waste
        opacity: 0.3,
        borderColor: rgb(0.86, 0.15, 0.15),
        borderWidth: 1,
        borderOpacity: 0.5,
      });

      if (wasteWidth > 40) {
        this.currentPage.drawText(`Waste: ${wasteLength.toFixed(0)}mm`, {
          x: wasteX + wasteWidth / 2 - 25,
          y: startY + barHeight / 2 - 5,
          size: 8,
          font: this.font,
          color: rgb(0.86, 0.15, 0.15),
        });
      }
    }

    // Add dimension markers
    this.currentPage.drawText('0', {
      x: startX,
      y: startY - 5,
      size: 8,
      font: this.font,
      color: rgb(0.4, 0.4, 0.4),
    });
    this.currentPage.drawText(`${stockLength}mm`, {
      x: startX + barWidth - 30,
      y: startY - 5,
      size: 8,
      font: this.font,
      color: rgb(0.4, 0.4, 0.4),
    });

    this.currentY += barHeight + 20;
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

  private async addAssemblyGuide(_project: WindowUnit) {
    const steps = [
      '1. Prepare all components according to cutting list',
      '2. For ROCK 60 / 45° systems:',
      '   • Cut all frame profiles at 45° – add 60mm for miter overlap (RC 6111-8).',
      '   • Cut all sash profiles at 45° – deduct 44mm for frame fit (RC 6122).',
      '   • Cut glazing beads at 45° – L - 167mm / H - 205mm (RC 6166).',
      '   • Use corner connectors 1130 (pressure plates) and 1110 (cleats) for all 45° corners.',
      '3. Assemble frame components with proper corner connections',
      '4. Install hardware (hinges 0253, locks, handles 0707, KIT 10451)',
      '5. Insert glazing unit and install weather seals (GT 0122 / GT 0118 / GT 0137 / GT 0146 / GT 0152)',
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

/**
 * Commercial PDF Service
 * 
 * Gold-tier PDF generation service for quotes and invoices.
 * Generates professional PDF documents with Prestige theme styling.
 * 
 * Features:
 * - Quote PDF generation
 * - Invoice PDF generation
 * - Prestige theme branding
 * - Multi-currency support
 * - Tax breakdown display
 * 
 * Usage:
 * ```typescript
 * const pdfBlob = await CommercialPDFService.generateQuotePDF(quote);
 * const pdfBlob = await CommercialPDFService.generateInvoicePDF(invoice);
 * // With template configuration:
 * const pdfBlob = await CommercialPDFService.generateQuotePDF(quote, templateConfig);
 * const pdfBlob = await CommercialPDFService.generateInvoicePDF(invoice, templateConfig);
 * ```
 */

import { formatCurrency } from '@/lib/i18n/formatters';
import type { DraftInvoice, DraftQuote } from '@/types/fabricator';

/**
 * Template configuration structure (matching QuoteTemplateEditor/InvoiceTemplateEditor)
 */
export interface QuoteInvoiceTemplateConfig {
  header: {
    logo_position: 'left' | 'center' | 'right';
    company_info: boolean;
    show_date: boolean;
  };
  body: {
    sections: string[];
    item_columns: string[];
    show_taxes: boolean;
    show_discounts: boolean;
  };
  footer: {
    notes: string;
    terms_conditions: string;
    payment_terms: boolean;
  };
  styling: {
    primary_color: string; // Hex color
    font_family: string;
    show_borders: boolean;
  };
}

/**
 * Convert hex color to RGB tuple for pdf-lib
 */
function hexToRgb(hex: string): [number, number, number] {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

/**
 * Map template font family to pdf-lib StandardFonts
 * pdf-lib StandardFonts: Helvetica, HelveticaBold, TimesRoman, TimesRomanBold, Courier, CourierBold
 * @param fontFamily - Font family name from template
 * @param StandardFonts - StandardFonts object from pdf-lib (must be loaded)
 * @param bold - Whether to return bold variant
 */
function mapFontFamily(fontFamily: string, StandardFonts: any, bold: boolean = false): any {
  // Map common font families to StandardFonts
  if (fontFamily.toLowerCase().includes('times') || fontFamily.toLowerCase().includes('serif')) {
    return bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
  }
  if (fontFamily.toLowerCase().includes('courier') || fontFamily.toLowerCase().includes('mono')) {
    return bold ? StandardFonts.CourierBold : StandardFonts.Courier;
  }
  // Default to Helvetica (most common)
  return bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
}

// Lazy import pdf-lib to reduce initial bundle size
let PDFDocument: any, rgb: any, StandardFonts: any;

/**
 * Default company branding (Prestige theme)
 */
const DEFAULT_BRANDING = {
  companyName: 'ALMONA Portfolio Forge',
  primaryColor: '#F59E0B', // Amber (Prestige theme)
  address: '',
  phone: '',
  email: '',
  website: '',
};

/**
 * Tax configuration - EGP: 14% VAT + 1% = 15% total
 */
const EGP_VAT_RATE = 0.15; // 15% (14% + 1%)
const DEFAULT_VAT_RATE = 0.15; // Default to 15% for EGP

/**
 * Calculate tax breakdown with precision
 * @param totalAmount - Total amount including tax
 * @param vatRate - VAT rate (default 0.15 for 15%)
 * @returns Object with subtotal, tax, and total (all rounded to 2 decimals)
 */
function calculateTaxBreakdown(totalAmount: number, vatRate: number = DEFAULT_VAT_RATE): {
  subtotal: number;
  tax: number;
  total: number;
} {
  if (!totalAmount || totalAmount <= 0) {
    return { subtotal: 0, tax: 0, total: 0 };
  }

  // Calculate subtotal: totalAmount / (1 + vatRate)
  const subtotal = Math.round((totalAmount / (1 + vatRate)) * 100) / 100;
  
  // Calculate tax: totalAmount - subtotal (to ensure precision)
  const tax = Math.round((totalAmount - subtotal) * 100) / 100;
  
  // Ensure total matches (subtotal + tax)
  const total = Math.round((subtotal + tax) * 100) / 100;

  return { subtotal, tax, total };
}

/**
 * Commercial PDF Service
 */
export class CommercialPDFService {
  /**
   * Generate Quote PDF
   * @param quote - Quote data
   * @param templateConfig - Optional template configuration for custom styling/layout
   */
  static async generateQuotePDF(
    quote: DraftQuote,
    templateConfig?: QuoteInvoiceTemplateConfig
  ): Promise<Blob> {
    try {
      // Lazy load pdf-lib
      if (!PDFDocument) {
        const mod = await import('pdf-lib');
        PDFDocument = mod.PDFDocument;
        rgb = mod.rgb;
        StandardFonts = mod.StandardFonts;
      }

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();

      // Embed fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = 50;
      let currentY = height - margin;

      // Apply template configuration or use defaults
      const config = templateConfig || {
        header: {
          logo_position: 'left',
          company_info: true,
          show_date: true,
        },
        body: {
          sections: ['customer_info', 'items', 'summary'],
          item_columns: ['description', 'quantity', 'price', 'total'],
          show_taxes: true,
          show_discounts: true,
        },
        footer: {
          notes: '',
          terms_conditions: '',
          payment_terms: true,
        },
        styling: {
          primary_color: '#F59E0B', // Default amber
          font_family: 'Helvetica',
          show_borders: true,
        },
      };

      // Get primary color from template or use default amber
      const primaryColorRgb = templateConfig?.styling?.primary_color
        ? rgb(...hexToRgb(templateConfig.styling.primary_color))
        : rgb(0.96, 0.62, 0.04); // Default amber

      // Map font family (must be after StandardFonts is loaded)
      const templateFont = templateConfig?.styling?.font_family
        ? await pdfDoc.embedFont(mapFontFamily(templateConfig.styling.font_family, StandardFonts, false))
        : font;
      const templateBoldFont = templateConfig?.styling?.font_family
        ? await pdfDoc.embedFont(mapFontFamily(templateConfig.styling.font_family, StandardFonts, true))
        : boldFont;

      // Header with template configuration
      if (config.header.company_info) {
        const headerX = config.header.logo_position === 'center'
          ? width / 2 - 100
          : config.header.logo_position === 'right'
          ? width - margin - 200
          : margin;

        page.drawText(DEFAULT_BRANDING.companyName, {
          x: headerX,
          y: currentY,
          size: 20,
          font: templateBoldFont,
          color: primaryColorRgb,
        });
        currentY -= 25;
      }

      // Quote title
      const titleX = config.header.logo_position === 'center'
        ? width / 2 - 30
        : config.header.logo_position === 'right'
        ? width - margin - 60
        : margin;

      page.drawText('QUOTE', {
        x: titleX,
        y: currentY,
        size: 24,
        font: templateBoldFont,
        color: rgb(0, 0, 0),
      });
      currentY -= 40;

      // Quote information (only if show_date is enabled in template)
      const quoteInfo: Array<[string, string]> = [];
      
      if (config.header.show_date) {
        quoteInfo.push(['Date:', quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : new Date().toLocaleDateString()]);
      }
      
      quoteInfo.push(
        ['Quote ID:', quote.id],
        ['Customer:', quote.customerName || 'N/A'],
        ['Project:', quote.projectTitle || 'N/A'],
        ['Valid Until:', quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'N/A'],
        ['Status:', (quote.status || 'draft').toUpperCase()],
      );

      quoteInfo.forEach(([label, value]) => {
        page.drawText(label, {
          x: margin,
          y: currentY,
          size: 10,
          font: templateBoldFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        page.drawText(String(value), {
          x: margin + 120,
          y: currentY,
          size: 10,
          font: templateFont,
          color: rgb(0, 0, 0),
        });
        currentY -= 18;
      });

      currentY -= 20;

      // Line items table
      if (quote.items && quote.items.length > 0) {
        // Table header
        const headerY = currentY;
        page.drawText('Description', {
          x: margin,
          y: headerY,
          size: 11,
          font: templateBoldFont,
          color: primaryColorRgb,
        });
        page.drawText('Qty', {
          x: margin + 300,
          y: headerY,
          size: 11,
          font: templateBoldFont,
          color: primaryColorRgb,
        });
        page.drawText('Unit Price', {
          x: margin + 360,
          y: headerY,
          size: 11,
          font: templateBoldFont,
          color: primaryColorRgb,
        });
        page.drawText('Total', {
          x: margin + 450,
          y: headerY,
          size: 11,
          font: templateBoldFont,
          color: primaryColorRgb,
        });

        // Draw header underline (if borders enabled)
        if (config.styling.show_borders) {
          page.drawLine({
            start: { x: margin, y: headerY - 5 },
            end: { x: width - margin, y: headerY - 5 },
            thickness: 1,
            color: primaryColorRgb,
          });
        }

        currentY -= 25;

        // Line items
        quote.items.forEach((item: any) => {
          if (currentY < margin + 100) {
            // Add new page if needed
            pdfDoc.addPage([595, 842]);
            currentY = height - margin;
            page.drawText('(continued)', {
              x: margin,
              y: currentY,
              size: 9,
              font: templateFont,
              color: rgb(0.5, 0.5, 0.5),
            });
            currentY -= 20;
          }

          const description = item.description || item.name || 'Item';
          const quantity = item.quantity || 1;
          const unitPrice = item.unitPrice || item.price || 0;
          const total = quantity * unitPrice;

          page.drawText(description.substring(0, 40), {
            x: margin,
            y: currentY,
            size: 9,
            font: templateFont,
            color: rgb(0, 0, 0),
          });
          page.drawText(quantity.toString(), {
            x: margin + 300,
            y: currentY,
            size: 9,
            font: templateFont,
            color: rgb(0, 0, 0),
          });
          const quoteCurrency = quote.currency || 'EGP';
          page.drawText(formatCurrency(unitPrice, 'en', quoteCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[^\d.,-]/g, ''), {
            x: margin + 360,
            y: currentY,
            size: 9,
            font: templateFont,
            color: rgb(0, 0, 0),
          });
          page.drawText(formatCurrency(total, 'en', quoteCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[^\d.,-]/g, ''), {
            x: margin + 450,
            y: currentY,
            size: 9,
            font: templateFont,
            color: rgb(0, 0, 0),
          });
          currentY -= 15;
        });
      }

      currentY -= 20;

      // Summary - Calculate tax breakdown with precision (15% VAT for EGP)
      const quoteCurrency = quote.currency || 'EGP';
      const vatRate = quoteCurrency === 'EGP' ? EGP_VAT_RATE : DEFAULT_VAT_RATE;
      const { subtotal, tax, total } = calculateTaxBreakdown(quote.amount || 0, vatRate);

      const summaryY = currentY;
      page.drawText('Subtotal:', {
        x: width - margin - 200,
        y: summaryY,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      page.drawText(formatCurrency(subtotal, 'en', quoteCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), {
        x: width - margin,
        y: summaryY,
        size: 11,
        font: font,
        color: rgb(0, 0, 0),
      });
      currentY -= 18;

      // Show tax only if enabled in template
      if (config.body.show_taxes) {
        page.drawText(`Tax (VAT ${(vatRate * 100).toFixed(0)}%):`, {
          x: width - margin - 200,
          y: currentY,
          size: 11,
          font: templateFont,
          color: rgb(0, 0, 0),
        });
        page.drawText(formatCurrency(tax, 'en', quoteCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), {
          x: width - margin,
          y: currentY,
          size: 11,
          font: templateFont,
          color: rgb(0, 0, 0),
        });
        currentY -= 25;
      }

      // Total with emphasis
      page.drawText('Total:', {
        x: width - margin - 200,
        y: currentY,
        size: 14,
        font: templateBoldFont,
        color: primaryColorRgb,
      });
      page.drawText(formatCurrency(total, 'en', quoteCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), {
        x: width - margin,
        y: currentY,
        size: 14,
        font: templateBoldFont,
        color: primaryColorRgb,
      });

      currentY -= 40;

      // Footer content from template
      let footerY = 60;
      
      if (config.footer.notes) {
        page.drawText(config.footer.notes, {
          x: margin,
          y: footerY,
          size: 9,
          font: templateFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        footerY -= 15;
      }

      if (config.footer.terms_conditions) {
        page.drawText('Terms & Conditions:', {
          x: margin,
          y: footerY,
          size: 9,
          font: templateBoldFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        footerY -= 12;
        
        // Split long text into multiple lines if needed
        const termsLines = config.footer.terms_conditions.split('\n').slice(0, 3); // Limit to 3 lines
        termsLines.forEach((line) => {
          if (footerY > 30) {
            page.drawText(line.substring(0, 80), {
              x: margin,
              y: footerY,
              size: 8,
              font: templateFont,
              color: rgb(0.4, 0.4, 0.4),
            });
            footerY -= 10;
          }
        });
      }

      if (config.footer.payment_terms) {
        footerY -= 10;
        page.drawText(`Generated on ${new Date().toLocaleDateString()}`, {
          x: margin,
          y: Math.max(footerY, 30),
          size: 8,
          font: templateFont,
          color: rgb(0.5, 0.5, 0.5),
        });
        footerY -= 15;
      }

      // Constitutional Disclaimer (Gold Tier Requirement)
      // This section must always be present unless explicitly disabled by advanced config
      // to ensure compliance with engineering authority limitations.
      footerY -= 15;
      page.drawText('CONSTITUTIONAL DISCLAIMER:', {
        x: margin,
        y: Math.max(footerY, 20),
        size: 8,
        font: templateBoldFont,
        color: rgb(0.8, 0.5, 0.0), // Amber-600
      });
      footerY -= 10;
      
      const disclaimer = 'This document contains manufacturable instructions only. No engineering judgment, structural analysis, or design authority is claimed. All outputs require human validation by qualified professionals. Accuracy framework: 99.8% (Tier 3 Protected Determinism).';
      const disclaimerLines = disclaimer.match(/.{1,100}/g) || [];
      disclaimerLines.forEach((line) => {
        if (footerY > 15) {
          page.drawText(line, {
            x: margin,
            y: footerY,
            size: 7,
            font: templateFont,
            color: rgb(0.6, 0.6, 0.6),
          });
          footerY -= 8;
        }
      });

      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (error) {
      console.error('Failed to generate quote PDF:', error);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Invoice PDF
   * @param invoice - Invoice data
   * @param templateConfig - Optional template configuration for custom styling/layout
   */
  static async generateInvoicePDF(
    invoice: DraftInvoice,
    templateConfig?: QuoteInvoiceTemplateConfig
  ): Promise<Blob> {
    try {
      // Lazy load pdf-lib
      if (!PDFDocument) {
        const mod = await import('pdf-lib');
        PDFDocument = mod.PDFDocument;
        rgb = mod.rgb;
        StandardFonts = mod.StandardFonts;
      }

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { width, height } = page.getSize();

      // Embed fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = 50;
      let currentY = height - margin;

      // Apply template configuration or use defaults
      const config = templateConfig || {
        header: {
          logo_position: 'left',
          company_info: true,
          show_date: true,
        },
        body: {
          sections: ['customer_info', 'items', 'summary'],
          item_columns: ['description', 'quantity', 'price', 'total'],
          show_taxes: true,
          show_discounts: true,
        },
        footer: {
          notes: '',
          terms_conditions: '',
          payment_terms: true,
        },
        styling: {
          primary_color: '#F59E0B', // Default amber
          font_family: 'Helvetica',
          show_borders: true,
        },
      };

      // Get primary color from template or use default amber
      const primaryColorRgb = templateConfig?.styling?.primary_color
        ? rgb(...hexToRgb(templateConfig.styling.primary_color))
        : rgb(0.96, 0.62, 0.04); // Default amber

      // Map font family (must be after StandardFonts is loaded)
      const templateFont = templateConfig?.styling?.font_family
        ? await pdfDoc.embedFont(mapFontFamily(templateConfig.styling.font_family, StandardFonts, false))
        : font;
      const templateBoldFont = templateConfig?.styling?.font_family
        ? await pdfDoc.embedFont(mapFontFamily(templateConfig.styling.font_family, StandardFonts, true))
        : boldFont;

      // Header with template configuration
      if (config.header.company_info) {
        const headerX = config.header.logo_position === 'center'
          ? width / 2 - 100
          : config.header.logo_position === 'right'
          ? width - margin - 200
          : margin;

        page.drawText(DEFAULT_BRANDING.companyName, {
          x: headerX,
          y: currentY,
          size: 20,
          font: templateBoldFont,
          color: primaryColorRgb,
        });
        currentY -= 25;
      }

      // Invoice title
      const titleX = config.header.logo_position === 'center'
        ? width / 2 - 40
        : config.header.logo_position === 'right'
        ? width - margin - 80
        : margin;

      page.drawText('INVOICE', {
        x: titleX,
        y: currentY,
        size: 24,
        font: templateBoldFont,
        color: rgb(0, 0, 0),
      });
      currentY -= 40;

      // Invoice information (only if show_date is enabled in template)
      const invoiceInfo: Array<[string, string]> = [];
      
      if (config.header.show_date) {
        invoiceInfo.push(['Date:', invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : new Date().toLocaleDateString()]);
      }
      
      invoiceInfo.push(
        ['Invoice Number:', invoice.invoiceNumber || invoice.id],
        ['Customer:', invoice.customerName || 'N/A'],
        ['Due Date:', invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'],
        ['Status:', (invoice.status || 'draft').toUpperCase()],
      );

      invoiceInfo.forEach(([label, value]) => {
        page.drawText(label, {
          x: margin,
          y: currentY,
          size: 10,
          font: templateBoldFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        page.drawText(String(value), {
          x: margin + 120,
          y: currentY,
          size: 10,
          font: templateFont,
          color: rgb(0, 0, 0),
        });
        currentY -= 18;
      });

      currentY -= 20;

      // Line items table (if available in payload)
      const invoiceItems = (invoice.payload?.items as any[]) || [];
      if (invoiceItems.length > 0) {
        // Table header
        const headerY = currentY;
        page.drawText('Description', {
          x: margin,
          y: headerY,
          size: 11,
          font: templateBoldFont,
          color: primaryColorRgb,
        });
        page.drawText('Qty', {
          x: margin + 300,
          y: headerY,
          size: 11,
          font: templateBoldFont,
          color: primaryColorRgb,
        });
        page.drawText('Unit Price', {
          x: margin + 360,
          y: headerY,
          size: 11,
          font: templateBoldFont,
          color: primaryColorRgb,
        });
        page.drawText('Total', {
          x: margin + 450,
          y: headerY,
          size: 11,
          font: templateBoldFont,
          color: primaryColorRgb,
        });

        // Draw header underline (if borders enabled)
        if (config.styling.show_borders) {
          page.drawLine({
            start: { x: margin, y: headerY - 5 },
            end: { x: width - margin, y: headerY - 5 },
            thickness: 1,
            color: primaryColorRgb,
          });
        }

        currentY -= 25;

        // Line items
        invoiceItems.forEach((item: any) => {
          if (currentY < margin + 100) {
            // Add new page if needed
            pdfDoc.addPage([595, 842]);
            currentY = height - margin;
            page.drawText('(continued)', {
              x: margin,
              y: currentY,
              size: 9,
              font: templateFont,
              color: rgb(0.5, 0.5, 0.5),
            });
            currentY -= 20;
          }

          const description = item.description || item.name || 'Item';
          const quantity = item.quantity || 1;
          const unitPrice = item.unitPrice || item.price || 0;
          const total = quantity * unitPrice;

          page.drawText(description.substring(0, 40), {
            x: margin,
            y: currentY,
            size: 9,
            font: templateFont,
            color: rgb(0, 0, 0),
          });
          page.drawText(quantity.toString(), {
            x: margin + 300,
            y: currentY,
            size: 9,
            font: templateFont,
            color: rgb(0, 0, 0),
          });
          const invoiceCurrency = invoice.currency || 'EGP';
          page.drawText(formatCurrency(unitPrice, 'en', invoiceCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[^\d.,-]/g, ''), {
            x: margin + 360,
            y: currentY,
            size: 9,
            font: templateFont,
            color: rgb(0, 0, 0),
          });
          page.drawText(formatCurrency(total, 'en', invoiceCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[^\d.,-]/g, ''), {
            x: margin + 450,
            y: currentY,
            size: 9,
            font: templateFont,
            color: rgb(0, 0, 0),
          });
          currentY -= 15;
        });
      }

      currentY -= 20;

      // Summary - Calculate tax breakdown with precision (15% VAT for EGP)
      const invoiceCurrency = invoice.currency || 'EGP';
      const vatRate = invoiceCurrency === 'EGP' ? EGP_VAT_RATE : DEFAULT_VAT_RATE;
      const { subtotal, tax, total } = calculateTaxBreakdown(invoice.amount || 0, vatRate);

      const summaryY = currentY;
      page.drawText('Subtotal:', {
        x: width - margin - 200,
        y: summaryY,
        size: 11,
        font: templateFont,
        color: rgb(0, 0, 0),
      });
      page.drawText(formatCurrency(subtotal, 'en', invoiceCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), {
        x: width - margin,
        y: summaryY,
        size: 11,
        font: templateFont,
        color: rgb(0, 0, 0),
      });
      currentY -= 18;

      // Show tax only if enabled in template
      if (config.body.show_taxes) {
        page.drawText(`Tax (VAT ${(vatRate * 100).toFixed(0)}%):`, {
          x: width - margin - 200,
          y: currentY,
          size: 11,
          font: templateFont,
          color: rgb(0, 0, 0),
        });
        page.drawText(formatCurrency(tax, 'en', invoiceCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), {
          x: width - margin,
          y: currentY,
          size: 11,
          font: templateFont,
          color: rgb(0, 0, 0),
        });
        currentY -= 25;
      }

      // Total with emphasis
      page.drawText('Total Amount:', {
        x: width - margin - 200,
        y: currentY,
        size: 14,
        font: templateBoldFont,
        color: primaryColorRgb,
      });
      page.drawText(formatCurrency(total, 'en', invoiceCurrency, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), {
        x: width - margin,
        y: currentY,
        size: 14,
        font: templateBoldFont,
        color: primaryColorRgb,
      });

      currentY -= 40;

      // Footer content from template
      let footerY = 60;
      
      if (config.footer.notes) {
        page.drawText(config.footer.notes, {
          x: margin,
          y: footerY,
          size: 9,
          font: templateFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        footerY -= 15;
      }

      // Constitutional Disclaimer (Gold Tier Requirement) - INVOICE
      {
        footerY -= 15;
        page.drawText('CONSTITUTIONAL DISCLAIMER:', {
          x: margin,
          y: Math.max(footerY, 20),
          size: 8,
          font: templateBoldFont,
          color: rgb(0.8, 0.5, 0.0), // Amber-600
        });
        footerY -= 10;
        
        const disclaimer = 'This document contains manufacturable instructions only. No engineering judgment, structural analysis, or design authority is claimed. All outputs require human validation by qualified professionals. Accuracy framework: 99.8% (Tier 3 Protected Determinism).';
        const disclaimerLines = disclaimer.match(/.{1,100}/g) || [];
        disclaimerLines.forEach((line) => {
          if (footerY > 15) {
            page.drawText(line, {
              x: margin,
              y: footerY,
              size: 7,
              font: templateFont,
              color: rgb(0.6, 0.6, 0.6),
            });
            footerY -= 8;
          }
        });
      }

      if (config.footer.terms_conditions) {
        page.drawText('Terms & Conditions:', {
          x: margin,
          y: footerY,
          size: 9,
          font: templateBoldFont,
          color: rgb(0.3, 0.3, 0.3),
        });
        footerY -= 12;
        
        // Split long text into multiple lines if needed
        const termsLines = config.footer.terms_conditions.split('\n').slice(0, 3); // Limit to 3 lines
        termsLines.forEach((line) => {
          if (footerY > 30) {
            page.drawText(line.substring(0, 80), {
              x: margin,
              y: footerY,
              size: 8,
              font: templateFont,
              color: rgb(0.4, 0.4, 0.4),
            });
            footerY -= 10;
          }
        });
      }

      if (config.footer.payment_terms) {
        footerY -= 10;
        page.drawText(`Generated on ${new Date().toLocaleDateString()}`, {
          x: margin,
          y: Math.max(footerY, 30),
          size: 8,
          font: templateFont,
          color: rgb(0.5, 0.5, 0.5),
        });
        footerY -= 15;
      }

      // Constitutional Disclaimer (Gold Tier Requirement) - QUOTE
      footerY -= 15;
      page.drawText('CONSTITUTIONAL DISCLAIMER:', {
        x: margin,
        y: Math.max(footerY, 20),
        size: 8,
        font: templateBoldFont,
        color: rgb(0.8, 0.5, 0.0), // Amber-600
      });
      footerY -= 10;
      
      const disclaimer = 'This document contains manufacturable instructions only. No engineering judgment, structural analysis, or design authority is claimed. All outputs require human validation by qualified professionals. Accuracy framework: 99.8% (Tier 3 Protected Determinism).';
      const disclaimerLines = disclaimer.match(/.{1,100}/g) || [];
      disclaimerLines.forEach((line) => {
        if (footerY > 15) {
          page.drawText(line, {
            x: margin,
            y: footerY,
            size: 7,
            font: templateFont,
            color: rgb(0.6, 0.6, 0.6),
          });
          footerY -= 8;
        }
      });

      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (error) {
      console.error('Failed to generate invoice PDF:', error);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download PDF blob as file
   */
  static downloadPDF(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}


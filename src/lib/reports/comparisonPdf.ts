// Lazy import pdf-lib to reduce initial bundle size
let PDFDocument: any, StandardFonts: any, rgb: any;
import type { Machine as YilmazMachine } from '@/constants/yilmazMachines';

// Cache for PDF generation to avoid recreating fonts
const fontCache = new Map<string, any>();
const logoCache = new Map<string, any>();

interface ComparisonTotals {
  totalPowerKw: number;
  totalAirConsumption?: number;
}

// Use the YilmazMachine type directly since it already has all the required properties
export type ComparisonMachine = YilmazMachine;

// Parse power consumption from machine specification
function parsePower(machine: ComparisonMachine): number {
  const val = machine.powerSpec?.consumption;
  if (!val) return 0;
  const match = val.match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

// Parse air consumption from machine specification
function parseAir(machine: ComparisonMachine): number {
  const val = machine.airSpec?.consumption;
  if (!val) return 0;
  const match = val.match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

export interface ComparisonPdfOptions {
  powerUnit?: 'kW' | 'HP';
  airUnit?: 'L/min' | 'm³/h';
  showBothUnits?: boolean;
  orientation?: 'landscape' | 'portrait';
  condensed?: boolean;
  includeFooter?: boolean;
  companyName?: string;
  companyTagline?: string;
  contactInfo?: {
    website?: string;
    email?: string;
    phone?: string;
  };
}

// Power conversion and formatting utilities
function formatPower(valueKw: number, unit: 'kW' | 'HP', both: boolean) {
  if (both) return `${valueKw.toFixed(2)} kW / ${(valueKw * 1.34102).toFixed(2)} HP`;
  return unit === 'HP' ? `${(valueKw * 1.34102).toFixed(2)} HP` : `${valueKw.toFixed(2)} kW`;
}

// Air consumption conversion and formatting utilities
function formatAir(valueLmin: number, unit: 'L/min' | 'm³/h', both: boolean) {
  if (both) return `${valueLmin.toFixed(1)} L/min / ${(valueLmin * 0.06).toFixed(2)} m³/h`;
  return unit === 'm³/h' ? `${(valueLmin * 0.06).toFixed(2)} m³/h` : `${valueLmin.toFixed(1)} L/min`;
}

export async function generateComparisonPDF(
  machines: ComparisonMachine[],
  logoDataUrl?: string,
  options: ComparisonPdfOptions = {}
) {
  if (!PDFDocument) {
    const mod = await import('pdf-lib');
    PDFDocument = mod.PDFDocument;
    StandardFonts = mod.StandardFonts;
    rgb = mod.rgb;
  }

  // Performance optimization: limit machines to prevent memory issues
  const maxMachines = 50;
  const limitedMachines = machines.slice(0, maxMachines);
  
  if (machines.length > maxMachines) {
    console.warn(`PDF generation limited to ${maxMachines} machines for performance`);
  }

  // Enhanced options with defaults
  const {
    powerUnit = 'kW',
    airUnit = 'L/min',
    showBothUnits = true,
    orientation = 'landscape',
    condensed: _condensed = false,
    includeFooter = true,
    companyName = 'YILMAZ MACHINES',
    companyTagline = 'Professional Industrial Equipment Solutions',
    contactInfo = {
      website: 'almona02.com',
      email: 'info@almona02.com',
      phone: ''
    }
  } = options;

  const pdf = await PDFDocument.create();
  
  // Use cached fonts for better performance
  let font = fontCache.get('helvetica');
  let bold = fontCache.get('helvetica-bold');
  
  if (!font) {
    font = await pdf.embedFont(StandardFonts.Helvetica);
    fontCache.set('helvetica', font);
  }
  
  if (!bold) {
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    fontCache.set('helvetica-bold', bold);
  }

  // Compute totals using limited machines
  const totals: ComparisonTotals = limitedMachines.reduce((acc, m) => {
    const power = parsePower(m);
    const air = parseAir(m);
    acc.totalPowerKw += power;
    acc.totalAirConsumption = (acc.totalAirConsumption || 0) + air;
    return acc;
  }, { totalPowerKw: 0, totalAirConsumption: 0 });

  // Professional page configuration
  const isPortrait = orientation === 'portrait';
  const pageWidth = isPortrait ? 595 : 842;
  const pageHeight = isPortrait ? 842 : 595;
  const margin = 30;
  const primaryColor = rgb(0.1, 0.3, 0.5);
  const secondaryColor = rgb(0.4, 0.4, 0.4);

  type PDFPage = ReturnType<typeof pdf.addPage>;

  // Enhanced header drawing function
  const drawProfessionalHeader = async (page: PDFPage, pageIndex: number, totalPages?: number) => {
    const yTop = pageHeight - 10; // Reduced from margin to 10px
    const headerHeight = 70;
    const headerY = yTop - headerHeight;

    // Enhanced header background
    page.drawRectangle({
      x: margin,
      y: headerY,
      width: pageWidth - margin * 2,
      height: headerHeight,
      color: rgb(0.97, 0.98, 1),
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 1
    });

    // Logo placement with professional sizing
    let logoX = margin + 15;
    const logoY = headerY + 15;

    if (logoDataUrl) {
      try {
        // Check logo cache first
        let logoImage = logoCache.get(logoDataUrl);
        
        if (!logoImage) {
          const base64 = logoDataUrl.split(',')[1];
          const logoBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          logoImage = await pdf.embedPng(logoBytes);
          logoCache.set(logoDataUrl, logoImage);
        }
        
        const logoDims = logoImage.scale(0.2);
        
        const maxLogoHeight = 40;
        const maxLogoWidth = 120;
        
        let finalWidth = logoDims.width;
        let finalHeight = logoDims.height;
        
        if (finalHeight > maxLogoHeight) {
          const scale = maxLogoHeight / finalHeight;
          finalWidth *= scale;
          finalHeight *= scale;
        }
        if (finalWidth > maxLogoWidth) {
          const scale = maxLogoWidth / finalWidth;
          finalWidth *= scale;
          finalHeight *= scale;
        }
        
        page.drawImage(logoImage, {
          x: logoX,
          y: logoY,
          width: finalWidth,
          height: finalHeight
        });
        logoX += finalWidth + 20;
      } catch (e) {
        console.warn('Logo embedding failed:', e);
      }
    }

    // Enhanced two-column header layout
    const innerX = margin + 20;
    const innerWidth = pageWidth - margin * 2 - 40;
    const leftWidth = innerWidth * 0.6;
    const rightX = innerX + leftWidth + 15;
    const _rightWidth = innerWidth - leftWidth - 15;

    // Company details (left column)
    const companyX = Math.max(logoX, innerX);
    const companyY = headerY + 40;

    // Company name with enhanced styling
    page.drawText(companyName, {
      x: companyX,
      y: companyY,
      size: 14,
      font: bold,
      color: primaryColor
    });

    // Company description
    page.drawText('ALMONA CO. IMPORT EXPORT COMMERCIAL AGENCIES', {
      x: companyX,
      y: companyY - 16,
      size: 9,
      font,
      color: secondaryColor
    });

    page.drawText(companyTagline, {
      x: companyX,
      y: companyY - 30,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Document details (right column)
    const docX = rightX;
    const docY = headerY + 40;

    // Document title with enhanced styling
    page.drawText('Machines Requirements', {
      x: docX,
      y: docY,
      size: 12,
      font: bold,
      color: primaryColor
    });

    page.drawText(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
      x: docX,
      y: docY - 15,
      size: 8,
      font,
      color: secondaryColor
    });

    page.drawText(`Time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, {
      x: docX,
      y: docY - 28,
      size: 8,
      font,
      color: secondaryColor
    });

    if (totalPages) {
      page.drawText(`Page ${pageIndex + 1} of ${totalPages}`, {
        x: docX,
        y: docY - 40,
        size: 7,
        font,
        color: rgb(0.6, 0.6, 0.6)
      });
    }

    return headerY - 25;
  };

  // Build professional tabular data
  const columns = [
    'Equipment Model',
    'Type',
    showBothUnits ? 'Power Consumption (kW / HP)' : `Power (${powerUnit})`,
    'Voltage',
    showBothUnits ? 'Air Consumption (L/min / m³/h)' : `Air (${airUnit})`
  ];

  const rows = limitedMachines.map(m => {
    const pKw = parsePower(m);
    const aL = parseAir(m);
    const machineName = m.name || '-';
    
    return [
      machineName,
      m.type || '-',
      pKw ? formatPower(pKw, powerUnit, showBothUnits) : (m.powerSpec?.consumption || '-'),
      m.powerSpec?.voltage || '-',
      aL ? formatAir(aL, airUnit, showBothUnits) : (m.airSpec?.consumption || '-')
    ];
  });

  const totalPowerDisplay = formatPower(totals.totalPowerKw, powerUnit, showBothUnits);
  const totalAirDisplay = totals.totalAirConsumption ? formatAir(totals.totalAirConsumption, airUnit, showBothUnits) : '-';

  // Add professional spacing and total row
  rows.push(['', '', '', '', '']);
  rows.push(['TOTAL', '', totalPowerDisplay, '', totalAirDisplay]);

  // Enhanced text sanitizer
  const sanitize = (text: string) => text
    .replace(/…/g, '...')
    .replace(/×/g, 'x')
    .replace(/≥/g, '>=')
    .replace(/³/g, '³')
    .replace(/°/g, 'deg')
    .replace(/±/g, '+/-')
    .replace(/–/g, '-')
    .replace(/"/g, "'");

  // Enhanced centered text function with better alignment
  const drawCenteredText = (
    pageRef: PDFPage,
    rawText: string,
    xPos: number,
    yPos: number,
    fontSize: number,
    fontRef: any,
    colorRef: any,
    cellWidth: number,
    cellHeight: number = lineHeight
  ) => {
    const cleaned = sanitize(rawText);
    const textWidth = fontRef.widthOfTextAtSize(cleaned, fontSize);
    const centeredX = xPos + (cellWidth - textWidth) / 2;
    // Better vertical alignment calculation - ensure text is fully visible
    const centeredY = yPos - (cellHeight - fontSize) / 2 - 1;
    pageRef.drawText(cleaned, { x: centeredX, y: centeredY, size: fontSize, font: fontRef, color: colorRef });
  };

  // Left-aligned text for better readability in some columns
  const drawLeftAlignedText = (
    pageRef: PDFPage,
    rawText: string,
    xPos: number,
    yPos: number,
    fontSize: number,
    fontRef: any,
    colorRef: any,
    cellWidth: number,
    cellHeight: number = lineHeight
  ) => {
    const cleaned = sanitize(rawText);
    // Better vertical alignment - ensure text is fully visible
    const textY = yPos - (cellHeight - fontSize) / 2 - 2;
    
    // Handle text truncation for left-aligned text
    let text = cleaned;
    const maxWidth = cellWidth - 10;
    const width = fontRef.widthOfTextAtSize(text, fontSize);
    
    if (width > maxWidth) {
      while (text.length > 3 && fontRef.widthOfTextAtSize(text + '...', fontSize) > maxWidth) {
        text = text.slice(0, -1);
      }
      text = text + '...';
    }
    
    pageRef.drawText(text, { x: xPos + 5, y: textY, size: fontSize, font: fontRef, color: colorRef });
  };

  // Professional table configuration
  const lineHeight = 24; // Reduced from 28 to 24
  const headerHeight = 40; // Increased from 36 to 40 for better text fit
  const tableMargin = 10; // Reduced from 12 to 10
  const sectionSpacing = 15; // Reduced from 20 to 15

  const pages: PDFPage[] = [];
  const createPage = () => { const p = pdf.addPage([pageWidth, pageHeight]); pages.push(p); return p; };
  let page = createPage();

  // Draw professional header
  let y = await drawProfessionalHeader(page, 0);

  // Enhanced table drawing section
  const tableX = margin + tableMargin;
  const tableWidth = pageWidth - margin * 2 - tableMargin * 2;

  // Draw professional table header with enhanced styling
  const headerYPosition = y - headerHeight;
  
  // Header background with professional color
  page.drawRectangle({
    x: tableX,
    y: headerYPosition,
    width: tableWidth,
    height: headerHeight,
    color: primaryColor,
    borderColor: rgb(0.08, 0.25, 0.45),
    borderWidth: 1
  });

  let x = tableX + 5; // Reduced from 8 to 5
  const tableInner = tableWidth - 10; // Reduced from 16 to 10

  // Enhanced column width distribution - better balanced
  const baseWidths = isPortrait 
    ? [0.22, 0.20, 0.30, 0.13, 0.15]  // Portrait: optimized for narrow format
    : [0.20, 0.18, 0.30, 0.12, 0.20]; // Landscape: optimized for wider format

  const colWidths = baseWidths.map(ratio => Math.min(tableInner * ratio, tableInner * 0.3));

  // Adjust column widths to fit table exactly
  const totalColWidth = colWidths.reduce((sum, width) => sum + width, 0);
  const widthDifference = tableInner - totalColWidth;
  
  if (widthDifference > 0) {
    // Distribute extra space proportionally
    const scale = tableInner / totalColWidth;
    for (let i = 0; i < colWidths.length; i++) {
      colWidths[i] *= scale;
    }
  }

  // Draw enhanced column headers with perfect alignment
  columns.forEach((col, i) => {
    const match = col.match(/^(.*?)\s*\((.*)\)$/);
    const headerTextColor = rgb(1, 1, 1);
    const headerSubTextColor = rgb(0.95, 0.95, 1);

    if (match) {
      const label = sanitize(match[1]);
      const units = '(' + sanitize(match[2]) + ')';
      
      // Main label - perfectly centered and fully visible
      drawCenteredText(page, label, x, headerYPosition + headerHeight - 6, 10, bold, headerTextColor, colWidths[i], headerHeight);
      // Units/subtitle - perfectly centered and fully visible
      drawCenteredText(page, units, x, headerYPosition + headerHeight - 20, 8, font, headerSubTextColor, colWidths[i], headerHeight);
    } else {
      drawCenteredText(page, sanitize(col), x, headerYPosition + headerHeight - 13, 10, bold, headerTextColor, colWidths[i], headerHeight);
    }
    x += colWidths[i];
  });

  y = headerYPosition;

  // Enhanced row rendering with perfect alignment
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    
    // Handle page breaks professionally
    if (y < margin + (isPortrait ? 120 : 80)) { // More space needed for portrait
      page = createPage();
      y = await drawProfessionalHeader(page, pages.length - 1);
      
      // Redraw table header on new page with perfect alignment
      const newHeaderYPosition = y - headerHeight;
      page.drawRectangle({
        x: tableX,
        y: newHeaderYPosition,
        width: tableWidth,
        height: headerHeight,
        color: primaryColor,
        borderColor: rgb(0.08, 0.25, 0.45),
        borderWidth: 1
      });

      let xh = tableX + 5; // Reduced from 8 to 5
      columns.forEach((col, i) => {
        const match = col.match(/^(.*?)\s*\((.*)\)$/);
        const headerTextColor = rgb(1, 1, 1);
        const headerSubTextColor = rgb(0.95, 0.95, 1);

        if (match) {
          const label = sanitize(match[1]);
          const units = '(' + sanitize(match[2]) + ')';
          drawCenteredText(page, label, xh, newHeaderYPosition + headerHeight - 6, 10, bold, headerTextColor, colWidths[i], headerHeight);
          drawCenteredText(page, units, xh, newHeaderYPosition + headerHeight - 20, 8, font, headerSubTextColor, colWidths[i], headerHeight);
        } else {
          drawCenteredText(page, sanitize(col), xh, newHeaderYPosition + headerHeight - 13, 10, bold, headerTextColor, colWidths[i], headerHeight);
        }
        xh += colWidths[i];
      });
      y = newHeaderYPosition;
    }

    let cx = tableX + 5; // Reduced from 8 to 5
    const isTotal = row[0] === 'TOTAL';
    const isEmpty = row[0] === '';

    // Professional row styling
    if (!isEmpty) {
      const rowBackgroundColor = isTotal 
        ? rgb(0.94, 0.98, 0.94)
        : (rowIndex % 2 === 0 ? rgb(0.99, 0.99, 1) : rgb(0.97, 0.98, 1));

      const rowBorderColor = isTotal 
        ? rgb(0.2, 0.5, 0.2) 
        : rgb(0.9, 0.92, 0.95);

      page.drawRectangle({
        x: tableX,
        y: y - lineHeight + 4,
        width: tableWidth,
        height: lineHeight,
        color: rowBackgroundColor,
        borderColor: rowBorderColor,
        borderWidth: isTotal ? 1.5 : 0.5
      });
    }

    // Draw cell content with perfect alignment
    if (!isEmpty) {
      row.forEach((cell, ci) => {
        const raw = sanitize(String(cell));
        
        const fontSize = isTotal ? 10 : 9;
        const textFont = isTotal ? bold : font;
        const textColor = isTotal ? rgb(0.1, 0.3, 0.1) : rgb(0.2, 0.2, 0.2);

        // Use left alignment for first two columns, center for others
        if (ci === 0 || ci === 1) {
          // Equipment Model and Type - left aligned for better readability
          drawLeftAlignedText(page, raw, cx, y, fontSize, textFont, textColor, colWidths[ci], lineHeight);
        } else {
          // Power, Voltage, Air - center aligned
          drawCenteredText(page, raw, cx, y, fontSize, textFont, textColor, colWidths[ci], lineHeight);
        }
        cx += colWidths[ci];
      });
    }

    y -= lineHeight;
  }

  // Enhanced summary section with better alignment
  y -= 10; // Reduced spacing from 15 to 10

  if (y - (isPortrait ? 150 : 120) < margin) { // More space needed for portrait
    page = createPage();
    y = await drawProfessionalHeader(page, pages.length - 1);
    y -= 10;
  }

  const summaryY = y - sectionSpacing;
  const summaryHeight = 61; // Increased by 6 points (2mm) from 55 to 61

  // Professional summary background
  page.drawRectangle({
    x: tableX,
    y: summaryY - summaryHeight,
    width: tableWidth,
    height: summaryHeight,
    color: rgb(0.98, 0.99, 0.98),
    borderColor: rgb(0.7, 0.8, 0.7),
    borderWidth: 1
  });

  // Summary title with perfect alignment
  const summaryTitle = 'TECHNICAL SPECIFICATION SUMMARY';
  const titleWidth = bold.widthOfTextAtSize(summaryTitle, 13);
  page.drawText(summaryTitle, {
    x: tableX + (tableWidth - titleWidth) / 2, // Perfectly centered
    y: summaryY - 18, // Adjusted for larger box
    size: 13,
    font: bold,
    color: rgb(0.1, 0.35, 0.1)
  });

  y = summaryY - 28; // Adjusted for larger box

  // Enhanced summary content with consistent alignment
  const summaryContent = [
    `Equipment Analyzed: ${limitedMachines.length} units${machines.length > limitedMachines.length ? ` (showing first ${limitedMachines.length} of ${machines.length})` : ''}`,
    `Total Power Requirement: ${totalPowerDisplay}`,
    `Total Air Consumption: ${totalAirDisplay}`,
    `Analysis Date: ${new Date().toLocaleDateString()}`
  ];

  summaryContent.forEach((line, index) => {
    page.drawText(sanitize(line), {
      x: tableX + 25,
      y: y - (index * 10), // Further reduced spacing from 12 to 10
      size: 9,
      font: index === 0 ? bold : font,
      color: rgb(0.2, 0.2, 0.2)
    });
  });

  y = summaryY - summaryHeight - 10; // Further reduced spacing from 15 to 10

  // Enhanced technical notes section with better alignment
  const notesTitle = 'IMPORTANT TECHNICAL CONSIDERATIONS:';
  const notesTitleWidth = bold.widthOfTextAtSize(notesTitle, 10);
  page.drawText(notesTitle, {
    x: tableX + (tableWidth - notesTitleWidth) / 2, // Perfectly centered
    y: y,
    size: 10,
    font: bold,
    color: rgb(0.3, 0.3, 0.3)
  });

  y -= 8; // Further reduced spacing from 12 to 8

  const technicalNotes = [
    '• Verify electrical capacity and maintain ≥20% safety margin for optimal performance',
    '• All specifications represent nominal values (not peak load) - consult technical team for peak requirements',
    '• Contact our technical team for detailed installation planning and site preparation',
    '• This document is for specification analysis only - contact us for formal quotation',
    '• Professional installation, training, and support services available upon request',
    '• Specifications subject to change without notice - confirm with latest technical documentation'
  ];

  for (let index = 0; index < technicalNotes.length; index++) {
    const note = technicalNotes[index];
    
    // Handle page breaks for notes
    if (y - 20 < margin + 50 && index < technicalNotes.length - 1) {
      page = createPage();
      y = await drawProfessionalHeader(page, pages.length - 1);
      y -= 40;
      
      // Redraw notes title on new page
      page.drawText(notesTitle, {
        x: tableX + (tableWidth - notesTitleWidth) / 2,
        y: y,
        size: 10,
        font: bold,
        color: rgb(0.3, 0.3, 0.3)
      });
      y -= 18;
    }

    page.drawText(sanitize(note), {
      x: tableX + 20,
      y: y - (index * 10), // Reduced spacing from 12 to 10
      size: 7.5,
      font,
      color: rgb(0.4, 0.4, 0.4)
    });
  }

  // Enhanced professional footer with perfect alignment
  if (includeFooter) {
    const totalPages = pages.length;
    
    pages.forEach((p, idx) => {
      const footerY = 25;
      const footerHeight = 55;

      // Enhanced footer background
      p.drawRectangle({
        x: margin,
        y: footerY,
        width: pageWidth - margin * 2,
        height: footerHeight,
        color: rgb(0.97, 0.98, 1),
        borderColor: rgb(0.85, 0.9, 0.95),
        borderWidth: 1
      });

      // Footer divider
      p.drawLine({
        start: { x: margin, y: footerY + footerHeight - 12 },
        end: { x: pageWidth - margin, y: footerY + footerHeight - 12 },
        thickness: 0.5,
        color: rgb(0.8, 0.85, 0.9)
      });

      // Enhanced company branding with consistent alignment
      p.drawText(companyName, {
        x: margin + 15,
        y: footerY + 35,
        size: 10,
        font: bold,
        color: primaryColor
      });

      p.drawText('ALMONA CO. IMPORT EXPORT COMMERCIAL AGENCIES', {
        x: margin + 15,
        y: footerY + 22,
        size: 8,
        font,
        color: secondaryColor
      });

      // Enhanced contact information with perfect alignment
      const contactText = 'TECHNICAL SUPPORT & QUOTATIONS';
      const contactWidth = bold.widthOfTextAtSize(contactText, 9);
      const contactX = pageWidth - margin - contactWidth - 15;
      
      p.drawText(contactText, {
        x: contactX,
        y: footerY + 35,
        size: 9,
        font: bold,
        color: primaryColor
      });

      if (contactInfo.website) {
        const websiteText = `Website: ${contactInfo.website}`;
        const websiteWidth = font.widthOfTextAtSize(websiteText, 8);
        p.drawText(websiteText, {
          x: pageWidth - margin - websiteWidth - 15,
          y: footerY + 22,
          size: 8,
          font,
          color: secondaryColor
        });
      }

      if (contactInfo.email) {
        const emailText = `Email: ${contactInfo.email}`;
        const emailWidth = font.widthOfTextAtSize(emailText, 8);
        p.drawText(emailText, {
          x: pageWidth - margin - emailWidth - 15,
          y: footerY + 12,
          size: 8,
          font,
          color: secondaryColor
        });
      }

      // Enhanced page numbering moved away from footer
      const pageLabel = `Page ${idx + 1} of ${totalPages}`;
      const labelWidth = font.widthOfTextAtSize(pageLabel, 9);
      p.drawText(pageLabel, {
        x: pageWidth - margin - labelWidth - 15,
        y: footerY + footerHeight + 10, // Moved above footer
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.6)
      });

      // Confidential notice with consistent alignment
      p.drawText('CONFIDENTIAL - FOR INTERNAL USE ONLY', {
        x: margin + 15,
        y: footerY + 8,
        size: 7,
        font,
        color: rgb(0.6, 0.6, 0.7)
      });
    });
  }

  // Finalize and return PDF
  const pdfBytes = await pdf.save();
  return pdfBytes;
}
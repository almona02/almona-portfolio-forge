// Lazy import pdf-lib to reduce initial bundle size
let PDFDocument: any, StandardFonts: any, rgb: any;
import type { Machine as BaseMachine } from '@/types/machine';

interface ComparisonTotals {
  totalPowerKw: number;
  totalAirConsumption?: number; // m3/min or L/min (pending spec)
}

// Extend base machine with optional specs used in comparison UI
export interface ComparisonMachine extends BaseMachine {
  type?: string;
  releaseDate?: string;
  powerSpec?: {
    consumption?: string; // e.g. "5.5 kW"
    voltage?: string;     // e.g. "380V"
  };
  airSpec?: {
    consumption?: string; // e.g. "250 L/min" (future addition)
  };
}

// Attempt to read numeric value from machine.powerSpec?.consumption like "5.5 kW"
function parsePower(machine: ComparisonMachine): number {
  const val = machine.powerSpec?.consumption;
  if (!val) return 0;
  const match = val.match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

// Placeholder: air consumption will be added to yilmazMachines.ts later
function parseAir(machine: ComparisonMachine): number {
  const val = machine.airSpec?.consumption; // expecting something like "250 L/min"
  if (!val) return 0;
  const match = val.match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

export interface ComparisonPdfOptions {
  powerUnit?: 'kW' | 'HP';
  airUnit?: 'L/min' | 'm³/h';
  showBothUnits?: boolean;
  orientation?: 'landscape' | 'portrait';
  condensed?: boolean; // mobile-friendly portrait variant
  includeFooter?: boolean;
}

function convertPowerKw(valueKw: number, unit: 'kW' | 'HP') {
  return unit === 'HP' ? valueKw * 1.34102 : valueKw;
}
function formatPower(valueKw: number, unit: 'kW' | 'HP', both: boolean) {
  if (both) return `${valueKw.toFixed(2)} kW / ${(valueKw * 1.34102).toFixed(2)} HP`;
  return unit === 'HP' ? `${(valueKw * 1.34102).toFixed(2)} HP` : `${valueKw.toFixed(2)} kW`;
}
function convertAirLmin(valueLmin: number, unit: 'L/min' | 'm³/h') {
  return unit === 'm³/h' ? valueLmin * 0.06 : valueLmin; // 1 L/min = 0.06 m³/h
}
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
    PDFDocument = mod.PDFDocument; StandardFonts = mod.StandardFonts; rgb = mod.rgb;
  }
  const { powerUnit = 'kW', airUnit = 'L/min', showBothUnits = true, orientation = 'landscape', condensed = false, includeFooter = true } = options;
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Compute totals
  const totals: ComparisonTotals = machines.reduce((acc, m) => {
    acc.totalPowerKw += parsePower(m);
    acc.totalAirConsumption = (acc.totalAirConsumption || 0) + parseAir(m);
    return acc;
  }, { totalPowerKw: 0, totalAirConsumption: 0 });

  // Page size (A4 either orientation)
  const isPortrait = orientation === 'portrait';
  const pageWidth = isPortrait ? 595 : 842;
  const pageHeight = isPortrait ? 842 : 595;
  const margin = 40;

  type PDFPage = ReturnType<typeof pdf.addPage>;
  const drawProfessionalHeader = async (page: PDFPage, pageIndex: number, totalPages?: number) => {
    const yTop = pageHeight - margin;
    
    // Company header section
    const headerHeight = 120;
    const headerY = yTop - headerHeight;
    
    // Header background
    page.drawRectangle({ 
      x: margin, 
      y: headerY, 
      width: pageWidth - margin * 2, 
      height: headerHeight, 
      color: rgb(0.95, 0.95, 0.97),
      borderColor: rgb(0.8, 0.8, 0.85),
      borderWidth: 1
    });
    
    // Logo placement with optimized sizing
    let logoX = margin + 15;
    let logoY = headerY + 25;
    if (logoDataUrl) {
      try {
        const base64 = logoDataUrl.split(',')[1];
        const logoBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const logoImage = await pdf.embedPng(logoBytes);
        // Optimized logo size for professional appearance
        const logoDims = logoImage.scale(0.25); // Reduced from 0.4 to 0.25
        const maxLogoHeight = 50; // Maximum logo height
        const maxLogoWidth = 120; // Maximum logo width
        
        let finalWidth = logoDims.width;
        let finalHeight = logoDims.height;
        
        // Scale down if too large
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
        logoX += finalWidth + 25;
      } catch (e) {
        // ignore logo embedding errors silently
      }
    }
    
    // Two-column header layout to separate company and document details
    const innerX = margin + 15;
    const innerWidth = pageWidth - margin * 2 - 30;
    const leftWidth = innerWidth * 0.55;
    const rightX = innerX + leftWidth + 20; // gutter
    const rightWidth = innerWidth - leftWidth - 20;

    // Company details (left column)
    const companyX = Math.max(logoX, innerX);
    const companyY = headerY + 60;
    
    drawFittedText(page, 'ALMONA INDUSTRIAL SOLUTIONS', companyX, companyY, 17, bold, rgb(0.1, 0.1, 0.1), leftWidth - (companyX - innerX));
    
    drawFittedText(page, 'Authorized YILMAZ Machinery Dealer', companyX, companyY - 28, 12, font, rgb(0.3, 0.3, 0.3), leftWidth - (companyX - innerX));
    
    drawFittedText(page, 'Professional Industrial Equipment Solutions', companyX, companyY - 56, 10, font, rgb(0.4, 0.4, 0.4), leftWidth - (companyX - innerX));
    
    // Document details (right column)
    const docX = rightX;
    const docY = headerY + 60;
    
    drawFittedText(page, 'MACHINE COMPARISON QUOTATION', docX, docY, 14, bold, rgb(0.1, 0.1, 0.1), rightWidth);
    
    drawFittedText(page, `Date: ${new Date().toLocaleDateString()}`, docX, docY - 26, 10, font, rgb(0.3, 0.3, 0.3), rightWidth);
    
    drawFittedText(page, `Time: ${new Date().toLocaleTimeString()}`, docX, docY - 44, 10, font, rgb(0.3, 0.3, 0.3), rightWidth);
    
    if (totalPages) {
      drawFittedText(page, `Page ${pageIndex + 1} / ${totalPages}`, docX, docY - 62, 9, font, rgb(0.4, 0.4, 0.4), rightWidth);
    }
    
    return headerY - 20; // Return Y position for content start
  };

  // Build tabular data (condensed vs full)
  let columns: string[];
  let rows: string[][];
  if (condensed) {
    columns = [
      'Name',
      showBothUnits ? 'Power (kW / HP)' : `Power (${powerUnit})`,
      showBothUnits ? 'Air (L/min / m³/h)' : `Air (${airUnit})`,
      'Voltage'
    ];
    rows = machines.map(m => {
      const pKw = parsePower(m);
      const aL = parseAir(m);
      const name = (m.name || '-').length > 28 ? (m.name || '-').slice(0,25) + '…' : (m.name || '-');
      return [
        name,
        pKw ? formatPower(pKw, powerUnit, showBothUnits) : (m.powerSpec?.consumption || '-'),
        aL ? formatAir(aL, airUnit, showBothUnits) : (m.airSpec?.consumption || '-'),
        m.powerSpec?.voltage || '-'
      ];
    });
  } else {
    columns = [
      'Name','Type','Release Date',
      showBothUnits ? 'Power (kW / HP)' : `Power (${powerUnit})`,
      'Voltage',
      showBothUnits ? 'Air (L/min / m³/h)' : `Air (${airUnit})`
    ];
    rows = machines.map(m => {
      const pKw = parsePower(m);
      const aL = parseAir(m);
      return [
        m.name || '-',
        m.type || '-',
        m.releaseDate ? new Date(m.releaseDate).toLocaleDateString() : '-',
        pKw ? formatPower(pKw, powerUnit, showBothUnits) : (m.powerSpec?.consumption || '-'),
        m.powerSpec?.voltage || '-',
        aL ? formatAir(aL, airUnit, showBothUnits) : (m.airSpec?.consumption || '-')
      ];
    });
  }
  const totalPowerDisplay = formatPower(totals.totalPowerKw, powerUnit, showBothUnits);
  const totalAirDisplay = totals.totalAirConsumption ? formatAir(totals.totalAirConsumption, airUnit, showBothUnits) : '-';
  rows.push(condensed ? ['TOTAL', totalPowerDisplay, totalAirDisplay, ''] : ['TOTAL','','', totalPowerDisplay, '', totalAirDisplay]);

  // Sanitizer to avoid unsupported glyphs (e.g., ellipsis) in StandardFonts (WinAnsi)
  const sanitize = (text: string) => text
    .replace(/…/g, '...')
    .replace(/×/g, 'x')
    .replace(/≥/g, '>=')
    .replace(/³/g, '^3')
    .replace(/°/g, 'deg')
    .replace(/±/g, '+/-');

  // Helper: draw text fitted within a max width (adds ellipsis if needed)
  const drawFittedText = (
    pageRef: ReturnType<typeof pdf.addPage>,
    rawText: string,
    xPos: number,
    yPos: number,
    fontSize: number,
    fontRef: any,
    colorRef: any,
    maxWidth: number
  ) => {
    const cleaned = sanitize(rawText);
    let textToDraw = cleaned;
    let width = fontRef.widthOfTextAtSize(textToDraw, fontSize);
    if (width <= maxWidth) {
      pageRef.drawText(textToDraw, { x: xPos, y: yPos, size: fontSize, font: fontRef, color: colorRef });
      return;
    }
    while (textToDraw.length > 3 && fontRef.widthOfTextAtSize(textToDraw + '...', fontSize) > maxWidth) {
      textToDraw = textToDraw.slice(0, -1);
    }
    pageRef.drawText(textToDraw + '...', { x: xPos, y: yPos, size: fontSize, font: fontRef, color: colorRef });
  };

  // Professional table rendering with enhanced spacing
  const lineHeight = 30; // Increased for better readability and professional spacing
  const headerHeight = 46; // Taller header to allow two-line header labels
  const tableMargin = 25; // Increased margin for better spacing
  const sectionSpacing = 35; // Added spacing between sections

  const pages: PDFPage[] = [];
  const createPage = () => { const p = pdf.addPage([pageWidth, pageHeight]); pages.push(p); return p; };
  let page = createPage();

  // Draw professional header first (we will retro-fit page numbers later if multiple pages)
  let y = await drawProfessionalHeader(page, 0);

  // Draw professional table header
  const tableX = margin + tableMargin;
  const tableWidth = pageWidth - margin * 2 - tableMargin * 2;
  
  // Header background with border
  page.drawRectangle({ 
    x: tableX, 
    y: y - headerHeight + 4, 
    width: tableWidth, 
    height: headerHeight, 
    color: rgb(0.2, 0.2, 0.3),
    borderColor: rgb(0.1, 0.1, 0.2),
    borderWidth: 1
  });
  
  let x = tableX + 10;
  // Optimized column width distribution for up to 5 machines
  const colCount = columns.length;
  const tableInner = tableWidth - 20; // padding allowance
  
  let colWidths: number[];
  if (condensed) {
    // Condensed mode: Name, Power, Air, Voltage
    const nameWidth = Math.min(180, tableInner * 0.3);
    const remaining = tableInner - nameWidth;
    const each = remaining / 3;
    colWidths = [nameWidth, each, each, each];
  } else {
    // Full mode: Name, Type, Release Date, Power, Voltage, Air
    const nameWidth = Math.min(200, tableInner * 0.25);
    const typeWidth = Math.min(120, tableInner * 0.15);
    const dateWidth = Math.min(100, tableInner * 0.12);
    const powerWidth = Math.min(150, tableInner * 0.18);
    const voltageWidth = Math.min(80, tableInner * 0.1);
    const airWidth = Math.min(140, tableInner * 0.17);
    
    // Adjust if total exceeds available width
    const totalWidth = nameWidth + typeWidth + dateWidth + powerWidth + voltageWidth + airWidth;
    if (totalWidth > tableInner) {
      const scale = tableInner / totalWidth;
      colWidths = [
        nameWidth * scale,
        typeWidth * scale,
        dateWidth * scale,
        powerWidth * scale,
        voltageWidth * scale,
        airWidth * scale
      ];
    } else {
      colWidths = [nameWidth, typeWidth, dateWidth, powerWidth, voltageWidth, airWidth];
    }
  }
  columns.forEach((col, i) => {
    const match = col.match(/^(.*?)\s*\((.*)\)$/);
    if (match) {
      const label = sanitize(match[1]);
      const units = '(' + sanitize(match[2]) + ')';
      drawFittedText(page, label, x, y - 22, 13, bold, rgb(1,1,1), colWidths[i] - 8);
      drawFittedText(page, units, x, y - 36, 10, font, rgb(0.9,0.9,0.95), colWidths[i] - 8);
    } else {
      drawFittedText(page, sanitize(col), x, y - 26, 13, bold, rgb(1,1,1), colWidths[i] - 8);
    }
    x += colWidths[i];
  });
  y -= headerHeight;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (y < margin + 60) { // new page
      page = createPage();
      y = await drawProfessionalHeader(page, 0);
      // redraw table header
      page.drawRectangle({ 
        x: tableX, 
        y: y - headerHeight + 4, 
        width: tableWidth, 
        height: headerHeight, 
        color: rgb(0.2, 0.2, 0.3),
        borderColor: rgb(0.1, 0.1, 0.2),
        borderWidth: 1
      });
      let xh = tableX + 8;
      columns.forEach((col, i) => { 
        const match = col.match(/^(.*?)\s*\((.*)\)$/);
        if (match) {
          const label = sanitize(match[1]);
          const units = '(' + sanitize(match[2]) + ')';
          drawFittedText(page, label, xh, y - 20, 12, bold, rgb(1,1,1), colWidths[i] - 8);
          drawFittedText(page, units, xh, y - 32, 9, font, rgb(0.9,0.9,0.95), colWidths[i] - 8);
        } else {
          drawFittedText(page, sanitize(col), xh, y - 22, 12, bold, rgb(1,1,1), colWidths[i] - 8);
        }
        xh += colWidths[i]; 
      });
      y -= headerHeight;
    }
    let cx = tableX + 10;
    const isTotal = row[0] === 'TOTAL';
    
    // Professional row styling
    if (!isTotal) {
      // Alternating row colors with professional borders
      page.drawRectangle({ 
        x: tableX, 
        y: y - lineHeight + 2, 
        width: tableWidth, 
        height: lineHeight, 
        color: (rowIndex % 2 === 0) ? rgb(0.98, 0.98, 1) : rgb(1, 1, 1),
        borderColor: rgb(0.85, 0.85, 0.9),
        borderWidth: 0.3
      });
    } else {
      // Special styling for total row with enhanced appearance and spacing
      page.drawRectangle({ 
        x: tableX, 
        y: y - lineHeight + 3, 
        width: tableWidth, 
        height: lineHeight, 
        color: rgb(0.92, 0.96, 0.92),
        borderColor: rgb(0.1, 0.4, 0.1),
        borderWidth: 2
      });
    }
    
    row.forEach((cell, ci) => {
      const raw = sanitize(String(cell));
      const maxWidth = colWidths[ci] - 15;
      let text = raw;
      
      // Improved text sizing for better readability
      const fontSize = isTotal ? 12 : 10.5;
      const textFont = isTotal ? bold : font;
      
      // Truncate if width exceeds (improved measure)
      const width = textFont.widthOfTextAtSize(text, fontSize);
      if (width > maxWidth) {
        while (text.length > 3 && textFont.widthOfTextAtSize(text + '…', fontSize) > maxWidth) {
          text = text.slice(0, -1);
        }
        text = text + '…';
      }
      
      // Enhanced text positioning with professional spacing
      const textY = y - 24;
      const textColor = isTotal ? rgb(0.05, 0.25, 0.05) : rgb(0.1, 0.1, 0.1);
      
      page.drawText(text, { 
        x: cx, 
        y: textY, 
        size: fontSize, 
        font: textFont, 
        color: textColor 
      });
      cx += colWidths[ci];
    });
    y -= lineHeight;
  }

  // Add professional summary section with enhanced spacing
  if (y - 140 < margin) {
    page = createPage();
    y = await drawProfessionalHeader(page, 0);
  }
  
  // Enhanced summary section with professional styling and spacing
  const summaryY = y - sectionSpacing;
  const summaryHeight = 100; // Increased height for better presentation and spacing
  
  page.drawRectangle({ 
    x: tableX, 
    y: summaryY - summaryHeight, 
    width: tableWidth, 
    height: summaryHeight, 
    color: rgb(0.96, 0.98, 0.96),
    borderColor: rgb(0.15, 0.35, 0.15),
    borderWidth: 1.5
  });
  
  // Summary title with enhanced styling
  page.drawText('QUOTATION SUMMARY', { 
    x: tableX + 20, 
    y: summaryY - 20, 
    size: 16, 
    font: bold, 
    color: rgb(0.08, 0.25, 0.08) 
  });
  
  y = summaryY - 50;
  
  // Machine count information with enhanced professional spacing
  page.drawText(sanitize(`Machines Compared: ${machines.length} units`), { 
    x: tableX + 30, 
    y: y, 
    size: 14, 
    font: bold, 
    color: rgb(0.15, 0.15, 0.15) 
  });
  y -= 25;
  
  if (condensed) {
    page.drawText(sanitize(`Total Power Required: ${totalPowerDisplay} | Total Air Consumption: ${totalAirDisplay}`), { 
      x: tableX + 30, 
      y: y, 
      size: 13, 
      font, 
      color: rgb(0.2, 0.2, 0.2) 
    });
    y -= 22;
  } else {
    page.drawText(sanitize(`Total Power Required: ${totalPowerDisplay}`), { 
      x: tableX + 30, 
      y: y, 
      size: 13, 
      font, 
      color: rgb(0.2, 0.2, 0.2) 
    });
    y -= 22;
    page.drawText(sanitize(`Total Air Consumption: ${totalAirDisplay}`), { 
      x: tableX + 30, 
      y: y, 
      size: 13, 
      font, 
      color: rgb(0.2, 0.2, 0.2) 
    });
    y -= 22;
  }
  
  // Enhanced professional notes section with better spacing
  y -= 30;
  page.drawText('IMPORTANT TECHNICAL NOTES:', { 
    x: tableX + 30, 
    y: y, 
    size: 12, 
    font: bold, 
    color: rgb(0.25, 0.25, 0.25) 
  });
  y -= 20;
  page.drawText(sanitize('• Verify electrical capacity and maintain >=20% safety margin for optimal performance'), { 
    x: tableX + 30, 
    y: y, 
    size: 10, 
    font, 
    color: rgb(0.35, 0.35, 0.35) 
  });
  y -= 16;
  page.drawText(sanitize('• All specifications are nominal values (not peak load) - consult technical team for peak requirements'), { 
    x: tableX + 30, 
    y: y, 
    size: 10, 
    font, 
    color: rgb(0.35, 0.35, 0.35) 
  });
  y -= 16;
  page.drawText(sanitize('• Contact our technical team for detailed installation planning and site preparation'), { 
    x: tableX + 30, 
    y: y, 
    size: 10, 
    font, 
    color: rgb(0.35, 0.35, 0.35) 
  });
  y -= 16;
  page.drawText(sanitize('• This quotation is valid for 30 days from the date of issue'), { 
    x: tableX + 30, 
    y: y, 
    size: 10, 
    font, 
    color: rgb(0.35, 0.35, 0.35) 
  });
  y -= 16;
  page.drawText(sanitize('• Professional installation and training services available upon request'), { 
    x: tableX + 30, 
    y: y, 
    size: 10, 
    font, 
    color: rgb(0.35, 0.35, 0.35) 
  });

  // Add professional footers with contact details
  if (includeFooter) {
    const total = pages.length;
    pages.forEach((p, idx) => {
      const footerY = 25;
      const footerHeight = 60;
      
      // Footer background
      p.drawRectangle({ 
        x: margin, 
        y: footerY, 
        width: pageWidth - margin * 2, 
        height: footerHeight, 
        color: rgb(0.95, 0.95, 0.97),
        borderColor: rgb(0.8, 0.8, 0.85),
        borderWidth: 1
      });
      
      // Divider line
      p.drawLine({ 
        start: { x: margin, y: footerY + footerHeight - 10 }, 
        end: { x: pageWidth - margin, y: footerY + footerHeight - 10 }, 
        thickness: 0.5, 
        color: rgb(0.7, 0.7, 0.75) 
      });
      
      // Company branding
      p.drawText('ALMONA INDUSTRIAL SOLUTIONS', { 
        x: margin + 15, 
        y: footerY + 35, 
        size: 10, 
        font: bold, 
        color: rgb(0.2, 0.2, 0.3) 
      });
      
      p.drawText('Authorized YILMAZ Machinery Dealer', { 
        x: margin + 15, 
        y: footerY + 20, 
        size: 8, 
        font, 
        color: rgb(0.3, 0.3, 0.4) 
      });
      
      // Contact information
      const contactX = pageWidth - margin - 200;
      p.drawText('CONTACT INFORMATION', { 
        x: contactX, 
        y: footerY + 35, 
        size: 9, 
        font: bold, 
        color: rgb(0.2, 0.2, 0.3) 
      });
      
      p.drawText('Website: almona02.com', { 
        x: contactX, 
        y: footerY + 20, 
        size: 8, 
        font, 
        color: rgb(0.3, 0.3, 0.4) 
      });
      
      p.drawText('Email: info@almona02.com', { 
        x: contactX, 
        y: footerY + 8, 
        size: 8, 
        font, 
        color: rgb(0.3, 0.3, 0.4) 
      });
      
      // Page number
      const pageLabel = `Page ${idx + 1} / ${total}`;
      const labelWidth = font.widthOfTextAtSize(pageLabel, 9);
      p.drawText(pageLabel, { 
        x: pageWidth - margin - labelWidth - 15, 
        y: footerY + 8, 
        size: 9, 
        font, 
        color: rgb(0.4, 0.4, 0.5) 
      });
    });
  }

  return pdf.save();
}

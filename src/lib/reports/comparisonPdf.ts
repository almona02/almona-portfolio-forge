import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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
  const drawHeader = async (page: PDFPage, pageIndex: number, totalPages?: number) => {
    const yTop = pageHeight - margin;
    if (logoDataUrl) {
      try {
        const base64 = logoDataUrl.split(',')[1];
        const logoBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const logoImage = await pdf.embedPng(logoBytes);
        const logoDims = logoImage.scale(0.3);
        page.drawImage(logoImage, { x: margin, y: yTop - logoDims.height, width: logoDims.width, height: logoDims.height });
      } catch (e) {
        // ignore logo embedding errors silently
      }
    }
    page.drawText('ALMONA Machine Comparison Report', { x: margin + 180, y: yTop - 20, size: 20, font: bold, color: rgb(0.2,0.2,0.2) });
    page.drawText(new Date().toLocaleString(), { x: pageWidth - margin - 150, y: yTop - 14, size: 10, font, color: rgb(0.3,0.3,0.3) });
    if (totalPages) {
      page.drawText(`Page ${pageIndex + 1} / ${totalPages}` , { x: pageWidth - margin - 100, y: margin / 2, size: 10, font, color: rgb(0.4,0.4,0.4) });
    }
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
    .replace(/³/g, '^3');

  // Simple table rendering with wrapping pages if needed
  const lineHeight = 18;
  const headerHeight = 24;
  let y = pageHeight - margin - 80;

  const pages: PDFPage[] = [];
  const createPage = () => { const p = pdf.addPage([pageWidth, pageHeight]); pages.push(p); return p; };
  let page = createPage();

  // Draw header first (we will retro-fit page numbers later if multiple pages)
  await drawHeader(page, 0);

  // Draw table header
  page.drawRectangle({ x: margin, y: y - headerHeight + 4, width: pageWidth - margin*2, height: headerHeight, color: rgb(0.95,0.95,0.97) });
  let x = margin + 4;
  // Dynamic column width distribution: first column wider, remaining share space
  const baseWidths = condensed
    ? [190,140,140,80]
    : [160,100,90,170,90,130];
  const colCount = columns.length;
  let colWidths = baseWidths;
  if (colCount !== baseWidths.length) {
    // Recompute: allocate first col 0.22 of width, rest evenly
    const tableInner = pageWidth - margin * 2 - 8; // padding allowance
    const first = Math.min(220, tableInner * 0.22);
    const remaining = tableInner - first;
    const each = remaining / (colCount - 1);
    colWidths = [first, ...Array.from({ length: colCount - 1 }, () => each)];
  }
  columns.forEach((col, i) => {
    page.drawText(sanitize(col), { x, y: y - 16, size: 11, font: bold });
    x += colWidths[i];
  });
  y -= headerHeight;

  rows.forEach((row, rowIndex) => {
    if (y < margin + 40) { // new page
      page = createPage();
      y = pageHeight - margin - 60;
      drawHeader(page, 0); // page number fix later
      // redraw header
      page.drawRectangle({ x: margin, y: y - headerHeight + 4, width: pageWidth - margin*2, height: headerHeight, color: rgb(0.95,0.95,0.97) });
      let xh = margin + 4;
  columns.forEach((col, i) => { page.drawText(sanitize(col), { x: xh, y: y - 16, size: 11, font: bold }); xh += colWidths[i]; });
      y -= headerHeight;
    }
    let cx = margin + 4;
  const isTotal = row[0] === 'TOTAL';
    if (!isTotal) {
      page.drawRectangle({ x: margin, y: y - lineHeight + 4, width: pageWidth - margin*2, height: lineHeight, color: (rowIndex % 2 === 0) ? rgb(0.99,0.99,1) : rgb(1,1,1) });
    } else {
      page.drawRectangle({ x: margin, y: y - lineHeight + 4, width: pageWidth - margin*2, height: lineHeight, color: rgb(0.93,0.93,0.97) });
    }
    row.forEach((cell, ci) => {
      const raw = sanitize(String(cell));
      const maxWidth = colWidths[ci] - 8;
      let text = raw;
      // Truncate if width exceeds (simple measure)
      const width = (isTotal ? bold : font).widthOfTextAtSize(text, isTotal ? 11 : 9.5);
      if (width > maxWidth) {
        while (text.length > 3 && (isTotal ? bold : font).widthOfTextAtSize(text + '…', isTotal ? 11 : 9.5) > maxWidth) {
          text = text.slice(0, -1);
        }
        text = text + '…';
      }
      page.drawText(text, { x: cx, y: y - 14, size: isTotal ? 11 : 9.5, font: isTotal ? bold : font, color: isTotal ? rgb(0.05,0.05,0.05) : rgb(0,0,0) });
      cx += colWidths[ci];
    });
    y -= lineHeight;
  });

  // Add summary section
  if (y - 100 < margin) {
    page = createPage();
    y = pageHeight - margin - 60;
    await drawHeader(page, 0);
  }
  page.drawText('Summary', { x: margin, y: y - 10, size: 14, font: bold });
  y -= 30;
  if (condensed) {
    page.drawText(sanitize(`Totals: Power ${totalPowerDisplay} | Air ${totalAirDisplay}`), { x: margin, y: y, size: 11, font });
    y -= 16;
  } else {
    page.drawText(sanitize(`Total Power Required: ${totalPowerDisplay}`), { x: margin, y: y, size: 11, font });
    y -= 16;
    page.drawText(sanitize(`Total Air Consumption: ${totalAirDisplay}`), { x: margin, y: y, size: 11, font });
    y -= 16;
  }
  page.drawText(sanitize('Notes: Verify capacity & keep >=20% margin. For mobile view use condensed mode; figures are nominal (not peak).'), { x: margin, y: y, size: 9, font, maxWidth: pageWidth - margin*2 });

  // Add footers with page numbers & branding
  if (includeFooter) {
    const total = pages.length;
    pages.forEach((p, idx) => {
      const footerY = 20;
      // divider line
      p.drawLine({ start: { x: margin, y: footerY + 10 }, end: { x: pageWidth - margin, y: footerY + 10 }, thickness: 0.5, color: rgb(0.8,0.8,0.85) });
      p.drawText('ALMONA | almona02.com | Authorized YILMAZ Dealer', { x: margin, y: footerY, size: 9, font, color: rgb(0.25,0.25,0.3) });
      const pageLabel = `Page ${idx + 1} / ${total}`;
      const labelWidth = font.widthOfTextAtSize(pageLabel, 9);
      p.drawText(pageLabel, { x: pageWidth - margin - labelWidth, y: footerY, size: 9, font, color: rgb(0.35,0.35,0.4) });
    });
  }

  return pdf.save();
}

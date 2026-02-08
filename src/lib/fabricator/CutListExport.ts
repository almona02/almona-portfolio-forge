/**
 * Cut list export for fenestration: CSV, print HTML, PDF, and ALMONA Cut Optimisation.
 * Workshop-ready formats for UPVC cutting (e.g. Yılmaz single-head). ALMONA layout for Egyptian market.
 */

import type {
    AlmonaCutProjectInfo,
    AlmonaCutReport,
    PackedBar
} from './AlmonaCuttingEngine';
import { AlmonaCuttingEngine } from './AlmonaCuttingEngine';
import { OptimizedCutList } from './UPVCCuttingEngine';

// -----------------------------------------------------------------------------
// CSV
// -----------------------------------------------------------------------------

/** Export cut list to CSV. One row per cut line: Bar, Profile, Role, Length_mm, Angle_deg, Position_mm, Waste_mm, Qty. Comma-delimited, no placeholders. */
export function exportCutListToCSV(
  cutList: OptimizedCutList,
  _projectName: string = 'Window Project'
): string {
  const headers = ['Bar', 'Profile', 'Role', 'Length_mm', 'Angle_deg', 'Position_mm', 'Waste_mm', 'Qty'];
  const rows: string[][] = [headers];
  cutList.items.forEach((item) => {
    rows.push([
      item.barNumber.toString(),
      escapeCsv(item.profileName),
      item.role.toUpperCase(),
      Math.round(item.cutLengthMm).toString(),
      item.cuttingAngle.toString(),
      Math.round(item.positionOnBarMm).toString(),
      Math.round(item.wasteAfterMm).toString(),
      item.quantity.toString(),
    ]);
  });
  return rows.map((row) => row.join(',')).join('\n');
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

/** Trigger download of CSV content. */
export function downloadCSV(csvContent: string, filename: string = 'cut-list.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// -----------------------------------------------------------------------------
// Basic print (simple HTML table)
// -----------------------------------------------------------------------------

/** Export cut list to print-ready HTML (A4 landscape, simple table). */
export function exportCutListToPrintHTML(
  cutList: OptimizedCutList,
  projectInfo: {
    name: string;
    width: number;
    height: number;
    systemPack: string;
  }
): string {
  const timestamp = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cut List - ${projectInfo.name}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    @media print { body { margin: 0; } .no-print { display: none; } .page-break { page-break-after: always; } }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 20pt; font-weight: bold; }
    .header .info { text-align: right; font-size: 10pt; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .summary-box { border: 2px solid #333; padding: 10px; text-align: center; }
    .summary-box .label { font-size: 9pt; color: #666; margin-bottom: 5px; }
    .summary-box .value { font-size: 18pt; font-weight: bold; }
    .summary-box.green { background-color: #d4edda; border-color: #28a745; }
    .summary-box.amber { background-color: #fff3cd; border-color: #ffc107; }
    .summary-box.red { background-color: #f8d7da; border-color: #dc3545; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #333; padding: 8px; text-align: left; }
    th { background-color: #333; color: white; font-weight: bold; font-size: 10pt; }
    td { font-size: 10pt; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .cut-number { background-color: #007bff; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; display: inline-block; min-width: 30px; text-align: center; }
    .role-badge { background-color: #6c757d; color: white; padding: 2px 6px; border-radius: 3px; font-size: 9pt; font-weight: bold; }
    .footer { margin-top: 30px; padding-top: 10px; border-top: 2px solid #333; display: flex; justify-content: space-between; font-size: 9pt; color: #666; }
    .print-button { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14pt; font-weight: bold; }
    .print-button:hover { background-color: #0056b3; }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">🖨️ Print</button>
  <div class="header">
    <div>
      <h1>UPVC CUTTING LIST</h1>
      <div style="font-size: 12pt; margin-top: 5px;"><strong>${projectInfo.name}</strong> | ${projectInfo.width}mm × ${projectInfo.height}mm</div>
    </div>
    <div class="info">
      <div><strong>System:</strong> ${projectInfo.systemPack}</div>
      <div><strong>Date:</strong> ${timestamp}</div>
      <div><strong>Machine:</strong> Yılmaz Single-Head</div>
    </div>
  </div>
  <div class="summary">
    <div class="summary-box"><div class="label">Total Bars (6m)</div><div class="value">${cutList.totalBarsUsed}</div></div>
    <div class="summary-box ${cutList.wastePercentage < 5 ? 'green' : cutList.wastePercentage < 10 ? 'amber' : 'red'}"><div class="label">Waste</div><div class="value">${cutList.wastePercentage.toFixed(1)}%</div></div>
    <div class="summary-box"><div class="label">Total Length</div><div class="value">${((cutList.totalBarsUsed * 6000 - cutList.totalWasteMm) / 1000).toFixed(1)}m</div></div>
    <div class="summary-box"><div class="label">Efficiency</div><div class="value">${(100 - cutList.wastePercentage).toFixed(1)}%</div></div>
  </div>
  <h2 style="margin-top: 30px; margin-bottom: 10px;">Cutting Instructions</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 50px;">#</th><th style="width: 70px;">Bar</th><th>Profile</th><th style="width: 80px;">Role</th>
        <th style="width: 100px;">Cut Length</th><th style="width: 70px;">Angle</th><th style="width: 100px;">Position</th><th style="width: 80px;">Qty</th>
      </tr>
    </thead>
    <tbody>
      ${cutList.items.map((item, idx) => `
        <tr>
          <td><span class="cut-number">${idx + 1}</span></td>
          <td style="text-align: center; font-weight: bold;">Bar ${item.barNumber}</td>
          <td>${item.profileName}</td>
          <td><span class="role-badge">${item.role.toUpperCase()}</span></td>
          <td style="text-align: right; font-weight: bold; font-family: monospace;">${item.cutLengthMm.toFixed(1)} mm</td>
          <td style="text-align: center; font-weight: bold;">${item.cuttingAngle}°</td>
          <td style="text-align: right; font-family: monospace;">${item.positionOnBarMm.toFixed(0)} mm</td>
          <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="footer">
    <div><strong>Almona Fabricator Pro</strong> - Gold Tier Production System</div>
    <div>Generated: ${timestamp}</div>
  </div>
</body>
</html>`.trim();
}

/** Open print dialog with simple cut list HTML. */
export function printCutList(
  cutList: OptimizedCutList,
  projectInfo: { name: string; width: number; height: number; systemPack: string }
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the cut list');
    return;
  }
  printWindow.document.write(exportCutListToPrintHTML(cutList, projectInfo));
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };
}

// -----------------------------------------------------------------------------
// PDF
// -----------------------------------------------------------------------------

/** Project info for PDF export. */
export interface CutListPDFProjectInfo {
  name: string;
  width?: number;
  height?: number;
  systemPack?: string;
}

/** Generate cut list PDF (lazy-loads jsPDF). Returns Blob for download. */
export async function exportCutListToPDF(
  cutList: OptimizedCutList,
  projectInfo: CutListPDFProjectInfo
): Promise<Blob> {
  const [{ default: jsPDF }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  type JsPDFWithAutoTable = typeof jsPDF & { autoTable: (opts: unknown) => JsPDFWithAutoTable };
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as JsPDFWithAutoTable;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;
  const timestamp = new Date().toLocaleString('en-GB');

  doc.setFontSize(16);
  doc.text('Cut List', pageW / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.text(projectInfo.name, margin, y);
  y += 6;
  doc.text(`Date: ${timestamp}  |  System: ${projectInfo.systemPack ?? '—'}`, margin, y);
  y += 6;
  doc.text(`Total bars: ${cutList.totalBarsUsed}  |  Waste: ${cutList.wastePercentage.toFixed(1)}%  |  Waste length: ${cutList.totalWasteMm} mm`, margin, y);
  y += 12;

  const tableData = cutList.items.map((item) => [
    item.barNumber.toString(),
    item.profileName,
    item.role.toUpperCase(),
    item.cutLengthMm.toFixed(1),
    item.cuttingAngle.toString(),
    item.positionOnBarMm.toFixed(0),
    item.quantity.toString(),
  ]);
  doc.autoTable({
    head: [['Bar', 'Profile', 'Role', 'Length (mm)', 'Angle (°)', 'Position (mm)', 'Qty']],
    body: tableData,
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 66, 66] },
  });
  y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
  y += 10;
  doc.setFontSize(9);
  doc.text(`ALMONA Fabricator Pro - Gold Tier  |  Generated ${timestamp}`, margin, pageH - 10);

  return doc.output('blob');
}

/** Download cut list as PDF file. */
export async function downloadCutListPDF(
  cutList: OptimizedCutList,
  projectInfo: CutListPDFProjectInfo,
  filename?: string
): Promise<void> {
  const blob = await exportCutListToPDF(cutList, projectInfo);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? `${(projectInfo.name || 'cut-list').replace(/\s+/g, '-')}-cut-list.pdf`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// -----------------------------------------------------------------------------
// ALMONA Cut Optimisation (gold-tier print: bars, rulers, angles, residuals)
// -----------------------------------------------------------------------------

/** Project info for ALMONA Cut Optimisation export. */
export interface AlmonaCutPrintProjectInfo extends AlmonaCutProjectInfo {
  width?: number;
  height?: number;
  systemPack?: string;
}

const BARS_PER_PAGE = 20;
const ALMONA_PRINT_CSS = `
  @page { margin: 10mm; size: A4 landscape; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 9pt; line-height: 1.25; color: #000; }
  .no-print { display: none; }
  .page-break { page-break-after: always; }
  .header { border-bottom: 2px solid #000; padding-bottom: 4mm; margin-bottom: 4mm; }
  .header-title { font-size: 16pt; font-weight: 800; text-align: left; }
  .header-subtitle { font-size: 9pt; color: #333; text-align: right; margin-top: -20px; }
  .project-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; border: 1px solid #000; margin-top: 4mm; }
  .project-info-row { display: grid; grid-template-columns: 100px 1fr 100px 1fr; border-bottom: 1px solid #000; }
  .project-info-row:last-child { border-bottom: none; }
  .info-cell { padding: 3px 6px; border-right: 1px solid #000; }
  .info-cell:last-child { border-right: none; }
  .info-label { font-weight: 700; color: #000; }
  .info-val { font-weight: 500; }
  
  .cut-table { width: 100%; border-collapse: collapse; margin-top: 5mm; }
  .cut-table th { border-bottom: 2px solid #000; border-top: 2px solid #000; padding: 4px; text-align: center; font-weight: 700; font-size: 9pt; background: #eee; }
  .cut-table td { padding: 6px 4px; border-bottom: 1px solid #999; vertical-align: middle; }
  .repeat-cell { width: 40px; text-align: center; font-weight: 800; font-size: 11pt; border-right: 1px solid #000; }
  .bar-cell { }
  .residual-cell { width: 60px; text-align: right; font-weight: 800; font-size: 10pt; vertical-align: top; padding-top: 10px; }

  .bar-container { display: flex; align-items: center; width: 100%; height: 50px; position: relative; }
  .profile-icon { width: 40px; height: 30px; border: 1px solid #000; margin-right: 10px; display: flex; align-items: center; justify-content: center; opacity: 0.6; }
  .visual-bar-wrapper { flex: 1; position: relative; height: 44px; border: 1px solid #000; border-radius: 2px; }
  
  /* Segments */
  .segment { position: absolute; top: 0; bottom: 0; border-right: 1px solid #000; box-sizing: border-box; background: #fff; overflow: hidden; }
  .segment:last-child { border-right: none; }
  
  /* Segment Content Layout */
  .seg-label-group { position: absolute; inset: 0; pointer-events: none; }
  .seg-part-id { position: absolute; top: 2px; left: 6px; font-size: 8pt; font-weight: 700; }
  .seg-len { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 14pt; font-weight: 800; background: rgba(255,255,255,0.8); padding: 0 2px; }
  .seg-angle-left { position: absolute; bottom: 0; left: 2px; font-size: 7pt; font-weight: 700; }
  .seg-angle-right { position: absolute; bottom: 0; right: 2px; font-size: 7pt; font-weight: 700; }

  /* Cut Lines via CSS borders/transforms */
  .cut-miter-slash { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px solid #000; transform-origin: 50% 50%; }
  /* We simulate the visual miter by drawing the segment as a rect and overlaying the 'slash' at the join */

  /* Waste */
  .segment-waste { background: repeating-linear-gradient(45deg, #eee, #eee 4px, #fff 4px, #fff 8px); color: #999; }
  .waste-label { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 9pt; font-weight: 700; letter-spacing: 1px; }

  .footer { margin-top: 4mm; border-top: 1px solid #000; padding-top: 2mm; font-size: 8pt; display: flex; justify-content: space-between; }
  .print-btn { position: fixed; top: 10px; right: 10px; padding: 8px 16px; background: #000; color: #fff; border: none; cursor: pointer; border-radius: 0; font-weight: bold; }
`.trim();

/** Dynamic length font size (pt) by bars on page: fewer bars = larger font for workshop readability. */
function segmentLengthFontSizePt(barsOnPage: number): number {
  if (barsOnPage <= 3) return 48;
  if (barsOnPage <= 6) return 36;
  if (barsOnPage <= 10) return 28;
  if (barsOnPage <= 15) return 22;
  return 18;
}

function buildAlmonaBarRowHtml(bar: PackedBar): string {
  const totalLen = bar.totalLength;
  const segmentsHtml = bar.segments.map((seg, i) => {
    const isFirst = i === 0;
    const prevSeg = !isFirst ? bar.segments[i-1] : null;
    
    // Width logic
    const widthPct = (seg.length / totalLen) * 100;
    const leftPct = (seg.position / totalLen) * 100;
    
    // Angle visual logic
    const angleL = prevSeg ? (prevSeg.angle || 90) : 90; // The cut between prev and current
    const angleR = seg.angle || 90; // The cut at end of current

    // For 45 deg cuts, we simulate the diagonal line visually if we wanted high fidelity,
    // but standard reports often just show Rectangles with text "45" at the corners.
    // The previous visual SVG used actual paths. Here in HTML+CSS, rects are safer for print layout stability.
    // We will just label the angles clearly.
    
    const labelAngleL = angleL === 90 ? '' : angleL;
    const labelAngleR = angleR === 90 ? '' : angleR;
    
    return `
      <div class="segment" style="left: ${leftPct}%; width: ${widthPct}%;">
        <div style="position:absolute;inset:0;opacity:0.1;pointer-events:none;">
          <svg viewBox="0 0 ${seg.length} 60" preserveAspectRatio="none" width="100%" height="100%">
               ${(() => {
                   const h = 60;
                   const w = seg.length;
                   const slope = Math.min(h, w / 2); // Max slope length is half the segment width or full height
                   
                   // Determine the shape based on the angles.
                   // This is a simplification, assuming the segment itself has a primary angle.
                   // For a more accurate representation, one would need to consider the angles of the cuts
                   // at both ends of the segment.
                   // Here, we'll use the segment's own angle property (seg.angle) for its right side,
                   // and infer the left side based on the previous segment's angle (angleL).
                   // However, the user's provided SVG logic uses a single `angleDeg` for the whole shape.
                   // Let's try to interpret `seg.angle` as the primary angle for the segment's shape.
                   
                   let shapePath = '';
                   const effectiveAngle = seg.angle || 90; // Use seg.angle if available, otherwise 90.

                   if (effectiveAngle === 45) { // Represents a segment that is cut at 45 degrees on its right side, and potentially 90 or 135 on its left.
                                                // The user's example `angleDeg === 45` draws /____\
                       shapePath = `M 0 ${h} L ${slope} 0 L ${w - slope} 0 L ${w} ${h} Z`;
                   } else if (effectiveAngle === 135) { // Represents a segment cut at 135 degrees on its right side.
                                                        // The user's example `angleDeg === 135` draws \____/
                       shapePath = `M 0 0 L ${slope} ${h} L ${w - slope} ${h} L ${w} 0 Z`;
                   } else { // Default to rectangular if 90 degrees or other.
                       shapePath = `M 0 0 L 0 ${h} L ${w} ${h} L ${w} 0 Z`;
                   }
                   
                   return `<path d="${shapePath}" fill="#000" />`;
               })()}
          </svg>
        </div>
        <div class="seg-label-group">
          <span class="seg-part-id">${seg.partId}</span>
          <span class="seg-len">${Math.round(seg.length)}</span>
          <span class="seg-angle-left">${labelAngleL}</span>
          <span class="seg-angle-right">${labelAngleR}</span>
        </div>
      </div>
    `;
  }).join('');

  // Remnant
  const remnantPct = (bar.remnant / totalLen) * 100;
  const remnantLeft = ((totalLen - bar.remnant) / totalLen) * 100;
  const remnantHtml = bar.remnant > 0 ? `
    <div class="segment segment-waste" style="left: ${remnantLeft}%; width: ${remnantPct}%;">
      <span class="waste-label">${Math.round(bar.remnant)}</span>
    </div>
  ` : '';

  return `
    <tr>
      <td class="repeat-cell">${bar.repeatCount} x</td>
      <td class="bar-cell">
        <div class="bar-container">
          <div class="profile-icon">
            <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:#000;stroke-width:2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></svg>
          </div>
          <div class="visual-bar-wrapper">
             ${segmentsHtml}
             ${remnantHtml}
          </div>
        </div>
      </td>
      <td class="residual-cell">${Math.round(bar.remnant)}</td>
    </tr>
  `;
}

function buildAlmonaPageHtml(
  pageBars: PackedBar[],
  pageIndex: number,
  header: AlmonaCutReport['header'],
  footer: AlmonaCutReport['footer'],
  totalPages: number,
  dateTime: string
): string {
  const h = header;
  const barsOnPage = pageBars.length;
  const lengthFontPt = segmentLengthFontSizePt(barsOnPage);
  const barRows = pageBars.map((bar) => buildAlmonaBarRowHtml(bar)).join('');
  const pageBreakClass = pageIndex > 0 ? 'page-break' : '';

  return `
    <div class="page ${pageBreakClass}" style="--segment-length-font-size: ${lengthFontPt}pt;">
      <div class="header">
        <div class="header-title">${h.title}</div>
        <div class="header-subtitle">${dateTime}</div>
        <div class="project-info">
          <div class="info-group"><span class="label">Project:</span><span class="value">${h.project}</span></div>
          <div class="info-group"><span class="label">Job Number:</span><span class="value">${h.jobNumber}</span></div>
          <div class="info-group"><span class="label">Person in Charge:</span><span class="value">${h.personInCharge}</span></div>
          <div class="info-group"><span class="label">Directory:</span><span class="value">${h.directory}</span></div>
          <div class="info-group"><span class="label">Profile Type:</span><span class="value">${h.profileType}</span></div>
          <div class="info-group"><span class="label">Total Pieces:</span><span class="value">${h.totalPieces}</span></div>
          <div class="info-group"><span class="label">Material:</span><span class="value">${h.material}</span></div>
          <div class="info-group"><span class="label">Colour:</span><span class="value">${h.color}</span></div>
          <div class="info-group"><span class="label">Saw Cut Deduction:</span><span class="value">${h.sawCutDeduction}</span></div>
          <div class="info-group"><span class="label">End Deduction Total:</span><span class="value">${h.endDeductionTotal}</span></div>
          <div class="info-group"><span class="label">Usable Residual Length:</span><span class="value">${h.usableResidualLength}</span></div>
          <div class="info-group"><span class="label">Wastage:</span><span class="value">${h.wastage}</span></div>
        </div>
      </div>
      <table class="cut-table cut-table-gold">
        <thead><tr><th>Repeat</th><th>Bar</th><th>Residual</th></tr></thead>
        <tbody>${barRows}</tbody>
      </table>
      <div class="footer">${footer.system} | Page ${pageIndex + 1} from ${totalPages} | ${footer.disclaimer}</div>
    </div>`;
}

/** Export ALMONA Cut Optimisation report as print-ready HTML (bars, rulers, angles, residuals). */
export function exportAlmonaCutStylePrintHTML(report: AlmonaCutReport, projectName: string): string {
  const { header, body, footer } = report;
  const totalPages = Math.ceil(body.bars.length / BARS_PER_PAGE) || 1;
  const dateTime = new Date().toLocaleString('en-GB');
  const pageBlocks: string[] = [];

  for (let page = 0; page < totalPages; page++) {
    const start = page * BARS_PER_PAGE;
    const end = Math.min(start + BARS_PER_PAGE, body.bars.length);
    const pageBars = body.bars.slice(start, end);
    pageBlocks.push(buildAlmonaPageHtml(pageBars, page, header, footer, totalPages, dateTime));
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${header.title} - ${projectName}</title>
  <style>${ALMONA_PRINT_CSS}</style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print</button>
  ${pageBlocks.join('')}
</body>
</html>`.trim();
}

/** Build ALMONA report from OptimizedCutList and return report + print HTML. */
export function buildAlmonaCutReportAndHTML(
  cutList: OptimizedCutList,
  projectInfo: AlmonaCutPrintProjectInfo
): { report: AlmonaCutReport; html: string } {
  const engine = new AlmonaCuttingEngine({
    barLengthMm: projectInfo.barLengthMm ?? 6500,
    sawKerfMm: projectInfo.sawKerfMm ?? 10,
    endDeductionMm: projectInfo.endDeductionMm ?? 20,
  });
  const report = engine.buildReportFromOptimizedCutList(cutList, projectInfo);
  const html = exportAlmonaCutStylePrintHTML(report, projectInfo.name);
  return { report, html };
}

/** Open print dialog with ALMONA Cut Optimisation layout. */
export function printCutListAlmonaStyle(
  cutList: OptimizedCutList,
  projectInfo: AlmonaCutPrintProjectInfo
): void {
  const { html } = buildAlmonaCutReportAndHTML(cutList, projectInfo);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the cut list');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };
}

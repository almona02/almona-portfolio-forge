// Workshop layout PDF export — reuses the ALMONA logo/branding pattern from comparisonPdf.
let PDFDocument: any, StandardFonts: any, rgb: any;
const fontCache = new Map<string, any>();
const logoCache = new Map<string, any>();

export interface LayoutPdfItem {
  label: string;
  x: number; // meters
  y: number; // meters
  w: number; // meters
  h: number; // meters
  color?: string; // hex like "#f59e0b"
}

export interface WorkshopLayoutPdfOptions {
  components?: { label: string; qty: number }[];
  totalPowerKw?: number;
  totalAirLmin?: number;
  companyName?: string;
}

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 0.4, g: 0.4, b: 0.4 };
  return {
    r: parseInt(m[1], 16) / 255,
    g: parseInt(m[2], 16) / 255,
    b: parseInt(m[3], 16) / 255,
  };
}

export async function generateWorkshopLayoutPDF(
  factoryW: number,
  factoryL: number,
  items: LayoutPdfItem[],
  logoDataUrl?: string,
  options: WorkshopLayoutPdfOptions = {}
): Promise<Uint8Array> {
  if (!PDFDocument) {
    const mod = await import('pdf-lib');
    PDFDocument = mod.PDFDocument;
    StandardFonts = mod.StandardFonts;
    rgb = mod.rgb;
  }

  const { components = [], totalPowerKw = 0, totalAirLmin = 0, companyName = 'YILMAZ MACHINES' } = options;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // landscape A4

  let font = fontCache.get('helvetica');
  let bold = fontCache.get('helvetica-bold');
  if (!font) { font = await pdf.embedFont(StandardFonts.Helvetica); fontCache.set('helvetica', font); }
  if (!bold) { bold = await pdf.embedFont(StandardFonts.HelveticaBold); fontCache.set('helvetica-bold', bold); }

  const primary = rgb(0.1, 0.3, 0.5);
  const secondary = rgb(0.4, 0.4, 0.4);
  const margin = 40;

  // Header
  let logoX = margin;
  if (logoDataUrl) {
    try {
      let img = logoCache.get(logoDataUrl);
      if (!img) {
        const base64 = logoDataUrl.split(',')[1];
        img = await pdf.embedPng(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
        logoCache.set(logoDataUrl, img);
      }
      const d = img.scale(0.22);
      const maxH = 44;
      let w = d.width, h = d.height;
      if (h > maxH) { const s = maxH / h; w *= s; h *= s; }
      page.drawImage(img, { x: logoX, y: 595 - margin - h, width: w, height: h });
      logoX += w + 16;
    } catch { /* logo optional */ }
  }

  page.drawText(companyName, { x: logoX, y: 595 - margin - 16, size: 15, font: bold, color: primary });
  page.drawText('ALMONA CO. IMPORT EXPORT COMMERCIAL AGENCIES', { x: logoX, y: 595 - margin - 32, size: 8, font, color: secondary });
  page.drawText('WORKSHOP LAYOUT PLAN', { x: 842 - margin - 170, y: 595 - margin - 18, size: 11, font: bold, color: primary });
  page.drawText(`Factory: ${factoryL} m × ${factoryW} m`, { x: 842 - margin - 170, y: 595 - margin - 32, size: 8, font, color: secondary });

  // Layout area — shifted down ~1cm to clear the logo line; bottom space reserved for components/footer.
  const areaX = margin;
  const areaY = 100;
  const areaW = 842 - margin * 2;
  const areaH = 595 - areaY - 105;
  const s = Math.min(areaW / factoryL, areaH / factoryW);
  const floorW = factoryL * s;
  const floorH = factoryW * s;
  const ox = areaX + (areaW - floorW) / 2;
  const oy = areaY + (areaH - floorH) / 2;

  // Floor
  page.drawRectangle({ x: ox, y: oy, width: floorW, height: floorH, borderColor: rgb(0.5, 0.55, 0.6), borderWidth: 1.5 });

  // Items
  for (const it of items) {
    const c = hexToRgb(it.color || '#94a3b8');
    const px = ox + it.x * s;
    const py = oy + it.y * s;
    const pw = it.w * s;
    const ph = it.h * s;
    page.drawRectangle({ x: px, y: py, width: pw, height: ph, color: rgb(c.r, c.g, c.b, 0.15), borderColor: rgb(c.r, c.g, c.b), borderWidth: 1 });
    if (pw > 40 && ph > 20) {
      page.drawText(it.label, { x: px + 3, y: py + ph / 2 - 4, size: 7, font: bold, color: rgb(0.15, 0.15, 0.15) });
    }
  }

  // Components list (bottom-left)
  let cy = 84;
  page.drawText('COMPONENTS', { x: margin, y: cy, size: 9, font: bold, color: primary });
  cy -= 13;
  const col2 = 260;
  let col = 0;
  for (const c of components) {
    page.drawText(`${c.qty}×  ${c.label}`, { x: margin + col * col2, y: cy, size: 7, font, color: secondary });
    cy -= 10;
    if (cy < 26) { cy = 84 - 13; col = 1; }
  }

  // Total power + electricity (bottom-right, above footer)
  const trx = 842 - margin - 230;
  page.drawText('TOTAL POWER & ELECTRICITY', { x: trx, y: 84, size: 9, font: bold, color: primary });
  page.drawText(`Total Power: ${totalPowerKw} kW`, { x: trx, y: 70, size: 8, font, color: secondary });
  page.drawText(`Total Air Consumption: ${totalAirLmin} L/min`, { x: trx, y: 58, size: 8, font, color: secondary });

  // Footer
  page.drawText(companyName, { x: margin, y: 30, size: 9, font: bold, color: primary });
  page.drawText('ALMONA CO. IMPORT EXPORT COMMERCIAL AGENCIES', { x: margin, y: 18, size: 7, font, color: secondary });
  page.drawText(`Generated: ${new Date().toLocaleDateString()}`, { x: 842 - margin - 130, y: 18, size: 7, font, color: secondary });

  return await pdf.save();
}

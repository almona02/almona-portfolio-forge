// Workshop layout PDF export — reuses the ALMONA logo/branding pattern from comparisonPdf.
type PdfLibModule = typeof import('pdf-lib');
let PDFDocument: PdfLibModule['PDFDocument'];
let StandardFonts: PdfLibModule['StandardFonts'];
let rgb: PdfLibModule['rgb'];
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
  workshopHeight?: number;
  companyName?: string;
  lang?: string;
}

// Helvetica (WinAnsi) covers Latin + Turkish; Arabic needs an embedded font, so Arabic falls back to English labels.
const PDF_LABELS: Record<string, { title: string; components: string; totals: string; power: string; air: string; workshop: string; generated: string; length: string; width: string; height: string }> = {
  en: { title: 'YILMAZ WORKSHOP PLAN', components: 'COMPONENTS', totals: 'TOTAL POWER & ELECTRICITY', power: 'Power', air: 'Air', workshop: 'Workshop', generated: 'Generated', length: 'Length', width: 'Width', height: 'Height' },
  tr: { title: 'YILMAZ ATÖLYE PLANI', components: 'BİLEŞENLER', totals: 'TOPLAM GÜÇ VE ELEKTRİK', power: 'Güç', air: 'Hava', workshop: 'Atölye', generated: 'Oluşturuldu', length: 'Uzunluk', width: 'Genişlik', height: 'Yükseklik' },
};

function hexToRgb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 0.4, g: 0.4, b: 0.4 };
  return { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 };
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

  const { components = [], totalPowerKw = 0, totalAirLmin = 0, workshopHeight = 0, companyName = 'YILMAZ MACHINES', lang = 'en' } = options;
  const L = PDF_LABELS[lang] || PDF_LABELS.en;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // landscape A4

  let font = fontCache.get('helvetica');
  let bold = fontCache.get('helvetica-bold');
  if (!font) { font = await pdf.embedFont(StandardFonts.Helvetica); fontCache.set('helvetica', font); }
  if (!bold) { bold = await pdf.embedFont(StandardFonts.HelveticaBold); fontCache.set('helvetica-bold', bold); }

  const primary = rgb(0.1, 0.3, 0.5);
  const secondary = rgb(0.4, 0.4, 0.4);
  const margin = 40;

  // ---- Header ----
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
  page.drawText(L.title, { x: 842 - margin - 200, y: 595 - margin - 18, size: 11, font: bold, color: primary });
  page.drawText(`${L.workshop}: ${L.length} ${factoryL} m × ${L.width} ${factoryW} m × ${L.height} ${workshopHeight || '—'} m`, { x: 842 - margin - 260, y: 595 - margin - 32, size: 9, font, color: secondary });

  // ---- Left sidebar: components + totals ----
  const sidebarX = margin;
  const sidebarW = 172;
  const sidebarTop = 480;
  let sy = sidebarTop;

  page.drawText(L.components, { x: sidebarX, y: sy, size: 9, font: bold, color: primary });
  sy -= 14;

  const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  for (const c of components) {
    if (sy < 130) break; // leave room for totals below
    page.drawText(`${c.qty}× ${truncate(c.label, 30)}`, { x: sidebarX, y: sy, size: 7, font, color: secondary });
    sy -= 10;
  }

  // totals at the bottom of the sidebar
  page.drawText(L.totals, { x: sidebarX, y: 96, size: 8, font: bold, color: primary });
  page.drawText(`${L.power}: ${totalPowerKw} kW`, { x: sidebarX, y: 84, size: 7, font, color: secondary });
  page.drawText(`${L.air}: ${totalAirLmin} L/min`, { x: sidebarX, y: 73, size: 7, font, color: secondary });

  // ---- Floor plan (right of sidebar) ----
  const areaX = margin + sidebarW + 20; // 232
  const areaY = 100;
  const areaW = 842 - areaX - margin; // 570
  const areaH = 595 - areaY - 45; // 450 -> top at 550 (below header) ... but header bottom ~511
  const s = Math.min(areaW / factoryL, areaH / factoryW);
  const floorW = factoryL * s;
  const floorH = factoryW * s;
  const ox = areaX + (areaW - floorW) / 2;
  const oy = areaY + (areaH - floorH) / 2;

  page.drawRectangle({ x: ox, y: oy, width: floorW, height: floorH, borderColor: rgb(0.5, 0.55, 0.6), borderWidth: 1.5 });

  for (const it of items) {
    const c = hexToRgb(it.color || '#94a3b8');
    const px = ox + it.x * s;
    const py = oy + it.y * s;
    const pw = it.w * s;
    const ph = it.h * s;
    page.drawRectangle({ x: px, y: py, width: pw, height: ph, color: rgb(c.r, c.g, c.b, 0.15), borderColor: rgb(c.r, c.g, c.b), borderWidth: 1 });
    if (pw > 10 && ph > 8) {
      // label (centered, sized to fit)
      const ls = Math.max(3.5, Math.min(7, pw / 9));
      const labelW = bold.widthOfTextAtSize(it.label, ls);
      const lx = px + Math.max(0, (pw - labelW) / 2);
      page.drawText(it.label, { x: lx, y: py + ph / 2 + 2, size: ls, font: bold, color: rgb(0.15, 0.15, 0.15) });
      // dimension (centered below the label)
      if (ph > 24) {
        const ds = Math.max(3, Math.min(6, pw / 13));
        const dim = `${it.w.toFixed(1)} × ${it.h.toFixed(1)} m`;
        const dimW = font.widthOfTextAtSize(dim, ds);
        const dx = px + Math.max(0, (pw - dimW) / 2);
        page.drawText(dim, { x: dx, y: py + ph / 2 - ds - 4, size: ds, font, color: rgb(0.25, 0.25, 0.25) });
      }
    }
  }

  // ---- Footer ----
  page.drawText(companyName, { x: margin, y: 30, size: 9, font: bold, color: primary });
  page.drawText('ALMONA CO. IMPORT EXPORT COMMERCIAL AGENCIES', { x: margin, y: 18, size: 7, font, color: secondary });
  page.drawText(`${L.generated}: ${new Date().toLocaleDateString()}`, { x: 842 - margin - 130, y: 18, size: 7, font, color: secondary });

  return await pdf.save();
}

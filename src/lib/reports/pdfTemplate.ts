type PdfLibModule = typeof import('pdf-lib');
let PDFDocument: PdfLibModule['PDFDocument'];
let rgb: PdfLibModule['rgb'];
let StandardFonts: PdfLibModule['StandardFonts'];
import { FabricationCosts } from './costCalculator';
import { MACHINE_SPECS } from './pricing';

export async function generatePDFReport(
  costs: FabricationCosts,
  machineModel: string,
  material: 'aluminum' | 'upvc',
  isArabic: boolean = false
): Promise<Uint8Array> {
  if (!PDFDocument) {
    const mod = await import('pdf-lib');
    PDFDocument = mod.PDFDocument; rgb = mod.rgb; StandardFonts = mod.StandardFonts;
  }
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width: _width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const title = isArabic ? '????? ???????' : 'Fabrication Report';
  const machineTitle = isArabic ? '??????? ????????' : 'Machine Specifications';
  const costTitle = isArabic ? '?????? ????????' : 'Cost Breakdown';
  
  // Draw title
  page.drawText(title, {
    x: 50,
    y: height - 50,
    size: 24,
    font: boldFont,
    color: rgb(0, 0, 0.5)
  });
  
  // Draw machine specs
  const machine = MACHINE_SPECS[machineModel];
  page.drawText(`${machineTitle}: ${machineModel}`, {
    x: 50,
    y: height - 100,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0)
  });
  
  const specsText = isArabic 
    ? [
        `?????: ${machine.power} ???? ???`,
        `???? ??? ???: ${machine.maxCutLength} ???`,
        `?????: ${machine.weight} ???`,
        `?????: ${machine.price.toLocaleString()} ????`
      ]
    : [
        `Power: ${machine.power} kW`,
        `Max cut length: ${machine.maxCutLength}m`,
        `Weight: ${machine.weight}kg`,
        `Price: EGP ${machine.price.toLocaleString()}`
      ];
  
  specsText.forEach((text, i) => {
    page.drawText(text, {
      x: 50,
      y: height - 130 - (i * 20),
      size: 12,
      font,
      color: rgb(0, 0, 0)
    });
  });
  
  // Draw cost breakdown
  page.drawText(costTitle, {
    x: 50,
    y: height - 230,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0)
  });
  
  const costText = isArabic
    ? [
        `????? ??????: ${costs.materialCost.toLocaleString()} ????`,
        `????? ????????: ${costs.accessoryCost.toLocaleString()} ????`,
        `????? ??????: ${costs.energyCost.toLocaleString()} ????`,
        `????? ???????: ${costs.bladeCost.toLocaleString()} ????`,
        `????? ???????: ${costs.laborCost.toLocaleString()} ????`,
        `?????? ???????: ${costs.totalCost.toLocaleString()} ????`
      ]
    : [
        `Material cost: EGP ${costs.materialCost.toLocaleString()}`,
        `Accessory cost: EGP ${costs.accessoryCost.toLocaleString()}`,
        `Energy cost: EGP ${costs.energyCost.toLocaleString()}`,
        `Blade cost: EGP ${costs.bladeCost.toLocaleString()}`,
        `Labor cost: EGP ${costs.laborCost.toLocaleString()}`,
        `Total cost: EGP ${costs.totalCost.toLocaleString()}`
      ];
  
  costText.forEach((text, i) => {
    page.drawText(text, {
      x: 50,
      y: height - 260 - (i * 20),
      size: 12,
      font,
      color: rgb(0, 0, 0)
    });
  });
  
  // Add comparison section
  const comparisonTitle = isArabic 
    ? '?????? ??? ?????????' 
    : 'Machine Comparison';
  
  page.drawText(comparisonTitle, {
    x: 50,
    y: height - 400,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0)
  });
  
  return pdfDoc.save();
}

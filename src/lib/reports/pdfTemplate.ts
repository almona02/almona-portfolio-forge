import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { FabricationCosts } from './costCalculator';
import { MACHINE_SPECS } from './pricing';

export async function generatePDFReport(
  costs: FabricationCosts,
  machineModel: string,
  material: 'aluminum' | 'upvc',
  isArabic: boolean = false
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const title = isArabic ? 'تقرير التصنيع' : 'Fabrication Report';
  const machineTitle = isArabic ? 'مواصفات الماكينة' : 'Machine Specifications';
  const costTitle = isArabic ? 'تفاصيل التكاليف' : 'Cost Breakdown';
  
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
        `القوة: ${machine.power} كيلو واط`,
        `أقصى طول قطع: ${machine.maxCutLength} متر`,
        `الوزن: ${machine.weight} كجم`,
        `السعر: ${machine.price.toLocaleString()} جنيه`
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
        `تكلفة المواد: ${costs.materialCost.toLocaleString()} جنيه`,
        `تكلفة الملحقات: ${costs.accessoryCost.toLocaleString()} جنيه`,
        `تكلفة الطاقة: ${costs.energyCost.toLocaleString()} جنيه`,
        `تكلفة الشفرات: ${costs.bladeCost.toLocaleString()} جنيه`,
        `تكلفة العمالة: ${costs.laborCost.toLocaleString()} جنيه`,
        `إجمالي التكلفة: ${costs.totalCost.toLocaleString()} جنيه`
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
    ? 'مقارنة بين الماكينات' 
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

import type { InstallationCostBreakdown } from '@/lib/installation/EgyptianInstallationCalculator';
import type { OptimizationResult, WindowUnit } from '@/types/fabricator';

export interface SplitPOPayload {
  profilePO: string;
  glassPO: string;
  accessoryPO: string;
  combined?: string;
}

const formatLine = (label: string, value: string | number) => `${label}: ${value}`;
const formatSection = (title: string) => `\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}\n`;

/**
 * Egyptian Supplier Information
 */
const EGYPTIAN_SUPPLIERS = {
  profiles: {
    aluminum: ['Caluminium Egypt', 'ELSHERIF', 'Alumisr', 'Al Sherif', 'Al Aharam'],
    upvc: ['UPVC Egypt', 'Veka Egypt', 'Rehau Egypt', 'Kompen Egypt'],
    locations: ['Cairo', '10th of Ramadan', 'Alexandria', '6th October'],
    leadTimeStock: '2-3 days',
    leadTimeImported: '7-14 days (Alexandria port clearance)',
    paymentTerms: '50% advance, 50% on delivery'
  },
  glass: {
    processors: ['Dr. Greiche', 'Sphinx Glass', 'Cairo Glass', 'Alexandria Glass'],
    locations: ['Cairo', 'Alexandria', '10th of Ramadan'],
    leadTimeStandard: '2 days',
    leadTimeCustom: '5-7 days (custom/arched with Astamba template)',
    paymentTerms: '50% advance, 50% on delivery',
    note: 'Astamba template required for arches/bending (100-200 EGP per template)'
  },
  accessories: {
    suppliers: ['Caluminium', 'ASAŞ', 'KALE Egypt', 'Alumisr', 'Local Hardware Stores'],
    locations: ['Cairo', 'Alexandria', '10th of Ramadan', 'Giza'],
    leadTimeLocal: '1-2 days',
    leadTimeImported: '5-10 days',
    paymentTerms: '50% advance, 50% on delivery'
  }
} as const;

export function generateSplitPOText(
  project: WindowUnit,
  optimization: OptimizationResult,
  installationBreakdown?: InstallationCostBreakdown,
): SplitPOPayload {
  const order = project.orderNumber || `ORDER-${Date.now()}`;
  const customer = project.customer || 'Customer';
  const projectCode = project.projectCode || project.posNumber || '1';
  const orderDate = project.orderDate ? new Date(project.orderDate).toLocaleDateString('en-EG') : new Date().toLocaleDateString('en-EG');

  // ============================================================================
  // PROFILE PURCHASE ORDER
  // ============================================================================
  const profileLines: string[] = [
    formatSection('PROFILE PURCHASE ORDER'),
    formatLine('Order Number', order),
    formatLine('Customer', customer),
    formatLine('Project Code', projectCode),
    formatLine('Order Date', orderDate),
    formatLine('Position', project.positionCode || project.posNumber || 'N/A'),
    '',
    '--- PROFILES REQUIRED ---',
    '',
  ];

  let totalProfileLength = 0;
  optimization.cuttingPlan.forEach((plan, idx) => {
    const totalLength = plan.cuts.reduce((sum, c) => sum + c.length, 0);
    totalProfileLength += totalLength;
    const barsNeeded = Math.ceil(totalLength / (plan.stockLength || 6000));
    profileLines.push(
      `${idx + 1}. ${plan.profile.name}`,
      `   Total Cut Length: ${totalLength.toFixed(0)} mm`,
      `   Stock Length: ${plan.stockLength || 6000} mm`,
      `   Bars Needed: ${barsNeeded}`,
      `   System: ${project.systemPackId || 'N/A'}`,
      ''
    );
  });

  profileLines.push(
    `TOTAL PROFILE LENGTH: ${totalProfileLength.toFixed(0)} mm`,
    '',
    '--- SUPPLIER INFORMATION ---',
    `Recommended Suppliers: ${EGYPTIAN_SUPPLIERS.profiles.aluminum.join(', ')}`,
    `Locations: ${EGYPTIAN_SUPPLIERS.profiles.locations.join(', ')}`,
    `Lead Time (Stock Items): ${EGYPTIAN_SUPPLIERS.profiles.leadTimeStock}`,
    `Lead Time (Imported): ${EGYPTIAN_SUPPLIERS.profiles.leadTimeImported}`,
    `Payment Terms: ${EGYPTIAN_SUPPLIERS.profiles.paymentTerms}`,
    '',
    '--- NOTES ---',
    '• Verify actual bar length before cutting (extrusion tolerance ±0.5mm/m)',
    '• Check for batch calibration if using multiple suppliers',
    '• Imported profiles may be delayed at Alexandria port (7-14 days clearance)'
  );

  // ============================================================================
  // GLASS PURCHASE ORDER
  // ============================================================================
  const glassLines: string[] = [
    formatSection('GLASS PURCHASE ORDER'),
    formatLine('Order Number', order),
    formatLine('Customer', customer),
    formatLine('Project Code', projectCode),
    formatLine('Order Date', orderDate),
    formatLine('Position', project.positionCode || project.posNumber || 'N/A'),
    '',
    '--- GLASS SPECIFICATIONS ---',
    '',
  ];

  let totalGlassArea = 0;
  project.components?.forEach((comp, idx) => {
    const w = comp.width || comp.cuttingLengths?.[0] || 0;
    const h = comp.height || comp.cuttingLengths?.[1] || 0;
    const area = (w * h) / 1_000_000; // m²
    totalGlassArea += area * (comp.quantity || 1);
    
    const glazingType = project.glazing?.type || 'double';
    const glassThickness = project.glazing?.thickness || 24;
    const glassColor = project.glazing?.color || 'clear';
    
    glassLines.push(
      `${idx + 1}. ${comp.name || comp.id || `Component ${idx + 1}`}`,
      `   Dimensions: ${w.toFixed(0)} × ${h.toFixed(0)} mm`,
      `   Quantity: ${comp.quantity || 1}`,
      `   Type: ${glazingType} (${glassThickness}mm)`,
      `   Color: ${glassColor}`,
      `   Area: ${area.toFixed(2)} m²`,
      ''
    );
  });

  glassLines.push(
    `TOTAL GLASS AREA: ${totalGlassArea.toFixed(2)} m²`,
    '',
    '--- SUPPLIER INFORMATION ---',
    `Recommended Processors: ${EGYPTIAN_SUPPLIERS.glass.processors.join(', ')}`,
    `Locations: ${EGYPTIAN_SUPPLIERS.glass.locations.join(', ')}`,
    `Lead Time (Standard): ${EGYPTIAN_SUPPLIERS.glass.leadTimeStandard}`,
    `Lead Time (Custom/Arched): ${EGYPTIAN_SUPPLIERS.glass.leadTimeCustom}`,
    `Payment Terms: ${EGYPTIAN_SUPPLIERS.glass.paymentTerms}`,
    '',
    '--- NOTES ---',
    `• ${EGYPTIAN_SUPPLIERS.glass.note}`,
    '• Verify glass type matches safety requirements (Rule 15: floor-to-800mm zones)',
    '• For arched windows, provide Astamba template to glass processor'
  );

  // ============================================================================
  // ACCESSORY PURCHASE ORDER
  // ============================================================================
  const accessoryLines: string[] = [
    formatSection('ACCESSORY PURCHASE ORDER'),
    formatLine('Order Number', order),
    formatLine('Customer', customer),
    formatLine('Project Code', projectCode),
    formatLine('Order Date', orderDate),
    formatLine('Position', project.positionCode || project.posNumber || 'N/A'),
    '',
    '--- ACCESSORIES REQUIRED ---',
    '',
    'Hardware Components:',
    '• Rollers/Hinges (per sash)',
    '• Interlock kits (per meeting stile)',
    '• Anti-lift blocks (per sliding sash)',
    '• Corner cleats (per sash)',
    '• Glazing shims (per sash)',
    '• Bumpers (per sliding sash)',
    '• Gaskets/Weather seals (perimeter)',
    '• Handles and locks',
    '',
    '--- INSTALLATION MATERIALS ---',
  ];

  // Add installation materials if breakdown provided
  if (installationBreakdown) {
    accessoryLines.push(
      `• Screws: ${installationBreakdown.fixingMaterials.screws} pcs`,
      `• Anchors: ${installationBreakdown.fixingMaterials.anchors} pcs`,
      `• Silicon Sealant: ${installationBreakdown.fixingMaterials.siliconCartridges} cartridges (280ml each)`,
      `• Foam Insulation: ${installationBreakdown.fixingMaterials.foamCans} cans (750ml each)`,
      `• Total Fixing Materials Cost: ${installationBreakdown.fixingMaterialsCost.toFixed(0)} EGP`,
      ''
    );
  } else {
    accessoryLines.push(
      '• Screws and fasteners (quantity based on perimeter)',
      '• Silicon sealant (cartridges)',
      '• Foam insulation (cans)',
      ''
    );
  }

  accessoryLines.push(
    '--- SUPPLIER INFORMATION ---',
    `Recommended Suppliers: ${EGYPTIAN_SUPPLIERS.accessories.suppliers.join(', ')}`,
    `Locations: ${EGYPTIAN_SUPPLIERS.accessories.locations.join(', ')}`,
    `Lead Time (Local Stock): ${EGYPTIAN_SUPPLIERS.accessories.leadTimeLocal}`,
    `Lead Time (Imported): ${EGYPTIAN_SUPPLIERS.accessories.leadTimeImported}`,
    `Payment Terms: ${EGYPTIAN_SUPPLIERS.accessories.paymentTerms}`,
    '',
    '--- NOTES ---',
    '• Verify hardware capacity matches sash weight (Rule 2)',
    '• Check roller-track compatibility (V-groove vs U-groove)',
    '• For imported hardware (GU, Siegenia), use black market USD rate',
    '• Currency conversion: USD/EGP rate may vary (check current rate)'
  );

  // ============================================================================
  // COMBINED DOCUMENT
  // ============================================================================
  const combined = [
    '='.repeat(60),
    'SPLIT PURCHASE ORDER',
    '='.repeat(60),
    '',
    formatLine('Order Number', order),
    formatLine('Customer', customer),
    formatLine('Project Code', projectCode),
    formatLine('Order Date', orderDate),
    formatLine('Position', project.positionCode || project.posNumber || 'N/A'),
    '',
    profileLines.join('\n'),
    '',
    glassLines.join('\n'),
    '',
    accessoryLines.join('\n'),
    '',
    '='.repeat(60),
    'PAYMENT TERMS & LEAD TIMES SUMMARY',
    '='.repeat(60),
    '',
    'PAYMENT TERMS:',
    '• 50% advance payment required before order processing',
    '• 50% payment on delivery/completion',
    '',
    'LEAD TIMES:',
    `• Profiles (Stock): ${EGYPTIAN_SUPPLIERS.profiles.leadTimeStock}`,
    `• Profiles (Imported): ${EGYPTIAN_SUPPLIERS.profiles.leadTimeImported}`,
    `• Glass (Standard): ${EGYPTIAN_SUPPLIERS.glass.leadTimeStandard}`,
    `• Glass (Custom): ${EGYPTIAN_SUPPLIERS.glass.leadTimeCustom}`,
    `• Accessories (Local): ${EGYPTIAN_SUPPLIERS.accessories.leadTimeLocal}`,
    `• Accessories (Imported): ${EGYPTIAN_SUPPLIERS.accessories.leadTimeImported}`,
    '',
    'CURRENCY NOTES:',
    '• Base prices in EGP (Egyptian Pounds)',
    '• Imported hardware (USD/EUR) uses black market rate (not official)',
    '• Verify current exchange rate before finalizing imported items',
    '',
    'GENERATED:', new Date().toLocaleString('en-EG'),
    '='.repeat(60)
  ].join('\n');

  return {
    profilePO: profileLines.join('\n'),
    glassPO: glassLines.join('\n'),
    accessoryPO: accessoryLines.join('\n'),
    combined
  };
}

export function downloadSplitPO(
  project: WindowUnit,
  optimization: OptimizationResult,
  installationBreakdown?: InstallationCostBreakdown,
) {
  const payload = generateSplitPOText(project, optimization, installationBreakdown);
  const content = payload.combined || [
    payload.profilePO,
    '',
    payload.glassPO,
    '',
    payload.accessoryPO,
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `split_po_${project.orderNumber || 'order'}_${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


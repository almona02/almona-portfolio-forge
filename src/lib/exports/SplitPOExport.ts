import type { WindowUnit, OptimizationResult } from '@/types/fabricator';

export interface SplitPOPayload {
  profilePO: string;
  glassPO: string;
  accessoryPO: string;
}

const formatLine = (label: string, value: string | number) => `${label}: ${value}`;

export function generateSplitPOText(
  project: WindowUnit,
  optimization: OptimizationResult,
): SplitPOPayload {
  const order = project.orderNumber || `ORDER-${Date.now()}`;
  const customer = project.customer || 'Customer';

  // Profiles
  const profileLines: string[] = [
    `Profile Purchase Order`,
    formatLine('Order', order),
    formatLine('Customer', customer),
    formatLine('Project', project.posNumber || '1'),
    '--- Profiles ---',
  ];

  optimization.cuttingPlan.forEach((plan, idx) => {
    const totalLength = plan.cuts.reduce((sum, c) => sum + c.length, 0);
    profileLines.push(
      `${idx + 1}. ${plan.profile.name} | Total Cut: ${totalLength}mm | Stock: ${plan.stockLength || 6000}mm`,
    );
  });

  // Glass
  const glassLines: string[] = [
    `Glass Purchase Order`,
    formatLine('Order', order),
    formatLine('Customer', customer),
    formatLine('Project', project.posNumber || '1'),
    '--- Glass ---',
  ];

  project.components?.forEach((comp, idx) => {
    const w = comp.width || comp.cuttingLengths?.[0] || 0;
    const h = comp.height || comp.cuttingLengths?.[1] || 0;
    glassLines.push(`${idx + 1}. ${comp.name || comp.id} | ${w} x ${h} mm | Qty ${comp.quantity || 1}`);
  });

  // Accessories
  const accessoryLines: string[] = [
    `Accessory Purchase Order`,
    formatLine('Order', order),
    formatLine('Customer', customer),
    formatLine('Project', project.posNumber || '1'),
    '--- Accessories ---',
    `Include: rollers/hinges, interlocks, anti-lift blocks, gaskets, screws, sealants`,
  ];

  return {
    profilePO: profileLines.join('\n'),
    glassPO: glassLines.join('\n'),
    accessoryPO: accessoryLines.join('\n'),
  };
}

export function downloadSplitPO(
  project: WindowUnit,
  optimization: OptimizationResult,
) {
  const payload = generateSplitPOText(project, optimization);
  const combined = [
    payload.profilePO,
    '',
    payload.glassPO,
    '',
    payload.accessoryPO,
    '',
    'Payment terms: 50% advance / 50% on delivery',
    'Lead time: Profiles 2-3 days (stock), Glass 2-5 days, Accessories 1-2 days',
  ].join('\n');

  const blob = new Blob([combined], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `split_po_${project.orderNumber || 'order'}_${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


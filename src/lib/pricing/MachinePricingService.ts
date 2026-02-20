/**
 * Machine Pricing Service
 * Simple pricing for shop machines (DC-421-PBS, MK-450, etc.)
 */

export interface MachinePrice {
  machineId: string;
  basePrice: number;
  currency: string;
  lastUpdated: Date;
}

const MACHINE_PRICES: Record<string, { price: number; currency: string }> = {
  // Featured Machines
  'aim-3410': { price: 4400000, currency: 'EGP' }, // AIM 3410 - 4-axis CNC aluminium profile machining center
  'kp-180': { price: 560000, currency: 'EGP' }, // KP 180 - Hydraulic aluminium corner crimping machine
  'ym-001': { price: 8600000, currency: 'EGP' }, // ALM 6510 - Aluminium Profile Machining Center
  'ym-002': { price: 1375000, currency: 'EGP' }, // DC-421-PBS - Full Automatic Double Head Mitre Saw
  'ym-003': { price: 820000, currency: 'EGP' }, // DK 502 - Double Corner PVC Welding Machine
  'ym-004': { price: 32000, currency: 'EGP' }, // KM 212 - Portable End Milling Machine
  'ym-005': { price: 730000, currency: 'EGP' }, // KD-402-S - Double Head Mitre Saw Machine
  'ym-006': { price: 95000, currency: 'EGP' }, // FR-221-S - Pneumatic Template Copy Router
  'ym-007': { price: 7500000, currency: 'EGP' }, // PIM 6509 - PVC Profile Machining and Cutting Center
  'ym-008': { price: 15000000, currency: 'EGP' }, // CCL 1661 - PVC Welding and Corner Cleaning Line
  'ym-009': { price: 3400000, currency: 'EGP' }, // CDC 600 - Full Automatic Double Head Compound Cutting
  'ym-010': { price: 1150000, currency: 'EGP' }, // DC-421-PSD - Full Automatic Double Head Mitre Saw
  'ym-011': { price: 275000, currency: 'EGP' }, // ACK-420-S - Up-Cutting Saw Machine
  'ym-012': { price: 200000, currency: 'EGP' }, // FR-226-S - Automatic Copy Router Machine
  'ym-013': { price: 1600000, currency: 'EGP' }, // NCR 300 - 4 Axis NC Router Machine
  'ym-014': { price: 260000, currency: 'EGP' }, // TK 505 - Single Corner PVC Welding Machine
  'ym-015': { price: 160000, currency: 'EGP' }, // KM-215-S - Semi Automatic End Milling Machine
  'ym-016': { price: 580000, currency: 'EGP' }, // CRM-250-S - 3 Spindle Copy Router Machine
  'ym-017': { price: 230000, currency: 'EGP' }, // ST 264 - Automatic PVC Water Slot Machine
  'ym-018': { price: 145000, currency: 'EGP' }, // SDT 275 - Reinforcement Steel Cutting Saw
  'ym-019': { price: 107000, currency: 'EGP' }, // MK 450 - Single Head Cutting Machine
  'ym-020': { price: 325000, currency: 'EGP' }, // RYK-420-W - Radial Saw Machine
  'ym-021': { price: 650000, currency: 'EGP' }, // SCM 420 L4/L7 - Servo Controlled Serial Cutting Machine
  'ym-022': { price: 185000, currency: 'EGP' }, // CK 412 - PVC Glazing Bead Saw
  'ym-023': { price: 3200000, currency: 'EGP' }, // DK 540 - Four Corner PVC Welding Machine
  'ym-024': { price: 285000, currency: 'EGP' }, // CA 603 - PVC Corner Cleaning Machine (4 Cutters)
  'ym-025': { price: 33000, currency: 'EGP' }, // KD 305 - Mitre Saw Machine
  'ym-026': { price: 115000, currency: 'EGP' }, // KD-350-PS - Mitre Saw Machine
  'ym-027': { price: 85000, currency: 'EGP' }, // KD-350-M - Compact Mitre Saw Machine
  'ym-028': { price: 54000, currency: 'EGP' }, // FR 223 - Portable Template Copy Router
  'ym-029': { price: 64000, currency: 'EGP' }, // FR-223-S - Portable Template Copy Router with spray
  'ym-030': { price: 35000, currency: 'EGP' }, // FR 222 - Economical Portable Template Copy Router
  'ym-031': { price: 75000, currency: 'EGP' }, // KM-211-S - Manual End Milling Machine
  'ym-034': { price: 105000, currency: 'EGP' }, // KD 400 D/PS - Single Head Mitre Saw Machine
  'ym-035': { price: 95000, currency: 'EGP' }, // MK 420/420 PS/450 - Manual Up-Cutting Saw Machine
  'ym-036': { price: 200000, currency: 'EGP' }, // TK 503 - Single Corner PVC Welding Machine
  'ym-037': { price: 0, currency: 'EGP' }, // VK 300 - V-Notch and Arrow Cutting Machine
  'ym-038': { price: 260000, currency: 'EGP' }, // CA 601 - Semi-Automatic PVC Corner Cleaning Machine
  'ym-039': { price: 1800000, currency: 'EGP' }, // DC 550 PB - Full Automatic Double Head Mitre Saw
};

export class MachinePricingService {
  private static instance: MachinePricingService;

  private constructor() {}

  static getInstance(): MachinePricingService {
    if (!MachinePricingService.instance) {
      MachinePricingService.instance = new MachinePricingService();
    }
    return MachinePricingService.instance;
  }

  getMachinePrice(machineId: string): MachinePrice | null {
    const priceData = MACHINE_PRICES[machineId];
    if (!priceData) return null;

    return {
      machineId,
      basePrice: priceData.price,
      currency: priceData.currency,
      lastUpdated: new Date(),
    };
  }

  updateMachinePrice(machineId: string, price: number, currency: string = 'EGP'): void {
    MACHINE_PRICES[machineId] = { price, currency };
  }

  getAllPrices(): Record<string, { price: number; currency: string }> {
    return { ...MACHINE_PRICES };
  }

  formatPrice(price: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }
}

export const machinePricingService = MachinePricingService.getInstance();

/**
 * Material Specifications Database
 * Defines standard specifications for aluminum and UPVC profiles
 */

export interface MaterialSpec {
  material: string;
  standard: string;
  thickness: number;
  width: number;
  height: number;
  weightPerMeter: number;
  thermalConductivity: number;
  uValue: number;
  colorOptions: string[];
  certifications: string[];
  regions: string[];
}

export interface AluminumSpec extends MaterialSpec {
  alloy: string;
  temper: string;
  surfaceTreatment: string;
  anodizingThickness?: number;
}

export interface UPVCSpec extends MaterialSpec {
  profileSystem: string;
  reinforcement: boolean;
  multiChamber: boolean;
  glazingBeadType: string;
}

export const ALUMINUM_SPECS: Record<string, AluminumSpec> = {
  '6063-T5': {
    material: 'aluminum',
    standard: 'EN755',
    thickness: 1.2,
    width: 50,
    height: 50,
    weightPerMeter: 0.54,
    thermalConductivity: 160,
    uValue: 2.8,
    colorOptions: ['white', 'silver', 'bronze', 'black', 'custom'],
    certifications: ['EN755', 'ISO9001', 'CE'],
    regions: ['EU', 'US', 'ASIA'],
    alloy: '6063',
    temper: 'T5',
    surfaceTreatment: 'anodized',
    anodizingThickness: 15,
  },
  '6061-T6': {
    material: 'aluminum',
    standard: 'EN755',
    thickness: 1.5,
    width: 60,
    height: 60,
    weightPerMeter: 0.81,
    thermalConductivity: 160,
    uValue: 2.6,
    colorOptions: ['white', 'silver', 'bronze', 'black'],
    certifications: ['EN755', 'ISO9001', 'CE'],
    regions: ['EU', 'US'],
    alloy: '6061',
    temper: 'T6',
    surfaceTreatment: 'powder_coated',
  },
  '6082-T6': {
    material: 'aluminum',
    standard: 'EN755',
    thickness: 2.0,
    width: 70,
    height: 70,
    weightPerMeter: 1.35,
    thermalConductivity: 160,
    uValue: 2.4,
    colorOptions: ['white', 'silver', 'bronze'],
    certifications: ['EN755', 'ISO9001', 'CE'],
    regions: ['EU'],
    alloy: '6082',
    temper: 'T6',
    surfaceTreatment: 'anodized',
    anodizingThickness: 20,
  },
};

export const UPVC_SPECS: Record<string, UPVCSpec> = {
  'UPVC-58': {
    material: 'upvc',
    standard: 'EN12608',
    thickness: 2.5,
    width: 58,
    height: 58,
    weightPerMeter: 1.2,
    thermalConductivity: 0.16,
    uValue: 1.4,
    colorOptions: ['white', 'brown', 'grey', 'black', 'woodgrain'],
    certifications: ['EN12608', 'EN14351', 'CE', 'QUALICOAT'],
    regions: ['EU', 'US', 'ASIA'],
    profileSystem: '58mm',
    reinforcement: true,
    multiChamber: true,
    glazingBeadType: 'internal',
  },
  'UPVC-70': {
    material: 'upvc',
    standard: 'EN12608',
    thickness: 3.0,
    width: 70,
    height: 70,
    weightPerMeter: 1.8,
    thermalConductivity: 0.16,
    uValue: 1.2,
    colorOptions: ['white', 'brown', 'grey', 'black', 'woodgrain'],
    certifications: ['EN12608', 'EN14351', 'CE', 'QUALICOAT'],
    regions: ['EU', 'ASIA'],
    profileSystem: '70mm',
    reinforcement: true,
    multiChamber: true,
    glazingBeadType: 'internal',
  },
  'UPVC-80': {
    material: 'upvc',
    standard: 'EN12608',
    thickness: 3.5,
    width: 80,
    height: 80,
    weightPerMeter: 2.4,
    thermalConductivity: 0.16,
    uValue: 1.0,
    colorOptions: ['white', 'brown', 'grey', 'black', 'woodgrain'],
    certifications: ['EN12608', 'EN14351', 'CE', 'QUALICOAT'],
    regions: ['EU'],
    profileSystem: '80mm',
    reinforcement: true,
    multiChamber: true,
    glazingBeadType: 'internal',
  },
};

export function getMaterialSpec(material: string, spec: string): MaterialSpec | null {
  if (material.toLowerCase() === 'aluminum') {
    return ALUMINUM_SPECS[spec] || null;
  }
  if (material.toLowerCase() === 'upvc') {
    return UPVC_SPECS[spec] || null;
  }
  return null;
}

export function getAllMaterialSpecs(material: string): MaterialSpec[] {
  if (material.toLowerCase() === 'aluminum') {
    return Object.values(ALUMINUM_SPECS);
  }
  if (material.toLowerCase() === 'upvc') {
    return Object.values(UPVC_SPECS);
  }
  return [];
}


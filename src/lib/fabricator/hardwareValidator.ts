import { EgyptianHardware, EGYPTIAN_HARDWARE_DB } from '@/data/egyptian-hardware-database';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface ProfileDims {
  width?: number;
  height?: number;
  thickness?: number;
}

export const validateHardwareFit = (
  hardware: EgyptianHardware,
  profile: ProfileDims,
  chamber: { width: number; depth: number },
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Chamber width/depth fit
  if (hardware.dimensions.width > chamber.width) {
    errors.push(`Hardware width ${hardware.dimensions.width}mm > chamber ${chamber.width}mm.`);
  }
  if (hardware.dimensions.depth > chamber.depth) {
    warnings.push(`Hardware depth ${hardware.dimensions.depth}mm close to chamber depth ${chamber.depth}mm.`);
  }

  // Axis rule for KALE
  if (hardware.supplier === 'KALE' && hardware.dimensions.axis === 13) {
    // If we had groove data we’d check; we surface as info
    suggestions.push('Ensure eurogroove supports 13mm axis (KALE standard).');
  }

  // Clearance rule for hinges/handles
  if (hardware.dimensions.clearance && hardware.category === 'hinge') {
    suggestions.push(`Requires clearance ${hardware.dimensions.clearance}mm to avoid binding.`);
  }

  // Thickness compatibility
  if (profile.thickness && hardware.compatibleProfileThickness) {
    const ok = hardware.compatibleProfileThickness.some(
      (t) => Math.abs(t - profile.thickness!) <= 0.1,
    );
    if (!ok) {
      warnings.push(
        `Profile thickness ${profile.thickness}mm not in ${hardware.compatibleProfileThickness.join(
          '/',
        )}mm`,
      );
    }
  }

  // Load capacity for rollers
  if (hardware.category === 'roller' && hardware.maxLoadKg && profile.width && profile.height) {
    const estWeight = calculateSashWeight(profile);
    if (estWeight > hardware.maxLoadKg) {
      warnings.push(
        `Estimated sash weight ${estWeight.toFixed(1)}kg > roller capacity ${hardware.maxLoadKg}kg`,
      );
      suggestions.push('Use heavy-duty rollers (80kg).');
    }
  }

  // Security level guidance
  if (hardware.securityLevel && hardware.securityLevel < 2) {
    warnings.push('Security level <2; avoid for ground/commercial openings.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
};

export const findCompatibleHardware = (
  profile: ProfileDims,
  chamber: { width: number; depth: number },
  category?: EgyptianHardware['category'],
): EgyptianHardware[] => {
  const supplierPriority: Record<string, number> = {
    Local: 1,
    KALE: 2,
    'Kin Long': 3,
    Domus: 4,
    Apex: 5,
  };

  return EGYPTIAN_HARDWARE_DB.filter((hw) => {
    if (category && hw.category !== category) return false;
    const fitsWidth = hw.dimensions.width <= chamber.width;
    const fitsDepth = hw.dimensions.depth <= chamber.depth;
    const thicknessOk =
      !hw.compatibleProfileThickness ||
      (profile.thickness !== undefined &&
        hw.compatibleProfileThickness.some((t) => Math.abs(t - profile.thickness!) <= 0.1));
    return fitsWidth && fitsDepth && thicknessOk;
  }).sort(
    (a, b) => (supplierPriority[a.supplier] || 99) - (supplierPriority[b.supplier] || 99),
  );
};

// Simplified sash weight estimator (perimeter * thickness * density)
const calculateSashWeight = (profile: ProfileDims): number => {
  const density = 2.7; // aluminum g/cm^3; simplified
  const width = profile.width || 0;
  const height = profile.height || 0;
  const perimeterM = 2 * (width + height) / 1000;
  const thicknessMm = profile.thickness || 1.4;
  const weightPerM = thicknessMm * density * 0.001; // kg/m approx
  return perimeterM * weightPerM;
};


/**
 * Egyptian Standards Validator
 * Validates projects against EOS (Egyptian Organization for Standardization) 
 * and ESI (Egyptian Standards Institute) compliance rules
 */

import { WindowUnit, Profile } from '@/types/fabricator';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  standard?: string; // EOS or ESI reference
}

/**
 * Validate Egyptian standards compliance for a fabrication project
 */
export function validateEgyptianStandards(
  project: WindowUnit,
  profiles: Profile[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // EOS/ESI Rule 1: Minimum material thickness for structural applications
  // Aluminum profiles must be at least 1.4mm thick for windows > 2m²
  const windowArea = (project.overallWidth * project.overallHeight) / 1_000_000; // Convert to m²
  if (windowArea > 2) {
    for (const component of project.components || []) {
      const profile = profiles.find((p) => p.id === component.profile.id);
      if (profile && profile.material === 'aluminum') {
        const thickness = profile.thickness || profile.height || 0;
        if (thickness < 1.4) {
          errors.push({
            field: 'profile.thickness',
            message: `Profile "${profile.name}" thickness (${thickness}mm) is below EOS minimum (1.4mm) for windows > 2m²`,
            severity: 'error',
            standard: 'EOS',
          });
        }
      }
    }
  }

  // EOS/ESI Rule 2: Required reinforcement for large spans
  // Windows with width or height > 2400mm require reinforcement
  const maxDimension = Math.max(project.overallWidth, project.overallHeight);
  if (maxDimension > 2400) {
    // Check if reinforcement is specified in project metadata
    const hasReinforcement = (project as any).reinforcement || 
                            (project as any).specifications?.reinforcement;
    if (!hasReinforcement) {
      errors.push({
        field: 'project.reinforcement',
        message: `Window dimensions (${maxDimension}mm) exceed 2400mm. EOS requires reinforcement for spans > 2400mm`,
        severity: 'warning',
        standard: 'EOS',
      });
    }
  }

  // EOS/ESI Rule 3: Approved profile types for structural applications
  // Only certified profiles should be used for structural windows
  for (const component of project.components || []) {
    const profile = profiles.find((p) => p.id === component.profile.id);
    if (profile) {
      const isCertified = profile.specifications?.eosCertified || 
                         profile.specifications?.esiCertified ||
                         profile.systemBrand === 'Yilmaz'; // Yilmaz is typically certified
      
      if (!isCertified && windowArea > 1.5) {
        errors.push({
          field: 'profile.certification',
          message: `Profile "${profile.name}" may not be EOS/ESI certified. Required for windows > 1.5m²`,
          severity: 'warning',
          standard: 'EOS/ESI',
        });
      }
    }
  }

  // EOS/ESI Rule 4: Minimum glass thickness based on area
  // Glass panes > 1.5m² require minimum 6mm thickness
  if (windowArea > 1.5) {
    const glassThickness = (project.glazing as any)?.thickness;
    if (!glassThickness || glassThickness < 6) {
      errors.push({
        field: 'glazing.thickness',
        message: `Glass thickness (${glassThickness || 'unspecified'}mm) is below EOS minimum (6mm) for windows > 1.5m²`,
        severity: 'error',
        standard: 'EOS',
      });
    }
  }

  // EOS/ESI Rule 5: Wind load requirements for high-rise buildings
  // Windows above 3rd floor require specific wind load ratings
  const floorLevel = (project.positionMeta as any)?.floor;
  if (floorLevel && parseInt(floorLevel) > 3) {
    const windLoadRating = (project.specifications as any)?.windLoadRating;
    if (!windLoadRating) {
      errors.push({
        field: 'project.windLoadRating',
        message: `Window on floor ${floorLevel} requires wind load rating per EOS standards for high-rise applications`,
        severity: 'warning',
        standard: 'EOS',
      });
    }
  }

  return errors;
}


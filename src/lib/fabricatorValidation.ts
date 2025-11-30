import { MeasurementData, WindowComponent, Profile, WindowUnit } from '@/types/fabricator';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { validateEgyptianStandards } from './validation/egyptianValidator';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Optional system-level constraints that can be attached to profile
 * specifications (typically coming from a system pack such as ROCK 60
 * or JUMBO100). Values are in mm / m².
 */
export interface SystemConstraints {
  minWidthMm?: number;
  maxWidthMm?: number;
  minHeightMm?: number;
  maxHeightMm?: number;
  maxAreaM2?: number;
}

/**
 * Resolve canonical system constraints for a given system pack ID, based on
 * its `windowSystemSpec.constraints` block. This is the single source of
 * truth for min/max width, height and area across measuring, design and
 * SmartDraw, with simple fallbacks when a pack has no explicit limits.
 */
export function getConstraintsForSystemPack(systemPackId?: string | null): SystemConstraints | null {
  if (!systemPackId) return null;
  const pack = SYSTEM_PACKS.find((p) => p.meta.id === systemPackId);
  if (!pack) return null;

  const spec: any = pack.windowSystemSpec;
  const constraints = spec?.constraints;
  if (!constraints || typeof constraints !== 'object') {
    return null;
  }

  const result: SystemConstraints = {};

  if (typeof constraints.minWidthMm === 'number') result.minWidthMm = constraints.minWidthMm;
  if (typeof constraints.maxWidthMm === 'number') result.maxWidthMm = constraints.maxWidthMm;
  if (typeof constraints.minHeightMm === 'number') result.minHeightMm = constraints.minHeightMm;
  if (typeof constraints.maxHeightMm === 'number') result.maxHeightMm = constraints.maxHeightMm;
  if (typeof constraints.maxAreaM2 === 'number') result.maxAreaM2 = constraints.maxAreaM2;

  return result;
}

/**
 * Validates measurement inputs with optional system-pack constraints.
 * Falls back to conservative defaults when no system constraints exist.
 */
export function validateMeasurements(
  data: MeasurementData,
  constraints?: SystemConstraints | null,
): ValidationResult {
  const errors: ValidationError[] = [];

  const effectiveConstraints =
    constraints ?? getConstraintsForSystemPack((data as any).systemPackId) ?? null;

  // Generic safety defaults when no system constraints are available
  const fallbackMinWidth = 300;
  const fallbackMaxWidth = 5000;
  const fallbackMinHeight = 300;
  const fallbackMaxHeight = 5000;

  // Validate width
  const width = Number(data.width);
  if (!data.width || isNaN(width)) {
    errors.push({ field: 'width', message: 'Width is required and must be a valid number' });
  } else if (width <= 0) {
    errors.push({ field: 'width', message: 'Width must be greater than 0' });
  } else {
    const minWidth = effectiveConstraints?.minWidthMm ?? fallbackMinWidth;
    const maxWidth = effectiveConstraints?.maxWidthMm ?? fallbackMaxWidth;

    if (width < minWidth) {
      errors.push({
        field: 'width',
        message: `Width must be at least ${minWidth}mm for this system`,
      });
    } else if (width > maxWidth) {
      errors.push({
        field: 'width',
        message: `Width cannot exceed ${maxWidth}mm for this system`,
      });
    }
  }

  // Validate height
  const height = Number(data.height);
  if (!data.height || isNaN(height)) {
    errors.push({ field: 'height', message: 'Height is required and must be a valid number' });
  } else if (height <= 0) {
    errors.push({ field: 'height', message: 'Height must be greater than 0' });
  } else {
    const minHeight = effectiveConstraints?.minHeightMm ?? fallbackMinHeight;
    const maxHeight = effectiveConstraints?.maxHeightMm ?? fallbackMaxHeight;

    if (height < minHeight) {
      errors.push({
        field: 'height',
        message: `Height must be at least ${minHeight}mm for this system`,
      });
    } else if (height > maxHeight) {
      errors.push({
        field: 'height',
        message: `Height cannot exceed ${maxHeight}mm for this system`,
      });
    }
  }

  // Optional area check when system defines a max area
  if (effectiveConstraints?.maxAreaM2 !== undefined && width > 0 && height > 0) {
    const areaM2 = (width * height) / 1_000_000;
    if (areaM2 > effectiveConstraints.maxAreaM2) {
      errors.push({
        field: 'area',
        message: `Area (${areaM2.toFixed(
          2,
        )} m²) exceeds maximum allowed for this system (${effectiveConstraints.maxAreaM2} m²)`,
      });
    }
  }

  // Validate window type
  const validWindowTypePrefixes = ['sliding_window', 'casement', 'tilt_turn', 'sliding_door', 'fixed_window', 'fixed'];
  if (!data.windowType) {
    errors.push({ field: 'windowType', message: 'Window type is required' });
  } else {
    const type = data.windowType.toLowerCase();
    const isValidType = validWindowTypePrefixes.some(prefix => type === prefix || type.startsWith(prefix));
    if (!isValidType) {
      errors.push({ field: 'windowType', message: 'Invalid window type selected' });
    }
  }

  // Validate color (optional but if provided should be valid)
  if (data.color) {
    const validColors = ['Silver', 'White', 'Black', 'Bronze'];
    if (!validColors.includes(data.color)) {
      errors.push({ field: 'color', message: 'Invalid color selected' });
    }
  }

  // Validate glazing type (optional but if provided should be valid)
  const validGlazingTypes = ['single', 'double', 'triple'];
  if (!data.glazingType) {
    errors.push({ field: 'glazingType', message: 'Glazing type is required' });
  } else if (!validGlazingTypes.includes(data.glazingType)) {
    errors.push({ field: 'glazingType', message: 'Invalid glazing type selected' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates window component data
 */
export function validateWindowComponent(component: WindowComponent, profiles: Profile[]): ValidationResult {
  const errors: ValidationError[] = [];

  if (!component.id) {
    errors.push({ field: 'id', message: 'Component ID is required' });
  }

  if (!component.profile) {
    errors.push({ field: 'profile', message: 'Component profile is required' });
  } else {
    const profileExists = profiles.some(p => p.id === component.profile.id);
    if (!profileExists) {
      errors.push({ field: 'profile', message: 'Selected profile does not exist in inventory' });
    }
  }

  if (!component.width || component.width <= 0) {
    errors.push({ field: 'width', message: 'Component width must be greater than 0' });
  }

  if (!component.height || component.height <= 0) {
    errors.push({ field: 'height', message: 'Component height must be greater than 0' });
  }

  if (!component.cuttingLengths || component.cuttingLengths.length === 0) {
    errors.push({ field: 'cuttingLengths', message: 'At least one cutting length is required' });
  } else {
    component.cuttingLengths.forEach((length, index) => {
      if (length <= 0) {
        errors.push({ field: `cuttingLengths[${index}]`, message: 'Cutting length must be greater than 0' });
      }
    });
  }

  if (component.angles && component.angles.length !== component.cuttingLengths.length) {
    errors.push({ field: 'angles', message: 'Number of angles must match number of cutting lengths' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates project data completeness
 * @param project - The project to validate
 * @param requireComponents - Whether to require components (default: true)
 * @param profiles - Optional profiles array for Egyptian standards validation
 */
export function validateProject(
  project: WindowUnit | null, 
  requireComponents: boolean = true,
  profiles?: Profile[]
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!project) {
    errors.push({ field: 'project', message: 'Project data is missing' });
    return { isValid: false, errors };
  }

  if (!project.id) {
    errors.push({ field: 'id', message: 'Project ID is required' });
  }

  if (!project.orderNumber) {
    errors.push({ field: 'orderNumber', message: 'Order number is required' });
  }

  if (!project.overallWidth || project.overallWidth <= 0) {
    errors.push({ field: 'overallWidth', message: 'Overall width must be greater than 0' });
  }

  if (!project.overallHeight || project.overallHeight <= 0) {
    errors.push({ field: 'overallHeight', message: 'Overall height must be greater than 0' });
  }

  // Only require components if explicitly requested (e.g., after design phase)
  if (requireComponents && (!project.components || project.components.length === 0)) {
    errors.push({ field: 'components', message: 'At least one component is required' });
  }

  // Add Egyptian standards validation if profiles are provided
  if (profiles && profiles.length > 0) {
    const egyptianErrors = validateEgyptianStandards(project, profiles);
    // Convert Egyptian validation errors to standard format
    egyptianErrors.forEach((egyptianError) => {
      errors.push({
        field: egyptianError.field,
        message: egyptianError.message,
      });
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Try to derive system constraints from a list of profiles by looking for
 * a `constraints` object on `profile.specifications`.
 */
export function deriveSystemConstraintsFromProfiles(profiles: Profile[]): SystemConstraints | null {
  // 1) Prefer explicit constraints from profile.specifications (existing behaviour)
  for (const profile of profiles) {
    const specs = profile.specifications as any;
    if (specs && typeof specs.constraints === 'object') {
      const c = specs.constraints;
      return {
        minWidthMm: typeof c.minWidthMm === 'number' ? c.minWidthMm : undefined,
        maxWidthMm: typeof c.maxWidthMm === 'number' ? c.maxWidthMm : undefined,
        minHeightMm: typeof c.minHeightMm === 'number' ? c.minHeightMm : undefined,
        maxHeightMm: typeof c.maxHeightMm === 'number' ? c.maxHeightMm : undefined,
        maxAreaM2: typeof c.maxAreaM2 === 'number' ? c.maxAreaM2 : undefined,
      };
    }
  }

  // 2) Fall back to constraints bundled in known system packs (ROCK 60, JUMBO 100, etc.)
  for (const pack of SYSTEM_PACKS) {
    const spec: any = pack.windowSystemSpec;
    if (spec && typeof spec.constraints === 'object') {
      const c = spec.constraints;
      return {
        minWidthMm: typeof c.minWidthMm === 'number' ? c.minWidthMm : undefined,
        maxWidthMm: typeof c.maxWidthMm === 'number' ? c.maxWidthMm : undefined,
        minHeightMm: typeof c.minHeightMm === 'number' ? c.minHeightMm : undefined,
        maxHeightMm: typeof c.maxHeightMm === 'number' ? c.maxHeightMm : undefined,
        maxAreaM2: typeof c.maxAreaM2 === 'number' ? c.maxAreaM2 : undefined,
      };
    }
  }

  return null;
}

/**
 * Validate a project against optional system constraints derived from its
 * profile system. This builds on top of `validateProject` and adds
 * structural checks like max width/height/area.
 */
export function validateProjectWithConstraints(
  project: WindowUnit | null,
  constraints: SystemConstraints | null
): ValidationResult {
  const base = validateProject(project);

  // If project missing or no constraints available, return base result
  if (!project || !constraints) {
    return base;
  }

  const errors = [...base.errors];

  const width = project.overallWidth;
  const height = project.overallHeight;
  const areaM2 = (width * height) / 1_000_000;

  if (constraints.minWidthMm !== undefined && width < constraints.minWidthMm) {
    errors.push({
      field: 'overallWidth',
      message: `Width (${width}mm) is below minimum allowed for this system (${constraints.minWidthMm}mm)`,
    });
  }

  if (constraints.maxWidthMm !== undefined && width > constraints.maxWidthMm) {
    errors.push({
      field: 'overallWidth',
      message: `Width (${width}mm) exceeds maximum allowed for this system (${constraints.maxWidthMm}mm)`,
    });
  }

  if (constraints.minHeightMm !== undefined && height < constraints.minHeightMm) {
    errors.push({
      field: 'overallHeight',
      message: `Height (${height}mm) is below minimum allowed for this system (${constraints.minHeightMm}mm)`,
    });
  }

  if (constraints.maxHeightMm !== undefined && height > constraints.maxHeightMm) {
    errors.push({
      field: 'overallHeight',
      message: `Height (${height}mm) exceeds maximum allowed for this system (${constraints.maxHeightMm}mm)`,
    });
  }

  if (constraints.maxAreaM2 !== undefined && areaM2 > constraints.maxAreaM2) {
    errors.push({
      field: 'area',
      message: `Area (${areaM2.toFixed(2)} m²) exceeds maximum allowed for this system (${constraints.maxAreaM2} m²)`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates profile data
 */
export function validateProfile(profile: Profile): ValidationResult {
  const errors: ValidationError[] = [];

  if (!profile.id) {
    errors.push({ field: 'id', message: 'Profile ID is required' });
  }

  if (!profile.name || profile.name.trim() === '') {
    errors.push({ field: 'name', message: 'Profile name is required' });
  }

  if (!profile.width || profile.width <= 0) {
    errors.push({ field: 'width', message: 'Profile width must be greater than 0' });
  }

  if (profile.costPerMeter !== undefined && profile.costPerMeter < 0) {
    errors.push({ field: 'costPerMeter', message: 'Cost per meter cannot be negative' });
  }

  if (profile.stockQuantity !== undefined && profile.stockQuantity < 0) {
    errors.push({ field: 'stockQuantity', message: 'Stock quantity cannot be negative' });
  }

  if (profile.cuttingAllowance !== undefined && profile.cuttingAllowance < 0) {
    errors.push({ field: 'cuttingAllowance', message: 'Cutting allowance cannot be negative' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}


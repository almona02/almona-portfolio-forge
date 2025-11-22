import { MeasurementData, WindowComponent, Profile, WindowUnit } from '@/types/fabricator';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates measurement inputs
 */
export function validateMeasurements(data: MeasurementData): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate width
  const width = Number(data.width);
  if (!data.width || isNaN(width)) {
    errors.push({ field: 'width', message: 'Width is required and must be a valid number' });
  } else if (width <= 0) {
    errors.push({ field: 'width', message: 'Width must be greater than 0' });
  } else if (width < 300) {
    errors.push({ field: 'width', message: 'Width must be at least 300mm' });
  } else if (width > 5000) {
    errors.push({ field: 'width', message: 'Width cannot exceed 5000mm' });
  }

  // Validate height
  const height = Number(data.height);
  if (!data.height || isNaN(height)) {
    errors.push({ field: 'height', message: 'Height is required and must be a valid number' });
  } else if (height <= 0) {
    errors.push({ field: 'height', message: 'Height must be greater than 0' });
  } else if (height < 300) {
    errors.push({ field: 'height', message: 'Height must be at least 300mm' });
  } else if (height > 5000) {
    errors.push({ field: 'height', message: 'Height cannot exceed 5000mm' });
  }

  // Validate window type
  const validWindowTypes = ['sliding_window', 'casement', 'tilt_turn', 'sliding_door', 'fixed_window'];
  if (!data.windowType) {
    errors.push({ field: 'windowType', message: 'Window type is required' });
  } else if (!validWindowTypes.includes(data.windowType)) {
    errors.push({ field: 'windowType', message: 'Invalid window type selected' });
  }

  // Validate color (optional but if provided should be valid)
  if (data.color) {
    const validColors = ['Silver', 'White', 'Black', 'Bronze'];
    if (!validColors.includes(data.color)) {
      errors.push({ field: 'color', message: 'Invalid color selected' });
    }
  }

  // Validate glazing type (optional but if provided should be valid)
  if (data.glazingType) {
    const validGlazingTypes = ['single', 'double', 'triple'];
    if (!validGlazingTypes.includes(data.glazingType)) {
      errors.push({ field: 'glazingType', message: 'Invalid glazing type selected' });
    }
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
 */
export function validateProject(project: WindowUnit | null): ValidationResult {
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

  if (!project.components || project.components.length === 0) {
    errors.push({ field: 'components', message: 'At least one component is required' });
  }

  return {
    isValid: errors.length === 0,
    errors
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


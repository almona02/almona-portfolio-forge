/**
 * Profile Data Sheet Parser
 * v1: Manual input with visual annotation support
 * v2 (Future): ML-based automated dimension extraction
 */

export interface ParsedProfileData {
  profileCode: string;
  systemName: string;
  width: number; // mm
  height: number; // mm
  materialThickness: number; // mm
  weightPerMeter: number; // kg/m
  role: 'frame' | 'sash' | 'mullion' | 'transom' | 'glazing_bead' | 'interlock' | 'accessory';
  material: 'aluminum' | 'upvc' | 'wood';
  annotations?: Array<{
    type: 'point' | 'box';
    x: number;
    y: number;
    width?: number;
    height?: number;
    label?: string;
  }>;
}

export class ProfileDataSheetParser {
  /**
   * Parse profile data from manual input
   * v1: Manual input only - user enters dimensions from data sheet
   * v2 (Future): Automated extraction from PDF/image using ML
   */
  parseManualInput(formData: {
    profileCode: string;
    systemName: string;
    width: number;
    height: number;
    materialThickness: number;
    weightPerMeter: number;
    role: string;
    material: string;
  }): ParsedProfileData {
    return {
      profileCode: formData.profileCode.trim(),
      systemName: formData.systemName.trim(),
      width: formData.width,
      height: formData.height,
      materialThickness: formData.materialThickness,
      weightPerMeter: formData.weightPerMeter,
      role: formData.role as ParsedProfileData['role'],
      material: formData.material as ParsedProfileData['material'],
    };
  }

  /**
   * Validate parsed profile data
   */
  validate(data: ParsedProfileData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.profileCode || data.profileCode.length < 2) {
      errors.push('Profile code is required and must be at least 2 characters');
    }

    if (!data.systemName || data.systemName.length < 2) {
      errors.push('System name is required and must be at least 2 characters');
    }

    if (data.width <= 0 || data.width > 1000) {
      errors.push('Profile width must be between 1mm and 1000mm');
    }

    if (data.height <= 0 || data.height > 1000) {
      errors.push('Profile height must be between 1mm and 1000mm');
    }

    if (data.materialThickness <= 0 || data.materialThickness > 50) {
      errors.push('Material thickness must be between 0.1mm and 50mm');
    }

    if (data.weightPerMeter < 0) {
      errors.push('Weight per meter cannot be negative');
    }

    const validRoles: ParsedProfileData['role'][] = [
      'frame',
      'sash',
      'mullion',
      'transom',
      'glazing_bead',
      'interlock',
      'accessory',
    ];
    if (!validRoles.includes(data.role)) {
      errors.push(`Role must be one of: ${validRoles.join(', ')}`);
    }

    const validMaterials: ParsedProfileData['material'][] = ['aluminum', 'upvc', 'wood'];
    if (!validMaterials.includes(data.material)) {
      errors.push(`Material must be one of: ${validMaterials.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract basic dimensions from image (v2 future - placeholder)
   * This would use ML/OCR to extract dimensions from data sheet images
   */
  async parseImage(_imageFile: File): Promise<Partial<ParsedProfileData>> {
    // v1: Return empty - manual input only
    // v2: Implement ML-based extraction
    console.warn('Image parsing not yet implemented. Use manual input.');
    return {};
  }

  /**
   * Extract data from PDF (v2 future - placeholder)
   */
  async parsePDF(_pdfFile: File): Promise<Partial<ParsedProfileData>> {
    // v1: Return empty - manual input only
    // v2: Implement PDF text extraction and parsing
    console.warn('PDF parsing not yet implemented. Use manual input.');
    return {};
  }
}

export const profileDataSheetParser = new ProfileDataSheetParser();


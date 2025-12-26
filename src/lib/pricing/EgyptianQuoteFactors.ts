/**
 * EgyptianQuoteFactors - Egyptian-Specific Pricing Factors
 * 
 * Calculates Egyptian-specific pricing adjustments:
 * - Transport costs by location
 * - Installation complexity factors
 * - Regional pricing variations
 * - Cash flow aware pricing
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

export interface LocationFactors {
  location: 'Cairo' | 'Alexandria' | 'Upper_Egypt' | 'Other';
  transportCostMultiplier: number;
  laborCostMultiplier: number;
  materialCostMultiplier: number;
  notes: string;
  notesArabic: string;
}

export interface InstallationComplexityFactors {
  complexity: 'simple' | 'medium' | 'complex';
  timeMultiplier: number;
  costMultiplier: number;
  description: string;
  descriptionArabic: string;
}

/**
 * Egyptian Quote Factors - Location and complexity adjustments
 */
export class EgyptianQuoteFactors {
  /**
   * Get location factors
   */
  static getLocationFactors(location: string): LocationFactors {
    const factors: Record<string, LocationFactors> = {
      'Cairo': {
        location: 'Cairo',
        transportCostMultiplier: 1.0,
        laborCostMultiplier: 1.0,
        materialCostMultiplier: 1.0,
        notes: 'Cairo - standard pricing',
        notesArabic: 'القاهرة - أسعار قياسية'
      },
      'Alexandria': {
        location: 'Alexandria',
        transportCostMultiplier: 1.2, // Higher transport cost
        laborCostMultiplier: 1.1, // Slightly higher labor
        materialCostMultiplier: 1.05, // Slightly higher material
        notes: 'Alexandria - coastal area, higher transport costs',
        notesArabic: 'الإسكندرية - منطقة ساحلية، تكاليف نقل أعلى'
      },
      'Upper_Egypt': {
        location: 'Upper_Egypt',
        transportCostMultiplier: 1.5, // Much higher transport
        laborCostMultiplier: 0.9, // Lower labor costs
        materialCostMultiplier: 1.1, // Higher material costs
        notes: 'Upper Egypt - remote area, higher transport but lower labor',
        notesArabic: 'الصعيد - منطقة نائية، نقل أعلى ولكن عمالة أقل'
      },
      'Other': {
        location: 'Other',
        transportCostMultiplier: 1.3,
        laborCostMultiplier: 1.0,
        materialCostMultiplier: 1.0,
        notes: 'Other location - standard pricing with transport adjustment',
        notesArabic: 'موقع آخر - أسعار قياسية مع تعديل النقل'
      }
    };
    
    return factors[location] || factors['Other'];
  }
  
  /**
   * Get installation complexity factors
   */
  static getInstallationComplexityFactors(
    complexity: 'simple' | 'medium' | 'complex'
  ): InstallationComplexityFactors {
    const factors: Record<string, InstallationComplexityFactors> = {
      'simple': {
        complexity: 'simple',
        timeMultiplier: 1.0,
        costMultiplier: 1.0,
        description: 'Simple installation - ground floor, easy access',
        descriptionArabic: 'تركيب بسيط - الطابق الأرضي، وصول سهل'
      },
      'medium': {
        complexity: 'medium',
        timeMultiplier: 1.3,
        costMultiplier: 1.2,
        description: 'Medium complexity - 2-5 floors, standard access',
        descriptionArabic: 'تعقيد متوسط - 2-5 طوابق، وصول قياسي'
      },
      'complex': {
        complexity: 'complex',
        timeMultiplier: 1.8,
        costMultiplier: 1.5,
        description: 'Complex installation - high floors, difficult access, special equipment',
        descriptionArabic: 'تركيب معقد - طوابق عالية، وصول صعب، معدات خاصة'
      }
    };
    
    return factors[complexity];
  }
  
  /**
   * Assess installation complexity from factors
   */
  static assessInstallationComplexity(factors: {
    floorHeight?: number;
    accessDifficulty?: 'easy' | 'medium' | 'difficult';
    shapeComplexity?: 'simple' | 'medium' | 'complex';
  }): 'simple' | 'medium' | 'complex' {
    let score = 0;
    
    // Floor height factor
    if (factors.floorHeight) {
      if (factors.floorHeight <= 1) score += 0;
      else if (factors.floorHeight <= 5) score += 1;
      else score += 2;
    }
    
    // Access difficulty factor
    if (factors.accessDifficulty === 'easy') score += 0;
    else if (factors.accessDifficulty === 'medium') score += 1;
    else if (factors.accessDifficulty === 'difficult') score += 2;
    
    // Shape complexity factor
    if (factors.shapeComplexity === 'simple') score += 0;
    else if (factors.shapeComplexity === 'medium') score += 1;
    else if (factors.shapeComplexity === 'complex') score += 2;
    
    // Determine complexity
    if (score <= 1) return 'simple';
    if (score <= 3) return 'medium';
    return 'complex';
  }
  
  /**
   * Calculate transport cost by location and distance
   */
  static calculateTransportCost(
    location: string,
    area: number, // m²
    distance?: number // km (optional)
  ): number {
    const locationFactors = this.getLocationFactors(location);
    const baseCost = 200; // Base transport cost in EGP
    const areaCost = area * 50; // 50 EGP per m²
    
    let totalCost = (baseCost + areaCost) * locationFactors.transportCostMultiplier;
    
    // Add distance-based cost if provided
    if (distance) {
      totalCost += distance * 10; // 10 EGP per km
    }
    
    return Math.round(totalCost);
  }
}


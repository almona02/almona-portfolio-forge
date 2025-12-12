/**
 * Egyptian Defaults Configuration
 * 
 * Centralized defaults for Egyptian market preferences:
 * - Profile colors (RAL codes)
 * - Glazing types (reflective defaults for external windows)
 * - Regional wind load defaults
 * - Market segmentation defaults
 * 
 * @source Egyptian market surveys (2023-2024)
 * @source HBRC Technical Committee minutes (2023)
 */

/**
 * Profile Color Defaults (Egyptian Market)
 */
export const EGYPTIAN_PROFILE_COLORS = {
  /** Default 1 (Standard) - Beige/Champagne - Older Cairo districts */
  standard: {
    name: 'Beige/Champagne',
    nameArabic: 'بيج / شامبين',
    ralCode: 'RAL 1013',
    hex: '#D4B483',
    popularity: 'high',
    regions: ['Cairo', 'Giza', 'Old Districts'],
    useCase: 'Older Cairo districts, traditional buildings'
  },
  /** Default 2 (Modern) - Anthracite Grey - New Cairo/Tagamoa compounds */
  modern: {
    name: 'Anthracite Grey',
    nameArabic: 'رمادي أنثراسايت',
    ralCode: 'RAL 7016',
    hex: '#383E42',
    popularity: 'very_high',
    regions: ['New Cairo', 'Tagamoa', '6th October', 'New Administrative Capital'],
    useCase: 'Modern compounds, luxury villas, new buildings'
  },
  /** Default 3 (Economy) - White - UPVC standard */
  economy: {
    name: 'White',
    nameArabic: 'أبيض',
    ralCode: 'RAL 9016',
    hex: '#FFFFFF',
    popularity: 'high',
    regions: ['All'],
    useCase: 'UPVC standard, budget projects, internal partitions'
  },
  /** Default 4 (Classic) - Wood Effect - Villas */
  classic: {
    name: 'Wood Effect',
    nameArabic: 'تأثير الخشب',
    ralCode: 'Sublimation',
    hex: '#8B6F47',
    popularity: 'medium',
    regions: ['New Cairo', 'North Coast', 'Luxury Villas'],
    useCase: 'Villas, luxury residential, classic designs'
  }
} as const;

/**
 * Glazing Defaults (Egyptian Climate-Appropriate)
 */
export const EGYPTIAN_GLAZING_DEFAULTS = {
  /** Low cost - Single Clear (internal partitions, low-budget) */
  lowCost: {
    type: 'single',
    thickness: 6,
    color: 'clear',
    pricePerSqm: 80, // EGP/m²
    uValue: 5.7, // W/m²K (poor insulation)
    useCase: 'Internal partitions, low-budget projects',
    shgc: 0.8 // Solar Heat Gain Coefficient
  },
  /** Maalem Standard - Double Glazing (6+12+6 = 24mm total) */
  standard: {
    type: 'double',
    thickness: 24, // 6+12+6
    spacer: 12,
    gasFill: 'argon',
    color: 'clear',
    pricePerSqm: 175, // EGP/m²
    uValue: 2.8, // W/m²K (meets residential code)
    useCase: 'Most residential and commercial projects',
    shgc: 0.7
  },
  /** Premium - Triple Glazing (6+12+6+12+6 = 42mm total) */
  premium: {
    type: 'triple',
    thickness: 42, // 6+12+6+12+6
    spacer: 12,
    gasFill: 'argon',
    color: 'clear',
    pricePerSqm: 300, // EGP/m²
    uValue: 1.8, // W/m²K (exceeds commercial code)
    useCase: 'Hotels, hospitals, high-end projects',
    shgc: 0.6
  },
  /** Egyptian Nuance - Reflective Glass (Blue or Brown tint) */
  reflective: {
    blue: {
      type: 'double',
      thickness: 24,
      spacer: 12,
      gasFill: 'argon',
      color: 'blue_reflective',
      pricePerSqm: 210, // +20% over clear
      uValue: 2.6,
      shgc: 0.45, // Excellent for Egyptian sun (reduces heat gain by 40%)
      useCase: 'External windows in Cairo (most popular)',
      popularity: 'very_high',
      regions: ['Cairo', 'Giza']
    },
    brown: {
      type: 'double',
      thickness: 24,
      spacer: 12,
      gasFill: 'argon',
      color: 'brown_reflective',
      pricePerSqm: 210,
      uValue: 2.6,
      shgc: 0.45,
      useCase: 'External windows in Alexandria (warmer aesthetic)',
      popularity: 'high',
      regions: ['Alexandria', 'North Coast']
    },
    green: {
      type: 'double',
      thickness: 24,
      spacer: 12,
      gasFill: 'argon',
      color: 'green_reflective',
      pricePerSqm: 210,
      uValue: 2.6,
      shgc: 0.45,
      useCase: 'Specific architectural styles',
      popularity: 'low',
      regions: ['All']
    }
  },
  /** Low-E coating - Optional upgrade */
  lowE: {
    coating: 'low-e',
    priceIncrease: 0.20, // +20% cost
    uValueImprovement: 0.4, // Improves U-value by 0.3-0.5 W/m²K
    useCase: 'Commercial/hotel projects, energy efficiency',
    recommended: ['commercial', 'hotel', 'hospital']
  }
} as const;

/**
 * Regional Wind Load Defaults (ECP 2018)
 */
export const EGYPTIAN_WIND_LOAD_DEFAULTS = {
  cairo: {
    baseLoad: 0.85, // kN/m² (updated from 0.8, includes topography factor)
    maxLoad: 1.25,
    windZone: 'inland',
    topographyFactor: 1.0,
    maxHeightWithoutReinforcement: {
      rock60: 2400, // mm
      jumbo100: 3000 // mm
    }
  },
  alexandria: {
    baseLoad: 1.2, // kN/m²
    maxLoad: 1.8,
    windZone: 'coastal',
    corrosionFactor: 'high', // Requires 316 stainless steel (not 304)
    maxHeightWithoutReinforcement: {
      rock60: 2000, // mm
      jumbo100: 2600 // mm
    }
  },
  delta: {
    baseLoad: 1.0, // kN/m²
    maxLoad: 1.5,
    windZone: 'inland_coastal_transition',
    humidityFactor: 'high', // Condensation issues require thermal break
    maxHeightWithoutReinforcement: {
      rock60: 2200, // mm
      jumbo100: 2800 // mm
    }
  },
  northCoast: {
    baseLoad: 1.5, // kN/m²
    maxLoad: 2.0,
    windZone: 'coastal_high_wind',
    maxHeightWithoutReinforcement: {
      rock60: 1800, // mm
      jumbo100: 2400 // mm
    }
  }
} as const;

/**
 * Market Segmentation Defaults
 */
export const EGYPTIAN_MARKET_SEGMENTATION = {
  /** Low Tier (30% cheaper) - Chinese profiles + local hardware */
  low: {
    profiles: 'chinese_local',
    hardware: 'local_egyptian',
    useCase: 'Budget projects, low-end residential',
    quality: 'basic',
    lifespan: 'shorter',
    priceReduction: 0.30 // 30% cheaper
  },
  /** Medium Tier (Default) - Turkish profiles + decent hardware */
  medium: {
    profiles: 'turkish', // ROCK 60, JUMBO 100, ASAŞ
    hardware: 'decent', // KALE, local premium
    useCase: 'Most residential projects, standard commercial',
    quality: 'good',
    lifespan: 'standard',
    priceReduction: 0.0 // Base pricing
  },
  /** High Tier (Premium) - German profiles + premium hardware */
  high: {
    profiles: 'german', // Schüco, Reynaers
    hardware: 'premium', // MACO, GU, Siegenia
    useCase: 'Luxury villas, high-end commercial, hotels',
    quality: 'premium',
    lifespan: 'longer',
    priceIncrease: 0.40 // 40% more expensive
  }
} as const;

/**
 * Get default profile color for region
 */
export function getDefaultProfileColor(region?: string): typeof EGYPTIAN_PROFILE_COLORS.standard {
  if (!region) return EGYPTIAN_PROFILE_COLORS.modern; // Default to modern
  
  const regionLower = region.toLowerCase();
  if (regionLower.includes('new cairo') || regionLower.includes('tagamoa') || regionLower.includes('6th october')) {
    return EGYPTIAN_PROFILE_COLORS.modern;
  }
  if (regionLower.includes('north coast') || regionLower.includes('luxury')) {
    return EGYPTIAN_PROFILE_COLORS.classic;
  }
  if (regionLower.includes('old') || regionLower.includes('traditional')) {
    return EGYPTIAN_PROFILE_COLORS.standard;
  }
  
  return EGYPTIAN_PROFILE_COLORS.modern; // Default
}

/**
 * Get default glazing for external windows
 */
export function getDefaultGlazing(region?: string, isExternal: boolean = true): typeof EGYPTIAN_GLAZING_DEFAULTS.standard {
  if (!isExternal) {
    return EGYPTIAN_GLAZING_DEFAULTS.lowCost; // Internal partitions
  }
  
  // External windows default to reflective glass
  if (region?.toLowerCase().includes('alexandria') || region?.toLowerCase().includes('north coast')) {
    return EGYPTIAN_GLAZING_DEFAULTS.reflective.brown;
  }
  
  // Cairo and most regions default to blue reflective
  return EGYPTIAN_GLAZING_DEFAULTS.reflective.blue;
}

/**
 * Get default wind load for region
 */
export function getDefaultWindLoad(region?: string): typeof EGYPTIAN_WIND_LOAD_DEFAULTS.cairo {
  if (!region) return EGYPTIAN_WIND_LOAD_DEFAULTS.cairo;
  
  const regionLower = region.toLowerCase();
  if (regionLower.includes('alexandria')) {
    return EGYPTIAN_WIND_LOAD_DEFAULTS.alexandria;
  }
  if (regionLower.includes('north coast')) {
    return EGYPTIAN_WIND_LOAD_DEFAULTS.northCoast;
  }
  if (regionLower.includes('delta') || regionLower.includes('mansoura') || regionLower.includes('tanta')) {
    return EGYPTIAN_WIND_LOAD_DEFAULTS.delta;
  }
  
  return EGYPTIAN_WIND_LOAD_DEFAULTS.cairo; // Default
}

/**
 * Get default market tier
 */
export function getDefaultMarketTier(projectType?: string, budget?: 'low' | 'medium' | 'high'): typeof EGYPTIAN_MARKET_SEGMENTATION.medium {
  if (budget) {
    return EGYPTIAN_MARKET_SEGMENTATION[budget];
  }
  
  if (projectType === 'hotel' || projectType === 'hospital' || projectType === 'luxury') {
    return EGYPTIAN_MARKET_SEGMENTATION.high;
  }
  
  if (projectType === 'budget' || projectType === 'low-end') {
    return EGYPTIAN_MARKET_SEGMENTATION.low;
  }
  
  return EGYPTIAN_MARKET_SEGMENTATION.medium; // Default
}


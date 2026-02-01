/**
 * Common Egyptian Window Sizes
 * 
 * Standard dimensions commonly used in Egyptian construction.
 * Used for quick-select suggestions in measurement interfaces.
 */

export interface CommonWindowSize {
  /** Display name for the size */
  name: string;
  /** Arabic name */
  nameArabic?: string;
  /** Width in millimeters */
  width: number;
  /** Height in millimeters */
  height: number;
  /** Typical usage context */
  context: 'residential' | 'commercial' | 'villa' | 'apartment' | 'bathroom' | 'balcony';
  /** Window type recommendations */
  recommendedTypes: ('sliding_window' | 'casement' | 'tilt_turn' | 'fixed_window')[];
  /** Usage frequency (for sorting) */
  frequency: 'very_high' | 'high' | 'medium' | 'low';
}

/**
 * Common Egyptian window sizes sorted by frequency and context
 */
export const COMMON_EGYPTIAN_WINDOW_SIZES: CommonWindowSize[] = [
  // Very High Frequency - Cairo Apartment Standards
  {
    name: 'Standard Sliding 120×120',
    nameArabic: 'منزلق قياسي ١٢٠×١٢٠',
    width: 1200,
    height: 1200,
    context: 'apartment',
    recommendedTypes: ['sliding_window'],
    frequency: 'very_high',
  },
  {
    name: 'Wide Sliding 150×120',
    nameArabic: 'منزلق عريض ١٥٠×١٢٠',
    width: 1500,
    height: 1200,
    context: 'apartment',
    recommendedTypes: ['sliding_window'],
    frequency: 'very_high',
  },
  {
    name: 'Tall Sliding 120×150',
    nameArabic: 'منزلق طويل ١٢٠×١٥٠',
    width: 1200,
    height: 1500,
    context: 'apartment',
    recommendedTypes: ['sliding_window'],
    frequency: 'very_high',
  },
  {
    name: 'Large Sliding 150×150',
    nameArabic: 'منزلق كبير ١٥٠×١٥٠',
    width: 1500,
    height: 1500,
    context: 'apartment',
    recommendedTypes: ['sliding_window'],
    frequency: 'very_high',
  },

  // High Frequency - Residential Standards
  {
    name: 'Standard Casement 80×120',
    nameArabic: 'مصراع قياسي ٨٠×١٢٠',
    width: 800,
    height: 1200,
    context: 'residential',
    recommendedTypes: ['casement', 'tilt_turn'],
    frequency: 'high',
  },
  {
    name: 'Wide Casement 100×120',
    nameArabic: 'مصراع عريض ١٠٠×١٢٠',
    width: 1000,
    height: 1200,
    context: 'residential',
    recommendedTypes: ['casement', 'tilt_turn'],
    frequency: 'high',
  },
  {
    name: 'Bathroom Window 60×100',
    nameArabic: 'نافذة حمام ٦٠×١٠٠',
    width: 600,
    height: 1000,
    context: 'bathroom',
    recommendedTypes: ['casement', 'tilt_turn'],
    frequency: 'high',
  },
  {
    name: 'Bedroom Casement 80×140',
    nameArabic: 'مصراع غرفة نوم ٨٠×١٤٠',
    width: 800,
    height: 1400,
    context: 'residential',
    recommendedTypes: ['casement', 'tilt_turn'],
    frequency: 'high',
  },

  // Medium Frequency - Villa & Commercial
  {
    name: 'Villa Sliding 180×150',
    nameArabic: 'منزلق فيلا ١٨٠×١٥٠',
    width: 1800,
    height: 1500,
    context: 'villa',
    recommendedTypes: ['sliding_window'],
    frequency: 'medium',
  },
  {
    name: 'Large Picture Window 200×150',
    nameArabic: 'نافذة صورة كبيرة ٢٠٠×١٥٠',
    width: 2000,
    height: 1500,
    context: 'villa',
    recommendedTypes: ['fixed_window'],
    frequency: 'medium',
  },
  {
    name: 'Balcony Door 180×210',
    nameArabic: 'باب شرفة ١٨٠×٢١٠',
    width: 1800,
    height: 2100,
    context: 'balcony',
    recommendedTypes: ['sliding_window'],
    frequency: 'medium',
  },
  {
    name: 'Commercial Sliding 240×180',
    nameArabic: 'منزلق تجاري ٢٤٠×١٨٠',
    width: 2400,
    height: 1800,
    context: 'commercial',
    recommendedTypes: ['sliding_window'],
    frequency: 'medium',
  },

  // Standard Fixed Windows
  {
    name: 'Small Fixed 80×80',
    nameArabic: 'ثابت صغير ٨٠×٨٠',
    width: 800,
    height: 800,
    context: 'residential',
    recommendedTypes: ['fixed_window'],
    frequency: 'medium',
  },
  {
    name: 'Medium Fixed 120×100',
    nameArabic: 'ثابت متوسط ١٢٠×١٠٠',
    width: 1200,
    height: 1000,
    context: 'residential',
    recommendedTypes: ['fixed_window'],
    frequency: 'medium',
  },
];

/**
 * Get common window sizes filtered by context and/or type
 */
export function getCommonWindowSizes(options?: {
  context?: CommonWindowSize['context'];
  windowType?: CommonWindowSize['recommendedTypes'][number];
  limit?: number;
}): CommonWindowSize[] {
  let filtered = COMMON_EGYPTIAN_WINDOW_SIZES;

  if (options?.context) {
    filtered = filtered.filter((size) => size.context === options.context);
  }

  if (options?.windowType) {
    filtered = filtered.filter((size) =>
      size.recommendedTypes.includes(options.windowType!)
    );
  }

  // Sort by frequency (very_high first, then high, etc.)
  const frequencyOrder = { very_high: 0, high: 1, medium: 2, low: 3 };
  filtered.sort((a, b) => frequencyOrder[a.frequency] - frequencyOrder[b.frequency]);

  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Find closest common window size to given dimensions
 */
export function findClosestCommonSize(
  width: number,
  height: number,
  tolerance: number = 100
): CommonWindowSize | null {
  let closest: CommonWindowSize | null = null;
  let minDistance = Infinity;

  for (const size of COMMON_EGYPTIAN_WINDOW_SIZES) {
    const widthDiff = Math.abs(size.width - width);
    const heightDiff = Math.abs(size.height - height);
    const distance = Math.sqrt(widthDiff * widthDiff + heightDiff * heightDiff);

    if (distance < minDistance && widthDiff <= tolerance && heightDiff <= tolerance) {
      minDistance = distance;
      closest = size;
    }
  }

  return closest;
}

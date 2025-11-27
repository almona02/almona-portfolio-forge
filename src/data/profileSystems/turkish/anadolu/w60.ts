import type { SystemPack } from '@/data/systemPacks';

/**
 * ANADOLU W60 Window System – stub pack for Turkish / MENA market
 * ----------------------------------------------------------------
 * This is a first, catalog-inspired stub. The numeric values are conservative
 * and should be refined against the official ANADOLU W60 technical manual
 * (min/max widths, heights, and recommended spans).
 */
export const ANADOLU_W60_PACK: SystemPack = {
  meta: {
    id: 'anadolu-w60',
    name: 'ANADOLU W60 Window System',
    brands: ['ANADOLU'],
    regions: ['turkey', 'mena'],
    defaultStockLengthMm: 6000,
  },
  windowSystemSpec: {
    window_system: 'ANADOLU W60',
    // Structural limits – to be validated against ANADOLU catalog
    constraints: {
      minWidthMm: 600,
      maxWidthMm: 2600,
      minHeightMm: 700,
      maxHeightMm: 2600,
      maxAreaM2: 6,
    },
    catalog_metadata: {
      supplier: 'ANADOLU',
      system_code: 'W60',
      // TODO: fill from real catalog
      extraction_date: new Date().toISOString().slice(0, 10),
    },
    // TODO: populate with real profile codes, weights, cutting rules & hardware kits.
    aluminum_profiles: [],
    hardware_kits: [],
    glass_rules: {
      default: {
        edgeClearanceMm: 3,
        minBiteMm: 12,
        allowRotation90: false,
      },
    },
  },
  smartDrawPreset: {
    defaultMullionSpacingMm: 800,
    maxSpanWithoutIntermediateMm: 1600,
    minPanelWidthMm: 600,
    maxPanelWidthMm: 1200,
    typicalPanelWidthsMm: [700, 800, 1000, 1200],
    recommendedMullionCounts: [2, 3, 4],
    spacingStrategy: 'equal',
  },
  glassAllowances: {
    edgeClearanceMm: 3,
    minBiteMm: 12,
    allowRotation90: false,
    maxWidthMm: 1500,
    maxHeightMm: 2400,
    maxAreaM2: 4.5,
  },
};



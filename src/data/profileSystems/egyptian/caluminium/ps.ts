import type { SystemPack } from '@/data/systemPacks';

/**
 * CALUMINIUM PS Sliding System – stub pack for Egyptian market
 * ------------------------------------------------------------
 * Values here are based on typical PS sliding practice and should be aligned
 * with the official CALUMINIUM PS catalog (span limits, panel widths, etc.).
 */
export const CALUMINIUM_PS_PACK: SystemPack = {
  meta: {
    id: 'caluminium-ps',
    name: 'CALUMINIUM PS Sliding',
    brands: ['CALUMINIUM'],
    regions: ['egypt', 'mena'],
    defaultStockLengthMm: 6500,
  },
  windowSystemSpec: {
    window_system: 'CALUMINIUM PS',
    constraints: {
      minWidthMm: 1000,
      maxWidthMm: 4500,
      minHeightMm: 1000,
      maxHeightMm: 3200,
      maxAreaM2: 9,
    },
    catalog_metadata: {
      supplier: 'CALUMINIUM',
      system_code: 'PS Sliding',
      // TODO: adjust once catalog is parsed
      extraction_date: new Date().toISOString().slice(0, 10),
    },
    // TODO: real profile codes, weights, and cutting rules from CALUMINIUM PS catalog.
    aluminum_profiles: [],
    hardware_kits: [],
    glass_rules: {
      default: {
        edgeClearanceMm: 4,
        minBiteMm: 15,
        allowRotation90: true,
      },
    },
  },
  smartDrawPreset: {
    defaultMullionSpacingMm: 1200,
    maxSpanWithoutIntermediateMm: 2400,
    minPanelWidthMm: 900,
    maxPanelWidthMm: 1800,
    typicalPanelWidthsMm: [1000, 1200, 1500, 1800],
    recommendedMullionCounts: [2, 3, 4],
    spacingStrategy: 'center-heavy',
  },
  glassAllowances: {
    edgeClearanceMm: 4,
    minBiteMm: 15,
    allowRotation90: true,
    maxWidthMm: 2400,
    maxHeightMm: 3200,
    maxAreaM2: 7.5,
  },
};



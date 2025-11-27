import type { Profile } from '@/types/fabricator';
import { ANADOLU_W60_PACK } from '@/data/profileSystems/turkish/anadolu/w60';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';

/**
 * System pack metadata – describes a branded window/door system
 * (e.g. ROCK 60) and how it should be treated regionally.
 */
export interface SystemPackMeta {
  /** Stable identifier, e.g. "rock60" */
  id: string;
  /** Human readable name, e.g. "ROCK 60" */
  name: string;
  /** Brand(s) or suppliers this pack belongs to */
  brands: string[];
  /** Regions where this pack is most relevant (egypt, turkey, mena, gulf, global, etc.) */
  regions: string[];
  /** Default stock bar length in mm for this system, if known */
  defaultStockLengthMm?: number;
}

/**
 * A system pack bundles cutting rules, hardware kits and other
 * configuration that is stored in `Profile.specifications`.
 *
 * For now we keep the internal structure as `any` to avoid blocking
 * on full typing; existing components (e.g. Rock60CuttingSummary)
 * already expect this shape.
 */
export interface SystemPackSmartDrawPreset {
  /** Recommended default mullion-to-mullion spacing in mm for typical elevations */
  defaultMullionSpacingMm: number;
  /** Max span in mm that can be left without an intermediate mullion */
  maxSpanWithoutIntermediateMm: number;
  /** Recommended min panel width in mm for Smart Draw */
  minPanelWidthMm: number;
  /** Recommended max panel width in mm for Smart Draw */
  maxPanelWidthMm: number;
  /** Common panel widths in mm used in catalog examples */
  typicalPanelWidthsMm: number[];
  /** Recommended mullion counts for typical openings (e.g. villas vs façades) */
  recommendedMullionCounts: number[];
  /** Spacing strategy hint for the UI */
  spacingStrategy: 'equal' | 'golden-ratio' | 'center-heavy';
}

export interface GlassAllowanceSpec {
  /** Clearance between frame pocket and glass edge per side (mm). */
  edgeClearanceMm: number;
  /** Minimum glass bite into the pocket per side (mm). */
  minBiteMm: number;
  /** Whether panes may be rotated by 90° during optimisation. */
  allowRotation90: boolean;
  /** Optional global max pane width in mm. */
  maxWidthMm?: number;
  /** Optional global max pane height in mm. */
  maxHeightMm?: number;
  /** Optional global max pane area in m². */
  maxAreaM2?: number;
}

export interface SystemPack {
  meta: SystemPackMeta;
  /** Raw specification object that will be embedded into profile.specifications */
  windowSystemSpec: Record<string, any>;
  /** Optional Smart Draw presets used by facade tools */
  smartDrawPreset?: SystemPackSmartDrawPreset;
  /** Optional glass sizing rules used for glazing and 2D glass optimisation. */
  glassAllowances?: GlassAllowanceSpec;
}

// ----------------------------------------------------------------------------
// ROCK 60 System Pack
// ----------------------------------------------------------------------------

// Default ROCK 60 window system template to seed for all users
// Updated with full 45° miter configuration and 2D cutting list
// NOTE: This object is consumed by multiple parts of the app (profile seeding,
// Rock60CuttingSummary, optimization helpers). Treat as canonical spec.
export const ROCK60_WINDOW_SYSTEM_TEMPLATE: Record<string, any> = {
  window_system: 'ROCK 60',
  drawing_reference: 'Page 24 - Draft Shop Drawing',
  // Optional default stock length for bars in mm (used as a hint; capped globally at 8000mm)
  stockLengthMm: 6000,
  // Recommended structural limits for typical ROCK 60 windows (can be tuned per market)
  constraints: {
    minWidthMm: 600,
    maxWidthMm: 3000,
    minHeightMm: 600,
    maxHeightMm: 2600,
    maxAreaM2: 6,
  },
  // Legacy flat list used by earlier phases (kept for backward compatibility)
  profiles_cutting_list: [
    {
      profile_number: 'RC 6111-8',
      quantity: 2,
      cutting_length: 'L + 60',
      description: 'Frame profile - length direction',
    },
    {
      profile_number: 'RC 6111-8',
      quantity: 2,
      cutting_length: 'H + 60',
      description: 'Frame profile - height direction',
    },
    {
      profile_number: 'RC 6122',
      quantity: 2,
      cutting_length: 'L - 44',
      description: 'Sash profile - length direction',
    },
    {
      profile_number: 'RC 6122',
      quantity: 2,
      cutting_length: 'H - 44',
      description: 'Sash profile - height direction',
    },
    {
      profile_number: 'RC 6166',
      quantity: 2,
      cutting_length: 'L - 167',
      description: 'Glazing bead - length direction',
    },
    {
      profile_number: 'RC 6166',
      quantity: 2,
      cutting_length: 'H - 205',
      description: 'Glazing bead - height direction',
    },
  ],
  glass_cutting: {
    type: 'Double Glass 24mm',
    quantity: 1,
    dimensions: {
      length: 'L - 167',
      height: 'H - 167',
    },
    notes: 'Final glass size after deductions',
  },
  weight_calculation: {
    length_weight: 'L (m) × 6.67 kg',
    height_weight: 'H1 (m) × 6.64 kg',
    total_weight_formula: 'TOTAL = (L × 6.67) + (H1 × 6.64) kg',
  },
  accessories_list: [
    {
      accessory_number: '0253',
      quantity: 2,
      description: 'Hinges',
    },
    {
      accessory_number: '1130',
      quantity: 4,
      description: 'Corner Joint – pressure plate',
    },
    {
      accessory_number: '1110',
      quantity: 4,
      description: 'Corner Joint – cleat',
    },
    {
      accessory_number: '0707',
      quantity: 1,
      description: 'Common Handle',
    },
    {
      accessory_number: 'KIT 10451',
      quantity: 1,
      description: 'Locking Kit',
    },
    {
      accessory_number: 'GT 0122',
      quantity: '21.4H',
      description: 'Glass Gasket',
    },
    {
      accessory_number: 'GT 0118',
      quantity: '21.4H',
      description: 'Glass Gasket',
    },
    {
      accessory_number: 'GT 0137',
      quantity: '21.4H',
      description: 'Central Gasket',
    },
    {
      accessory_number: 'GT 0146',
      quantity: '21.4H',
      description: 'Sash Striker Gasket',
    },
    {
      accessory_number: 'GT 0152',
      quantity: '21.4H',
      description: 'Frame Gasket',
    },
  ],
  notes: {
    dimensions_unit: 'mm',
    variables: {
      L: 'Overall length of window opening',
      H: 'Overall height of window opening',
      H1: 'Alternative height measurement',
    },
    gasket_quantities: '21.4H indicates gasket length requirement relative to height H',
  },
  // Full 45° miter configuration used by ROCK 60 2D cutting list & optimization helpers
  rock60_45_degree_config: {
    window_system: 'ROCK 60',
    cut_angle: '45°',
    frame_profiles: {
      main_frame: {
        profile_code: 'RC 6111-8',
        new_code: '1 061 1138',
        weight_kg_m: 1.315,
        cuts: [
          {
            purpose: 'horizontal_frame',
            quantity: 2,
            calculation: 'L + 60',
            cut_angle: '45° left',
            notes: 'Add 60mm for miter joints',
          },
          {
            purpose: 'vertical_frame',
            quantity: 2,
            calculation: 'H + 60',
            cut_angle: '45° left',
            notes: 'Add 60mm for miter joints',
          },
        ],
      },
    },
    sash_profiles: {
      main_sash: {
        profile_code: 'RC 6122',
        new_code: '1 061 1300',
        weight_kg_m: 1.342,
        cuts: [
          {
            purpose: 'horizontal_sash',
            quantity: 2,
            calculation: 'L - 44',
            cut_angle: '45° right',
            notes: 'Deduct 44mm for frame clearance',
          },
          {
            purpose: 'vertical_sash',
            quantity: 2,
            calculation: 'H - 44',
            cut_angle: '45° right',
            notes: 'Deduct 44mm for frame clearance',
          },
        ],
      },
    },
    glazing_beads: {
      bead_profile: {
        profile_code: 'RC 6166',
        new_code: '1 061 6180',
        weight_kg_m: 0.324,
        cuts: [
          {
            purpose: 'horizontal_bead',
            quantity: 2,
            calculation: 'L - 167',
            cut_angle: '45°',
            notes: 'Miter cut both ends',
          },
          {
            purpose: 'vertical_bead',
            quantity: 2,
            calculation: 'H - 205',
            cut_angle: '45°',
            notes: 'Miter cut both ends',
          },
        ],
      },
    },
    glass: {
      type: 'Double Glass 24mm',
      dimensions: {
        width: 'L - 167',
        height: 'H - 167',
      },
      quantity: 1,
    },
    hardware_45_degree_setup: {
      hinges: {
        code: '0253',
        quantity: 2,
        position: '45° miter joints',
        installation: 'Mount on 45° cut faces',
      },
      corner_connectors: {
        pressure_plates: {
          code: '1130',
          quantity: 4,
          purpose: '45° corner reinforcement',
        },
        cleats: {
          code: '1110',
          quantity: 4,
          purpose: '45° corner locking',
        },
      },
      handle: {
        code: '0707',
        quantity: 1,
        type: 'Common Handle',
      },
      locking_system: {
        code: 'KIT 10451',
        quantity: 1,
      },
    },
    gaskets_45_degree: {
      glass_gaskets: [
        {
          code: 'GT 0122',
          quantity: '21.4H',
          purpose: '45° corner glass sealing',
        },
        {
          code: 'GT 0118',
          quantity: '21.4H',
          purpose: '45° corner glass sealing',
        },
      ],
      central_gasket: {
        code: 'GT 0137',
        quantity: '21.4H',
        purpose: 'Meeting stile 45° seal',
      },
      striker_gasket: {
        code: 'GT 0146',
        quantity: '21.4H',
        purpose: '45° sash striker seal',
      },
      frame_gasket: {
        code: 'GT 0152',
        quantity: '21.4H',
        purpose: '45° frame perimeter seal',
      },
    },
    weight_calculation: {
      frame_weight: 'L (m) × 6.67 kg',
      sash_weight: 'H1 (m) × 6.64 kg',
      total_formula: '(L × 6.67) + (H1 × 6.64) kg',
    },
    cutting_instructions: {
      frame_cuts: 'Cut all frame profiles at 45° - add 60mm for miter overlap',
      sash_cuts: 'Cut all sash profiles at 45° - deduct 44mm for frame fit',
      bead_cuts: 'Cut glazing beads at 45° for clean corner joints',
      tool_setup: 'Use 45° saw blade setting for all aluminum cuts',
      details: {
        frame_profiles: {
          rc_6111_8: {
            horizontal: '2 × (L + 60mm) – both ends 45°',
            vertical: '2 × (H + 60mm) – both ends 45°',
          },
        },
        sash_profiles: {
          rc_6122: {
            horizontal: '2 × (L - 44mm) – both ends 45°',
            vertical: '2 × (H - 44mm) – both ends 45°',
          },
        },
        glazing_beads: {
          rc_6166: {
            horizontal: '2 × (L - 167mm) – both ends 45°',
            vertical: '2 × (H - 205mm) – both ends 45°',
          },
        },
      },
    },
  },
};

export const ROCK60_SYSTEM_PACK: SystemPack = {
  meta: {
    id: 'rock60',
    name: 'ROCK 60',
    brands: ['ROCK 60'],
    regions: ['egypt', 'mena', 'global'],
    defaultStockLengthMm: 6000,
  },
  windowSystemSpec: ROCK60_WINDOW_SYSTEM_TEMPLATE,
  smartDrawPreset: {
    defaultMullionSpacingMm: 800,
    maxSpanWithoutIntermediateMm: 1600,
    minPanelWidthMm: 600,
    maxPanelWidthMm: 1200,
    typicalPanelWidthsMm: [600, 800, 1000, 1200],
    recommendedMullionCounts: [2, 3, 4],
    spacingStrategy: 'equal',
  },
  glassAllowances: {
    edgeClearanceMm: 3, // 3mm per side inside pocket
    minBiteMm: 12,
    allowRotation90: false,
    maxWidthMm: 1500,
    maxHeightMm: 2400,
    maxAreaM2: 4.5,
  },
};

// ----------------------------------------------------------------------------
// ELSHERIF JUMBO 100 System Pack (Catalog extract)
// ----------------------------------------------------------------------------

export const JUMBO100_WINDOW_SYSTEM_SPEC: Record<string, any> = {
  window_system: 'JUMBO100',
  // Recommended structural limits for JUMBO100 PS sliding systems (large openings)
  constraints: {
    minWidthMm: 1000,
    maxWidthMm: 4500,
    minHeightMm: 1000,
    maxHeightMm: 3200,
    maxAreaM2: 9,
  },
  catalog_metadata: {
    catalog_name: 'JUMBO100',
    company: 'ELSHERIF ALUMINUM & ACCESSORIES TRADING',
    total_pages: 23,
    extraction_date: '2024-12-19',
  },
  aluminum_profiles: [
    {
      profile_number: '2 100 1020',
      old_profile_number: 'J 1027',
      weight_kg_per_ml: 1.504,
      dimensions_mm: {
        A: 74.0,
        B: 32.0,
        C: 35.27,
        D: 15.0,
        E: 23.09,
        F: 53.0,
        X: 70.0,
        Y: true,
      },
      page: 56,
    },
    {
      profile_number: '2 100 1120',
      old_profile_number: 'J 1027',
      weight_kg_per_ml: 1.768,
      dimensions_mm: {
        A: 90.0,
        B: 32.0,
        C: 41.12,
        D: 16.0,
        E: 27.8,
        F: 51.0,
        X: 70.0,
        Y: true,
      },
      page: 56,
    },
    {
      profile_number: '2 100 1130',
      old_profile_number: 'J 1013',
      weight_kg_per_ml: 1.667,
      dimensions_mm: {
        A: 90.0,
        B: 32.0,
        D: 16.0,
        E: 36.91,
        F: 30.89,
        X: true,
        Y: true,
      },
      page: 57,
    },
    {
      profile_number: '2 100 1150',
      old_profile_number: 'J 1013',
      weight_kg_per_ml: 1.784,
      dimensions_mm: {
        A: 90.0,
        B: 32.0,
        D: 16.0,
        E: 34.56,
        X: true,
        Y: true,
      },
      page: 57,
    },
    {
      profile_number: '2 100 1320',
      old_profile_number: 'J 1028',
      weight_kg_per_ml: 1.793,
      dimensions_mm: {
        A: 90.0,
        B: 32.0,
        D: 16.0,
        E: 46.83,
        F: 27.64,
        G: 50.0,
        X: 80.0,
        Y: true,
      },
      page: 58,
    },
    {
      profile_number: '2 100 1330',
      old_profile_number: 'J 1028',
      weight_kg_per_ml: 1.861,
      dimensions_mm: {
        A: 90.0,
        B: 32.0,
        D: 16.0,
        E: 42.78,
        F: 30.65,
        G: 50.0,
        Y: true,
      },
      page: 58,
    },
    {
      profile_number: '2 100 1350',
      old_profile_number: 'J 1026',
      weight_kg_per_ml: 2.025,
      dimensions_mm: {
        A: 94.0,
        B: 32.0,
        D: 16.0,
        E: 41.0,
        F: 34.4,
        G: 107.0,
        X: true,
      },
      page: 59,
    },
    {
      profile_number: '2 100 1352',
      old_profile_number: 'J 1026.2',
      weight_kg_per_ml: 2.038,
      dimensions_mm: {
        A: 94.0,
        B: 32.0,
        D: 16.0,
        E: 38.79,
        F: 36.39,
        G: 54.0,
        H: 107.0,
        Y: true,
      },
      page: 59,
    },
    {
      profile_number: '2 100 1420',
      old_profile_number: 'J 1031',
      weight_kg_per_ml: 2.013,
      dimensions_mm: {
        A: 110.0,
        B: 32.0,
        D: 16.0,
        E: 53.99,
        F: 50.0,
        G: 28.75,
        H: 80.0,
        X: true,
        Y: true,
      },
      page: 60,
    },
    {
      profile_number: '2 100 1430',
      old_profile_number: 'J 1031',
      weight_kg_per_ml: 2.004,
      dimensions_mm: {
        A: 110.0,
        B: 32.0,
        D: 16.0,
        E: 49.73,
        F: 50.0,
        G: 28.75,
        H: 80.0,
        X: true,
        Y: true,
      },
      page: 60,
    },
    {
      profile_number: '2 100 2120',
      weight_kg_per_ml: 1.883,
      dimensions_mm: {
        A: 90.0,
        B: 32.0,
        C: 41.62,
        D: 16.0,
        E: 27.08,
        F: 51.5,
        G: 88.0,
        X: true,
      },
      page: 64,
    },
    {
      profile_number: '2 100 2130',
      weight_kg_per_ml: 1.755,
      dimensions_mm: {
        A: 90.0,
        B: 32.0,
        C: 38.46,
        D: 16.0,
        E: 28.3,
        F: 81.5,
        G: 90.0,
        Y: true,
      },
      page: 64,
    },
    {
      profile_number: '2 100 2300',
      weight_kg_per_ml: 1.646,
      dimensions_mm: {
        A: 94.0,
        B: 32.0,
        D: 16.0,
        E: 45.58,
        F: 27.82,
        G: 53.0,
        H: 84.0,
        X: true,
        Y: true,
      },
      page: 65,
    },
    {
      profile_number: '2 100 2320',
      old_profile_number: 'J 1038',
      weight_kg_per_ml: 1.772,
      dimensions_mm: {
        A: 94.0,
        B: 32.0,
        D: 16.0,
        E: 46.87,
        F: 28.86,
        G: 80.0,
        X: true,
        Y: true,
      },
      page: 65,
    },
    {
      profile_number: '2 100 2350',
      weight_kg_per_ml: 1.956,
      dimensions_mm: {
        A: 94.0,
        B: 32.0,
        D: 16.0,
        E: 41.45,
        F: 55.3,
        X: true,
        Y: true,
      },
      page: 66,
    },
    {
      profile_number: '2 100 2352',
      old_profile_number: 'J 1037.2',
      weight_kg_per_ml: 2.041,
      dimensions_mm: {
        A: 94.0,
        B: 32.0,
        D: 16.0,
        E: 39.02,
        X: true,
        Y: true,
      },
      page: 66,
    },
    {
      profile_number: '2 100 2420',
      old_profile_number: 'J 1032',
      weight_kg_per_ml: 2.005,
      dimensions_mm: {
        A: 110.0,
        B: 32.0,
        D: 16.0,
        E: 53.66,
        F: 26.06,
        G: 80.0,
        X: true,
        Y: true,
      },
      page: 67,
    },
    {
      profile_number: '2 100 2432',
      old_profile_number: 'J 10332',
      weight_kg_per_ml: 2.155,
      dimensions_mm: {
        A: 110.0,
        B: 32.0,
        D: 16.0,
        E: 48.13,
        F: 28.76,
        G: 81.5,
        X: true,
        Y: true,
      },
      page: 67,
    },
    {
      profile_number: '2 100 2452',
      old_profile_number: 'J 1035.2',
      weight_kg_per_ml: 2.271,
      dimensions_mm: {
        A: 110.0,
        B: 32.0,
        D: 16.0,
        E: 45.83,
        F: 34.18,
        G: 100.0,
        H: 54.0,
        X: true,
        Y: true,
      },
      page: 68,
    },
    {
      profile_number: '2 100 2453',
      old_profile_number: 'J 1035.3',
      weight_kg_per_ml: 2.241,
      dimensions_mm: {
        A: 100.0,
        B: 32.0,
        D: 16.0,
        E: 45.46,
        F: 100.0,
        G: 54.0,
        X: true,
        Y: true,
      },
      page: 68,
    },
    {
      profile_number: '2 100 2520',
      old_profile_number: 'J 1029',
      weight_kg_per_ml: 2.147,
      dimensions_mm: {
        A: 118.0,
        B: 32.0,
        D: 16.0,
        E: 59.69,
        F: 27.72,
        G: 52.0,
        H: 100.0,
        X: true,
        Y: true,
      },
      page: 69,
    },
    {
      profile_number: '2 100 2552',
      weight_kg_per_ml: 2.423,
      dimensions_mm: {
        A: 118.0,
        B: 32.0,
        D: 16.0,
        E: 61.3,
        F: 51.0,
      },
      page: 69,
    },
  ],
  small_profiles: [
    {
      profile_number: '2 100 6120',
      old_profile_number: 'J 1061',
      weight_kg_per_ml: 0.205,
      dimensions_mm: {
        A: 15.0,
        B: 14.0,
        C: 16.0,
      },
      page: 95,
    },
    {
      profile_number: '2 100 6180',
      old_profile_number: 'J 1062',
      weight_kg_per_ml: 0.149,
      dimensions_mm: {
        A: 3.0,
        B: 14.0,
        C: 16.0,
      },
      page: 95,
    },
    {
      profile_number: '2 100 9510',
      old_profile_number: 'J 1091',
      weight_kg_per_ml: 0.654,
      dimensions_mm: {
        A: 4.0,
        B: 52.0,
        C: 11.0,
      },
      page: 95,
    },
    {
      profile_number: '2 100 9210',
      old_profile_number: 'J 1050',
      weight_kg_per_ml: 0.572,
      dimensions_mm: {
        A: 5.0,
        B: 8.0,
        C: 10.0,
      },
      page: 95,
    },
    {
      profile_number: '2 100 9560',
      old_profile_number: 'J 1052',
      weight_kg_per_ml: 0.584,
      dimensions_mm: {
        A: 12.0,
      },
      page: 95,
    },
    {
      profile_number: '2 100 9910',
      old_profile_number: 'J 1095',
      weight_kg_per_ml: 0.14,
      dimensions_mm: {
        A: 17.0,
      },
      page: 95,
    },
    {
      profile_number: '2 100 9560',
      old_profile_number: 'J 1090',
      weight_kg_per_ml: 1.332,
      dimensions_mm: {
        A: 95.0,
        B: 11.0,
      },
      page: 95,
    },
  ],
  cutting_configurations: [
    {
      configuration_name: 'SEC B-B',
      page: 94,
      profiles_cutting_list: [
        { profile_number: 'J 1008', quantity: 2, cutting_length: 'L' },
        { profile_number: 'J 1008', quantity: 2, cutting_length: 'H' },
        { profile_number: 'J 1040', quantity: 4, cutting_length: 'L - 7' },
        { profile_number: 'J 1050', quantity: 4, cutting_length: 'H - 84' },
        { profile_number: 'J 1061', quantity: 2, cutting_length: 'H - 64' },
        { profile_number: 'SH 8081', quantity: 2, cutting_length: 'L - 98' },
        { profile_number: 'K 2210', quantity: 2, cutting_length: 'H' },
        { profile_number: 'K 2227', quantity: 2, cutting_length: 'L - 26' },
        { profile_number: 'K 2237', quantity: 2, cutting_length: 'H - 25' },
        { profile_number: 'K 2247', quantity: 2, cutting_length: 'L - 44' },
        { profile_number: 'K 2257', quantity: 2, cutting_length: 'H - 60' },
        { material: 'SINGLE GLASS 6mm', quantity: 2, cutting_length: 'L - 175' },
        { material: 'SINGLE GLASS 6mm', quantity: 2, cutting_length: 'H - 250' },
      ],
      accessories_list: [
        { accessory_number: '0209', quantity: 12, description: 'Corner Joint' },
        { accessory_number: '0309', quantity: 21.421, description: 'Clip' },
        { accessory_number: '0270', quantity: 16, description: 'Alignment Angle' },
        { accessory_number: '0272', quantity: 4, description: 'Alignment Angle' },
        { accessory_number: '0274', quantity: 4, description: 'Alignment Angle' },
        { accessory_number: '3004', quantity: 2, description: 'Striker' },
        { accessory_number: '3040', quantity: 2, description: 'Shut Latch Handle' },
        { accessory_number: '3050', quantity: 1, description: 'Shut Handle' },
        { accessory_number: '3065', quantity: 1, description: 'Single Roller Set' },
        { accessory_number: '3031', quantity: 4, description: 'Shock Absorber' },
        { accessory_number: '3305', quantity: 2, description: 'Anti-Dust Caps' },
        { accessory_number: '3465', quantity: 4, description: 'Cover Caps' },
        { accessory_number: '3486', quantity: 2, description: 'Security Guard' },
        { accessory_number: '3497', quantity: 4, description: 'Alignment Guide' },
        { accessory_number: '3510', quantity: 2, description: 'Drainage Cover' },
        { accessory_number: '3601', quantity: 4, description: 'Screen Corner & Fuel' },
        { accessory_number: 'GT 0111', quantity: 21.411, description: 'Glass Gasket' },
        { accessory_number: 'GT 0124', quantity: 21.411, description: 'Glass Gasket' },
        { accessory_number: 'GT 0142', quantity: 21.411, description: 'Striker Gasket' },
        { accessory_number: 'GT 0161', quantity: 1.431, description: 'Screen Flower Gasket' },
        { accessory_number: 'WG 5710', quantity: 21.411, description: 'Weather Slip' },
        { accessory_number: 'WG 5710 F1', quantity: 41.441, description: 'Weather Slip' },
      ],
      weight_calculation: {
        formula: 'L (m.) X 8.19 Kg + H (m.) X 12.85 Kg',
        total: 'TOTAL = Kg',
      },
    },
    {
      configuration_name: 'SEC A-A',
      page: 97,
      profiles_cutting_list: [
        { profile_number: 'J 1039', quantity: 2, cutting_length: 'L' },
        { profile_number: 'J 1039', quantity: 2, cutting_length: 'H' },
        { profile_number: 'J 1040', quantity: 6, cutting_length: '3' },
        { profile_number: 'J 1040', quantity: 6, cutting_length: 'H - 84' },
        { profile_number: 'J 1050', quantity: 4, cutting_length: 'H - 54' },
        { profile_number: 'SH 8081', quantity: 2, cutting_length: 'L' },
        { profile_number: 'SH 8081', quantity: 2, cutting_length: 'H' },
        { material: 'SINGLE GLASS 6mm', quantity: 3, cutting_length: 'L - 392' },
        { material: 'SINGLE GLASS 6mm', quantity: 3, cutting_length: 'H - 228' },
      ],
      accessories_list: [
        { accessory_number: 'GT 0111', quantity: 21.4, description: 'Glass Gasket' },
        { accessory_number: 'GT 0124', quantity: 21.4, description: 'Glass Gasket' },
        { accessory_number: 'GT 0142', quantity: 4, description: 'Shifter Gasket' },
        { accessory_number: 'WS 0710 F', quantity: 41.12, description: 'Weather Strip' },
        { accessory_number: '0320', quantity: 20, description: 'Corner Joint' },
        { accessory_number: '0593', quantity: 21.5, description: 'Clip' },
        { accessory_number: '0570', quantity: 24, description: 'Alignment Angle' },
        { accessory_number: '0672', quantity: 12, description: 'Alignment Angle' },
        { accessory_number: '0574', quantity: 4, description: 'Alignment Angle' },
        { accessory_number: '3004', quantity: 2, description: 'Shifter' },
        { accessory_number: '3040', quantity: 2, description: 'Shot Latent Handle' },
        { accessory_number: '3020', quantity: 1, description: 'Shot Handle' },
        { accessory_number: '3355', quantity: 2, description: 'Single Roller Set' },
        { accessory_number: '3331', quantity: 4, description: 'Shock Absorber' },
        { accessory_number: '3365', quantity: 4, description: 'Anti-Coat Caps' },
        { accessory_number: '3465', quantity: 8, description: 'Cover Caps' },
        { accessory_number: '3486', quantity: 2, description: 'Security Guard' },
        { accessory_number: '3497', quantity: 6, description: 'Alignment Guide' },
        { accessory_number: '3510', quantity: 2, description: 'Drainage Cover' },
      ],
      weight_calculation: {
        formula: 'L (m.) X 8.15 Kg + H (m.) X 15.51 Kg',
        total: 'TOTAL = Kg',
      },
    },
  ],
  summary: {
    total_profiles_extracted: 29,
    total_cutting_configurations: 2,
    total_accessories: 43,
    weight_units: 'kg_per_meter',
    dimension_units: 'mm',
  },
};

export const JUMBO100_SYSTEM_PACK: SystemPack = {
  meta: {
    id: 'jumbo100',
    name: 'JUMBO 100 Sliding',
    brands: ['ELSHERIF', 'JUMBO100'],
    regions: ['egypt', 'mena', 'gulf'],
    defaultStockLengthMm: 6000,
  },
  windowSystemSpec: JUMBO100_WINDOW_SYSTEM_SPEC,
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
    maxWidthMm: 2200,
    maxHeightMm: 2800,
    maxAreaM2: 6.5,
  },
};

export const SYSTEM_PACKS: SystemPack[] = [
  ROCK60_SYSTEM_PACK,
  JUMBO100_SYSTEM_PACK,
  ANADOLU_W60_PACK,
  CALUMINIUM_PS_PACK,
  // Coming Soon – Turkish & Egyptian branded packs
  // KALE_KAS_70_PACK,
  // ASAS_CW_120_PACK,
  // Winsa_PACK,
  // ALUMIL_EGYPT_NC_PACK,
  // ALSALAM_PS_PACK,
];



import type { SystemPack } from '@/data/systemPacks';

/**
 * KALE 70mm Sliding System – Turkish market system pack
 * -----------------------------------------------------
 * KALE Kilit is renowned for its locking systems and also produces high-quality
 * aluminum door and window systems. The "Kale 70" refers to a 70mm deep profile series.
 * 
 * Key Features:
 * - Sash weight capacity: up to 130kg
 * - Advanced locking mechanisms integration
 * - Horizontal and vertical hinge adjustments
 * - Gasket pressure adjustments on stay arms
 */
export const KALE_70_SLIDING_PACK: SystemPack = {
  meta: {
    id: 'kale-70-sliding',
    name: 'KALE 70mm Sliding System',
    brands: ['KALE', 'Kale Kilit'],
    regions: ['turkey', 'mena', 'gulf'],
    defaultStockLengthMm: 6000,
  },
  windowSystemSpec: {
    window_system: 'KALE 70mm Sliding',
    constraints: {
      minWidthMm: 800,
      maxWidthMm: 3000,
      minHeightMm: 800,
      maxHeightMm: 2400,
      maxAreaM2: 6.5,
    },
    catalog_metadata: {
      supplier: 'KALE Kilit',
      system_code: 'KALE 70',
      extraction_date: new Date().toISOString().slice(0, 10),
    },
    technical_specifications: {
      profile_depth_mm: 70,
      sash_weight_capacity_kg: 130,
      hardware_integration: {
        type: 'proprietary_kale',
        locking_mechanism: 'advanced_multi_point',
        hinge_type: 'adjustable_multi_axis',
      },
      adjustments: {
        horizontal_hinge_adjustment: true,
        vertical_hinge_adjustment: true,
        gasket_pressure_adjustment: true,
        stay_arm_adjustment: true,
      },
    },
    aluminum_profiles: [
      {
        profile_number: 'KALE-70-FRAME',
        role: 'frame',
        width: 70,
        height: 32,
        thickness: 1.8,
        weight_per_meter: 1.2,
        cutting_allowance: 3.0,
        machiningMacros: [
          {
            id: 'kale_70_hinge_slot',
            name: 'KALE Hinge Slot Type A',
            operation: 'slot',
            dimensions: { width: 22, height: 5, depth: 3 },
            position: { x: 15, y: 8 },
            toolSpecs: { diameter: 5, type: 'end_mill' },
            gCodeTemplate: `
G65 P9010 A22 B5 C3 X15 Y8 T5
(INPUTS: A=WIDTH, B=HEIGHT, C=DEPTH, X=X_POS, Y=Y_POS, T=TOOL_ID)
`,
          },
        ],
        compatibleAccessories: ['kale_70_hinge', 'kale_70_roller', 'kale_70_lock'],
      },
      {
        profile_number: 'KALE-70-SASH',
        role: 'sash',
        width: 70,
        height: 28,
        thickness: 1.6,
        weight_per_meter: 1.0,
        cutting_allowance: 3.0,
        specifications: {
          max_sash_weight_kg: 130,
        },
        machiningMacros: [
          {
            id: 'kale_70_lock_pocket',
            name: 'KALE Multi-Point Lock Pocket',
            operation: 'pocket',
            dimensions: { width: 35, height: 8, depth: 4 },
            position: { x: 30, y: 12 },
            toolSpecs: { diameter: 8, type: 'end_mill' },
          },
        ],
      },
    ],
    hardware_kits: [
      {
        id: 'kale_70_hinge',
        name: 'KALE 70mm Adjustable Hinge System',
        type: 'hinge',
        specifications: {
          loadCapacity: 130,
          material: 'stainless_steel',
          installation: 'slot_mount',
          adjustments: ['horizontal', 'vertical'],
        },
        unit_price: 12.50,
        currency: 'TRY',
      },
      {
        id: 'kale_70_roller',
        name: 'KALE 70mm Roller System',
        type: 'roller',
        specifications: {
          loadCapacity: 150,
          material: 'nylon_bearing',
        },
        unit_price: 15.00,
        currency: 'TRY',
      },
      {
        id: 'kale_70_lock',
        name: 'KALE Advanced Multi-Point Locking System',
        type: 'lock',
        specifications: {
          type: 'multi_point',
          material: 'stainless_steel',
          security_grade: 'high',
        },
        unit_price: 35.00,
        currency: 'TRY',
      },
    ],
    glass_rules: {
      default: {
        edgeClearanceMm: 3,
        minBiteMm: 12,
        allowRotation90: false,
      },
    },
    cutting_rules: {
      frame_length: 'L + 60',
      sash_length: 'L + 50',
      miter_angle: 45,
      kerf_width: 3.0,
    },
  },
  smartDrawPreset: {
    defaultMullionSpacingMm: 900,
    maxSpanWithoutIntermediateMm: 1800,
    minPanelWidthMm: 700,
    maxPanelWidthMm: 1400,
    typicalPanelWidthsMm: [800, 900, 1000, 1200],
    recommendedMullionCounts: [2, 3, 4],
    spacingStrategy: 'equal',
  },
  glassAllowances: {
    edgeClearanceMm: 3,
    minBiteMm: 12,
    allowRotation90: false,
    maxWidthMm: 1800,
    maxHeightMm: 2400,
    maxAreaM2: 4.5,
  },
};

/**
 * KALE Commercial Window System
 */
export const KALE_COMMERCIAL_PACK: SystemPack = {
  meta: {
    id: 'kale-commercial',
    name: 'KALE Commercial Window System',
    brands: ['KALE'],
    regions: ['turkey', 'mena'],
    defaultStockLengthMm: 6000,
  },
  windowSystemSpec: {
    window_system: 'KALE Commercial',
    constraints: {
      minWidthMm: 1000,
      maxWidthMm: 4000,
      minHeightMm: 1000,
      maxHeightMm: 3000,
      maxAreaM2: 10,
    },
    catalog_metadata: {
      supplier: 'KALE',
      system_code: 'KALE Commercial',
      extraction_date: new Date().toISOString().slice(0, 10),
    },
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
    recommendedMullionCounts: [2, 3, 4, 5],
    spacingStrategy: 'center-heavy',
  },
  glassAllowances: {
    edgeClearanceMm: 4,
    minBiteMm: 15,
    allowRotation90: true,
    maxWidthMm: 2400,
    maxHeightMm: 3000,
    maxAreaM2: 7.5,
  },
};


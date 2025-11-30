import type { SystemPack } from '@/data/systemPacks';

/**
 * ASAS CW100 Curtain Wall System – Turkish commercial façade system
 * -----------------------------------------------------------------
 * ASAS is a major Turkish manufacturer specializing in curtain wall
 * and commercial façade systems. This pack covers the CW100 series.
 */
export const ASAS_CW100_PACK: SystemPack = {
  meta: {
    id: 'asas-cw100',
    name: 'ASAS CW100 Curtain Wall',
    brands: ['ASAS'],
    regions: ['turkey', 'mena', 'gulf'],
    defaultStockLengthMm: 6000,
  },
  windowSystemSpec: {
    window_system: 'ASAS CW100',
    constraints: {
      minWidthMm: 1200,
      maxWidthMm: 6000,
      minHeightMm: 1200,
      maxHeightMm: 6000,
      maxAreaM2: 30,
    },
    catalog_metadata: {
      supplier: 'ASAS',
      system_code: 'CW100',
      extraction_date: new Date().toISOString().slice(0, 10),
    },
    aluminum_profiles: [
      {
        profile_number: 'ASAS-CW100-MULLION',
        role: 'mullion',
        width: 100,
        height: 60,
        thickness: 3.0,
        weight_per_meter: 2.8,
        cutting_allowance: 3.0,
        specifications: {
          structuralGrade: 'commercial',
          maxHeight: 6000,
          windLoad: 2400,
        },
        machiningMacros: [
          {
            id: 'asas_cw100_anchor_slot',
            name: 'ASAS Anchor Slot',
            operation: 'slot',
            dimensions: { width: 30, height: 8, depth: 5 },
            position: { x: 20, y: 10 },
            toolSpecs: { diameter: 8, type: 'end_mill' },
          },
        ],
      },
      {
        profile_number: 'ASAS-CW100-TRANSOM',
        role: 'transom',
        width: 100,
        height: 50,
        thickness: 2.5,
        weight_per_meter: 2.2,
        cutting_allowance: 3.0,
      },
    ],
    hardware_kits: [
      {
        id: 'asas_cw100_anchor',
        name: 'ASAS CW100 Structural Anchor',
        type: 'anchor',
        specifications: {
          loadCapacity: 5000,
          material: 'stainless_steel',
          installation: 'structural',
        },
        unit_price: 45.00,
        currency: 'TRY',
      },
    ],
    glass_rules: {
      default: {
        edgeClearanceMm: 5,
        minBiteMm: 20,
        allowRotation90: true,
      },
    },
    cutting_rules: {
      mullion_length: 'L + 100',
      transom_length: 'L + 80',
      miter_angle: 90,
      kerf_width: 3.0,
    },
  },
  smartDrawPreset: {
    defaultMullionSpacingMm: 1500,
    maxSpanWithoutIntermediateMm: 3000,
    minPanelWidthMm: 1200,
    maxPanelWidthMm: 2400,
    typicalPanelWidthsMm: [1500, 1800, 2100, 2400],
    recommendedMullionCounts: [3, 4, 5, 6],
    spacingStrategy: 'equal',
  },
  glassAllowances: {
    edgeClearanceMm: 5,
    minBiteMm: 20,
    allowRotation90: true,
    maxWidthMm: 3000,
    maxHeightMm: 4000,
    maxAreaM2: 12,
  },
};

/**
 * ASAS Rescara RWT75 Window System
 * High-performance insulated window system
 */
export const ASAS_RESCARA_RWT75_PACK: SystemPack = {
  meta: {
    id: 'asas-rescara-rwt75',
    name: 'ASAS Rescara RWT75 Window System',
    brands: ['ASAS', 'Rescara'],
    regions: ['turkey', 'mena', 'gulf'],
    defaultStockLengthMm: 6000,
  },
  windowSystemSpec: {
    window_system: 'ASAS Rescara RWT75',
    constraints: {
      minWidthMm: 800,
      maxWidthMm: 3500,
      minHeightMm: 800,
      maxHeightMm: 3000,
      maxAreaM2: 8,
    },
    catalog_metadata: {
      supplier: 'ASAS',
      system_code: 'Rescara RWT75',
      extraction_date: new Date().toISOString().slice(0, 10),
    },
    technical_specifications: {
      frame_depth_mm: 75,
      sash_depth_mm: {
        min: 65,
        max: 85,
      },
      profile_thickness_mm: {
        frame: 1.4,
        sash: 2.0,
      },
      max_glazing_thickness_mm: {
        standard: 48,
        enhanced: 58,
      },
      thermal_insulation: {
        uf_value_w_m2k: 1.752,
        thermal_break: true,
      },
    },
    aluminum_profiles: [
      {
        profile_number: 'ASAS-RWT75-FRAME',
        role: 'frame',
        width: 75,
        height: 65,
        thickness: 1.4,
        weight_per_meter: 1.8,
        cutting_allowance: 3.0,
        machiningMacros: [
          {
            id: 'asas_rwt75_hinge_slot',
            name: 'ASAS RWT75 Hinge Slot',
            operation: 'slot',
            dimensions: { width: 24, height: 6, depth: 4 },
            position: { x: 18, y: 10 },
            toolSpecs: { diameter: 6, type: 'end_mill' },
          },
        ],
      },
      {
        profile_number: 'ASAS-RWT75-SASH',
        role: 'sash',
        width: 75,
        height: 85,
        thickness: 2.0,
        weight_per_meter: 2.2,
        cutting_allowance: 3.0,
      },
    ],
    hardware_kits: [
      {
        id: 'asas_rwt75_hinge',
        name: 'ASAS RWT75 Hinge System',
        type: 'hinge',
        specifications: {
          loadCapacity: 120,
          material: 'stainless_steel',
          adjustment: 'multi_axis',
        },
        unit_price: 25.00,
        currency: 'TRY',
      },
    ],
    glass_rules: {
      default: {
        edgeClearanceMm: 5,
        minBiteMm: 18,
        allowRotation90: true,
        maxGlazingThicknessMm: 58,
      },
    },
    cutting_rules: {
      frame_length: 'L + 70',
      sash_length: 'L + 60',
      miter_angle: 45,
      kerf_width: 3.0,
    },
  },
  smartDrawPreset: {
    defaultMullionSpacingMm: 1100,
    maxSpanWithoutIntermediateMm: 2200,
    minPanelWidthMm: 900,
    maxPanelWidthMm: 1700,
    typicalPanelWidthsMm: [1000, 1100, 1300, 1500],
    recommendedMullionCounts: [2, 3, 4],
    spacingStrategy: 'center-heavy',
  },
  glassAllowances: {
    edgeClearanceMm: 5,
    minBiteMm: 18,
    allowRotation90: true,
    maxWidthMm: 2200,
    maxHeightMm: 3000,
    maxAreaM2: 6.5,
    maxGlazingThicknessMm: 58,
  },
};

/**
 * ASAS Rescara R50 Facade System
 * Commercial facade system for large buildings
 */
export const ASAS_RESCARA_R50_PACK: SystemPack = {
  meta: {
    id: 'asas-rescara-r50',
    name: 'ASAS Rescara R50 Facade System',
    brands: ['ASAS', 'Rescara'],
    regions: ['turkey', 'mena', 'gulf'],
    defaultStockLengthMm: 6000,
  },
  windowSystemSpec: {
    window_system: 'ASAS Rescara R50 Facade',
    constraints: {
      minWidthMm: 1200,
      maxWidthMm: 6000,
      minHeightMm: 1200,
      maxHeightMm: 6000,
      maxAreaM2: 30,
    },
    catalog_metadata: {
      supplier: 'ASAS',
      system_code: 'Rescara R50',
      extraction_date: new Date().toISOString().slice(0, 10),
    },
    technical_specifications: {
      profile_width_mm: 50,
      mullion_depths_mm: [80, 100, 120, 150, 180, 200],
      profile_thickness_mm: [1.6, 1.8, 2.0, 2.2, 2.5, 3.0],
      max_glazing_thickness_mm: 52,
      thermal_insulation: {
        uf_value_w_m2k: 2.76,
        thermal_break: true,
      },
    },
    aluminum_profiles: [
      {
        profile_number: 'ASAS-R50-MULLION',
        role: 'mullion',
        width: 50,
        height: 100,
        thickness: 2.5,
        weight_per_meter: 2.5,
        cutting_allowance: 3.0,
        specifications: {
          structural_grade: 'facade',
          available_depths_mm: [80, 100, 120, 150, 180, 200],
        },
      },
    ],
    hardware_kits: [],
    glass_rules: {
      default: {
        edgeClearanceMm: 5,
        minBiteMm: 20,
        allowRotation90: true,
        maxGlazingThicknessMm: 52,
      },
    },
    cutting_rules: {
      mullion_length: 'L + 100',
      miter_angle: 90,
      kerf_width: 3.0,
    },
  },
  smartDrawPreset: {
    defaultMullionSpacingMm: 1500,
    maxSpanWithoutIntermediateMm: 3000,
    minPanelWidthMm: 1200,
    maxPanelWidthMm: 2400,
    typicalPanelWidthsMm: [1500, 1800, 2100, 2400],
    recommendedMullionCounts: [3, 4, 5, 6],
    spacingStrategy: 'equal',
  },
  glassAllowances: {
    edgeClearanceMm: 5,
    minBiteMm: 20,
    allowRotation90: true,
    maxWidthMm: 3000,
    maxHeightMm: 4000,
    maxAreaM2: 12,
    maxGlazingThicknessMm: 52,
  },
};

/**
 * ASAS REFD77 Folding Door System
 * High-performance insulated folding door for large spans
 */
export const ASAS_REFD77_PACK: SystemPack = {
  meta: {
    id: 'asas-refd77',
    name: 'ASAS REFD77 Folding Door System',
    brands: ['ASAS'],
    regions: ['turkey', 'mena', 'gulf'],
    defaultStockLengthMm: 6000,
  },
  windowSystemSpec: {
    window_system: 'ASAS REFD77 Folding Door',
    constraints: {
      minWidthMm: 2000,
      maxWidthMm: 8000,
      minHeightMm: 2000,
      maxHeightMm: 3500,
      maxAreaM2: 20,
    },
    catalog_metadata: {
      supplier: 'ASAS',
      system_code: 'REFD77',
      extraction_date: new Date().toISOString().slice(0, 10),
    },
    technical_specifications: {
      frame_depth_mm: 77,
      vent_depth_mm: 77,
      vent_width_mm: 65,
      max_glazing_thickness_mm: {
        min: 24,
        max: 50,
      },
      thermal_insulation_bar_mm: {
        frame: 24,
        vent: 31,
      },
      max_vent_height_mm: 3500,
      max_vent_weight_kg: 120,
      max_number_of_vents: 7,
    },
    aluminum_profiles: [
      {
        profile_number: 'ASAS-REFD77-FRAME',
        role: 'frame',
        width: 77,
        height: 65,
        thickness: 2.0,
        weight_per_meter: 2.1,
        cutting_allowance: 3.0,
        machiningMacros: [
          {
            id: 'asas_refd77_hinge_pocket',
            name: 'ASAS REFD77 Hinge Pocket',
            operation: 'pocket',
            dimensions: { width: 30, height: 8, depth: 6 },
            position: { x: 25, y: 12 },
            toolSpecs: { diameter: 8, type: 'end_mill' },
          },
          {
            id: 'asas_refd77_lock_pocket',
            name: 'ASAS REFD77 Multi-Point Lock Pocket',
            operation: 'pocket',
            dimensions: { width: 40, height: 10, depth: 5 },
            position: { x: 35, y: 15 },
            toolSpecs: { diameter: 10, type: 'end_mill' },
          },
        ],
      },
    ],
    hardware_kits: [
      {
        id: 'asas_refd77_folding_hinge',
        name: 'ASAS REFD77 Folding Hinge System',
        type: 'hinge',
        specifications: {
          loadCapacity: 120,
          material: 'stainless_steel',
          mechanism: 'folding',
        },
        unit_price: 45.00,
        currency: 'TRY',
      },
    ],
    glass_rules: {
      default: {
        edgeClearanceMm: 5,
        minBiteMm: 20,
        allowRotation90: true,
        maxGlazingThicknessMm: 50,
      },
    },
    cutting_rules: {
      frame_length: 'L + 80',
      vent_length: 'L + 70',
      miter_angle: 45,
      kerf_width: 3.0,
    },
  },
  smartDrawPreset: {
    defaultMullionSpacingMm: 1200,
    maxSpanWithoutIntermediateMm: 2400,
    minPanelWidthMm: 1000,
    maxPanelWidthMm: 2000,
    typicalPanelWidthsMm: [1200, 1500, 1800, 2000],
    recommendedMullionCounts: [3, 4, 5],
    spacingStrategy: 'equal',
  },
  glassAllowances: {
    edgeClearanceMm: 5,
    minBiteMm: 20,
    allowRotation90: true,
    maxWidthMm: 3000,
    maxHeightMm: 3500,
    maxAreaM2: 10,
    maxGlazingThicknessMm: 50,
  },
};

/**
 * ASAS Commercial Window System
 */
export const ASAS_COMMERCIAL_PACK: SystemPack = {
  meta: {
    id: 'asas-commercial',
    name: 'ASAS Commercial Window System',
    brands: ['ASAS'],
    regions: ['turkey', 'mena'],
    defaultStockLengthMm: 6000,
  },
  windowSystemSpec: {
    window_system: 'ASAS Commercial',
    constraints: {
      minWidthMm: 800,
      maxWidthMm: 3500,
      minHeightMm: 800,
      maxHeightMm: 2800,
      maxAreaM2: 8,
    },
    catalog_metadata: {
      supplier: 'ASAS',
      system_code: 'ASAS Commercial',
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
    defaultMullionSpacingMm: 1100,
    maxSpanWithoutIntermediateMm: 2200,
    minPanelWidthMm: 900,
    maxPanelWidthMm: 1700,
    typicalPanelWidthsMm: [1000, 1100, 1300, 1500],
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


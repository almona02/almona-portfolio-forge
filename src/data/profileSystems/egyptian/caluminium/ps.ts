import type { SystemPack } from '@/data/systemPacks';

/**
 * CALUMINIUM PS Profile Systems – Egyptian Market
 * ------------------------------------------------------------
 * The PS series is one of the most recognized profile systems in Egypt for
 * windows, doors, and curtain walls. Available in sliding and hinged configurations.
 * 
 * Systems:
 * - Sliding: PS 9900, PS 9600, PS 6600
 * - Hinged: PS 5600, PS 4800
 * - Curtain Walls: PS 100
 * 
 * Source: Caluminium technical catalogs and Egyptian market specifications
 */
export const CALUMINIUM_PS_PACK: SystemPack = {
  meta: {
    id: 'caluminium-ps',
    name: 'CALUMINIUM PS System',
    brands: ['CALUMINIUM'],
    regions: ['egypt', 'mena', 'gulf'],
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
      system_code: 'PS',
      extraction_date: new Date().toISOString().slice(0, 10),
      market: 'egypt',
    },
    // PS 6600 Sliding System
    ps_6600_sliding: {
      system_name: 'PS 6600 Sliding',
      frame_width_mm: 97.15,
      sash_width_mm: 66,
      max_glazing_thickness_mm: 20.8,
      profiles: [
        {
          profile_number: 'PS-6601',
          role: 'frame',
          weight_kg_per_m: 0.900,
          width: 97.15,
          height: 66,
          thickness: 1.8,
        },
      ],
    },
    // PS 9600 Sliding System
    ps_9600_sliding: {
      system_name: 'PS 9600 Sliding',
      frame_width_mm: 97.15,
      sash_width_mm: 115.6,
      max_glazing_thickness_mm: 14.8,
      profiles: [
        {
          profile_number: 'PS-9601',
          role: 'frame',
          weight_kg_per_m: 1.130,
          width: 97.15,
          height: 115.6,
          thickness: 2.0,
        },
      ],
    },
    // PS 5600 Hinged System
    ps_5600_hinged: {
      system_name: 'PS 5600 Hinged',
      frame_width_mm: 85.0,
      sash_width_mm: 72.0,
      max_glazing_thickness_mm: 20.75,
      profiles: [
        {
          profile_number: 'PS-5600-FRAME',
          role: 'frame',
          weight_kg_per_m: 0.815,
          width: 85.0,
          height: 72.0,
          thickness: 1.7,
        },
        {
          profile_number: 'PS-5600-SASH',
          role: 'sash',
          weight_kg_per_m: 0.750,
          width: 85.0,
          height: 68.0,
          thickness: 1.6,
        },
      ],
    },
    // PS 4800 Hinged System
    ps_4800_hinged: {
      system_name: 'PS 4800 Hinged',
      frame_width_mm: 78.5,
      sash_width_mm: 78.5,
      max_glazing_thickness_mm: 20.7,
      profiles: [
        {
          profile_number: 'PS-4800',
          role: 'frame',
          weight_kg_per_m: 0.726,
          width: 78.5,
          height: 78.5,
          thickness: 1.6,
        },
      ],
    },
    // PS 100 Curtain Wall System
    ps_100_curtain_wall: {
      system_name: 'PS 100 Curtain Wall',
      mullion_cross_section: {
        width: 54,
        height: 100,
      },
      profile_weight_kg_per_m: 2.859, // Example for PS-101 mullion
      moment_of_inertia_cm4: 252.5, // Ix value for wind load calculations
      structural_grade: 'curtain_wall',
      max_height_mm: 6000,
      wind_load_resistance_pa: 2400,
    },
    aluminum_profiles: [
      {
        profile_number: 'PS-6601',
        role: 'frame',
        system_type: 'sliding',
        weight_per_meter: 0.900,
        width: 97.15,
        height: 66,
        thickness: 1.8,
        cutting_allowance: 3.0,
        machiningMacros: [
          {
            id: 'ps_6600_drainage_slot',
            name: 'PS 6600 Drainage Slot',
            operation: 'slot',
            dimensions: { width: 8, height: 3, depth: 2 },
            position: { x: 20, y: 5 },
            toolSpecs: { diameter: 3, type: 'end_mill' },
          },
        ],
      },
      {
        profile_number: 'PS-9601',
        role: 'frame',
        system_type: 'sliding',
        weight_per_meter: 1.130,
        width: 97.15,
        height: 115.6,
        thickness: 2.0,
        cutting_allowance: 3.0,
      },
      {
        profile_number: 'PS-5600-FRAME',
        role: 'frame',
        system_type: 'hinged',
        weight_per_meter: 0.815,
        width: 85.0,
        height: 72.0,
        thickness: 1.7,
        cutting_allowance: 3.0,
        machiningMacros: [
          {
            id: 'ps_5600_hinge_slot',
            name: 'PS 5600 Hinge Slot',
            operation: 'slot',
            dimensions: { width: 22, height: 5, depth: 3 },
            position: { x: 16, y: 9 },
            toolSpecs: { diameter: 5, type: 'end_mill' },
          },
        ],
      },
      {
        profile_number: 'PS-5600-SASH',
        role: 'sash',
        system_type: 'hinged',
        weight_per_meter: 0.750,
        width: 85.0,
        height: 68.0,
        thickness: 1.6,
        cutting_allowance: 3.0,
      },
      {
        profile_number: 'PS-4800',
        role: 'frame',
        system_type: 'hinged',
        weight_per_meter: 0.726,
        width: 78.5,
        height: 78.5,
        thickness: 1.6,
        cutting_allowance: 3.0,
        machiningMacros: [
          {
            id: 'ps_4800_hinge_slot',
            name: 'PS 4800 Hinge Slot',
            operation: 'slot',
            dimensions: { width: 20, height: 5, depth: 3 },
            position: { x: 15, y: 8 },
            toolSpecs: { diameter: 5, type: 'end_mill' },
          },
        ],
      },
      {
        profile_number: 'PS-101',
        role: 'mullion',
        system_type: 'curtain_wall',
        weight_per_meter: 2.859,
        width: 54,
        height: 100,
        thickness: 3.0,
        cutting_allowance: 3.0,
        specifications: {
          moment_of_inertia_cm4: 252.5,
          structural_grade: 'curtain_wall',
        },
      },
    ],
    hardware_kits: [
      {
        id: 'ps_sliding_roller',
        name: 'PS Sliding Roller System',
        type: 'roller',
        specifications: {
          loadCapacity: 150,
          material: 'nylon_bearing',
        },
        unit_price: 15.00,
        currency: 'EGP',
      },
      {
        id: 'ps_hinge_kit',
        name: 'PS Hinged Window Hinge Kit',
        type: 'hinge',
        specifications: {
          loadCapacity: 80,
          material: 'stainless_steel',
        },
        unit_price: 12.00,
        currency: 'EGP',
      },
    ],
    glass_rules: {
      default: {
        edgeClearanceMm: 4,
        minBiteMm: 15,
        allowRotation90: true,
      },
      ps_6600: {
        edgeClearanceMm: 3,
        minBiteMm: 12,
        maxGlazingThicknessMm: 20.8,
        allowRotation90: false,
      },
      ps_9600: {
        edgeClearanceMm: 3,
        minBiteMm: 12,
        maxGlazingThicknessMm: 14.8,
        allowRotation90: false,
      },
      ps_5600: {
        edgeClearanceMm: 4,
        minBiteMm: 15,
        maxGlazingThicknessMm: 20.75,
        allowRotation90: true,
      },
      ps_4800: {
        edgeClearanceMm: 4,
        minBiteMm: 15,
        maxGlazingThicknessMm: 20.7,
        allowRotation90: true,
      },
    },
    cutting_rules: {
      frame_length: 'L + 60',
      sash_length: 'L + 50',
      miter_angle: 45,
      kerf_width: 3.0,
      corner_cut: '45° miter for all corners',
      drainage_drilling: 'Required for sliding systems',
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



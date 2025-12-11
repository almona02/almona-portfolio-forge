export type HardwareCategory =
  | 'lock'
  | 'handle'
  | 'hinge'
  | 'roller'
  | 'corner_key'
  | 'spacer'
  | 'seal';

export interface EgyptianHardware {
  id: string;
  name: string;
  category: HardwareCategory;
  subCategory?: 'espagnolette' | 'multipoint' | 'casement' | 'sliding' | 'tilt_turn' | 'mortise';
  dimensions: {
    width: number; // chamber/groove width required (mm)
    height: number; // overall height (mm)
    depth: number; // penetration/backset (mm)
    axis?: number; // KALE axis 13mm rule
    clearance?: number; // hinge clearance (mm)
  };
  maxLoadKg?: number;
  securityLevel?: 1 | 2 | 3;
  weatherResistance?: 'basic' | 'enhanced' | 'marine';
  supplier: 'KALE' | 'Kin Long' | 'Domus' | 'Alumisr' | 'Apex' | 'Local';
  supplierCode: string;
  origin: 'Turkey' | 'China' | 'Greece' | 'Egypt' | 'India' | 'Italy';
  location: 'Cairo' | 'Alexandria' | 'El Nozha' | '10th of Ramadan' | 'Sabtia' | 'Giza' | 'Other';
  leadTimeDays: number;
  costEGP?: number;
  compatibleProfileThickness?: number[];
  compatibleSystems?: string[];
  requiresMachining: boolean;
  machiningMacro?: string;
  svgIcon?: string;
}

export const EGYPTIAN_HARDWARE_DB: EgyptianHardware[] = [
  // Locks (KALE)
  {
    id: 'kale_espag_15_13axis',
    name: 'KALE Espagnolette (15mm Backset, 13mm Axis)',
    category: 'lock',
    subCategory: 'espagnolette',
    dimensions: { width: 15, height: 800, depth: 28, axis: 13 },
    supplier: 'KALE',
    supplierCode: 'K-ESP-15-13',
    origin: 'Turkey',
    location: 'Cairo',
    leadTimeDays: 3,
    costEGP: 250,
    compatibleProfileThickness: [1.2, 1.4, 1.6],
    compatibleSystems: ['rock60', 'jumbo100', 'panda-hinged'],
    requiresMachining: true,
    machiningMacro: 'espag_groove_13mm',
  },
  {
    id: 'kale_252r_safety',
    name: 'KALE 252 R Safety Mortise Lock',
    category: 'lock',
    subCategory: 'mortise',
    dimensions: { width: 18, height: 210, depth: 45, axis: 13 },
    securityLevel: 3,
    supplier: 'KALE',
    supplierCode: '252-R',
    origin: 'Turkey',
    location: 'Cairo',
    leadTimeDays: 5,
    costEGP: 850,
    compatibleProfileThickness: [1.6, 2.0],
    compatibleSystems: ['jumbo100', 'volcano'],
    requiresMachining: true,
    machiningMacro: 'mortise_lock_pocket_252r',
  },
  // Handles
  {
    id: 'domus_cremone_black',
    name: 'Domus Cremone Handle (Black)',
    category: 'handle',
    subCategory: 'casement',
    dimensions: { width: 28, height: 140, depth: 45 },
    supplier: 'Domus',
    supplierCode: 'DMS-CR-BLK',
    origin: 'Greece',
    location: 'Alexandria',
    leadTimeDays: 7,
    costEGP: 575,
    compatibleProfileThickness: [1.2, 1.4],
    compatibleSystems: ['rock60', 'panda-hinged'],
    requiresMachining: true,
    machiningMacro: 'cremone_handle_holes',
  },
  {
    id: 'kinlong_multipoint_handle',
    name: 'Kin Long Multipoint Handle',
    category: 'handle',
    subCategory: 'sliding',
    dimensions: { width: 32, height: 160, depth: 50, clearance: 12 },
    supplier: 'Kin Long',
    supplierCode: 'KL-MP-HDL',
    origin: 'China',
    location: 'El Nozha',
    leadTimeDays: 2,
    costEGP: 450,
    compatibleProfileThickness: [1.4, 1.6],
    compatibleSystems: ['jumbo100', 'ps-9600'],
    requiresMachining: true,
    machiningMacro: 'kinlong_handle_slot',
  },
  // Rollers
  {
    id: 'apex_roller_80kg',
    name: 'Apex Heavy Duty Roller (80kg)',
    category: 'roller',
    subCategory: 'sliding',
    dimensions: { width: 14, height: 25, depth: 12 },
    maxLoadKg: 80,
    supplier: 'Apex',
    supplierCode: 'AP-R-80',
    origin: 'India',
    location: 'Sabtia',
    leadTimeDays: 1,
    costEGP: 45,
    compatibleProfileThickness: [1.4, 1.6, 2.0],
    compatibleSystems: ['rock60', 'panda-sliding'],
    requiresMachining: false,
  },
  {
    id: 'local_roller_40kg',
    name: 'Local Standard Roller (40kg)',
    category: 'roller',
    subCategory: 'sliding',
    dimensions: { width: 12, height: 22, depth: 10 },
    maxLoadKg: 40,
    supplier: 'Local',
    supplierCode: 'LOC-R-40',
    origin: 'Egypt',
    location: '10th of Ramadan',
    leadTimeDays: 0,
    costEGP: 25,
    compatibleProfileThickness: [1.2, 1.4],
    compatibleSystems: ['panda-sliding'],
    requiresMachining: false,
  },
  // Corner Key
  {
    id: 'local_press_fit_key',
    name: 'Press-Fit Corner Key (Local)',
    category: 'corner_key',
    dimensions: { width: 8, height: 30, depth: 30 },
    supplier: 'Local',
    supplierCode: 'PF-CK-30',
    origin: 'Egypt',
    location: 'Cairo',
    leadTimeDays: 1,
    requiresMachining: false,
  },
];
/**
 * Egyptian Hardware Database
 * 
 * Comprehensive database of Maalem-grade accessories for Egyptian window/door systems.
 * Includes sliding/hinged accessories, Panda system components, rolling shutters,
 * Georgian bars, bending services, ACP panels, curtain wall components, and glass processing.
 * 
 * All prices in EGP (Egyptian Pounds) as of Dec 2024.
 */

export interface EgyptianHardwareItem {
  id: string;
  name: string;
  nameArabic?: string;
  category: 'sliding' | 'hinged' | 'panda' | 'shish' | 'latish' | 'duran' | 'acp' | 'curtain_wall' | 'glass_processing' | 'general';
  type: string;
  material?: string;
  specifications: {
    [key: string]: any;
  };
  quantity: string | number; // Can be "per sash", "per window", or exact number
  priceInEGP: number;
  priceInUSD?: number;
  currencyPeg?: 'EGP' | 'USD' | 'EUR';
  suppliers: string[];
  supplierLocations: string[];
  availableInEgypt: boolean;
  leadTimeDays: number;
  requiresImportClearance?: boolean;
  notes?: string;
}

export interface PandaSystemComponents {
  doubleSashAdapter: EgyptianHardwareItem;
  screenSashProfile: EgyptianHardwareItem;
  screenMesh: EgyptianHardwareItem;
  magneticCatch: EgyptianHardwareItem;
}

export interface RollingShutterComponents {
  shishBox: EgyptianHardwareItem;
  shishSlats: EgyptianHardwareItem;
  motor: EgyptianHardwareItem;
  manualMechanism: EgyptianHardwareItem;
}

export interface GeorgianBarComponents {
  latishBars: EgyptianHardwareItem;
  crossConnectors: EgyptianHardwareItem;
}

// ============================================================================
// Sliding System Accessories
// ============================================================================

export const SLIDING_ACCESSORIES: EgyptianHardwareItem[] = [
  {
    id: 'anti-lift-block',
    name: 'Anti-Lift Block',
    nameArabic: 'حارس التعليق',
    category: 'sliding',
    type: 'anti_lift',
    material: 'nylon',
    specifications: {
      height_mm: 15,
      compatibleTrack: 'V-groove',
      uvResistant: true
    },
    quantity: 2, // per sash
    priceInEGP: 6,
    suppliers: ['Caluminium', 'ASAŞ', 'Alumisr'],
    supplierLocations: ['Cairo', 'Alexandria', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 2
  },
  {
    id: 'interlock-kit',
    name: 'Interlock Kit',
    nameArabic: 'سكينة / مقفل',
    category: 'sliding',
    type: 'interlock',
    material: 'nylon_pile_aluminum_base',
    specifications: {
      sealType: 'brush_pile',
      pileDensity: 'high',
      pileHeight_mm: 10, // Minimum 8mm, but Egyptian dust requires 10mm+
      width_mm: 20
    },
    quantity: 1, // per meeting stile
    priceInEGP: 32,
    suppliers: ['Caluminium', 'ASAŞ'],
    supplierLocations: ['Cairo', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 2,
    notes: 'High-density pile mandatory for Egyptian dust'
  },
  {
    id: 'roller-standard',
    name: 'Standard Roller',
    category: 'sliding',
    type: 'roller',
    specifications: {
      maxLoad_kg: 50,
      wheelDiameter_mm: 25,
      trackType: 'V-groove'
    },
    quantity: 2, // per sash
    priceInEGP: 20,
    suppliers: ['Caluminium', 'ASAŞ', 'KALE'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 2
  },
  {
    id: 'roller-heavy-duty',
    name: 'Heavy-Duty Roller',
    category: 'sliding',
    type: 'roller',
    specifications: {
      maxLoad_kg: 80,
      wheelDiameter_mm: 30,
      trackType: 'V-groove'
    },
    quantity: 2, // per sash
    priceInEGP: 38,
    suppliers: ['Caluminium', 'ASAŞ', 'KALE'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 2
  },
  {
    id: 'bumper',
    name: 'Bumper',
    nameArabic: 'صدادات',
    category: 'sliding',
    type: 'bumper',
    material: 'EPDM_rubber',
    specifications: {
      thickness_mm: 5,
      weatherResistant: true
    },
    quantity: 2, // per sash
    priceInEGP: 3,
    suppliers: ['Local'],
    supplierLocations: ['Cairo', 'Alexandria', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 1
  }
];

// ============================================================================
// Hinged System Accessories
// ============================================================================

export const HINGED_ACCESSORIES: EgyptianHardwareItem[] = [
  {
    id: 'corner-cleat-screw',
    name: 'Corner Cleat (Screw)',
    nameArabic: 'زاوية (براغي)',
    category: 'hinged',
    type: 'corner_cleat',
    material: 'aluminum',
    specifications: {
      type: 'screw',
      gauge_mm: 1.5,
      assemblyMethod: 'manual_with_allen_key'
    },
    quantity: 4, // per sash
    priceInEGP: 10,
    suppliers: ['Caluminium', 'ASAŞ', 'KALE'],
    supplierLocations: ['Cairo', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 2
  },
  {
    id: 'corner-cleat-crimp',
    name: 'Corner Cleat (Crimp)',
    nameArabic: 'زاوية (كبس)',
    category: 'hinged',
    type: 'corner_cleat',
    material: 'aluminum',
    specifications: {
      type: 'crimp',
      gauge_mm: 1.5,
      assemblyMethod: 'factory_crimping_machine'
    },
    quantity: 4, // per sash
    priceInEGP: 8,
    suppliers: ['Caluminium', 'ASAŞ', 'KALE'],
    supplierLocations: ['Cairo', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 2,
    notes: 'Requires factory crimping machine'
  },
  {
    id: 'glazing-shim',
    name: 'Glazing Shim',
    nameArabic: 'تاكوز / مواد',
    category: 'hinged',
    type: 'glazing_shim',
    material: 'PVC',
    specifications: {
      thickness_mm: [3, 5, 6],
      purpose: 'toe_and_heel_glass'
    },
    quantity: 5, // per sash (corners + mid-points)
    priceInEGP: 0.75,
    suppliers: ['Local'],
    supplierLocations: ['Cairo', 'Alexandria', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 1,
    notes: 'Critical for preventing glass sagging'
  },
  {
    id: 'friction-stay-standard',
    name: 'Friction Stay (Standard)',
    nameArabic: 'مقبض مقصي',
    category: 'hinged',
    type: 'friction_stay',
    specifications: {
      minLength_mm: 300,
      maxLength_mm: 800,
      capacity_kg: 15
    },
    quantity: 1, // per top-hung sash
    priceInEGP: 62,
    suppliers: ['KALE', 'Veka Egypt', 'Rehau Egypt'],
    supplierLocations: ['Cairo', 'New Cairo', '6th October'],
    availableInEgypt: true,
    leadTimeDays: 3
  },
  {
    id: 'friction-stay-heavy-duty',
    name: 'Friction Stay (Heavy-Duty)',
    category: 'hinged',
    type: 'friction_stay',
    specifications: {
      minLength_mm: 300,
      maxLength_mm: 800,
      capacity_kg: 25
    },
    quantity: 1, // per top-hung sash
    priceInEGP: 85,
    suppliers: ['KALE', 'Veka Egypt', 'Rehau Egypt'],
    supplierLocations: ['Cairo', 'New Cairo', '6th October'],
    availableInEgypt: true,
    leadTimeDays: 3
  },
  {
    id: 'espagnolette-standard',
    name: 'Espagnolette (Standard)',
    category: 'hinged',
    type: 'espagnolette',
    specifications: {
      gearboxType: 'single_point',
      rodLength_mm: [400, 2000],
      matchesSashHeight: true
    },
    quantity: 1, // per sash
    priceInEGP: 115,
    suppliers: ['KALE', 'MACO', 'Apex'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 3
  },
  {
    id: 'espagnolette-multi-point',
    name: 'Espagnolette (Multi-Point)',
    category: 'hinged',
    type: 'espagnolette',
    specifications: {
      gearboxType: 'multi_point',
      rodLength_mm: [400, 2000],
      matchesSashHeight: true
    },
    quantity: 1, // per sash
    priceInEGP: 275,
    suppliers: ['KALE', 'MACO', 'Apex'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 5,
    notes: 'Premium security option'
  }
];

// ============================================================================
// Panda System Components
// ============================================================================

export const PANDA_COMPONENTS: PandaSystemComponents = {
  doubleSashAdapter: {
    id: 'panda-double-sash-adapter',
    name: 'Double Sash Adapter',
    nameArabic: 'برور شباك',
    category: 'panda',
    type: 'screen_adapter',
    specifications: {
      profileCode: 'Sector Barour Shabaak',
      purpose: 'creates_secondary_rebate',
      screenAdapterOffset_mm: 15, // Default, range: 12-18mm
      brandVariations: {
        'al-sherif': 15,
        'al-aharam': 14,
        'sector': 15,
        'wintech': 15,
        'generic': 15
      }
    },
    quantity: 4, // per window (perimeter)
    priceInEGP: 20, // per meter
    suppliers: ['Al Sherif', 'Al Aharam'],
    supplierLocations: ['Cairo', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 3
  },
  screenSashProfile: {
    id: 'panda-screen-sash-profile',
    name: 'Screen Sash Profile',
    nameArabic: 'بروفايل شباك الشاشة',
    category: 'panda',
    type: 'screen_sash',
    specifications: {
      width_mm: 28, // Typical, varies by manufacturer
      manufacturerVariants: {
        'al-sherif': 28.5,
        'al-aharam': 27.8,
        'sector': 28.0,
        'wintech': 28.0,
        'generic': 28.0
      },
      purpose: 'holds_screen_mesh'
    },
    quantity: 'perimeter', // Perimeter of screen sash
    priceInEGP: 40, // per meter
    suppliers: ['Al Sherif', 'Al Aharam', 'Local Extruders'],
    supplierLocations: ['Cairo', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 3,
    notes: 'Width varies by manufacturer - critical for cutting accuracy'
  },
  screenMesh: {
    id: 'panda-screen-mesh',
    name: 'Screen Mesh',
    nameArabic: 'شبكة الشاشة',
    category: 'panda',
    type: 'screen_mesh',
    specifications: {
      types: ['fiber_mesh_1x1', 'aluminum_wire_1.5x1.5'],
      meshSize_mm: [1, 1.5]
    },
    quantity: 'area', // Area of screen sash
    priceInEGP: 30, // per m²
    suppliers: ['Local'],
    supplierLocations: ['Cairo', 'Alexandria', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 1
  },
  magneticCatch: {
    id: 'panda-magnetic-catch',
    name: 'Magnetic Catch for Screen',
    nameArabic: 'قفل مغناطيسي للشاشة',
    category: 'panda',
    type: 'magnetic_catch',
    specifications: {
      purpose: 'keeps_screen_sash_closed'
    },
    quantity: 3, // per screen sash (corners)
    priceInEGP: 12,
    suppliers: ['Local Hardware Stores'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 1
  }
};

// ============================================================================
// Rolling Shutter (Shish Heseira) Components
// ============================================================================

export const ROLLING_SHUTTER_COMPONENTS: RollingShutterComponents = {
  shishBox: {
    id: 'shish-box',
    name: 'Shish Box',
    nameArabic: 'صندوق الشيش',
    category: 'shish',
    type: 'shish_box',
    material: 'foam_injected_aluminum',
    specifications: {
      sizes_mm: [140, 170, 180, 210], // Market standardized sizes
      note: 'Old catalog values (137, 165, 205) are nominal; actual retail uses rounded metric sizes'
    },
    quantity: 1, // per window (above frame)
    priceInEGP: 300, // per m² (varies by slat type)
    suppliers: ['Local Manufacturers'],
    supplierLocations: ['10th of Ramadan', 'Cairo'],
    availableInEgypt: true,
    leadTimeDays: 3
  },
  shishSlats: {
    id: 'shish-slats',
    name: 'Shish Slats',
    nameArabic: 'شرائح الشيش',
    category: 'shish',
    type: 'shish_slats',
    specifications: {
      types: [
        { name: '4cm', description: 'foam-filled', use: 'standard_residential' },
        { name: '5cm', description: 'foam-filled', use: 'medium_duty' },
        { name: '5.5cm', description: 'extruded', use: 'heavy_duty' }
      ]
    },
    quantity: 'based_on_width', // Based on window width
    priceInEGP: 22, // per meter (varies by type)
    suppliers: ['Local Manufacturers'],
    supplierLocations: ['10th of Ramadan', 'Cairo'],
    availableInEgypt: true,
    leadTimeDays: 3
  },
  motor: {
    id: 'shish-motor',
    name: 'Shish Motor (Electric)',
    nameArabic: 'موتور الشيش',
    category: 'shish',
    type: 'motor',
    specifications: {
      brands: ['Somfy', 'Nice'],
      power: '220V_AC',
      needsElectricalOutput: true,
      marketPenetration: '95% in luxury villas/new buildings'
    },
    quantity: 1, // per window
    priceInEGP: 1150,
    suppliers: ['Somfy Egypt', 'Nice Egypt'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 5
  },
  manualMechanism: {
    id: 'shish-manual',
    name: 'Manual Mechanism (Shareet/Manivella)',
    nameArabic: 'ميكانيزم يدوي (شاريت / منيفيلا)',
    category: 'shish',
    type: 'manual',
    specifications: {
      type: 'strap_crank',
      requiresHole: true,
      holeDiameter_mm: 20
    },
    quantity: 1, // per window
    priceInEGP: 225,
    suppliers: ['Local'],
    supplierLocations: ['Cairo', 'Alexandria', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 1,
    notes: 'Still common in middle-class apartments (cost saving)'
  }
};

// ============================================================================
// Georgian Bars (Latish) Components
// ============================================================================

export const GEORGIAN_BAR_COMPONENTS: GeorgianBarComponents = {
  latishBars: {
    id: 'latish-bars',
    name: 'Latish Bars',
    nameArabic: 'قضبان اللاتيش',
    category: 'latish',
    type: 'georgian_bars',
    material: 'aluminum',
    specifications: {
      sizes_mm: ['8x8', '10x10'],
      gridTypes: ['Salib (Cross)', 'T-Shape', 'Diamond']
    },
    quantity: 'linear_meter', // Calculated by linear meter based on grid pattern
    priceInEGP: 32, // per meter
    suppliers: ['Local'],
    supplierLocations: ['Cairo', 'Alexandria', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 2,
    notes: 'Installed inside double glazing unit (between glass panes). Adds 15-25% to glass cost.'
  },
  crossConnectors: {
    id: 'latish-connectors',
    name: 'Cross Connectors (Saliba Latish)',
    nameArabic: 'صالبة اللاتيش',
    category: 'latish',
    type: 'cross_connector',
    specifications: {
      purpose: 'connect_bars_at_intersections'
    },
    quantity: 'per_intersection', // 1 per intersection
    priceInEGP: 3.5,
    suppliers: ['Local'],
    supplierLocations: ['Cairo', 'Alexandria', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 2
  }
};

// ============================================================================
// Bending (Duran) Components
// ============================================================================

export const BENDING_COMPONENTS: EgyptianHardwareItem[] = [
  {
    id: 'bending-service',
    name: 'Bending Service',
    nameArabic: 'خدمة الدوران',
    category: 'duran',
    type: 'bending_service',
    specifications: {
      costPerBend: true,
      minimumRadius: {
        'panda': 500,
        'rock60': 1200,
        'jumbo100': 1500
      },
      requiresSpecializedMachine: true
    },
    quantity: 'per_bend', // Per "Fatha" (one bend)
    priceInEGP: 75, // per bend (50-100 EGP range)
    suppliers: ['Large Workshops'],
    supplierLocations: ['Cairo', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 5,
    notes: 'Charged per bend, not per meter'
  },
  {
    id: 'glass-template-astamba',
    name: 'Glass Template (Astamba)',
    nameArabic: 'استامبا الزجاج',
    category: 'duran',
    type: 'glass_template',
    specifications: {
      purpose: 'custom_curved_glass_cutting',
      requiredFor: 'each_unique_arch_radius'
    },
    quantity: 'per_unique_radius', // One-time per unique radius
    priceInEGP: 150, // per template (100-200 EGP range)
    suppliers: ['Glass Processing Factories'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 3
  }
];

// ============================================================================
// Kitchen Cladding (ACP/Fiber Panels)
// ============================================================================

export const ACP_PANEL_COMPONENTS: EgyptianHardwareItem[] = [
  {
    id: 'acp-panel',
    name: 'Aluminum Composite Panel (ACP)',
    nameArabic: 'لوح الألمنيوم المركب',
    category: 'acp',
    type: 'acp_panel',
    specifications: {
      thickness_mm: 4,
      core: ['polyethylene', 'fire_resistant'],
      colors: ['Silver', 'White', 'Wood Effect (Sublimation)']
    },
    quantity: 'area', // Area of panel (typically bottom 900mm of kitchen doors)
    priceInEGP: 200, // per m² (150-250 EGP range)
    suppliers: ['Local Suppliers'],
    supplierLocations: ['10th of Ramadan', 'Obour'],
    availableInEgypt: true,
    leadTimeDays: 3,
    notes: 'Replaces glass in selected cell, uses same bead system. Also used for safety (tempered glass alternative)'
  }
];

// ============================================================================
// Curtain Wall Components
// ============================================================================

export const CURTAIN_WALL_COMPONENTS: EgyptianHardwareItem[] = [
  {
    id: 'structural-silicon',
    name: 'Structural Silicon',
    nameArabic: 'سيليكون هيكلي',
    category: 'curtain_wall',
    type: 'structural_silicon',
    specifications: {
      brands: ['Sika SG500', 'Dow Corning 993'],
      designStrength_MPa: 0.14,
      cartridgeVolume_ml: 280,
      typicalUsage: '1 cartridge per 8-10 linear meters'
    },
    quantity: 'linear_meter', // Critical cost factor
    priceInEGP: 100, // per cartridge (80-120 EGP range)
    suppliers: ['Sika Egypt', 'Dow Corning Distributors'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 3
  },
  {
    id: 'backer-rod',
    name: 'Backer Rod (Fom)',
    nameArabic: 'فوم',
    category: 'curtain_wall',
    type: 'backer_rod',
    material: 'closed_cell_foam',
    specifications: {
      diameter_mm: [12, 20],
      purpose: 'inserted_behind_silicon_to_control_depth'
    },
    quantity: 'linear_meter', // Linear meters of silicon joints
    priceInEGP: 7.5, // per meter (5-10 EGP range)
    suppliers: ['Local'],
    supplierLocations: ['Cairo', 'Alexandria', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 1
  },
  {
    id: 'setting-blocks',
    name: 'Setting Blocks (Takoz Zogag)',
    nameArabic: 'تاكوز زجاج',
    category: 'curtain_wall',
    type: 'setting_blocks',
    material: 'EPDM_rubber',
    specifications: {
      size_mm: '50x50x6',
      purpose: 'support_glass_at_bottom'
    },
    quantity: 'per_panel', // 2-4 per glass panel
    priceInEGP: 4, // per block (3-5 EGP range)
    suppliers: ['Local'],
    supplierLocations: ['Cairo', 'Alexandria', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 1
  },
  {
    id: 'interface-u-channel',
    name: 'Interface (U-Channel)',
    nameArabic: 'قناة U',
    category: 'curtain_wall',
    type: 'interface',
    material: 'aluminum',
    specifications: {
      finish: ['anodized', 'powder_coated'],
      purpose: 'holds_glass_in_structural_systems'
    },
    quantity: 'perimeter', // Perimeter of glass panels
    priceInEGP: 50, // per meter (40-60 EGP range)
    suppliers: ['Curtain Wall System Suppliers'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 5
  },
  {
    id: 'floor-anchors',
    name: 'Floor Anchors (Brackets)',
    nameArabic: 'مراسي الأرضية',
    category: 'curtain_wall',
    type: 'floor_anchor',
    specifications: {
      types: ['fixed_anchor', 'sliding_anchor'],
      spacing: 'every_3_4_meters'
    },
    quantity: 'based_on_mullion_spacing', // Based on mullion length and floor height
    priceInEGP: 75, // per anchor (50-100 EGP range)
    suppliers: ['Curtain Wall System Suppliers'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 5
  },
  {
    id: 'expansion-joints',
    name: 'Expansion Joints',
    nameArabic: 'مفاصل التمدد',
    category: 'curtain_wall',
    type: 'expansion_joint',
    specifications: {
      spacing: 'every_12_15_meters',
      allowance_mm: [20, 30],
      purpose: 'allow_thermal_movement'
    },
    quantity: 'per_joint', // Every 12-15m
    priceInEGP: 300, // per joint (200-400 EGP range, includes covers)
    suppliers: ['Curtain Wall System Suppliers'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 7
  }
];

// ============================================================================
// Advanced Glass Processing (Masnayat)
// ============================================================================

export const GLASS_PROCESSING_COMPONENTS: EgyptianHardwareItem[] = [
  {
    id: 'glass-grinding-polishing',
    name: 'Grinding/Polishing (Rodah/Musanfer)',
    nameArabic: 'رودة / مسنفر',
    category: 'glass_processing',
    type: 'grinding_polishing',
    specifications: {
      rule: 'any_exposed_edge_must_be_polished',
      appliesTo: ['frameless_doors', 'spider_facades', 'glass_partitions']
    },
    quantity: 'linear_meter', // Per linear meter of exposed edge
    priceInEGP: 20, // per linear meter (15-25 EGP range)
    suppliers: ['Glass Processing Factories'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 3
  },
  {
    id: 'glass-holes-cutouts',
    name: 'Holes & Cutouts (Fatha/Notch)',
    nameArabic: 'فتحة / نوتش',
    category: 'glass_processing',
    type: 'holes_cutouts',
    specifications: {
      types: ['round_holes', 'rectangular_cutouts'],
      holeSizes_mm: [8, 10, 12],
      purpose: ['spider_fittings', 'glass_door_handles', 'hardware_mounting']
    },
    quantity: 'per_hole', // Per hole/cutout
    priceInEGP: 30, // per hole (20-40 EGP range, varies by size)
    suppliers: ['Glass Processing Factories'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 3
  },
  {
    id: 'step-glazing',
    name: 'Step Glazing (Zogag Daraga)',
    nameArabic: 'زجاج درجة',
    category: 'glass_processing',
    type: 'step_glazing',
    specifications: {
      context: 'structural_curtain_walls',
      logic: 'outer_pane_larger_than_inner_by_20mm',
      surcharge: '15%'
    },
    quantity: 'per_panel', // Additional 15% of glass cost
    priceInEGP: 0, // Calculated as 15% surcharge on glass cost
    suppliers: ['Glass Processing Factories'],
    supplierLocations: ['Cairo', 'Alexandria'],
    availableInEgypt: true,
    leadTimeDays: 5,
    notes: 'Custom cutting for structural curtain walls'
  }
];

// ============================================================================
// Gaskets (Weather Seals)
// ============================================================================

export const GASKETS: EgyptianHardwareItem[] = [
  {
    id: 'gasket-glass',
    name: 'Glass Gasket',
    nameArabic: 'جاسكت الزجاج',
    category: 'general',
    type: 'gasket',
    specifications: {
      types: ['GT 0122', 'GT 0118'],
      lengthFactor: '21.4H' // Height in meters
    },
    quantity: 'perimeter', // Perimeter length of sash (m) × gasket length factor
    priceInEGP: 5.5, // per meter (3-8 EGP range)
    suppliers: ['Caluminium', 'ASAŞ', 'Local'],
    supplierLocations: ['Cairo', 'Alexandria', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 2
  },
  {
    id: 'gasket-central',
    name: 'Central Gasket',
    nameArabic: 'جاسكت مركزي',
    category: 'general',
    type: 'gasket',
    specifications: {
      type: 'GT 0137',
      lengthFactor: '21.4H'
    },
    quantity: 'perimeter',
    priceInEGP: 5.5,
    suppliers: ['Caluminium', 'ASAŞ', 'Local'],
    supplierLocations: ['Cairo', 'Alexandria', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 2
  },
  {
    id: 'gasket-sash-striker',
    name: 'Sash Striker Gasket',
    nameArabic: 'جاسكت ضارب الشباك',
    category: 'general',
    type: 'gasket',
    specifications: {
      type: 'GT 0146',
      lengthFactor: '21.4H'
    },
    quantity: 'perimeter',
    priceInEGP: 5.5,
    suppliers: ['Caluminium', 'ASAŞ', 'Local'],
    supplierLocations: ['Cairo', 'Alexandria', '10th of Ramadan'],
    availableInEgypt: true,
    leadTimeDays: 2
  }
];

// ============================================================================
// Complete Hardware Database
// ============================================================================

export const EGYPTIAN_HARDWARE_DATABASE = {
  sliding: SLIDING_ACCESSORIES,
  hinged: HINGED_ACCESSORIES,
  panda: PANDA_COMPONENTS,
  rollingShutter: ROLLING_SHUTTER_COMPONENTS,
  georgianBars: GEORGIAN_BAR_COMPONENTS,
  bending: BENDING_COMPONENTS,
  acp: ACP_PANEL_COMPONENTS,
  curtainWall: CURTAIN_WALL_COMPONENTS,
  glassProcessing: GLASS_PROCESSING_COMPONENTS,
  gaskets: GASKETS
};

/**
 * Get hardware item by ID
 */
export function getHardwareItemById(id: string): EgyptianHardwareItem | undefined {
  const allItems = [
    ...SLIDING_ACCESSORIES,
    ...HINGED_ACCESSORIES,
    ...Object.values(PANDA_COMPONENTS),
    ...Object.values(ROLLING_SHUTTER_COMPONENTS),
    ...Object.values(GEORGIAN_BAR_COMPONENTS),
    ...BENDING_COMPONENTS,
    ...ACP_PANEL_COMPONENTS,
    ...CURTAIN_WALL_COMPONENTS,
    ...GLASS_PROCESSING_COMPONENTS,
    ...GASKETS
  ];
  
  return allItems.find(item => item.id === id);
}

/**
 * Get hardware items by category
 */
export function getHardwareByCategory(category: EgyptianHardwareItem['category']): EgyptianHardwareItem[] {
  const allItems = [
    ...SLIDING_ACCESSORIES,
    ...HINGED_ACCESSORIES,
    ...Object.values(PANDA_COMPONENTS),
    ...Object.values(ROLLING_SHUTTER_COMPONENTS),
    ...Object.values(GEORGIAN_BAR_COMPONENTS),
    ...BENDING_COMPONENTS,
    ...ACP_PANEL_COMPONENTS,
    ...CURTAIN_WALL_COMPONENTS,
    ...GLASS_PROCESSING_COMPONENTS,
    ...GASKETS
  ];
  
  return allItems.filter(item => item.category === category);
}

/**
 * Check if hardware is available in Egypt
 */
export function isHardwareAvailableInEgypt(id: string): boolean {
  const item = getHardwareItemById(id);
  return item?.availableInEgypt ?? false;
}


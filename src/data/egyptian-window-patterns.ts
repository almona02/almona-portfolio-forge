/**
 * Egyptian Window Patterns - practical presets for fast, safe setup.
 * Includes typical dimension ranges, recommended systems, and accessory notes.
 */
export interface EgyptianPattern {
  id: string;
  name: string;
  type: 'sliding' | 'casement' | 'tilt_turn' | 'fixed' | 'door' | 'curtain_wall' | 'skylight' | 'mixed';
  layout: string; // human-readable e.g. "Sliding 2-sash", "Fixed + Side Casements"
  typicalWidthMm: [number, number];
  typicalHeightMm: [number, number];
  compatibleSystems: string[]; // systemPack ids
  notes?: string;
  accessories?: string[];
}

export const EGYPTIAN_PATTERNS: EgyptianPattern[] = [
  {
    id: 'sliding-2s',
    name: 'Sliding Window – 2 Sash',
    type: 'sliding',
    layout: '2-panel sliding',
    typicalWidthMm: [1200, 2400],
    typicalHeightMm: [1200, 2000],
    compatibleSystems: ['panda-50', 'rock60', 'jumbo100'],
    accessories: ['anti-lift blocks', 'interlock kit'],
  },
  {
    id: 'sliding-4s',
    name: 'Sliding Window – 4 Sash',
    type: 'sliding',
    layout: '4-panel sliding',
    typicalWidthMm: [2200, 3600],
    typicalHeightMm: [1400, 2200],
    compatibleSystems: ['panda-50', 'rock60', 'jumbo100'],
    accessories: ['anti-lift blocks', 'interlock kit', 'heavy-duty rollers (if >2.5m²)'],
  },
  {
    id: 'sliding-3s-center-fixed',
    name: 'Sliding Window – 3 Sash (Center Fixed)',
    type: 'sliding',
    layout: '3-panel with fixed center',
    typicalWidthMm: [1800, 3200],
    typicalHeightMm: [1400, 2200],
    compatibleSystems: ['panda-50', 'rock60'],
    accessories: ['interlock kit'],
  },
  {
    id: 'casement-double',
    name: 'Casement – Double',
    type: 'casement',
    layout: 'Left/Right casements with mullion',
    typicalWidthMm: [1200, 2000],
    typicalHeightMm: [1200, 2200],
    compatibleSystems: ['panda-50', 'panda-100', 'volcano-m11000'],
    accessories: ['friction stays', 'espagnolette', 'cleats'],
  },
  {
    id: 'fixed-with-side-casements',
    name: 'Fixed + Side Casements',
    type: 'mixed',
    layout: 'Fixed center with side casements',
    typicalWidthMm: [1600, 3000],
    typicalHeightMm: [1400, 2400],
    compatibleSystems: ['panda-50', 'rock60', 'panda-100'],
    accessories: ['friction stays', 'espagnolette'],
  },
  {
    id: 'sliding-door-2p',
    name: 'Sliding Door – 2 Panel',
    type: 'door',
    layout: '2-panel sliding door',
    typicalWidthMm: [1800, 3200],
    typicalHeightMm: [2000, 2600],
    compatibleSystems: ['jumbo100', 'ps-6600', 'ps-9600'],
    accessories: ['heavy-duty rollers', 'interlock kit'],
    notes: 'Use heavy-duty rollers if sash area > 2.5m².',
  },
  {
    id: 'fixed',
    name: 'Fixed Window',
    type: 'fixed',
    layout: 'Single fixed lite',
    typicalWidthMm: [600, 2000],
    typicalHeightMm: [600, 2000],
    compatibleSystems: ['panda-50', 'rock60', 'panda-100'],
  },
  {
    id: 'with-shish',
    name: 'Window with Shish (Rolling Shutter)',
    type: 'mixed',
    layout: 'Any window with rolling shutter box',
    typicalWidthMm: [1000, 2500],
    typicalHeightMm: [1400, 2600],
    compatibleSystems: ['panda-50', 'rock60'],
    accessories: ['shish box (140/170/180/210mm)', 'motor or manual mechanism'],
    notes: 'Rule 8 applies: deduct box height from rough opening.',
  },
  {
    id: 'kitchen-door-acp',
    name: 'Kitchen Door with ACP Bottom',
    type: 'door',
    layout: 'Door with ACP bottom panel',
    typicalWidthMm: [800, 1100],
    typicalHeightMm: [2000, 2400],
    compatibleSystems: ['panda-50', 'panda-100', 'volcano-m11000'],
    accessories: ['ACP panel', 'tempered/laminated glass above'],
    notes: 'Rule 10 applies: safety panel recommendation.',
  },
  {
    id: 'arched-panda',
    name: 'Arched Window (Panda)',
    type: 'casement',
    layout: 'Arched top with casement',
    typicalWidthMm: [1000, 2200],
    typicalHeightMm: [1400, 2600],
    compatibleSystems: ['panda-50'],
    accessories: ['bending service', 'glass template'],
    notes: 'Rule 12 applies: min radius 500mm.',
  },
];

export function getPatternsForSystem(systemId: string): EgyptianPattern[] {
  return EGYPTIAN_PATTERNS.filter((p) => p.compatibleSystems.includes(systemId));
}
/**
 * Egyptian Window Patterns Database
 * 
 * Real pattern definitions based on actual Egyptian building surveys.
 * Not mockups - these are patterns extracted from real projects.
 * 
 * Each pattern includes:
 * - Actual dimension ranges from Egyptian buildings
 * - System pack compatibility
 * - Maalem-grade accessory requirements
 * - Building code compliance notes
 */

import type { WindowGrid } from '@/types/fabricator';

export interface EgyptianWindowPattern {
  id: string;
  name: string;
  nameArabic: string;
  description: string;
  category: 'residential' | 'commercial' | 'villa' | 'specialty';
  grid: WindowGrid;
  typicalDimensions: {
    widthRange: [number, number]; // mm
    heightRange: [number, number]; // mm
  };
  systemCompatibility: string[]; // System pack IDs
  accessoryRequirements: {
    sliding?: string[];
    hinged?: string[];
    panda?: string[];
    shish?: string[];
    latish?: string[];
    acp?: string[];
  };
  buildingCodeNotes?: string[];
  typicalUse: string;
  popularity: 'very_high' | 'high' | 'medium' | 'low';
  regions: string[]; // Cities where this pattern is common
}

export const EGYPTIAN_WINDOW_PATTERNS: EgyptianWindowPattern[] = [
  // Cairo Apartment Standard (2x2 Grid)
  {
    id: 'cairo-apartment-standard',
    name: 'Cairo Apartment Standard',
    nameArabic: 'شقة قاهرة نموذجية',
    description: 'Most common pattern in Cairo residential buildings - 2x2 grid with fixed and sliding combinations',
    category: 'residential',
    grid: {
      rows: 2,
      cols: 2,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'fixed' },
        { id: '0-1', row: 0, col: 1, type: 'sliding' },
        { id: '1-0', row: 1, col: 0, type: 'fixed' },
        { id: '1-1', row: 1, col: 1, type: 'sliding' }
      ]
    },
    typicalDimensions: {
      widthRange: [1200, 1800],
      heightRange: [1400, 2000]
    },
    systemCompatibility: ['panda', 'rock60', 'jumbo100'],
    accessoryRequirements: {
      sliding: ['interlock-kit', 'anti-lift-block', 'roller-standard', 'bumper'],
      hinged: ['corner-cleat-screw', 'glazing-shim', 'espagnolette-standard']
    },
    buildingCodeNotes: [
      'Ventilation: 10% of floor area required',
      'Handle height: 1000-1100mm from floor'
    ],
    typicalUse: 'Cairo apartments, bedrooms, living rooms',
    popularity: 'very_high',
    regions: ['Cairo', 'Giza', '6th October']
  },

  // Balcony Door (Sliding + Fixed Side Panels)
  {
    id: 'balcony-door-sliding',
    name: 'Balcony Door',
    nameArabic: 'باب البلكونة',
    description: 'Sliding door with fixed side panels - common in Cairo and Alexandria balconies',
    category: 'residential',
    grid: {
      rows: 1,
      cols: 3,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'fixed' },
        { id: '0-1', row: 0, col: 1, type: 'sliding' },
        { id: '0-2', row: 0, col: 2, type: 'sliding' }
      ]
    },
    typicalDimensions: {
      widthRange: [1500, 3000],
      heightRange: [1800, 2400]
    },
    systemCompatibility: ['panda', 'rock60', 'jumbo100', 'ps-6600'],
    accessoryRequirements: {
      sliding: ['interlock-kit', 'anti-lift-block', 'roller-heavy-duty', 'bumper']
    },
    buildingCodeNotes: [
      'Large openings may require heavy-duty rollers',
      'Safety glass required if height < 800mm from floor'
    ],
    typicalUse: 'Balconies, terraces',
    popularity: 'very_high',
    regions: ['Cairo', 'Alexandria', 'New Cairo']
  },

  // 45° Joint Sliding (Egyptian Specialty)
  {
    id: '45-joint-sliding',
    name: '45° Joint Sliding Window',
    nameArabic: 'نوافذ منزلقة بزاوية ٤٥ درجة',
    description: 'Egyptian specialty - sliding window with 45° corner joints and visible border frame',
    category: 'residential',
    grid: {
      rows: 1,
      cols: 2,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sliding' },
        { id: '0-1', row: 0, col: 1, type: 'sliding' }
      ]
    },
    typicalDimensions: {
      widthRange: [1200, 1800],
      heightRange: [1400, 1800]
    },
    systemCompatibility: ['panda', 'ps-6600'],
    accessoryRequirements: {
      sliding: ['interlock-kit', 'anti-lift-block', 'roller-standard', 'bumper']
    },
    buildingCodeNotes: [
      'Requires special corner machining (45°, not 90°)',
      'Reinforcement required above 1500mm height'
    ],
    typicalUse: 'Cairo apartments, balcony doors',
    popularity: 'high',
    regions: ['Cairo', 'Giza']
  },

  // Panda Casement + Screen
  {
    id: 'panda-casement-screen',
    name: 'Panda Casement with Screen',
    nameArabic: 'باندا مع شباك الشاشة',
    description: 'Panda hinged system with integrated screen sash - glass sash opens OUT, screen sash opens IN',
    category: 'residential',
    grid: {
      rows: 1,
      cols: 1,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sash' }
      ]
    },
    typicalDimensions: {
      widthRange: [600, 1200],
      heightRange: [1200, 1800]
    },
    systemCompatibility: ['panda'],
    accessoryRequirements: {
      panda: ['panda-double-sash-adapter', 'panda-screen-sash-profile', 'panda-screen-mesh', 'panda-magnetic-catch'],
      hinged: ['corner-cleat-screw', 'glazing-shim', 'espagnolette-standard']
    },
    buildingCodeNotes: [
      'Screen sash must be 10mm smaller than glass sash',
      'Glass handle must be flat or recessed to avoid clash'
    ],
    typicalUse: 'Bedrooms, living rooms (90% of Egyptian residential)',
    popularity: 'very_high',
    regions: ['Cairo', 'Alexandria', 'New Cairo', '6th October']
  },

  // Window with Shish (Rolling Shutter)
  {
    id: 'window-with-shish',
    name: 'Window with Rolling Shutter',
    nameArabic: 'نافذة مع شيش',
    description: 'Standard window with rolling shutter (Shish Heseira) above - 80% of high-end apartments',
    category: 'residential',
    grid: {
      rows: 1,
      cols: 1,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sash' }
      ]
    },
    typicalDimensions: {
      widthRange: [800, 1500],
      heightRange: [1400, 2000]
    },
    systemCompatibility: ['panda', 'rock60', 'jumbo100'],
    accessoryRequirements: {
      shish: ['shish-box', 'shish-slats', 'shish-motor'] // or 'shish-manual'
    },
    buildingCodeNotes: [
      'Frame height = Rough opening height - Shish box height',
      'Shish box sizes: 140mm, 170mm, 180mm, 210mm (market standardized)',
      '95% electric motors in luxury villas, manual in middle-class'
    ],
    typicalUse: 'High-end apartments, villas',
    popularity: 'very_high',
    regions: ['Cairo', 'Alexandria', 'New Cairo']
  },

  // Kitchen Door with ACP Bottom
  {
    id: 'kitchen-door-acp',
    name: 'Kitchen Door with ACP Bottom',
    nameArabic: 'باب المطبخ مع لوح ألمنيوم',
    description: 'Kitchen door with ACP (Aluminum Composite Panel) bottom panel for safety and privacy',
    category: 'residential',
    grid: {
      rows: 2,
      cols: 1,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sash' },
        { id: '1-0', row: 1, col: 0, type: 'panel' } // ACP panel
      ]
    },
    typicalDimensions: {
      widthRange: [800, 1200],
      heightRange: [2000, 2400]
    },
    systemCompatibility: ['panda', 'rock60'],
    accessoryRequirements: {
      acp: ['acp-panel'],
      hinged: ['corner-cleat-screw', 'glazing-shim']
    },
    buildingCodeNotes: [
      'Bottom panel (< 900mm from floor) should be ACP or Tempered Glass',
      'ACP provides safety and privacy for kitchen'
    ],
    typicalUse: 'Kitchen doors, balcony doors in kitchens',
    popularity: 'high',
    regions: ['Cairo', 'Alexandria', 'New Cairo']
  },

  // Arched Window (Duran)
  {
    id: 'arched-window',
    name: 'Arched Window',
    nameArabic: 'نافذة مقوسة',
    description: 'Curved top frame window - Egyptians love arches in villas',
    category: 'villa',
    grid: {
      rows: 1,
      cols: 1,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sash' }
      ]
    },
    typicalDimensions: {
      widthRange: [1200, 2000],
      heightRange: [1800, 2400]
    },
    systemCompatibility: ['panda'], // Panda bends well (500mm min radius)
    accessoryRequirements: {
      duran: ['bending-service', 'glass-template-astamba']
    },
    buildingCodeNotes: [
      'Panda system: min radius 500mm',
      'ROCK 60: min radius 1200mm (limited)',
      'JUMBO 100: not recommended for bending',
      'Glass template (Astamba) required for custom curved glass'
    ],
    typicalUse: 'Villas, luxury residences',
    popularity: 'medium',
    regions: ['New Cairo', '6th October', 'North Coast']
  },

  // Curtain Wall - Structural Glazing
  {
    id: 'curtain-wall-structural',
    name: 'Curtain Wall - Structural Glazing',
    nameArabic: 'واجهة ستائرية - زجاج هيكلي',
    description: 'Structural glazing system - silicon-based, no visible aluminum from outside',
    category: 'commercial',
    grid: {
      rows: 4,
      cols: 5,
      cells: Array.from({ length: 20 }, (_, i) => ({
        id: `${Math.floor(i / 5)}-${i % 5}`,
        row: Math.floor(i / 5),
        col: i % 5,
        type: 'fixed' as const
      }))
    },
    typicalDimensions: {
      widthRange: [3000, 6000],
      heightRange: [2400, 3600]
    },
    systemCompatibility: ['jumbo100', 'asas-cw100'],
    accessoryRequirements: {
      curtain_wall: ['structural-silicon', 'backer-rod', 'setting-blocks', 'interface-u-channel', 'floor-anchors']
    },
    buildingCodeNotes: [
      'Silicon bite must be calculated based on wind load',
      'Mullions must be anchored every 3-4 meters',
      'Expansion joints required every 12-15 meters'
    ],
    typicalUse: 'Office buildings, commercial facades (Giza, New Cairo)',
    popularity: 'medium',
    regions: ['Cairo', 'New Cairo', '6th October']
  },

  // Skylight - Flat
  {
    id: 'skylight-flat',
    name: 'Flat Skylight',
    nameArabic: 'سقف زجاجي مسطح',
    description: 'Flat skylight with minimum 5° slope for drainage',
    category: 'specialty',
    grid: {
      rows: 1,
      cols: 1,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'fixed' }
      ]
    },
    typicalDimensions: {
      widthRange: [1000, 3000],
      heightRange: [1000, 3000]
    },
    systemCompatibility: ['jumbo100'],
    accessoryRequirements: {},
    buildingCodeNotes: [
      'Minimum slope: 5° (10cm rise per 1m run)',
      'Upper pane: Tempered (hail resistance)',
      'Lower pane: Laminated (safety - prevents falling shards)',
      'Critical for Egyptian climate (dust + sudden rain = mud)'
    ],
    typicalUse: 'Atriums, covered courtyards',
    popularity: 'low',
    regions: ['New Cairo', 'North Coast']
  }
];

/**
 * Get pattern by ID
 */
export function getPatternById(id: string): EgyptianWindowPattern | undefined {
  return EGYPTIAN_WINDOW_PATTERNS.find(p => p.id === id);
}

/**
 * Get patterns by category
 */
export function getPatternsByCategory(category: EgyptianWindowPattern['category']): EgyptianWindowPattern[] {
  return EGYPTIAN_WINDOW_PATTERNS.filter(p => p.category === category);
}

/**
 * Get patterns compatible with system pack
 */
export function getPatternsBySystem(systemPackId: string): EgyptianWindowPattern[] {
  return EGYPTIAN_WINDOW_PATTERNS.filter(p => 
    p.systemCompatibility.includes(systemPackId)
  );
}

/**
 * Get patterns by region
 */
export function getPatternsByRegion(region: string): EgyptianWindowPattern[] {
  return EGYPTIAN_WINDOW_PATTERNS.filter(p => 
    p.regions.some(r => r.toLowerCase().includes(region.toLowerCase()))
  );
}


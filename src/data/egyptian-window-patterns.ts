import type { GridCell, WindowGrid } from '@/types/fabricator';

/**
 * Egyptian Window Patterns - practical presets for fast, safe setup.
 * Includes typical dimension ranges, recommended systems, and accessory notes.
 * 
 * ENGINEERING SPECIFICATIONS:
 * - Grid structure (rows, cols, cell types)
 * - Mullion/transom requirements
 * - Opening directions
 * - Technical constraints
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
  
  // ========== ENGINEERING TECHNICAL SPECIFICATIONS ==========
  /**
   * Grid structure definition - exact technical layout
   * This is what gets applied to the blueprint preview
   */
  gridSpec: {
    rows: number;
    cols: number;
    cells: Array<{
      row: number;
      col: number;
      type: GridCell['type'];
      openingDirection?: GridCell['openingDirection'];
      colSpan?: number;
      rowSpan?: number;
    }>;
    /**
     * Column width proportions (relative weights)
     * e.g. [1, 2, 1] means middle column is 2x wider
     */
    colWidths?: number[];
    /**
     * Row height proportions (relative weights)
     * e.g. [2, 1] means top row is 2x taller
     */
    rowHeights?: number[];
  };
  
  /**
   * Mullion specifications (vertical divisions)
   */
  mullions?: Array<{
    position: number; // column index where mullion appears (0 = between col 0 and 1)
    type: 'standard' | 'structural' | 'corner';
    width?: number; // mm - actual mullion width
    reinforcement?: boolean; // requires steel reinforcement
  }>;
  
  /**
   * Transom specifications (horizontal divisions)
   */
  transoms?: Array<{
    position: number; // row index where transom appears (0 = between row 0 and 1)
    type: 'standard' | 'structural';
    height?: number; // mm - actual transom height
    reinforcement?: boolean; // requires steel reinforcement
  }>;
  
  /**
   * Technical constraints for this pattern
   */
  constraints?: {
    minSashWidth?: number; // mm - minimum individual sash width
    maxSashWidth?: number; // mm - maximum individual sash width
    minSashHeight?: number; // mm
    maxSashHeight?: number; // mm
    maxSashArea?: number; // m² - maximum sash area before heavy-duty hardware
    requiresReinforcement?: boolean; // needs steel reinforcement
    windLoadCategory?: 'low' | 'medium' | 'high'; // wind load requirements
  };
  
  /**
   * Opening mechanism details
   */
  openingMechanism?: {
    type: 'sliding' | 'casement' | 'tilt-turn' | 'awning' | 'fixed' | 'bi-fold';
    direction?: 'left' | 'right' | 'both' | 'outward' | 'inward';
    trackType?: 'top' | 'bottom' | 'both'; // for sliding
    pivotPoint?: 'center' | 'side' | 'corner'; // for pivot doors
  };
}

export const EGYPTIAN_PATTERNS: EgyptianPattern[] = [
  {
    id: 'sliding-2s',
    name: 'Sliding Window – 2 Sash',
    type: 'sliding',
    layout: '2-panel sliding',
    typicalWidthMm: [1200, 2400],
    typicalHeightMm: [1200, 2000],
    compatibleSystems: ['panda-50', 'rock60', 'jumbo100', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'emapen_ema60_complete', 'emapen_ema60s_sliding', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60', 'foxywin_eco_view_88', 'foxywin_foxy_prestige_114'],
    accessories: ['anti-lift blocks', 'interlock kit'],
    gridSpec: {
      rows: 1,
      cols: 2,
      cells: [
        { row: 0, col: 0, type: 'sliding', openingDirection: 'right' },
        { row: 0, col: 1, type: 'sliding', openingDirection: 'left' }
      ],
      colWidths: [1, 1] // Equal width panels
    },
    mullions: [], // NO MULLION - Sliding sashes use interlock profile instead
    // Interlock profile connects the two sliding sashes in the middle track
    constraints: {
      minSashWidth: 600,
      maxSashWidth: 1200,
      maxSashArea: 2.5,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'sliding',
      direction: 'both',
      trackType: 'bottom'
    }
  },
  {
    id: 'sliding-4s',
    name: 'Sliding Window – 4 Sash',
    type: 'sliding',
    layout: '4-panel sliding',
    typicalWidthMm: [2200, 3600],
    typicalHeightMm: [1400, 2200],
    compatibleSystems: ['panda-50', 'rock60', 'jumbo100', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'emapen_ema60_complete', 'emapen_ema60s_sliding', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60', 'foxywin_eco_view_88', 'foxywin_foxy_prestige_114'],
    accessories: ['anti-lift blocks', 'interlock kit', 'heavy-duty rollers (if >2.5m²)'],
    gridSpec: {
      rows: 1,
      cols: 4,
      cells: [
        { row: 0, col: 0, type: 'sliding', openingDirection: 'right' },
        { row: 0, col: 1, type: 'sliding', openingDirection: 'right' },
        { row: 0, col: 2, type: 'sliding', openingDirection: 'left' },
        { row: 0, col: 3, type: 'sliding', openingDirection: 'left' }
      ],
      colWidths: [1, 1, 1, 1] // Equal width panels
    },
    mullions: [
      { position: 0, type: 'standard', width: 50 },
      { position: 1, type: 'standard', width: 50 },
      { position: 2, type: 'standard', width: 50 }
    ],
    constraints: {
      minSashWidth: 550,
      maxSashWidth: 900,
      maxSashArea: 2.5,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'sliding',
      direction: 'both',
      trackType: 'bottom'
    }
  },
  {
    id: 'sliding-3s-center-fixed',
    name: 'Sliding Window – 3 Sash (Center Fixed)',
    type: 'sliding',
    layout: '3-panel with fixed center',
    typicalWidthMm: [1800, 3200],
    typicalHeightMm: [1400, 2200],
    compatibleSystems: ['panda-50', 'rock60', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'emapen_ema60_complete', 'emapen_ema60s_sliding', 'emapen_ema55_economy', 'emapen_ema42s_budget', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60', 'foxywin_eco_view_88', 'foxywin_foxy_prestige_114'],
    accessories: ['interlock kit'],
    gridSpec: {
      rows: 1,
      cols: 3,
      cells: [
        { row: 0, col: 0, type: 'sliding', openingDirection: 'right' },
        { row: 0, col: 1, type: 'fixed' },
        { row: 0, col: 2, type: 'sliding', openingDirection: 'left' }
      ],
      colWidths: [1, 1.2, 1] // Center fixed panel slightly wider
    },
    mullions: [
      { position: 0, type: 'standard', width: 50 },
      { position: 1, type: 'standard', width: 50 }
    ],
    constraints: {
      minSashWidth: 600,
      maxSashWidth: 1100,
      maxSashArea: 2.5,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'sliding',
      direction: 'both',
      trackType: 'bottom'
    }
  },
  {
    id: 'casement-double',
    name: 'Casement – Double',
    type: 'casement',
    layout: 'Left/Right casements with mullion',
    typicalWidthMm: [1200, 2000],
    typicalHeightMm: [1200, 2200],
    compatibleSystems: ['panda-50', 'panda-100', 'volcano-m11000', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'veka_70_softline', 'rehau_geneo', 'emapen_ema60_complete', 'emapen_ema55_economy', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60'],
    accessories: ['friction stays', 'espagnolette', 'cleats'],
    gridSpec: {
      rows: 1,
      cols: 2,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'left' },
        { row: 0, col: 1, type: 'sash', openingDirection: 'right' }
      ],
      colWidths: [1, 1] // Equal width sashes
    },
    mullions: [
      { position: 0, type: 'standard', width: 50 } // Center mullion
    ],
    constraints: {
      minSashWidth: 600,
      maxSashWidth: 1000,
      maxSashArea: 2.2,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'casement',
      direction: 'both',
      trackType: undefined
    }
  },
  {
    id: 'casement-2sash',
    name: '2 Sash Casements',
    type: 'casement',
    layout: '2-panel casement window',
    typicalWidthMm: [1200, 2000],
    typicalHeightMm: [1200, 2200],
    compatibleSystems: ['panda-50', 'panda-100', 'rock60', 'volcano-m11000', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'veka_70_softline', 'rehau_geneo', 'emapen_ema60_complete', 'emapen_ema60s_sliding', 'emapen_ema55_economy', 'emapen_ema42s_budget', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60', 'foxywin_eco_view_88', 'foxywin_foxy_prestige_114'],
    accessories: ['friction stays', 'espagnolette', 'cleats', 'corner cleats'],
    gridSpec: {
      rows: 1,
      cols: 2,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'left' },
        { row: 0, col: 1, type: 'sash', openingDirection: 'right' }
      ],
      colWidths: [1, 1] // Equal width sashes
    },
    mullions: [
      { position: 0, type: 'standard', width: 50 } // Center mullion
    ],
    constraints: {
      minSashWidth: 600,
      maxSashWidth: 1000,
      maxSashArea: 2.2,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'casement',
      direction: 'both',
      trackType: undefined
    }
  },
  {
    id: 'casement-2sash-fixed',
    name: '2 Sash Casements + Fixed',
    type: 'mixed',
    layout: '2 casement sashes with fixed center panel',
    typicalWidthMm: [1800, 3200],
    typicalHeightMm: [1400, 2400],
    compatibleSystems: ['panda-50', 'panda-100', 'rock60', 'volcano-m11000', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'veka_70_softline', 'rehau_geneo', 'emapen_ema60_complete', 'emapen_ema60s_sliding', 'emapen_ema55_economy', 'emapen_ema42s_budget', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60', 'foxywin_eco_view_88', 'foxywin_foxy_prestige_114'],
    accessories: ['friction stays', 'espagnolette', 'cleats'],
    gridSpec: {
      rows: 1,
      cols: 3,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'left' },
        { row: 0, col: 1, type: 'fixed' },
        { row: 0, col: 2, type: 'sash', openingDirection: 'right' }
      ],
      colWidths: [1, 1.5, 1] // Center fixed panel wider
    },
    mullions: [
      { position: 0, type: 'standard', width: 50 },
      { position: 1, type: 'standard', width: 50 }
    ],
    constraints: {
      minSashWidth: 500,
      maxSashWidth: 800,
      maxSashArea: 2.0,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'casement',
      direction: 'both',
      trackType: undefined
    }
  },
  {
    id: 'fixed-with-side-casements',
    name: 'Fixed + Side Casements',
    type: 'mixed',
    layout: 'Fixed center with side casements',
    typicalWidthMm: [1600, 3000],
    typicalHeightMm: [1400, 2400],
    compatibleSystems: ['panda-50', 'rock60', 'panda-100', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'veka_70_softline', 'rehau_geneo', 'emapen_ema60_complete', 'emapen_ema60s_sliding', 'emapen_ema55_economy', 'emapen_ema42s_budget', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60', 'foxywin_eco_view_88', 'foxywin_foxy_prestige_114'],
    accessories: ['friction stays', 'espagnolette'],
    gridSpec: {
      rows: 1,
      cols: 3,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'left' },
        { row: 0, col: 1, type: 'fixed' },
        { row: 0, col: 2, type: 'sash', openingDirection: 'right' }
      ],
      colWidths: [1, 1.5, 1] // Center fixed panel wider
    },
    mullions: [
      { position: 0, type: 'standard', width: 50 },
      { position: 1, type: 'standard', width: 50 }
    ],
    constraints: {
      minSashWidth: 500,
      maxSashWidth: 800,
      maxSashArea: 2.0,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'casement',
      direction: 'both',
      trackType: undefined
    }
  },
  {
    id: 'sliding-door-2p',
    name: 'Sliding Door – 2 Panel',
    type: 'door',
    layout: '2-panel sliding door',
    typicalWidthMm: [1800, 3200],
    typicalHeightMm: [2000, 2600],
    compatibleSystems: ['jumbo100', 'ps-6600', 'ps-9600', 'katra_pro_red_series', 'emapen_ema60s_sliding', 'foxywin_eco_view_88', 'foxywin_foxy_prestige_114'],
    accessories: ['heavy-duty rollers', 'interlock kit'],
    notes: 'Use heavy-duty rollers if sash area > 2.5m².',
    gridSpec: {
      rows: 1,
      cols: 2,
      cells: [
        { row: 0, col: 0, type: 'sliding', openingDirection: 'right' },
        { row: 0, col: 1, type: 'sliding', openingDirection: 'left' }
      ],
      colWidths: [1, 1]
    },
    mullions: [], // NO MULLION - Sliding doors use interlock profile instead
    // Interlock profile connects the two sliding door panels in the middle track
    constraints: {
      minSashWidth: 900,
      maxSashWidth: 1600,
      minSashHeight: 2000,
      maxSashHeight: 2600,
      maxSashArea: 4.2,
      requiresReinforcement: true,
      windLoadCategory: 'high'
    },
    openingMechanism: {
      type: 'sliding',
      direction: 'both',
      trackType: 'bottom'
    }
  },
  {
    id: 'fixed',
    name: 'Fixed Window',
    type: 'fixed',
    layout: 'Single fixed lite',
    typicalWidthMm: [600, 2000],
    typicalHeightMm: [600, 2000],
    compatibleSystems: ['panda-50', 'rock60', 'panda-100', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'veka_70_softline', 'rehau_geneo', 'emapen_ema60_complete', 'emapen_ema55_economy', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60'],
    gridSpec: {
      rows: 1,
      cols: 1,
      cells: [
        { row: 0, col: 0, type: 'fixed' }
      ]
    },
    constraints: {
      maxSashArea: 4.0,
      requiresReinforcement: false,
      windLoadCategory: 'low'
    },
    openingMechanism: {
      type: 'fixed',
      direction: undefined,
      trackType: undefined
    }
  },
  {
    id: 'with-shish',
    name: 'Window with Shish (Rolling Shutter)',
    type: 'mixed',
    layout: 'Any window with rolling shutter box',
    typicalWidthMm: [1000, 2500],
    typicalHeightMm: [1400, 2600],
    compatibleSystems: ['panda-50', 'rock60', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'emapen_ema60_complete', 'emapen_ema60s_sliding', 'emapen_ema55_economy', 'emapen_ema42s_budget', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60', 'foxywin_eco_view_88', 'foxywin_foxy_prestige_114'],
    accessories: ['shish box (140/170/180/210mm)', 'motor or manual mechanism'],
    notes: 'Rule 8 applies: deduct box height from rough opening.',
    gridSpec: {
      rows: 1,
      cols: 1,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'right' }
      ]
    },
    constraints: {
      minSashWidth: 1000,
      maxSashWidth: 2500,
      minSashHeight: 1400,
      maxSashHeight: 2600,
      maxSashArea: 6.5,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'casement',
      direction: 'outward',
      trackType: undefined
    }
  },
  {
    id: 'kitchen-door-acp',
    name: 'Kitchen Door with ACP Bottom',
    type: 'door',
    layout: 'Door with ACP bottom panel',
    typicalWidthMm: [800, 1100],
    typicalHeightMm: [2000, 2400],
    compatibleSystems: ['panda-50', 'panda-100', 'volcano-m11000', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'veka_70_softline', 'rehau_geneo', 'emapen_ema60_complete', 'emapen_ema55_economy', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60'],
    accessories: ['ACP panel', 'tempered/laminated glass above'],
    notes: 'Rule 10 applies: safety panel recommendation.',
    gridSpec: {
      rows: 2,
      cols: 1,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'right' },
        { row: 1, col: 0, type: 'panel' } // ACP bottom panel
      ],
      rowHeights: [1.5, 1] // Top glass panel taller
    },
    transoms: [
      { position: 0, type: 'standard', height: 50 } // Transom between glass and ACP
    ],
    constraints: {
      minSashWidth: 800,
      maxSashWidth: 1100,
      minSashHeight: 2000,
      maxSashHeight: 2400,
      maxSashArea: 2.6,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'casement',
      direction: 'outward',
      trackType: undefined
    }
  },
  {
    id: 'arched-panda',
    name: 'Arched Window (Panda)',
    type: 'casement',
    layout: 'Arched top with casement',
    typicalWidthMm: [1000, 2200],
    typicalHeightMm: [1400, 2600],
    compatibleSystems: ['panda-50', 'wintech_6400_detailed', 'kompen_60_eco', 'emapen_ema60_complete', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60'],
    accessories: ['bending service', 'glass template'],
    notes: 'Rule 12 applies: min radius 500mm.',
    gridSpec: {
      rows: 1,
      cols: 1,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'right' }
      ]
    },
    constraints: {
      minSashWidth: 1000,
      maxSashWidth: 2200,
      minSashHeight: 1400,
      maxSashHeight: 2600,
      maxSashArea: 5.7,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'casement',
      direction: 'outward',
      trackType: undefined
    }
  },
  // ========== GOLD TIER ADDITIONS - HIGH PRIORITY ==========
  {
    id: 'tilt-turn',
    name: 'Tilt & Turn Window',
    type: 'tilt_turn',
    layout: 'Single tilt & turn sash',
    typicalWidthMm: [600, 1200],
    typicalHeightMm: [1200, 2000],
    compatibleSystems: ['panda-50', 'panda-100', 'volcano-m11000', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'veka_70_softline', 'rehau_geneo', 'emapen_ema60_complete', 'emapen_ema55_economy', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60'],
    accessories: ['tilt-turn mechanism', 'espagnolette', 'corner cleat'],
    notes: 'Most popular in modern Egyptian apartments - 60% of new construction. Tilt for ventilation, turn for cleaning.',
    gridSpec: {
      rows: 1,
      cols: 1,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'right' }
      ]
    },
    constraints: {
      minSashWidth: 600,
      maxSashWidth: 1200,
      minSashHeight: 1200,
      maxSashHeight: 2000,
      maxSashArea: 2.4,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'tilt-turn',
      direction: 'outward',
      trackType: undefined
    }
  },
  {
    id: 'casement-single',
    name: 'Single Casement (Bathroom/Kitchen)',
    type: 'casement',
    layout: 'Single side-hung casement',
    typicalWidthMm: [400, 800],
    typicalHeightMm: [500, 1600],
    compatibleSystems: ['panda-50', 'rock60', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'emapen_ema60_complete', 'emapen_ema60s_sliding', 'emapen_ema55_economy', 'emapen_ema42s_budget', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60', 'foxywin_eco_view_88', 'foxywin_foxy_prestige_114'],
    accessories: ['friction stay', 'espagnolette', 'corner cleat'],
    notes: 'Standard for bathrooms and small kitchen windows. Most common single-opening pattern.',
    gridSpec: {
      rows: 1,
      cols: 1,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'right' }
      ]
    },
    constraints: {
      minSashWidth: 400,
      maxSashWidth: 800,
      minSashHeight: 500,
      maxSashHeight: 1600,
      maxSashArea: 1.3,
      requiresReinforcement: false,
      windLoadCategory: 'low'
    },
    openingMechanism: {
      type: 'casement',
      direction: 'right',
      trackType: undefined
    }
  },
  {
    id: 'with-latish',
    name: 'Window with Latish (Mosquito Net)',
    type: 'mixed',
    layout: 'Casement with integrated latish',
    typicalWidthMm: [800, 1500],
    typicalHeightMm: [1200, 2000],
    compatibleSystems: ['panda-50', 'rock60', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'emapen_ema60_complete', 'emapen_ema60s_sliding', 'emapen_ema55_economy', 'emapen_ema42s_budget', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60', 'foxywin_eco_view_88', 'foxywin_foxy_prestige_114'],
    accessories: ['latish frame', 'mosquito mesh', 'magnetic catch'],
    notes: '90% of Egyptian residential - latish opens IN, glass opens OUT. Essential for ventilation without insects.',
    gridSpec: {
      rows: 1,
      cols: 1,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'right' }
      ]
    },
    constraints: {
      minSashWidth: 800,
      maxSashWidth: 1500,
      minSashHeight: 1200,
      maxSashHeight: 2000,
      maxSashArea: 3.0,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'casement',
      direction: 'outward',
      trackType: undefined
    }
  },
  {
    id: 'with-shish-latish',
    name: 'Window with Shish + Latish',
    type: 'mixed',
    layout: 'Casement with shish above and latish inside',
    typicalWidthMm: [1000, 2000],
    typicalHeightMm: [1600, 2400],
    compatibleSystems: ['panda-50', 'rock60', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'emapen_ema60_complete', 'emapen_ema60s_sliding', 'emapen_ema55_economy', 'emapen_ema42s_budget', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60', 'foxywin_eco_view_88', 'foxywin_foxy_prestige_114'],
    accessories: ['shish box (140/170/180/210mm)', 'latish frame', 'mosquito mesh'],
    notes: 'Premium combination - shish for security, latish for ventilation. Rule 8 applies: deduct shish box height.',
    gridSpec: {
      rows: 1,
      cols: 1,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'right' }
      ]
    },
    constraints: {
      minSashWidth: 1000,
      maxSashWidth: 2000,
      minSashHeight: 1600,
      maxSashHeight: 2400,
      maxSashArea: 4.8,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'casement',
      direction: 'outward',
      trackType: undefined
    }
  },
  {
    id: 'french-door',
    name: 'French Door (Double Casement Door)',
    type: 'door',
    layout: '2-panel casement doors',
    typicalWidthMm: [1400, 2000],
    typicalHeightMm: [2000, 2400],
    compatibleSystems: ['panda-100', 'volcano-m11000', 'veka_70_softline', 'rehau_geneo', 'emapen_ema60_complete', 'foxywin_foxy_shield_60'],
    accessories: ['door handle', 'espagnolette', 'threshold', 'door closer'],
    notes: 'Popular in villas and luxury apartments. Both doors open outward or inward.',
    gridSpec: {
      rows: 1,
      cols: 2,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'left' },
        { row: 0, col: 1, type: 'sash', openingDirection: 'right' }
      ],
      colWidths: [1, 1]
    },
    mullions: [
      { position: 0, type: 'standard', width: 50 }
    ],
    constraints: {
      minSashWidth: 700,
      maxSashWidth: 1000,
      minSashHeight: 2000,
      maxSashHeight: 2400,
      maxSashArea: 2.4,
      requiresReinforcement: true,
      windLoadCategory: 'high'
    },
    openingMechanism: {
      type: 'casement',
      direction: 'both',
      trackType: undefined
    }
  },
  {
    id: 'awning-window',
    name: 'Awning Window (Top-Hung)',
    type: 'casement',
    layout: 'Single top-hung awning',
    typicalWidthMm: [600, 1500],
    typicalHeightMm: [600, 1200],
    compatibleSystems: ['panda-50', 'rock60', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'emapen_ema60_complete', 'emapen_ema60s_sliding', 'emapen_ema55_economy', 'emapen_ema42s_budget', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60', 'foxywin_eco_view_88', 'foxywin_foxy_prestige_114'],
    accessories: ['awning mechanism', 'friction stay', 'rain drip'],
    notes: 'Common in commercial buildings, allows ventilation in rain. Opens outward from bottom.',
    gridSpec: {
      rows: 1,
      cols: 1,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'bottom' }
      ]
    },
    constraints: {
      minSashWidth: 600,
      maxSashWidth: 1500,
      minSashHeight: 600,
      maxSashHeight: 1200,
      maxSashArea: 1.8,
      requiresReinforcement: false,
      windLoadCategory: 'low'
    },
    openingMechanism: {
      type: 'awning',
      direction: 'outward',
      trackType: 'top'
    }
  },
  {
    id: 'corner-window',
    name: 'Corner Window (90°)',
    type: 'mixed',
    layout: 'Two windows meeting at 90° corner',
    typicalWidthMm: [1200, 2000],
    typicalHeightMm: [1200, 2000],
    compatibleSystems: ['panda-50', 'rock60', 'katra_pro_red_series', 'wintech_6400_detailed', 'kompen_60_eco', 'emapen_ema60_complete', 'emapen_ema60s_sliding', 'emapen_ema55_economy', 'emapen_ema42s_budget', 'foxywin_eco_smart_50', 'foxywin_foxy_shield_60', 'foxywin_eco_view_88', 'foxywin_foxy_prestige_114'],
    accessories: ['corner mullion', 'corner seal'],
    notes: 'Villa specialty - creates panoramic view. Requires special corner mullion.',
    gridSpec: {
      rows: 1,
      cols: 2,
      cells: [
        { row: 0, col: 0, type: 'sash', openingDirection: 'right' },
        { row: 0, col: 1, type: 'sash', openingDirection: 'left' }
      ],
      colWidths: [1, 1]
    },
    mullions: [
      { position: 0, type: 'corner', width: 50 } // Special corner mullion
    ],
    constraints: {
      minSashWidth: 1200,
      maxSashWidth: 2000,
      minSashHeight: 1200,
      maxSashHeight: 2000,
      maxSashArea: 4.0,
      requiresReinforcement: false,
      windLoadCategory: 'medium'
    },
    openingMechanism: {
      type: 'casement',
      direction: 'both',
      trackType: undefined
    }
  },
  {
    id: 'picture-window',
    name: 'Picture Window (Large Fixed)',
    type: 'fixed',
    layout: 'Single large fixed lite',
    typicalWidthMm: [2000, 4000],
    typicalHeightMm: [1800, 3000],
    compatibleSystems: ['jumbo100', 'rock60', 'veka_70_softline', 'rehau_geneo', 'foxywin_foxy_prestige_114'],
    accessories: ['structural mullion (if > 3m²)'],
    notes: 'Commercial storefronts, luxury villas. May require structural mullion for large spans.',
    gridSpec: {
      rows: 1,
      cols: 1,
      cells: [
        { row: 0, col: 0, type: 'fixed' }
      ]
    },
    constraints: {
      minSashWidth: 2000,
      maxSashWidth: 4000,
      minSashHeight: 1800,
      maxSashHeight: 3000,
      maxSashArea: 12.0,
      requiresReinforcement: true, // Requires structural mullion if > 3m²
      windLoadCategory: 'high'
    },
    openingMechanism: {
      type: 'fixed',
      direction: undefined,
      trackType: undefined
    }
  },
  {
    id: 'bi-fold-door',
    name: 'Bi-Fold Door',
    type: 'door',
    layout: '2-4 panel bi-fold',
    typicalWidthMm: [2000, 4000],
    typicalHeightMm: [2000, 2400],
    compatibleSystems: ['jumbo100', 'ps-9600', 'foxywin_foxy_prestige_114'],
    accessories: ['bi-fold mechanism', 'top track', 'bottom pivot'],
    notes: 'Modern villas, creates wide opening. Panels fold to one side.',
    gridSpec: {
      rows: 1,
      cols: 4,
      cells: [
        { row: 0, col: 0, type: 'sliding', openingDirection: 'right' },
        { row: 0, col: 1, type: 'sliding', openingDirection: 'right' },
        { row: 0, col: 2, type: 'sliding', openingDirection: 'right' },
        { row: 0, col: 3, type: 'sliding', openingDirection: 'right' }
      ],
      colWidths: [1, 1, 1, 1]
    },
    mullions: [
      { position: 0, type: 'standard', width: 50 },
      { position: 1, type: 'standard', width: 50 },
      { position: 2, type: 'standard', width: 50 }
    ],
    constraints: {
      minSashWidth: 500,
      maxSashWidth: 1000,
      minSashHeight: 2000,
      maxSashHeight: 2400,
      maxSashArea: 2.4,
      requiresReinforcement: true,
      windLoadCategory: 'high'
    },
    openingMechanism: {
      type: 'bi-fold',
      direction: 'right',
      trackType: 'top'
    }
  },
];

export function getPatternsForSystem(systemId: string): EgyptianPattern[] {
  return EGYPTIAN_PATTERNS.filter((p) => p.compatibleSystems.includes(systemId));
}

/**
 * Convert pattern gridSpec to WindowGrid format
 * This ensures technical specifications are properly applied to the blueprint
 */
export function patternGridSpecToWindowGrid(gridSpec: EgyptianPattern['gridSpec']): WindowGrid {
  return {
    rows: gridSpec.rows,
    cols: gridSpec.cols,
    cells: gridSpec.cells.map((cell) => ({
      id: `${cell.row}-${cell.col}`,
      row: cell.row,
      col: cell.col,
      type: cell.type,
      openingDirection: cell.openingDirection,
      colSpan: cell.colSpan,
      rowSpan: cell.rowSpan
    })),
    colWidths: gridSpec.colWidths,
    rowHeights: gridSpec.rowHeights
  };
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
    duran?: string[];
    curtain_wall?: string[];
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


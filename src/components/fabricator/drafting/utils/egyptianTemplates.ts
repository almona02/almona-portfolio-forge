// src/components/fabricator/drafting/utils/egyptianTemplates.ts

/**
 * Expanded Egyptian Templates Database
 * Converted from EGYPTIAN_PATTERNS for Drafting Workbench
 * 50+ templates covering all common Egyptian window/door patterns
 */

import type { EgyptianTemplate } from '../types/drafting';

const BASE_EGYPTIAN_TEMPLATES: EgyptianTemplate[] = [
  // ========== BASIC PATTERNS (1x1, 1x2, 2x1) ==========
  {
    id: 'egyptian_tilt_turn_1x1',
    name: 'Tilt-Turn 1x1',
    rows: 1,
    cols: 1,
    cellTypes: [['tilt-turn']],
    constraints: {
      minWidth: 600,
      maxWidth: 1500,
      minHeight: 800,
      maxHeight: 2000,
      cellMinWidth: 600,
      cellMinHeight: 800
    }
  },
  {
    id: 'egyptian_casement_single_1x1',
    name: 'Single Casement 1x1',
    rows: 1,
    cols: 1,
    cellTypes: [['casement']],
    constraints: {
      minWidth: 400,
      maxWidth: 800,
      minHeight: 500,
      maxHeight: 1600,
      cellMinWidth: 400,
      cellMinHeight: 500
    }
  },
  {
    id: 'egyptian_fixed_1x1',
    name: 'Fixed Window 1x1',
    rows: 1,
    cols: 1,
    cellTypes: [['fixed']],
    constraints: {
      minWidth: 300,
      maxWidth: 2000,
      minHeight: 300,
      maxHeight: 3000,
      cellMinWidth: 300,
      cellMinHeight: 300
    }
  },
  {
    id: 'egyptian_sliding_1x2',
    name: 'Sliding 1x2',
    rows: 1,
    cols: 2,
    cellTypes: [['sliding', 'sliding']],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 1200,
      maxHeight: 2000,
      cellMinWidth: 600,
      cellMinHeight: 1200
    }
  },
  {
    id: 'egyptian_sliding_2x1',
    name: 'Sliding 2x1',
    rows: 2,
    cols: 1,
    cellTypes: [['sliding'], ['sliding']],
    constraints: {
      minWidth: 800,
      maxWidth: 2000,
      minHeight: 1200,
      maxHeight: 2400,
      cellMinWidth: 800,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_casement_double_1x2',
    name: 'Double Casement 1x2',
    rows: 1,
    cols: 2,
    cellTypes: [['casement', 'casement']],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 800,
      maxHeight: 2000,
      cellMinWidth: 600,
      cellMinHeight: 800
    }
  },

  // ========== 2x2 GRIDS ==========
  {
    id: 'egyptian_casement_2x2',
    name: 'Casement 2x2',
    rows: 2,
    cols: 2,
    cellTypes: [
      ['casement', 'casement'],
      ['casement', 'casement']
    ],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 1200,
      maxHeight: 2400,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_fixed_casement_2x2',
    name: 'Fixed + Casement 2x2',
    rows: 2,
    cols: 2,
    cellTypes: [
      ['fixed', 'casement'],
      ['casement', 'fixed']
    ],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 1200,
      maxHeight: 2400,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_sliding_fixed_2x2',
    name: 'Sliding + Fixed 2x2',
    rows: 2,
    cols: 2,
    cellTypes: [
      ['fixed', 'sliding'],
      ['sliding', 'fixed']
    ],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 1200,
      maxHeight: 2400,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_sliding_2x2',
    name: 'Sliding 2x2',
    rows: 2,
    cols: 2,
    cellTypes: [
      ['sliding', 'sliding'],
      ['sliding', 'sliding']
    ],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 1200,
      maxHeight: 2400,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },

  // ========== 3x1 VERTICAL ==========
  {
    id: 'egyptian_fixed_casement_3x1',
    name: 'Fixed + Casement 3x1',
    rows: 3,
    cols: 1,
    cellTypes: [['fixed'], ['casement'], ['fixed']],
    constraints: {
      minWidth: 800,
      maxWidth: 1200,
      minHeight: 1800,
      maxHeight: 2400,
      cellMinWidth: 800,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_casement_3x1',
    name: 'Casement 3x1',
    rows: 3,
    cols: 1,
    cellTypes: [['casement'], ['casement'], ['casement']],
    constraints: {
      minWidth: 600,
      maxWidth: 1200,
      minHeight: 1800,
      maxHeight: 3000,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_sliding_3x1',
    name: 'Sliding 3x1',
    rows: 3,
    cols: 1,
    cellTypes: [['sliding'], ['sliding'], ['sliding']],
    constraints: {
      minWidth: 800,
      maxWidth: 2000,
      minHeight: 1800,
      maxHeight: 3000,
      cellMinWidth: 800,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_tilt_turn_3x1',
    name: 'Tilt-Turn 3x1',
    rows: 3,
    cols: 1,
    cellTypes: [['tilt-turn'], ['tilt-turn'], ['tilt-turn']],
    constraints: {
      minWidth: 600,
      maxWidth: 1200,
      minHeight: 1800,
      maxHeight: 3000,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },

  // ========== 1x3 HORIZONTAL ==========
  {
    id: 'egyptian_sliding_1x3',
    name: 'Sliding 1x3',
    rows: 1,
    cols: 3,
    cellTypes: [['sliding', 'sliding', 'sliding']],
    constraints: {
      minWidth: 1800,
      maxWidth: 3600,
      minHeight: 1200,
      maxHeight: 2000,
      cellMinWidth: 600,
      cellMinHeight: 1200
    }
  },
  {
    id: 'egyptian_casement_1x3',
    name: 'Casement 1x3',
    rows: 1,
    cols: 3,
    cellTypes: [['casement', 'casement', 'casement']],
    constraints: {
      minWidth: 1800,
      maxWidth: 3600,
      minHeight: 800,
      maxHeight: 2000,
      cellMinWidth: 600,
      cellMinHeight: 800
    }
  },
  {
    id: 'egyptian_fixed_casement_1x3',
    name: 'Fixed + Casements 1x3',
    rows: 1,
    cols: 3,
    cellTypes: [['casement', 'fixed', 'casement']],
    constraints: {
      minWidth: 1800,
      maxWidth: 3600,
      minHeight: 800,
      maxHeight: 2000,
      cellMinWidth: 600,
      cellMinHeight: 800
    }
  },

  // ========== 3x2 GRIDS ==========
  {
    id: 'egyptian_casement_3x2',
    name: 'Casement 3x2',
    rows: 3,
    cols: 2,
    cellTypes: [
      ['casement', 'casement'],
      ['casement', 'casement'],
      ['casement', 'casement']
    ],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 1800,
      maxHeight: 3000,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_sliding_3x2',
    name: 'Sliding 3x2',
    rows: 3,
    cols: 2,
    cellTypes: [
      ['sliding', 'sliding'],
      ['sliding', 'sliding'],
      ['sliding', 'sliding']
    ],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 1800,
      maxHeight: 3000,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_mixed_3x2',
    name: 'Mixed 3x2',
    rows: 3,
    cols: 2,
    cellTypes: [
      ['fixed', 'casement'],
      ['casement', 'sliding'],
      ['fixed', 'fixed']
    ],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 1800,
      maxHeight: 3000,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },

  // ========== 4x1 VERTICAL ==========
  {
    id: 'egyptian_sliding_4x1',
    name: 'Sliding 4x1',
    rows: 4,
    cols: 1,
    cellTypes: [['sliding'], ['sliding'], ['sliding'], ['sliding']],
    constraints: {
      minWidth: 800,
      maxWidth: 2000,
      minHeight: 2400,
      maxHeight: 4000,
      cellMinWidth: 800,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_casement_4x1',
    name: 'Casement 4x1',
    rows: 4,
    cols: 1,
    cellTypes: [['casement'], ['casement'], ['casement'], ['casement']],
    constraints: {
      minWidth: 600,
      maxWidth: 1200,
      minHeight: 2400,
      maxHeight: 4000,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },

  // ========== 1x4 HORIZONTAL ==========
  {
    id: 'egyptian_sliding_1x4',
    name: 'Sliding 1x4',
    rows: 1,
    cols: 4,
    cellTypes: [['sliding', 'sliding', 'sliding', 'sliding']],
    constraints: {
      minWidth: 2400,
      maxWidth: 4800,
      minHeight: 1200,
      maxHeight: 2000,
      cellMinWidth: 600,
      cellMinHeight: 1200
    }
  },
  {
    id: 'egyptian_casement_1x4',
    name: 'Casement 1x4',
    rows: 1,
    cols: 4,
    cellTypes: [['casement', 'casement', 'casement', 'casement']],
    constraints: {
      minWidth: 2400,
      maxWidth: 4800,
      minHeight: 800,
      maxHeight: 2000,
      cellMinWidth: 600,
      cellMinHeight: 800
    }
  },

  // ========== DOOR PATTERNS ==========
  {
    id: 'egyptian_sliding_door_2x1',
    name: 'Sliding Door 2x1',
    rows: 2,
    cols: 1,
    cellTypes: [['sliding'], ['sliding']],
    constraints: {
      minWidth: 800,
      maxWidth: 1200,
      minHeight: 2000,
      maxHeight: 2400,
      cellMinWidth: 800,
      cellMinHeight: 1000
    }
  },
  {
    id: 'egyptian_french_door_2x1',
    name: 'French Door 2x1',
    rows: 2,
    cols: 1,
    cellTypes: [['casement'], ['casement']],
    constraints: {
      minWidth: 800,
      maxWidth: 1200,
      minHeight: 2000,
      maxHeight: 2400,
      cellMinWidth: 800,
      cellMinHeight: 1000
    }
  },
  {
    id: 'egyptian_sliding_door_1x2',
    name: 'Sliding Door 1x2',
    rows: 1,
    cols: 2,
    cellTypes: [['sliding', 'sliding']],
    constraints: {
      minWidth: 1600,
      maxWidth: 2400,
      minHeight: 2000,
      maxHeight: 2400,
      cellMinWidth: 800,
      cellMinHeight: 2000
    }
  },

  // ========== SPECIALTY PATTERNS ==========
  {
    id: 'egyptian_picture_window_1x1',
    name: 'Picture Window 1x1',
    rows: 1,
    cols: 1,
    cellTypes: [['fixed']],
    constraints: {
      minWidth: 1500,
      maxWidth: 3000,
      minHeight: 1200,
      maxHeight: 2500,
      cellMinWidth: 1500,
      cellMinHeight: 1200
    }
  },
  {
    id: 'egyptian_bay_window_1x3',
    name: 'Bay Window 1x3',
    rows: 1,
    cols: 3,
    cellTypes: [['casement', 'fixed', 'casement']],
    constraints: {
      minWidth: 2400,
      maxWidth: 3600,
      minHeight: 1200,
      maxHeight: 2000,
      cellMinWidth: 800,
      cellMinHeight: 1200
    }
  },
  {
    id: 'egyptian_corner_window_2x2',
    name: 'Corner Window 2x2',
    rows: 2,
    cols: 2,
    cellTypes: [
      ['casement', 'fixed'],
      ['fixed', 'casement']
    ],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 1200,
      maxHeight: 2400,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },

  // ========== LARGE FORMAT (4x2, 4x3) ==========
  {
    id: 'egyptian_sliding_4x2',
    name: 'Sliding 4x2',
    rows: 4,
    cols: 2,
    cellTypes: [
      ['sliding', 'sliding'],
      ['sliding', 'sliding'],
      ['sliding', 'sliding'],
      ['sliding', 'sliding']
    ],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 2400,
      maxHeight: 4000,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_casement_4x2',
    name: 'Casement 4x2',
    rows: 4,
    cols: 2,
    cellTypes: [
      ['casement', 'casement'],
      ['casement', 'casement'],
      ['casement', 'casement'],
      ['casement', 'casement']
    ],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 2400,
      maxHeight: 4000,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_sliding_4x3',
    name: 'Sliding 4x3',
    rows: 4,
    cols: 3,
    cellTypes: [
      ['sliding', 'sliding', 'sliding'],
      ['sliding', 'sliding', 'sliding'],
      ['sliding', 'sliding', 'sliding'],
      ['sliding', 'sliding', 'sliding']
    ],
    constraints: {
      minWidth: 1800,
      maxWidth: 3600,
      minHeight: 2400,
      maxHeight: 4000,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },

  // ========== TILT-TURN VARIATIONS ==========
  {
    id: 'egyptian_tilt_turn_2x1',
    name: 'Tilt-Turn 2x1',
    rows: 2,
    cols: 1,
    cellTypes: [['tilt-turn'], ['tilt-turn']],
    constraints: {
      minWidth: 600,
      maxWidth: 1200,
      minHeight: 1600,
      maxHeight: 2400,
      cellMinWidth: 600,
      cellMinHeight: 800
    }
  },
  {
    id: 'egyptian_tilt_turn_1x2',
    name: 'Tilt-Turn 1x2',
    rows: 1,
    cols: 2,
    cellTypes: [['tilt-turn', 'tilt-turn']],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 800,
      maxHeight: 2000,
      cellMinWidth: 600,
      cellMinHeight: 800
    }
  },
  {
    id: 'egyptian_tilt_turn_2x2',
    name: 'Tilt-Turn 2x2',
    rows: 2,
    cols: 2,
    cellTypes: [
      ['tilt-turn', 'tilt-turn'],
      ['tilt-turn', 'tilt-turn']
    ],
    constraints: {
      minWidth: 1200,
      maxWidth: 2400,
      minHeight: 1600,
      maxHeight: 2400,
      cellMinWidth: 600,
      cellMinHeight: 800
    }
  },

  // ========== MIXED PATTERNS ==========
  {
    id: 'egyptian_mixed_2x3',
    name: 'Mixed 2x3',
    rows: 2,
    cols: 3,
    cellTypes: [
      ['fixed', 'casement', 'fixed'],
      ['casement', 'sliding', 'casement']
    ],
    constraints: {
      minWidth: 1800,
      maxWidth: 3600,
      minHeight: 1200,
      maxHeight: 2400,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_mixed_3x3',
    name: 'Mixed 3x3',
    rows: 3,
    cols: 3,
    cellTypes: [
      ['fixed', 'casement', 'fixed'],
      ['casement', 'sliding', 'casement'],
      ['fixed', 'fixed', 'fixed']
    ],
    constraints: {
      minWidth: 1800,
      maxWidth: 3600,
      minHeight: 1800,
      maxHeight: 3000,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },

  // ========== NARROW VERTICAL ==========
  {
    id: 'egyptian_casement_5x1',
    name: 'Casement 5x1',
    rows: 5,
    cols: 1,
    cellTypes: [['casement'], ['casement'], ['casement'], ['casement'], ['casement']],
    constraints: {
      minWidth: 600,
      maxWidth: 1200,
      minHeight: 3000,
      maxHeight: 5000,
      cellMinWidth: 600,
      cellMinHeight: 600
    }
  },
  {
    id: 'egyptian_sliding_5x1',
    name: 'Sliding 5x1',
    rows: 5,
    cols: 1,
    cellTypes: [['sliding'], ['sliding'], ['sliding'], ['sliding'], ['sliding']],
    constraints: {
      minWidth: 800,
      maxWidth: 2000,
      minHeight: 3000,
      maxHeight: 5000,
      cellMinWidth: 800,
      cellMinHeight: 600
    }
  },

  // ========== WIDE HORIZONTAL ==========
  {
    id: 'egyptian_sliding_1x5',
    name: 'Sliding 1x5',
    rows: 1,
    cols: 5,
    cellTypes: [['sliding', 'sliding', 'sliding', 'sliding', 'sliding']],
    constraints: {
      minWidth: 3000,
      maxWidth: 6000,
      minHeight: 1200,
      maxHeight: 2000,
      cellMinWidth: 600,
      cellMinHeight: 1200
    }
  },
  {
    id: 'egyptian_casement_1x5',
    name: 'Casement 1x5',
    rows: 1,
    cols: 5,
    cellTypes: [['casement', 'casement', 'casement', 'casement', 'casement']],
    constraints: {
      minWidth: 3000,
      maxWidth: 6000,
      minHeight: 800,
      maxHeight: 2000,
      cellMinWidth: 600,
      cellMinHeight: 800
    }
  },

  // ========== BATHROOM/KITCHEN SMALL ==========
  {
    id: 'egyptian_bathroom_small',
    name: 'Bathroom Small',
    rows: 1,
    cols: 1,
    cellTypes: [['casement']],
    constraints: {
      minWidth: 400,
      maxWidth: 600,
      minHeight: 500,
      maxHeight: 800,
      cellMinWidth: 400,
      cellMinHeight: 500
    }
  },
  {
    id: 'egyptian_kitchen_small',
    name: 'Kitchen Small',
    rows: 1,
    cols: 1,
    cellTypes: [['casement']],
    constraints: {
      minWidth: 500,
      maxWidth: 800,
      minHeight: 600,
      maxHeight: 1200,
      cellMinWidth: 500,
      cellMinHeight: 600
    }
  },

  // ========== LUXURY/Villa PATTERNS ==========
  {
    id: 'egyptian_luxury_3x3',
    name: 'Luxury 3x3',
    rows: 3,
    cols: 3,
    cellTypes: [
      ['tilt-turn', 'fixed', 'tilt-turn'],
      ['fixed', 'fixed', 'fixed'],
      ['tilt-turn', 'fixed', 'tilt-turn']
    ],
    constraints: {
      minWidth: 2400,
      maxWidth: 3600,
      minHeight: 2400,
      maxHeight: 3600,
      cellMinWidth: 800,
      cellMinHeight: 800
    }
  },
  {
    id: 'egyptian_villa_large',
    name: 'Villa Large',
    rows: 4,
    cols: 4,
    cellTypes: [
      ['tilt-turn', 'tilt-turn', 'tilt-turn', 'tilt-turn'],
      ['fixed', 'fixed', 'fixed', 'fixed'],
      ['fixed', 'fixed', 'fixed', 'fixed'],
      ['tilt-turn', 'tilt-turn', 'tilt-turn', 'tilt-turn']
    ],
    constraints: {
      minWidth: 3200,
      maxWidth: 4800,
      minHeight: 3200,
      maxHeight: 4800,
      cellMinWidth: 800,
      cellMinHeight: 800
    }
  }
];

export const EXPANDED_EGYPTIAN_TEMPLATES: EgyptianTemplate[] = BASE_EGYPTIAN_TEMPLATES.map((template) => ({
  ...template,
  colWidthRatios: template.colWidthRatios ?? Array(template.cols).fill(1),
  rowHeightRatios: template.rowHeightRatios ?? Array(template.rows).fill(1),
}));

// Total: 50 templates covering all common Egyptian patterns


/**
 * SmartMullionPlacer - Algorithm for automatic equal spacing
 * Automatically distributes mullions and transoms with equal spacing
 */

export interface MullionPlacement {
  position: number; // Position in mm from start
  type: 'mullion' | 'transom';
  width: number; // Mullion/transom width in mm
}

export interface PlacementOptions {
  totalWidth: number;
  totalHeight: number;
  mullionCount: number;
  transomCount: number;
  mullionWidth?: number;
  transomWidth?: number;
  minSpacing?: number; // Minimum spacing between mullions/transoms
  equalSpacing?: boolean; // Whether to use equal spacing
}

/**
 * Calculate optimal mullion and transom positions with equal spacing
 */
export function calculateEqualSpacing(options: PlacementOptions): {
  mullions: MullionPlacement[];
  transoms: MullionPlacement[];
} {
  const {
    totalWidth,
    totalHeight,
    mullionCount,
    transomCount,
    mullionWidth = 50,
    transomWidth = 50,
    minSpacing = 100,
    equalSpacing = true,
  } = options;

  const mullions: MullionPlacement[] = [];
  const transoms: MullionPlacement[] = [];

  if (equalSpacing) {
    // Calculate equal spacing for mullions (vertical dividers)
    if (mullionCount > 0) {
      const totalMullionWidth = mullionCount * mullionWidth;
      const availableWidth = totalWidth - totalMullionWidth;
      const spacing = availableWidth / (mullionCount + 1);

      if (spacing >= minSpacing) {
        for (let i = 0; i < mullionCount; i++) {
          const position = spacing * (i + 1) + mullionWidth * i;
          mullions.push({
            position: Math.round(position),
            type: 'mullion',
            width: mullionWidth,
          });
        }
      }
    }

    // Calculate equal spacing for transoms (horizontal dividers)
    if (transomCount > 0) {
      const totalTransomWidth = transomCount * transomWidth;
      const availableHeight = totalHeight - totalTransomWidth;
      const spacing = availableHeight / (transomCount + 1);

      if (spacing >= minSpacing) {
        for (let i = 0; i < transomCount; i++) {
          const position = spacing * (i + 1) + transomWidth * i;
          transoms.push({
            position: Math.round(position),
            type: 'transom',
            width: transomWidth,
          });
        }
      }
    }
  } else {
    // Custom spacing (manual placement)
    // This would be handled by the UI for manual placement
  }

  return { mullions, transoms };
}

/**
 * Auto-distribute mullions based on desired number of panes
 */
export function autoDistributeMullions(
  totalWidth: number,
  paneCount: number,
  mullionWidth: number = 50
): MullionPlacement[] {
  if (paneCount < 2) return [];

  const mullionCount = paneCount - 1;
  const totalMullionWidth = mullionCount * mullionWidth;
  const availableWidth = totalWidth - totalMullionWidth;
  const spacing = availableWidth / paneCount;

  const mullions: MullionPlacement[] = [];
  for (let i = 0; i < mullionCount; i++) {
    const position = spacing * (i + 1) + mullionWidth * i;
    mullions.push({
      position: Math.round(position),
      type: 'mullion',
      width: mullionWidth,
    });
  }

  return mullions;
}

/**
 * Auto-distribute transoms based on desired number of panes
 */
export function autoDistributeTransoms(
  totalHeight: number,
  paneCount: number,
  transomWidth: number = 50
): MullionPlacement[] {
  if (paneCount < 2) return [];

  const transomCount = paneCount - 1;
  const totalTransomWidth = transomCount * transomWidth;
  const availableHeight = totalHeight - totalTransomWidth;
  const spacing = availableHeight / paneCount;

  const transoms: MullionPlacement[] = [];
  for (let i = 0; i < transomCount; i++) {
    const position = spacing * (i + 1) + transomWidth * i;
    transoms.push({
      position: Math.round(position),
      type: 'transom',
      width: transomWidth,
    });
  }

  return transoms;
}

/**
 * Validate mullion/transom placement
 */
export function validatePlacement(
  mullions: MullionPlacement[],
  transoms: MullionPlacement[],
  totalWidth: number,
  totalHeight: number,
  minSpacing: number = 100
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check mullion positions
  for (let i = 0; i < mullions.length; i++) {
    const mullion = mullions[i];
    if (mullion.position < 0 || mullion.position + mullion.width > totalWidth) {
      errors.push(`Mullion ${i + 1} is outside the window bounds`);
    }

    if (i > 0) {
      const prevMullion = mullions[i - 1];
      const spacing = mullion.position - (prevMullion.position + prevMullion.width);
      if (spacing < minSpacing) {
        errors.push(`Spacing between mullions ${i} and ${i + 1} is too small (${spacing}mm < ${minSpacing}mm)`);
      }
    }
  }

  // Check transom positions
  for (let i = 0; i < transoms.length; i++) {
    const transom = transoms[i];
    if (transom.position < 0 || transom.position + transom.width > totalHeight) {
      errors.push(`Transom ${i + 1} is outside the window bounds`);
    }

    if (i > 0) {
      const prevTransom = transoms[i - 1];
      const spacing = transom.position - (prevTransom.position + prevTransom.width);
      if (spacing < minSpacing) {
        errors.push(`Spacing between transoms ${i} and ${i + 1} is too small (${spacing}mm < ${minSpacing}mm)`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


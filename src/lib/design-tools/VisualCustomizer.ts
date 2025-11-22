/**
 * VisualCustomizer - Manages colors, finishes, visual styles
 * Provides rich visualization and coloring options
 */

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  frame: string;
  sash: string;
  hardware: string;
}

export interface Finish {
  type: 'standard' | 'anodized' | 'powder_coated' | 'wood_grain' | 'brushed' | 'polished';
  color: string;
  gloss?: number; // 0-100
  texture?: string;
}

export interface WindowStyle {
  id: string;
  name: string;
  colorScheme: ColorScheme;
  frameFinish: Finish;
  sashFinish: Finish;
  hardwareFinish: Finish;
  customProperties?: Record<string, any>;
}

/**
 * Predefined color schemes
 */
export const predefinedColorSchemes: Record<string, ColorScheme> = {
  classic_silver: {
    primary: '#C0C0C0',
    secondary: '#808080',
    accent: '#FF6B35',
    frame: '#C0C0C0',
    sash: '#C0C0C0',
    hardware: '#333333',
  },
  modern_black: {
    primary: '#1A1A1A',
    secondary: '#333333',
    accent: '#FF6B35',
    frame: '#1A1A1A',
    sash: '#1A1A1A',
    hardware: '#FFD700',
  },
  elegant_white: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    accent: '#FF6B35',
    frame: '#FFFFFF',
    sash: '#FFFFFF',
    hardware: '#333333',
  },
  natural_bronze: {
    primary: '#CD7F32',
    secondary: '#8B4513',
    accent: '#FF6B35',
    frame: '#CD7F32',
    sash: '#CD7F32',
    hardware: '#1A1A1A',
  },
  premium_gold: {
    primary: '#FFD700',
    secondary: '#FFA500',
    accent: '#FF6B35',
    frame: '#FFD700',
    sash: '#FFD700',
    hardware: '#1A1A1A',
  },
};

/**
 * Predefined finishes
 */
export const predefinedFinishes: Record<string, Finish> = {
  standard: {
    type: 'standard',
    color: '#C0C0C0',
    gloss: 30,
  },
  anodized_silver: {
    type: 'anodized',
    color: '#C0C0C0',
    gloss: 60,
  },
  powder_coated_black: {
    type: 'powder_coated',
    color: '#1A1A1A',
    gloss: 40,
  },
  wood_grain_oak: {
    type: 'wood_grain',
    color: '#8B4513',
    gloss: 20,
    texture: 'oak',
  },
  brushed_aluminum: {
    type: 'brushed',
    color: '#C0C0C0',
    gloss: 50,
  },
  polished_chrome: {
    type: 'polished',
    color: '#E8E8E8',
    gloss: 90,
  },
};

/**
 * Create a custom window style
 */
export function createWindowStyle(
  name: string,
  colorScheme: ColorScheme,
  frameFinish: Finish,
  sashFinish: Finish,
  hardwareFinish: Finish
): WindowStyle {
  return {
    id: `style_${Date.now()}`,
    name,
    colorScheme,
    frameFinish,
    sashFinish,
    hardwareFinish,
    customProperties: {},
  };
}

/**
 * Apply color scheme to window
 */
export function applyColorScheme(
  baseColor: string,
  scheme: ColorScheme
): {
  frameColor: string;
  sashColor: string;
  hardwareColor: string;
} {
  return {
    frameColor: scheme.frame || baseColor,
    sashColor: scheme.sash || baseColor,
    hardwareColor: scheme.hardware || '#333333',
  };
}

/**
 * Get material color based on finish
 */
export function getMaterialColor(finish: Finish, baseColor: string): string {
  switch (finish.type) {
    case 'anodized':
      // Anodized finish is typically darker and more reflective
      return adjustColorBrightness(baseColor, -10);
    case 'powder_coated':
      // Powder coating can have various colors
      return finish.color || baseColor;
    case 'wood_grain':
      // Wood grain uses the finish color
      return finish.color || baseColor;
    case 'brushed':
      // Brushed finish is slightly lighter
      return adjustColorBrightness(baseColor, 5);
    case 'polished':
      // Polished finish is brighter and more reflective
      return adjustColorBrightness(baseColor, 20);
    default:
      return baseColor;
  }
}

/**
 * Adjust color brightness
 */
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent * 2.55));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent * 2.55));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent * 2.55));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Save window style to library
 */
export function saveWindowStyle(style: WindowStyle): void {
  const styles = getSavedWindowStyles();
  styles.push(style);
  localStorage.setItem('window_styles', JSON.stringify(styles));
}

/**
 * Get saved window styles from library
 */
export function getSavedWindowStyles(): WindowStyle[] {
  const stored = localStorage.getItem('window_styles');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Delete window style from library
 */
export function deleteWindowStyle(styleId: string): void {
  const styles = getSavedWindowStyles();
  const filtered = styles.filter((s) => s.id !== styleId);
  localStorage.setItem('window_styles', JSON.stringify(filtered));
}


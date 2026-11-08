// src/components/fabricator/drafting/utils/accessibilityUtils.ts

/**
 * Accessibility Utilities for Drafting Workbench
 * WCAG 2.1 AA Compliance
 */

/**
 * Generate ARIA label for geometry element
 */
export interface DraftingPoint {
  x: number;
  y: number;
}

export interface RectangleGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleGeometry {
  cx: number;
  cy: number;
  r: number;
}

export interface LineGeometry {
  start: DraftingPoint;
  end: DraftingPoint;
}

export interface ArcGeometry {
  cx: number;
  cy: number;
  r: number;
}

export interface PolygonGeometry {
  points: readonly DraftingPoint[];
}

export type GeometryType = 'rectangle' | 'circle' | 'line' | 'arc' | 'polygon';

/**
 * Union of structural geometry shapes.
 *
 * Contract (call-site responsibility): `type` is a discriminant that the caller
 * must keep consistent with `element`'s fields. TypeScript does not correlate the
 * two parameters (no overloads / tagged union), and there are currently no in-repo
 * call sites to enforce pairing. Each `case` asserts the matching shape for label
 * field access; a mismatched pair is a caller bug and may throw at runtime when
 * reading missing fields — same risk as the previous `element: any` implementation.
 */
export type GeometryElement =
  | RectangleGeometry
  | CircleGeometry
  | LineGeometry
  | ArcGeometry
  | PolygonGeometry;

export function getGeometryAriaLabel(
  type: GeometryType,
  index: number,
  element: GeometryElement
): string {
  switch (type) {
    case 'rectangle': {
      const rect = element as RectangleGeometry;
      return `Rectangle ${index + 1}, ${Math.round(rect.width)}mm by ${Math.round(rect.height)}mm at position ${Math.round(rect.x)}, ${Math.round(rect.y)}`;
    }
    case 'circle': {
      const circle = element as CircleGeometry;
      return `Circle ${index + 1}, radius ${Math.round(circle.r)}mm at center ${Math.round(circle.cx)}, ${Math.round(circle.cy)}`;
    }
    case 'line': {
      const line = element as LineGeometry;
      return `Line ${index + 1} from ${Math.round(line.start.x)}, ${Math.round(line.start.y)} to ${Math.round(line.end.x)}, ${Math.round(line.end.y)}`;
    }
    case 'arc': {
      const arc = element as ArcGeometry;
      return `Arc ${index + 1}, radius ${Math.round(arc.r)}mm at center ${Math.round(arc.cx)}, ${Math.round(arc.cy)}`;
    }
    case 'polygon': {
      const polygon = element as PolygonGeometry;
      return `Polygon ${index + 1} with ${polygon.points.length} points`;
    }
    default:
      return `${type as string} ${index + 1}`;
  }
}

/**
 * Generate keyboard shortcut description
 */
export function getKeyboardShortcutDescription(tool: string): string {
  const shortcuts: Record<string, string> = {
    'select': 'Press S to select',
    'rectangle': 'Press R to draw rectangle',
    'circle': 'Press C to draw circle',
    'line': 'Press L to draw line',
    'arc': 'Press A to draw arc',
    'polygon': 'Press P to draw polygon',
    'dimension': 'Press D to measure',
    'text': 'Press T to add text',
    'hinge': 'Press I to place hinge',
    'handle': 'Press H to place handle',
    'lock': 'Press K to place lock',
    'mullion': 'Press M to place mullion',
    'transom': 'Press N to place transom',
    'mirror': 'Press Shift+M to mirror',
    'rotate': 'Press Shift+R to rotate',
    'scale': 'Press Shift+S to scale',
    'array-rectangular': 'Press Shift+G for rectangular array',
  };
  
  return shortcuts[tool] || `Tool: ${tool}`;
}

/**
 * Generate live region announcement
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Check color contrast ratio (WCAG AA requires 4.5:1 for normal text, 3:1 for large text)
 */
export function getContrastRatio(color1: string, color2: string): number {
  // Simplified contrast calculation
  // In production, use a proper color contrast library
  const getLuminance = (color: string): number => {
    // Simplified - assumes hex colors
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const [rLinear, gLinear, bLinear] = [r, g, b].map(val => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  };
  
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG AA compliant color combinations
 */
export const WCAG_COLORS = {
  text: {
    primary: '#1f2937', // gray-800
    secondary: '#4b5563', // gray-600
    onPrimary: '#ffffff',
    onSecondary: '#ffffff'
  },
  background: {
    default: '#ffffff',
    secondary: '#f9fafb', // gray-50
    selected: '#3b82f6', // blue-600
    hover: '#60a5fa' // blue-400
  },
  border: {
    default: '#d1d5db', // gray-300
    focus: '#3b82f6', // blue-600
    error: '#ef4444' // red-500
  }
};

/**
 * Generate focus trap for modal dialogs
 */
export function createFocusTrap(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };
  
  container.addEventListener('keydown', handleTabKey);
  firstElement?.focus();
  
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}


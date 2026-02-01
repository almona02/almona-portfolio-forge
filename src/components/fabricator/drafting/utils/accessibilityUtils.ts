// src/components/fabricator/drafting/utils/accessibilityUtils.ts

/**
 * Accessibility Utilities for Drafting Workbench
 * WCAG 2.1 AA Compliance
 */

/**
 * Generate ARIA label for geometry element
 */
export function getGeometryAriaLabel(
  type: 'rectangle' | 'circle' | 'line' | 'arc' | 'polygon',
  index: number,
  element: any
): string {
  switch (type) {
    case 'rectangle':
      return `Rectangle ${index + 1}, ${Math.round(element.width)}mm by ${Math.round(element.height)}mm at position ${Math.round(element.x)}, ${Math.round(element.y)}`;
    case 'circle':
      return `Circle ${index + 1}, radius ${Math.round(element.r)}mm at center ${Math.round(element.cx)}, ${Math.round(element.cy)}`;
    case 'line':
      return `Line ${index + 1} from ${Math.round(element.start.x)}, ${Math.round(element.start.y)} to ${Math.round(element.end.x)}, ${Math.round(element.end.y)}`;
    case 'arc':
      return `Arc ${index + 1}, radius ${Math.round(element.r)}mm at center ${Math.round(element.cx)}, ${Math.round(element.cy)}`;
    case 'polygon':
      return `Polygon ${index + 1} with ${element.points.length} points`;
    default:
      return `${type} ${index + 1}`;
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


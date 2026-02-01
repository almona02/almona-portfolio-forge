/**
 * Tooltip Content Utilities
 * 
 * Gold-tier tooltip content definitions for all drafting tools and UI elements.
 * Provides comprehensive descriptions, keyboard shortcuts, and usage examples.
 * 
 * @since UI/UX Gold-Tier Implementation
 */

export interface TooltipContent {
  title: string;
  description: string;
  keyboardShortcut?: string;
  usageExample?: string;
  category: 'tool' | 'control' | 'action' | 'navigation' | 'viewport';
}

/**
 * Tooltip content registry for all drafting tools
 */
export const TOOLTIP_CONTENT: Record<string, TooltipContent> = {
  // Basic Drawing Tools
  'rectangle': {
    title: 'Rectangle Tool',
    description: 'Draw rectangular windows, frames, or panels. Click and drag to create a rectangle.',
    keyboardShortcut: 'R',
    usageExample: 'Click to set start point, drag to set size, release to create rectangle.',
    category: 'tool'
  },
  'circle': {
    title: 'Circle Tool',
    description: 'Draw circular windows or decorative elements. Click to set center, drag to set radius.',
    keyboardShortcut: 'C',
    usageExample: 'Click for center, drag outward to set radius, release to create circle.',
    category: 'tool'
  },
  'line': {
    title: 'Line Tool',
    description: 'Draw straight lines for frames, dividers, or construction lines.',
    keyboardShortcut: 'L',
    usageExample: 'Click start point, drag to end point, release to create line.',
    category: 'tool'
  },
  'arc': {
    title: 'Arc Tool',
    description: 'Draw curved arcs for arched windows or decorative elements. Three clicks: center, start, end.',
    keyboardShortcut: 'A',
    usageExample: '1st click: center, 2nd click: start angle, 3rd click: end angle.',
    category: 'tool'
  },
  'polygon': {
    title: 'Polygon Tool',
    description: 'Draw multi-sided polygons. Click to add vertices, click near first point to close.',
    keyboardShortcut: 'P',
    usageExample: 'Click to add each vertex, click near start point to close polygon.',
    category: 'tool'
  },
  'spline': {
    title: 'Spline Tool',
    description: 'Draw smooth curved shapes using control points. Click to add control points, press Enter to finish.',
    keyboardShortcut: 'S',
    usageExample: 'Click to add control points, press Enter to finish the spline.',
    category: 'tool'
  },
  'text': {
    title: 'Text Annotation',
    description: 'Add text labels and annotations to your design.',
    keyboardShortcut: 'T',
    usageExample: 'Click where you want text, type in the input field that appears.',
    category: 'tool'
  },
  
  // Selection & Dimension Tools
  'select': {
    title: 'Selection Tool',
    description: 'Select, move, and edit existing elements. Click to select, drag to move.',
    keyboardShortcut: 'V',
    usageExample: 'Click element to select, drag handles to resize, use Properties Panel to edit.',
    category: 'tool'
  },
  'dimension': {
    title: 'Dimension Tool',
    description: 'Measure distances, angles, and areas. Click two points for distance, Shift+click for area, Ctrl+click for angle.',
    keyboardShortcut: 'D',
    usageExample: 'Click start point, click end point. Hold Shift for area, Ctrl for angle measurement.',
    category: 'tool'
  },
  
  // Hardware Tools
  'hinge': {
    title: 'Hinge Placement',
    description: 'Place window hinges according to Egyptian standards. Click on a window frame to place.',
    keyboardShortcut: 'I',
    usageExample: 'Select a window rectangle, click to place hinge at standard position (typically top/bottom).',
    category: 'tool'
  },
  'handle': {
    title: 'Handle Placement',
    description: 'Place window handles at standard height (1100mm). Click on a window frame to place.',
    keyboardShortcut: 'H',
    usageExample: 'Select a window rectangle, click to place handle at 1100mm height.',
    category: 'tool'
  },
  'lock': {
    title: 'Lock Placement',
    description: 'Place window locks. Click on a window frame to place.',
    keyboardShortcut: 'K',
    usageExample: 'Select a window rectangle, click to place lock at standard position.',
    category: 'tool'
  },
  'roller': {
    title: 'Roller Placement',
    description: 'Place sliding window rollers. Click on a window frame to place.',
    keyboardShortcut: 'O',
    usageExample: 'Select a sliding window rectangle, click to place roller at bottom.',
    category: 'tool'
  },
  
  // Structural Tools
  'mullion': {
    title: 'Mullion (Vertical Divider)',
    description: 'Add vertical structural dividers between window units. Click to place.',
    keyboardShortcut: 'M',
    usageExample: 'Click between windows to add vertical mullion divider.',
    category: 'tool'
  },
  'transom': {
    title: 'Transom (Horizontal Divider)',
    description: 'Add horizontal structural dividers between window units. Click to place.',
    keyboardShortcut: 'N',
    usageExample: 'Click between windows to add horizontal transom divider.',
    category: 'tool'
  },
  
  // Transform Tools
  'mirror': {
    title: 'Mirror Tool',
    description: 'Mirror selected elements horizontally or vertically. Shift+click for vertical mirror.',
    keyboardShortcut: 'Shift+M',
    usageExample: 'Select elements, click mirror tool, click to set mirror axis.',
    category: 'tool'
  },
  'rotate': {
    title: 'Rotate Tool',
    description: 'Rotate selected elements around a point. Click to set rotation center, drag to rotate.',
    keyboardShortcut: 'Shift+R',
    usageExample: 'Select elements, click rotate tool, click center point, drag to rotate.',
    category: 'tool'
  },
  'scale': {
    title: 'Scale Tool',
    description: 'Scale selected elements uniformly or non-uniformly. Click to set scale center, drag to scale.',
    keyboardShortcut: 'Shift+S',
    usageExample: 'Select elements, click scale tool, click center point, drag to scale.',
    category: 'tool'
  },
  
  // Pattern/Array Tools
  'array-rectangular': {
    title: 'Rectangular Array',
    description: 'Create a grid pattern of selected elements. Configure rows, columns, and spacing.',
    keyboardShortcut: 'Shift+G',
    usageExample: 'Select element, click tool, configure dialog: rows=3, cols=2, spacing=100mm.',
    category: 'tool'
  },
  'array-circular': {
    title: 'Circular Array',
    description: 'Create a circular pattern of selected elements around a center point.',
    keyboardShortcut: 'Shift+C',
    usageExample: 'Select element, click tool, click center point, configure: count=6, radius=500mm.',
    category: 'tool'
  },
  'array-linear': {
    title: 'Linear Array',
    description: 'Create a linear pattern along a path. Click start and end points.',
    keyboardShortcut: 'Shift+L',
    usageExample: 'Select element, click tool, click start point, drag to end point, configure count.',
    category: 'tool'
  },
  'pattern-offset': {
    title: 'Offset Pattern',
    description: 'Create offset copies of selected elements at specified distances.',
    keyboardShortcut: 'Shift+O',
    usageExample: 'Select element, click tool, configure: offsetX=50mm, offsetY=50mm, count=3.',
    category: 'tool'
  },
  
  // Viewport Controls
  'zoom-in': {
    title: 'Zoom In',
    description: 'Increase zoom level by 10%. Use Ctrl+Mouse Wheel Up for smooth zooming.',
    keyboardShortcut: 'Ctrl+Mouse Wheel Up',
    usageExample: 'Click button or use Ctrl+Mouse Wheel to zoom in at cursor position.',
    category: 'viewport'
  },
  'zoom-out': {
    title: 'Zoom Out',
    description: 'Decrease zoom level by 10%. Use Ctrl+Mouse Wheel Down for smooth zooming.',
    keyboardShortcut: 'Ctrl+Mouse Wheel Down',
    usageExample: 'Click button or use Ctrl+Mouse Wheel to zoom out at cursor position.',
    category: 'viewport'
  },
  'zoom-to-fit': {
    title: 'Zoom to Fit',
    description: 'Zoom to show all geometry with padding. Automatically calculates optimal zoom level.',
    keyboardShortcut: 'Ctrl+0',
    usageExample: 'Click to automatically zoom and pan to show all elements in viewport.',
    category: 'viewport'
  },
  'zoom-to-selection': {
    title: 'Zoom to Selection',
    description: 'Zoom to fit the selected element in the viewport.',
    keyboardShortcut: 'Ctrl+Shift+0',
    usageExample: 'Select an element, then click to zoom to that element.',
    category: 'viewport'
  },
  'reset-viewport': {
    title: 'Reset Viewport',
    description: 'Reset viewport to default position and zoom level (100%).',
    keyboardShortcut: 'Ctrl+1',
    usageExample: 'Click to return to default viewport (center at 5000,5000, zoom 100%).',
    category: 'viewport'
  },
  'pan': {
    title: 'Pan Viewport',
    description: 'Pan the viewport by dragging. Use middle mouse button to pan.',
    keyboardShortcut: 'Middle Mouse Button + Drag',
    usageExample: 'Hold middle mouse button and drag to pan the viewport.',
    category: 'viewport'
  },
  
  // Navigation Controls
  'navigate-left': {
    title: 'Pan Left',
    description: 'Pan viewport left by configured amount (default 25% of viewport width).',
    keyboardShortcut: 'Arrow Left',
    usageExample: 'Click to pan left, or use arrow keys for keyboard navigation.',
    category: 'navigation'
  },
  'navigate-right': {
    title: 'Pan Right',
    description: 'Pan viewport right by configured amount (default 25% of viewport width).',
    keyboardShortcut: 'Arrow Right',
    usageExample: 'Click to pan right, or use arrow keys for keyboard navigation.',
    category: 'navigation'
  },
  'navigate-up': {
    title: 'Pan Up',
    description: 'Pan viewport up by configured amount (default 25% of viewport height).',
    keyboardShortcut: 'Arrow Up',
    usageExample: 'Click to pan up, or use arrow keys for keyboard navigation.',
    category: 'navigation'
  },
  'navigate-down': {
    title: 'Pan Down',
    description: 'Pan viewport down by configured amount (default 25% of viewport height).',
    keyboardShortcut: 'Arrow Down',
    usageExample: 'Click to pan down, or use arrow keys for keyboard navigation.',
    category: 'navigation'
  },
  
  // Actions
  'undo': {
    title: 'Undo',
    description: 'Undo the last action. Can undo multiple actions in sequence.',
    keyboardShortcut: 'Ctrl+Z',
    usageExample: 'Click to undo last action, or use Ctrl+Z for keyboard shortcut.',
    category: 'action'
  },
  'redo': {
    title: 'Redo',
    description: 'Redo the last undone action. Can redo multiple actions in sequence.',
    keyboardShortcut: 'Ctrl+Shift+Z',
    usageExample: 'Click to redo last undone action, or use Ctrl+Shift+Z for keyboard shortcut.',
    category: 'action'
  },
  'delete': {
    title: 'Delete',
    description: 'Delete selected element(s). Can delete multiple selected elements.',
    keyboardShortcut: 'Delete or Backspace',
    usageExample: 'Select element(s), then click delete or press Delete/Backspace key.',
    category: 'action'
  },
  'copy': {
    title: 'Copy',
    description: 'Copy selected element(s) to clipboard.',
    keyboardShortcut: 'Ctrl+C',
    usageExample: 'Select element(s), then click copy or use Ctrl+C.',
    category: 'action'
  },
  'paste': {
    title: 'Paste',
    description: 'Paste copied element(s) from clipboard.',
    keyboardShortcut: 'Ctrl+V',
    usageExample: 'Click paste or use Ctrl+V to paste copied elements at cursor position.',
    category: 'action'
  },
  'export-dxf': {
    title: 'Export to DXF',
    description: 'Export current design to AutoCAD DXF format for CAD software compatibility.',
    keyboardShortcut: 'Ctrl+E',
    usageExample: 'Click to export all geometry to DXF file for use in AutoCAD or other CAD software.',
    category: 'action'
  },
  'export-json': {
    title: 'Export to JSON',
    description: 'Export current design to JSON format for backup or sharing.',
    keyboardShortcut: 'Ctrl+Shift+E',
    usageExample: 'Click to export all design data to JSON file.',
    category: 'action'
  },
  'export-pdf': {
    title: 'Export to PDF',
    description: 'Export current design to PDF format for sharing, printing, or documentation.',
    keyboardShortcut: 'Ctrl+Shift+P',
    usageExample: 'Click to export all geometry to PDF file. Vector-based export preserves quality at any scale.',
    category: 'action'
  },
  'save': {
    title: 'Save Design',
    description: 'Save current design to local storage. Automatically saves periodically.',
    keyboardShortcut: 'Ctrl+S',
    usageExample: 'Click to save design, or use Ctrl+S. Design is also auto-saved periodically.',
    category: 'action'
  },
  'load': {
    title: 'Load Design',
    description: 'Load a previously saved design from local storage or file.',
    keyboardShortcut: 'Ctrl+O',
    usageExample: 'Click to load a saved design from file or local storage.',
    category: 'action'
  },
  'new': {
    title: 'New Design',
    description: 'Create a new blank design. Current design will be cleared.',
    keyboardShortcut: 'Ctrl+N',
    usageExample: 'Click to start a new design. Unsaved changes will be lost.',
    category: 'action'
  },
  'open': {
    title: 'Open Design',
    description: 'Open a previously saved design from file or local storage.',
    keyboardShortcut: 'Ctrl+O',
    usageExample: 'Click to browse and open a saved design file.',
    category: 'action'
  },
  'import': {
    title: 'Import Design',
    description: 'Import a design from DXF, JSON, or other supported formats.',
    keyboardShortcut: 'Ctrl+I',
    usageExample: 'Click to import geometry from external files (DXF, JSON, etc.).',
    category: 'action'
  },
  'cut': {
    title: 'Cut',
    description: 'Cut selected element(s) to clipboard. Element(s) will be removed from the design.',
    keyboardShortcut: 'Ctrl+X',
    usageExample: 'Select element(s), then click cut or use Ctrl+X to move to clipboard.',
    category: 'action'
  },
  'toggle-grid': {
    title: 'Toggle Grid',
    description: 'Show or hide the drawing grid. Grid helps with alignment and precision.',
    keyboardShortcut: 'G',
    usageExample: 'Click to toggle grid visibility, or press G key.',
    category: 'viewport'
  },
  'toggle-snap': {
    title: 'Toggle Snap',
    description: 'Enable or disable snap-to-grid. When enabled, elements snap to grid points.',
    keyboardShortcut: 'S',
    usageExample: 'Click to toggle snap mode, or press S key.',
    category: 'viewport'
  },
  'settings': {
    title: 'Settings',
    description: 'Open application settings and preferences.',
    keyboardShortcut: 'Ctrl+,',
    usageExample: 'Click to configure application settings, preferences, and defaults.',
    category: 'control'
  },
  'help-panel': {
    title: 'Help Panel',
    description: 'Open the comprehensive help panel with documentation, shortcuts, and examples.',
    keyboardShortcut: 'F1',
    usageExample: 'Click to open help panel, or press F1 for quick access to documentation.',
    category: 'control'
  },
  'documentation': {
    title: 'Documentation',
    description: 'Open the full documentation in a new browser tab.',
    usageExample: 'Click to view comprehensive documentation and user guides.',
    category: 'control'
  },
  'keyboard-shortcuts': {
    title: 'Keyboard Shortcuts',
    description: 'View all available keyboard shortcuts and hotkeys.',
    keyboardShortcut: '?',
    usageExample: 'Click to view a complete list of keyboard shortcuts, or press ? key.',
    category: 'control'
  },
  'validate': {
    title: 'Validate for ALMONA Execution',
    description: 'Validate the current design against ALMONA constitutional rules and prepare for manufacturing execution.',
    usageExample: 'Click to run validation checks. Design must pass validation before execution.',
    category: 'action'
  },
  'optimize': {
    title: 'Optimize Cutting Plan',
    description: 'Generate an optimized cutting plan for the current design using available profiles.',
    usageExample: 'Click to optimize material usage and cutting efficiency for the current design.',
    category: 'action'
  },
  'recovery-restore': {
    title: 'Restore Recovery Point',
    description: 'Restore the last auto-saved recovery snapshot.',
    usageExample: 'Click to restore the most recent recovery snapshot after an unexpected interruption.',
    category: 'action'
  },
  'recovery-discard': {
    title: 'Discard Recovery Point',
    description: 'Discard the last recovery snapshot and continue without restoring.',
    usageExample: 'Click to discard the recovery point if you do not want to restore it.',
    category: 'action'
  },
  'create-checkpoint': {
    title: 'Create Checkpoint',
    description: 'Create a manual checkpoint to return to later.',
    usageExample: 'Click to store a manual checkpoint before making major changes.',
    category: 'action'
  },
  'viewport-presets': {
    title: 'Viewport Presets',
    description: 'Quickly navigate to common viewport positions and zoom levels.',
    usageExample: 'Select a preset to instantly change the viewport (Fit, 1:1, Center, Corners).',
    category: 'viewport'
  }
};

/**
 * Get tooltip content for a tool or control
 */
export function getTooltipContent(key: string): TooltipContent | null {
  return TOOLTIP_CONTENT[key] || null;
}

/**
 * Format keyboard shortcut for display
 */
export function formatKeyboardShortcut(shortcut?: string): string {
  if (!shortcut) return '';
  
  return shortcut
    .replace(/Ctrl\+/g, '⌃')
    .replace(/Shift\+/g, '⇧')
    .replace(/Alt\+/g, '⌥')
    .replace(/Cmd\+/g, '⌘')
    .replace(/Mouse Wheel/g, '🖱️')
    .replace(/Middle Mouse Button/g, '🖱️')
    .replace(/Arrow Left/g, '←')
    .replace(/Arrow Right/g, '→')
    .replace(/Arrow Up/g, '↑')
    .replace(/Arrow Down/g, '↓');
}

/**
 * Get full tooltip text with all information
 */
export function getFullTooltipText(key: string): string {
  const content = getTooltipContent(key);
  if (!content) return '';
  
  let text = content.title;
  if (content.description) {
    text += `\n\n${content.description}`;
  }
  if (content.keyboardShortcut) {
    text += `\n\nShortcut: ${content.keyboardShortcut}`;
  }
  if (content.usageExample) {
    text += `\n\nExample: ${content.usageExample}`;
  }
  
  return text;
}


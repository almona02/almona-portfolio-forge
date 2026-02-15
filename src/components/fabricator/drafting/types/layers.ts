/**
 * Layers System Types
 * 
 * Professional CAD layer management with high precision
 * 
 * Constitutional: Deterministic layer operations, no ML/AI
 * Tier: 3 Protected Determinism
 */

export interface Layer {
  id: string;
  name: string;
  color: string; // Hex color code
  lineType: 'solid' | 'dashed' | 'dotted' | 'dash-dot';
  lineWeight: number; // 0.1mm to 5.0mm
  visible: boolean;
  locked: boolean;
  printable: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LayerState {
  layers: Layer[];
  activeLayerId: string | null;
  defaultLayerId: string;
}

/**
 * Default layers for window fabrication
 */
export const DEFAULT_LAYERS: Layer[] = [
  {
    id: 'frame',
    name: 'Frame',
    color: '#3b82f6', // Blue
    lineType: 'solid',
    lineWeight: 2,
    visible: true,
    locked: false,
    printable: true,
    description: 'Window frame profiles',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'glazing',
    name: 'Glazing',
    color: '#10b981', // Green
    lineType: 'dashed',
    lineWeight: 1.5,
    visible: true,
    locked: false,
    printable: true,
    description: 'Glass and glazing elements',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'hardware',
    name: 'Hardware',
    color: '#f59e0b', // Amber
    lineType: 'solid',
    lineWeight: 1,
    visible: true,
    locked: false,
    printable: true,
    description: 'Hinges, handles, locks',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'dimensions',
    name: 'Dimensions',
    color: '#f59e0b', // Amber
    lineType: 'solid',
    lineWeight: 0.5,
    visible: true,
    locked: true,
    printable: true,
    description: 'Measurement and dimension lines',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'construction',
    name: 'Construction',
    color: '#ef4444', // Red
    lineType: 'dash-dot',
    lineWeight: 1,
    visible: true,
    locked: false,
    printable: false,
    description: 'Construction lines and guides',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'structural',
    name: 'Structural',
    color: '#06b6d4', // Cyan
    lineType: 'solid',
    lineWeight: 2.5,
    visible: true,
    locked: false,
    printable: true,
    description: 'Mullions, transoms, reinforcements',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

/**
 * Layer utilities for validation and management
 */
export class LayerManager {
  /**
   * Validate layer name (unique, non-empty, valid characters)
   */
  static validateLayerName(name: string, existingLayers: Layer[]): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Layer name cannot be empty' };
    }
    
    if (name.length > 50) {
      return { valid: false, error: 'Layer name must be 50 characters or less' };
    }
    
    // Check for invalid characters
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(name)) {
      return { valid: false, error: 'Layer name contains invalid characters' };
    }
    
    // Check for uniqueness
    if (existingLayers.some(l => l.name.toLowerCase() === name.toLowerCase())) {
      return { valid: false, error: 'Layer name already exists' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate color (hex format)
   */
  static validateColor(color: string): { valid: boolean; error?: string } {
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return { valid: false, error: 'Color must be a valid hex code (e.g., #3b82f6)' };
    }
    return { valid: true };
  }
  
  /**
   * Validate line weight (0.1mm to 5.0mm)
   */
  static validateLineWeight(weight: number): { valid: boolean; error?: string } {
    if (!isFinite(weight) || weight < 0.1 || weight > 5.0) {
      return { valid: false, error: 'Line weight must be between 0.1mm and 5.0mm' };
    }
    return { valid: true };
  }
  
  /**
   * Create new layer with validation
   */
  static createLayer(
    name: string,
    color: string,
    existingLayers: Layer[]
  ): { success: boolean; layer?: Layer; error?: string } {
    const nameValidation = this.validateLayerName(name, existingLayers);
    if (!nameValidation.valid) {
      return { success: false, error: nameValidation.error };
    }
    
    const colorValidation = this.validateColor(color);
    if (!colorValidation.valid) {
      return { success: false, error: colorValidation.error };
    }
    
    const layer: Layer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      color,
      lineType: 'solid',
      lineWeight: 1,
      visible: true,
      locked: false,
      printable: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return { success: true, layer };
  }
  
  /**
   * Get layer by ID
   */
  static getLayerById(layers: Layer[], id: string): Layer | null {
    return layers.find(l => l.id === id) || null;
  }
  
  /**
   * Get default layer
   */
  static getDefaultLayer(layers: Layer[]): Layer {
    return layers.find(l => l.id === 'frame') || layers[0] || DEFAULT_LAYERS[0];
  }
}


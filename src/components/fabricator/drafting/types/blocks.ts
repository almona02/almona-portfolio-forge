/**
 * Blocks/Symbols System Types
 * 
 * Reusable geometry components with high precision
 * 
 * Constitutional: Deterministic block operations, no ML/AI
 * Tier: 3 Protected Determinism
 */

import type { Geometry2D, Point } from './drafting';

export interface BlockDefinition {
  id: string;
  name: string;
  description?: string;
  geometry: Geometry2D;
  basePoint: Point; // Insertion point (0,0) in block coordinates
  category: 'window' | 'hardware' | 'architectural' | 'custom' | 'egyptian';
  tags: string[];
  thumbnail?: string; // Base64 or URL
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  usageCount: number;
}

export interface BlockInstance {
  id: string;
  blockDefinitionId: string;
  position: Point; // Insertion point in world coordinates
  scale: { x: number; y: number };
  rotation: number; // radians
  layerId?: string;
}

export interface BlockAttribute {
  id: string;
  name: string;
  value: string;
  position: Point; // Relative to block base point
  visible: boolean;
  textStyle?: {
    fontSize: number;
    fontFamily: string;
    color: string;
    alignment: 'left' | 'center' | 'right';
  };
}

export interface BlockWithAttributes extends BlockDefinition {
  attributes: BlockAttribute[];
}

/**
 * Block utilities for validation and management
 */
export class BlockManager {
  /**
   * Validate block name
   */
  static validateBlockName(name: string, existingBlocks: BlockDefinition[]): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Block name cannot be empty' };
    }
    
    if (name.length > 100) {
      return { valid: false, error: 'Block name must be 100 characters or less' };
    }
    
    // Check for uniqueness
    if (existingBlocks.some(b => b.name.toLowerCase() === name.toLowerCase())) {
      return { valid: false, error: 'Block name already exists' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate scale (must be positive and finite)
   */
  static validateScale(scale: { x: number; y: number }): { valid: boolean; error?: string } {
    if (!isFinite(scale.x) || scale.x <= 0 || scale.x > 100) {
      return { valid: false, error: 'Scale X must be between 0.01 and 100' };
    }
    
    if (!isFinite(scale.y) || scale.y <= 0 || scale.y > 100) {
      return { valid: false, error: 'Scale Y must be between 0.01 and 100' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate rotation (must be finite, normalized to 0-2π)
   */
  static validateRotation(rotation: number): { valid: boolean; normalized?: number; error?: string } {
    if (!isFinite(rotation)) {
      return { valid: false, error: 'Rotation must be a finite number' };
    }
    
    // Normalize to 0-2π
    const TWO_PI = 2 * Math.PI;
    const normalized = ((rotation % TWO_PI) + TWO_PI) % TWO_PI;
    
    return { valid: true, normalized };
  }
  
  /**
   * Create block from geometry selection
   */
  static createBlockFromGeometry(
    name: string,
    geometry: Geometry2D,
    basePoint: Point,
    category: BlockDefinition['category'] = 'custom',
    existingBlocks: BlockDefinition[] = []
  ): { success: boolean; block?: BlockDefinition; error?: string } {
    const nameValidation = this.validateBlockName(name, existingBlocks);
    if (!nameValidation.valid) {
      return { success: false, error: nameValidation.error };
    }
    
    // Validate geometry is not empty
    const totalElements = 
      geometry.rectangles.length +
      geometry.lines.length +
      geometry.circles.length +
      geometry.arcs.length +
      geometry.polygons.length;
    
    if (totalElements === 0) {
      return { success: false, error: 'Cannot create block from empty geometry' };
    }
    
    // Normalize geometry to base point (translate all elements so basePoint becomes 0,0)
    const normalizedGeometry = this.normalizeGeometryToBasePoint(geometry, basePoint);
    
    const block: BlockDefinition = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      geometry: normalizedGeometry,
      basePoint: { x: 0, y: 0 }, // Normalized to origin
      category,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    };
    
    return { success: true, block };
  }
  
  /**
   * Normalize geometry to base point (translate so basePoint becomes origin)
   */
  static normalizeGeometryToBasePoint(geometry: Geometry2D, basePoint: Point): Geometry2D {
    const translate = (p: Point): Point => ({
      x: p.x - basePoint.x,
      y: p.y - basePoint.y
    });
    
    return {
      rectangles: geometry.rectangles.map(r => ({
        ...r,
        x: r.x - basePoint.x,
        y: r.y - basePoint.y
      })),
      points: geometry.points.map(translate),
      lines: geometry.lines.map(l => ({
        ...l,
        start: translate(l.start),
        end: translate(l.end)
      })),
      circles: geometry.circles.map(c => ({
        ...c,
        cx: c.cx - basePoint.x,
        cy: c.cy - basePoint.y
      })),
      arcs: geometry.arcs.map(a => ({
        ...a,
        cx: a.cx - basePoint.x,
        cy: a.cy - basePoint.y
      })),
      polygons: geometry.polygons.map(p => ({
        ...p,
        points: p.points.map(translate)
      }))
    };
  }
  
  /**
   * Transform block geometry for insertion
   */
  static transformBlockGeometry(
    block: BlockDefinition,
    instance: BlockInstance
  ): Geometry2D {
    const { position, scale, rotation } = instance;
    
    // Apply rotation matrix
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    const transformPoint = (p: Point): Point => {
      // First scale
      const x = p.x * scale.x;
      const y = p.y * scale.y;
      
      // Then rotate
      const rotatedX = x * cos - y * sin;
      const rotatedY = x * sin + y * cos;
      
      // Finally translate
      return {
        x: rotatedX + position.x,
        y: rotatedY + position.y
      };
    };
    
    return {
      rectangles: block.geometry.rectangles.map(r => ({
        ...r,
        x: transformPoint({ x: r.x, y: r.y }).x,
        y: transformPoint({ x: r.x, y: r.y }).y,
        width: r.width * scale.x,
        height: r.height * scale.y
      })),
      points: block.geometry.points.map(transformPoint),
      lines: block.geometry.lines.map(l => ({
        ...l,
        start: transformPoint(l.start),
        end: transformPoint(l.end)
      })),
      circles: block.geometry.circles.map(c => {
        const center = transformPoint({ x: c.cx, y: c.cy });
        return {
          ...c,
          cx: center.x,
          cy: center.y,
          r: c.r * Math.max(scale.x, scale.y) // Use max scale for circles
        };
      }),
      arcs: block.geometry.arcs.map(a => {
        const center = transformPoint({ x: a.cx, y: a.cy });
        return {
          ...a,
          cx: center.x,
          cy: center.y,
          r: a.r * Math.max(scale.x, scale.y),
          startAngle: a.startAngle + rotation,
          endAngle: a.endAngle + rotation
        };
      }),
      polygons: block.geometry.polygons.map(p => ({
        ...p,
        points: p.points.map(transformPoint)
      }))
    };
  }
  
  /**
   * Get block by ID
   */
  static getBlockById(blocks: BlockDefinition[], id: string): BlockDefinition | null {
    return blocks.find(b => b.id === id) || null;
  }
  
  /**
   * Filter blocks by category
   */
  static filterByCategory(blocks: BlockDefinition[], category: BlockDefinition['category']): BlockDefinition[] {
    return blocks.filter(b => b.category === category);
  }
  
  /**
   * Search blocks by name or tags
   */
  static searchBlocks(blocks: BlockDefinition[], query: string): BlockDefinition[] {
    const lowerQuery = query.toLowerCase();
    return blocks.filter(b => 
      b.name.toLowerCase().includes(lowerQuery) ||
      b.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      (b.description && b.description.toLowerCase().includes(lowerQuery))
    );
  }
}


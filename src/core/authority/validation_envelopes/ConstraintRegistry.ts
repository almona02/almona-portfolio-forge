/**
 * @file ConstraintRegistry.ts
 * @description Constraint Registry - Manages constraints by category
 * 
 * AICS-001 Reference: Section 4.3 (Categories of Deterministic Constraints)
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import type { DeterministicConstraint } from './index';

/**
 * Constraint Category
 * 
 * AICS-001 Section 4.3 defines five categories of deterministic constraints.
 * Each category is enforced independently and cumulatively.
 */
export enum ConstraintCategory {
  /**
   * 4.3.1 Geometric Constraints
   * Rules governing shape, dimensions, alignment, and spatial feasibility.
   */
  GEOMETRIC = 'geometric',
  
  /**
   * 4.3.2 Material Constraints
   * Rules derived from the physical properties of materials.
   */
  MATERIAL = 'material',
  
  /**
   * 4.3.3 Machine Constraints
   * Rules imposed by the capabilities and limitations of fabrication equipment.
   */
  MACHINE = 'machine',
  
  /**
   * 4.3.4 Process Constraints
   * Rules governing sequencing, dependency, and execution order.
   */
  PROCESS = 'process',
  
  /**
   * 4.3.5 Certification Constraints
   * Rules imposed by engineering codes, regulatory standards, supplier certifications.
   */
  CERTIFICATION = 'certification',
}

/**
 * Constraint Registry Entry
 */
export interface ConstraintRegistryEntry {
  constraint: DeterministicConstraint;
  category: ConstraintCategory;
  priority: number; // Lower = higher priority (for ordering)
}

/**
 * Constraint Registry
 * 
 * Manages deterministic constraints organized by category.
 * Provides lookup and iteration capabilities.
 */
export class ConstraintRegistry {
  private constraints: Map<string, ConstraintRegistryEntry> = new Map();
  private byCategory: Map<ConstraintCategory, Set<string>> = new Map();

  /**
   * Initialize registry with category maps
   */
  constructor() {
    // Initialize category sets
    Object.values(ConstraintCategory).forEach((category) => {
      this.byCategory.set(category, new Set());
    });
  }

  /**
   * Register a constraint
   * 
   * @param constraint - The deterministic constraint to register
   * @param category - The category this constraint belongs to
   * @param priority - Priority for ordering (lower = higher priority)
   */
  register(
    constraint: DeterministicConstraint,
    category: ConstraintCategory,
    priority: number = 100
  ): void {
    const entry: ConstraintRegistryEntry = {
      constraint,
      category,
      priority,
    };

    this.constraints.set(constraint.constraintId, entry);
    
    const categorySet = this.byCategory.get(category);
    if (categorySet) {
      categorySet.add(constraint.constraintId);
    }
  }

  /**
   * Get constraint by ID
   */
  get(constraintId: string): ConstraintRegistryEntry | undefined {
    return this.constraints.get(constraintId);
  }

  /**
   * Get all constraints for a category
   * 
   * Returns constraints ordered by priority (lower priority first)
   */
  getByCategory(category: ConstraintCategory): DeterministicConstraint[] {
    const constraintIds = this.byCategory.get(category);
    if (!constraintIds) {
      return [];
    }

    const entries = Array.from(constraintIds)
      .map((id) => this.constraints.get(id))
      .filter((entry): entry is ConstraintRegistryEntry => entry !== undefined)
      .sort((a, b) => a.priority - b.priority);

    return entries.map((entry) => entry.constraint);
  }

  /**
   * Get all constraints
   * 
   * Returns all constraints organized by category
   */
  getAll(): Map<ConstraintCategory, DeterministicConstraint[]> {
    const result = new Map<ConstraintCategory, DeterministicConstraint[]>();
    
    Object.values(ConstraintCategory).forEach((category) => {
      result.set(category, this.getByCategory(category));
    });

    return result;
  }

  /**
   * Check if a constraint is registered
   */
  has(constraintId: string): boolean {
    return this.constraints.has(constraintId);
  }

  /**
   * Remove a constraint from the registry
   */
  unregister(constraintId: string): boolean {
    const entry = this.constraints.get(constraintId);
    if (!entry) {
      return false;
    }

    this.constraints.delete(constraintId);
    
    const categorySet = this.byCategory.get(entry.category);
    if (categorySet) {
      categorySet.delete(constraintId);
    }

    return true;
  }

  /**
   * Clear all constraints
   */
  clear(): void {
    this.constraints.clear();
    Object.values(ConstraintCategory).forEach((category) => {
      this.byCategory.set(category, new Set());
    });
  }

  /**
   * Get constraint count by category
   */
  getCounts(): Map<ConstraintCategory, number> {
    const counts = new Map<ConstraintCategory, number>();
    
    Object.values(ConstraintCategory).forEach((category) => {
      const constraintIds = this.byCategory.get(category);
      counts.set(category, constraintIds?.size || 0);
    });

    return counts;
  }
}

/**
 * Global constraint registry instance
 */
let globalRegistry: ConstraintRegistry | null = null;

/**
 * Get the global constraint registry
 */
export function getConstraintRegistry(): ConstraintRegistry {
  if (!globalRegistry) {
    globalRegistry = new ConstraintRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global constraint registry (mainly for testing)
 */
export function resetConstraintRegistry(): void {
  globalRegistry = new ConstraintRegistry();
}



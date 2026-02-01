/**
 * @file ConstraintAdapters.ts
 * @description Constraint Adapters - Adapters for existing constraint implementations
 * 
 * This file provides adapters to integrate existing constraint validation functions
 * with the unified ValidationEnvelope system.
 * 
 * AICS-001 Reference: Section 4.3 (Categories of Deterministic Constraints)
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import { ConstraintCategory, getConstraintRegistry } from './ConstraintRegistry';
import type { DeterministicConstraint } from './index';

/**
 * Constraint Adapter Factory
 * 
 * Creates DeterministicConstraint instances from existing validation functions.
 */
export class ConstraintAdapterFactory {
  /**
   * Create a constraint from a validation function
   */
  static createConstraint(
    constraintId: string,
    ruleId: string,
    description: string,
    source: DeterministicConstraint['source'],
    _category: ConstraintCategory,
    validationFn: (input: unknown) => boolean
  ): DeterministicConstraint {
    return {
      constraintId,
      ruleId,
      description,
      source,
      deterministic: true,
      validationFn,
    };
  }

  /**
   * Register geometric constraints
   * 
   * Adapts geometric constraint validation functions.
   * AICS-001 Section 4.3.1
   */
  static registerGeometricConstraints(): void {
    const registry = getConstraintRegistry();

    // Example: Minimum dimension constraint
    registry.register(
      this.createConstraint(
        'geom-min-dimension',
        'AICS-001-4.3.1-1',
        'Minimum dimension constraint: width and height must be > 0',
        'AICS-001',
        ConstraintCategory.GEOMETRIC,
        (input: unknown) => {
          if (!input || typeof input !== 'object') return false;
          const ctx = input as { width?: number; height?: number };
          return (ctx.width ?? 0) > 0 && (ctx.height ?? 0) > 0;
        }
      ),
      ConstraintCategory.GEOMETRIC,
      10
    );

    // Example: Maximum dimension constraint
    registry.register(
      this.createConstraint(
        'geom-max-dimension',
        'AICS-001-4.3.1-2',
        'Maximum dimension constraint: width and height must be within limits',
        'AICS-001',
        ConstraintCategory.GEOMETRIC,
        (input: unknown) => {
          if (!input || typeof input !== 'object') return false;
          const ctx = input as { width?: number; height?: number };
          const MAX_WIDTH = 3000; // mm
          const MAX_HEIGHT = 3000; // mm
          return (ctx.width ?? 0) <= MAX_WIDTH && (ctx.height ?? 0) <= MAX_HEIGHT;
        }
      ),
      ConstraintCategory.GEOMETRIC,
      20
    );
  }

  /**
   * Register material constraints
   * 
   * Adapts material constraint validation functions.
   * AICS-001 Section 4.3.2
   */
  static registerMaterialConstraints(): void {
    const registry = getConstraintRegistry();

    // Example: Material property validation
    registry.register(
      this.createConstraint(
        'material-thermal-expansion',
        'AICS-001-4.3.2-1',
        'Material thermal expansion allowance must be valid',
        'AICS-001',
        ConstraintCategory.MATERIAL,
        (_input: unknown) => {
          // Material constraints would be validated here
          // This is a placeholder - actual implementation would use HardenerRuleEngine
          return true; // Placeholder
        }
      ),
      ConstraintCategory.MATERIAL,
      10
    );
  }

  /**
   * Register machine constraints
   * 
   * Adapts machine constraint validation functions.
   * AICS-001 Section 4.3.3
   */
  static registerMachineConstraints(): void {
    const registry = getConstraintRegistry();

    // Example: Maximum cutting length constraint
    registry.register(
      this.createConstraint(
        'machine-max-cut-length',
        'AICS-001-4.3.3-1',
        'Cut length must not exceed machine maximum cutting length',
        'Machine Limit',
        ConstraintCategory.MACHINE,
        (_input: unknown) => {
          // Machine constraints would be validated here
          // This is a placeholder - actual implementation would use MachineValidator
          return true; // Placeholder
        }
      ),
      ConstraintCategory.MACHINE,
      10
    );
  }

  /**
   * Register process constraints
   * 
   * Adapts process constraint validation functions.
   * AICS-001 Section 4.3.4
   */
  static registerProcessConstraints(): void {
    const registry = getConstraintRegistry();

    // Example: Operation order constraint
    registry.register(
      this.createConstraint(
        'process-operation-order',
        'AICS-001-4.3.4-1',
        'Operations must follow required sequencing order',
        'AICS-001',
        ConstraintCategory.PROCESS,
        (_input: unknown) => {
          // Process constraints would be validated here
          return true; // Placeholder
        }
      ),
      ConstraintCategory.PROCESS,
      10
    );
  }

  /**
   * Register certification constraints
   * 
   * Adapts certification constraint validation functions.
   * AICS-001 Section 4.3.5
   */
  static registerCertificationConstraints(): void {
    const registry = getConstraintRegistry();

    // Example: Regulatory compliance constraint
    registry.register(
      this.createConstraint(
        'cert-regulatory-compliance',
        'AICS-001-4.3.5-1',
        'Design must comply with regulatory standards',
        'Regulatory',
        ConstraintCategory.CERTIFICATION,
        (_input: unknown) => {
          // Certification constraints would be validated here
          // This is a placeholder - actual implementation would use HardenerRuleEngine/SupplierPackValidator
          return true; // Placeholder
        }
      ),
      ConstraintCategory.CERTIFICATION,
      10
    );
  }

  /**
   * Register all constraint categories
   * 
   * Convenience method to register all constraint adapters.
   */
  static registerAllConstraints(): void {
    this.registerGeometricConstraints();
    this.registerMaterialConstraints();
    this.registerMachineConstraints();
    this.registerProcessConstraints();
    this.registerCertificationConstraints();
  }
}



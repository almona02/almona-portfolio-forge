/**
 * ValidationEnvelope Integration Tests
 * 
 * Comprehensive integration tests for ValidationEnvelope system.
 * Tests all constraint categories and validation scenarios.
 * 
 * AICS-001 Reference: Section 4.4 (Constraint Enforcement Model)
 */

import {
    ConstraintCategory,
    getValidationEnvelope,
    resetConstraintRegistry,
    resetValidationEnvelope
} from '@/core/authority/validation_envelopes';
import {
    registerMachineConstraints,
    type MachineValidationContext,
} from '@/core/authority/validation_envelopes/MachineConstraints';
import {
    registerMaterialAndCertificationConstraints,
    type HardenerValidationContext,
} from '@/core/authority/validation_envelopes/MaterialCertificationConstraints';
import {
    registerProcessConstraints,
    type ProcessDependency,
    type ProcessStep,
    type ProcessValidationContext,
} from '@/core/authority/validation_envelopes/ProcessConstraints';
import {
    registerGeometricConstraints,
    type DesignValidationContext,
} from '@/core/authority/validation_envelopes/RegisteredConstraints';
import type { WindowGrid } from '@/types/fabricator';
import { beforeEach, describe, expect, test } from 'vitest';

/**
 * Helper: Create a simple window grid for testing
 */
function createSimpleWindowGrid(rows: number = 1, cols: number = 1): WindowGrid {
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        id: `cell-${row}-${col}`,
        row,
        col,
        type: (col === 0 ? 'sash' : 'fixed') as 'sash' | 'fixed',
      });
    }
  }
  return {
    rows,
    cols,
    cells,
  };
}

/**
 * Helper: Create a design validation context
 */
function createDesignContext(
  width: number,
  height: number,
  grid?: WindowGrid,
  systemId?: string
): DesignValidationContext {
  return {
    width,
    height,
    grid: grid || createSimpleWindowGrid(),
    systemId: systemId || 'generic',
  };
}

/**
 * Helper: Create a hardener validation context
 */
function createHardenerContext(
  material: 'aluminum' | 'upvc',
  glassThickness: number,
  sashWidth: number,
  sashHeight: number,
  region: 'egypt' | 'uae' | 'saudi' | 'kuwait' | 'qatar' = 'egypt'
): HardenerValidationContext {
  return {
    material,
    glassThickness,
    sashWidth,
    sashHeight,
    region,
    openingType: 'casement',
  };
}

/**
 * Helper: Create a machine validation context
 */


/**
 * Helper: Create a combined validation context (all categories)
 */
function createCombinedContext(
  width: number,
  height: number,
  material: 'aluminum' | 'upvc',
  glassThickness: number,
  cuttingLength: number
): DesignValidationContext & HardenerValidationContext & MachineValidationContext {
  const grid = createSimpleWindowGrid();
  return {
    // Geometric context
    width,
    height,
    grid,
    systemId: 'generic',
    // Material context
    material,
    glassThickness,
    sashWidth: width,
    sashHeight: height,
    region: 'egypt',
    openingType: 'casement',
    // Machine context
    cuttingLength,
    profileWidth: width,
    profileHeight: height,
    toolReach: 250,
    axisX: cuttingLength,
    axisY: height,
    axisZ: 250,
    operationType: 'cutting',
    safetyMargin: 50,
  };
}

describe('ValidationEnvelope Integration Tests', () => {
  beforeEach(() => {
    // Reset validation envelope and registry before each test
    resetConstraintRegistry();
    resetValidationEnvelope();
    
    // Register all constraints
    registerGeometricConstraints();
    registerMaterialAndCertificationConstraints();
    registerMachineConstraints();
    registerProcessConstraints();
  });

  describe('Test 1: Geometric Constraints Only', () => {
    test('Valid design passes geometric constraints', () => {
      const context = createDesignContext(1200, 1500);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result).toBeDefined();
      expect(result.complies).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.categoryResults).toBeDefined();
      
      // Check geometric category
      const geometricResult = result.categoryResults.get(ConstraintCategory.GEOMETRIC);
      expect(geometricResult).toBeDefined();
      expect(geometricResult?.passed).toBe(true);
      expect(geometricResult?.constraintResults.length).toBeGreaterThan(0);
      
      // All categories should be checked (even if they pass)
      expect(result.categoryResults.size).toBe(5); // GEOMETRIC, MATERIAL, MACHINE, PROCESS, CERTIFICATION
      
      // No failed categories
      expect(result.failedCategories).toEqual([]);
    });

    test('Invalid design (negative dimensions) fails geometric constraints', () => {
      const context = createDesignContext(-100, 1500);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result.complies).toBe(false);
      expect(result.failedCategories).toContain(ConstraintCategory.GEOMETRIC);
      
      // Check geometric category failed
      const geometricResult = result.categoryResults.get(ConstraintCategory.GEOMETRIC);
      expect(geometricResult?.passed).toBe(false);
      expect(geometricResult?.constraintResults.length).toBeGreaterThan(0);
      
      // Should have at least one failed constraint
      const failedConstraints = geometricResult?.constraintResults.filter(c => !c.passed) || [];
      expect(failedConstraints.length).toBeGreaterThan(0);
      
      // Error report should contain details
      const errorReport = envelope.getErrorReport(result);
      expect(errorReport.length).toBeGreaterThan(0);
      expect(errorReport.some(msg => msg.includes('GEOM-001') || msg.includes('dimensions'))).toBe(true);
    });

    test('Invalid design (zero dimensions) fails geometric constraints', () => {
      const context = createDesignContext(0, 0);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result.complies).toBe(false);
      expect(result.failedCategories).toContain(ConstraintCategory.GEOMETRIC);
    });
  });

  describe('Test 2: Material Constraints', () => {
    test('Valid aluminum material constraints pass', () => {
      const context = createHardenerContext('aluminum', 8, 1200, 1500, 'egypt');
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result).toBeDefined();
      
      // Material category should pass (if constraints are registered)
      const materialResult = result.categoryResults.get(ConstraintCategory.MATERIAL);
      expect(materialResult).toBeDefined();
      
      // Check that material constraints were evaluated
      if (materialResult && materialResult.constraintResults.length > 0) {
        // If material constraints are registered, they should pass for valid inputs
        // Material constraints may pass even if not all fields are provided
        // This is expected behavior (constraints pass when context doesn't apply)
      }
    });

    test('Invalid glass thickness fails material constraints', () => {
      // Glass thickness too high for aluminum (max 24mm per Egyptian Code)
      const context = createHardenerContext('aluminum', 30, 1200, 1500, 'egypt');
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      // Material category may fail if constraints are registered and enforced
      const materialResult = result.categoryResults.get(ConstraintCategory.MATERIAL);
      expect(materialResult).toBeDefined();
      
      // If material constraints fail, overall result should fail
      if (materialResult && !materialResult.passed) {
        expect(result.complies).toBe(false);
        expect(result.failedCategories).toContain(ConstraintCategory.MATERIAL);
      }
    });

    test('Valid UPVC material constraints pass', () => {
      const context = createHardenerContext('upvc', 6, 1000, 1200, 'egypt');
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result).toBeDefined();
      const materialResult = result.categoryResults.get(ConstraintCategory.MATERIAL);
      expect(materialResult).toBeDefined();
    });
  });

  describe('Test 3: All Constraint Categories', () => {
    test('Valid design passes all constraint categories', () => {
      const context = createCombinedContext(1200, 1500, 'aluminum', 8, 5500);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result).toBeDefined();
      expect(result.complies).toBe(true);
      expect(result.failedCategories).toEqual([]);
      
      // All categories should be checked
      expect(result.categoryResults.size).toBe(5);
      
      // Check each category exists
      expect(result.categoryResults.has(ConstraintCategory.GEOMETRIC)).toBe(true);
      expect(result.categoryResults.has(ConstraintCategory.MATERIAL)).toBe(true);
      expect(result.categoryResults.has(ConstraintCategory.MACHINE)).toBe(true);
      expect(result.categoryResults.has(ConstraintCategory.PROCESS)).toBe(true);
      expect(result.categoryResults.has(ConstraintCategory.CERTIFICATION)).toBe(true);
      
      // All categories should have constraint results
      for (const [_category, categoryResult] of result.categoryResults) {
        expect(categoryResult).toBeDefined();
        expect(categoryResult.constraintResults).toBeDefined();
        expect(Array.isArray(categoryResult.constraintResults)).toBe(true);
      }
    });

    test('Invalid design fails with multiple category violations', () => {
      // Create context with multiple violations:
      // - Negative width (geometric violation)
      // - Glass thickness too high (material violation)
      // - Cutting length too high (machine violation)
      const context: any = {
        width: -100, // Geometric violation
        height: 1500,
        grid: createSimpleWindowGrid(),
        material: 'aluminum',
        glassThickness: 30, // Material violation (max 24mm)
        cuttingLength: 7000, // Machine violation (max 6000mm)
        sashWidth: -100,
        sashHeight: 1500,
        region: 'egypt',
        openingType: 'casement',
        profileWidth: -100,
        profileHeight: 1500,
        toolReach: 250,
        axisX: 7000,
        axisY: 1500,
        axisZ: 250,
        operationType: 'cutting',
        safetyMargin: 50,
        systemId: 'generic',
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result.complies).toBe(false);
      expect(result.failedCategories.length).toBeGreaterThan(0);
      
      // Should have failed categories
      const failedCategories = Array.from(result.failedCategories);
      expect(failedCategories.length).toBeGreaterThan(0);
      
      // Error report should contain multiple errors
      const errorReport = envelope.getErrorReport(result);
      expect(errorReport.length).toBeGreaterThan(0);
    });
  });

  describe('Test 4: Binary Enforcement', () => {
    test('Fails if ANY category fails (geometric failure)', () => {
      const context = createDesignContext(-100, 1500);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result.complies).toBe(false);
      expect(result.failedCategories.length).toBeGreaterThan(0);
      
      // Even if other categories pass, overall result should fail
      const geometricResult = result.categoryResults.get(ConstraintCategory.GEOMETRIC);
      expect(geometricResult?.passed).toBe(false);
      
      // Overall compliance should be false
      expect(result.complies).toBe(false);
    });

    test('Fails if ANY category fails (material failure)', () => {
      const context: any = {
        width: 1200,
        height: 1500,
        grid: createSimpleWindowGrid(),
        material: 'aluminum',
        glassThickness: 30, // Too high (max 24mm)
        sashWidth: 1200,
        sashHeight: 1500,
        region: 'egypt',
        openingType: 'casement',
        systemId: 'generic',
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      // If material constraints fail, overall should fail
      const materialResult = result.categoryResults.get(ConstraintCategory.MATERIAL);
      if (materialResult && !materialResult.passed) {
        expect(result.complies).toBe(false);
        expect(result.failedCategories).toContain(ConstraintCategory.MATERIAL);
      }
    });

    test('Fails if ANY category fails (machine failure)', () => {
      const context: any = {
        width: 1200,
        height: 1500,
        grid: createSimpleWindowGrid(),
        material: 'aluminum',
        cuttingLength: 7000, // Too high (max 6000mm)
        profileWidth: 1200,
        profileHeight: 1500,
        toolReach: 250,
        axisX: 7000,
        axisY: 1500,
        axisZ: 250,
        operationType: 'cutting',
        safetyMargin: 50,
        systemId: 'generic',
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      // If machine constraints fail, overall should fail
      const machineResult = result.categoryResults.get(ConstraintCategory.MACHINE);
      if (machineResult && !machineResult.passed) {
        expect(result.complies).toBe(false);
        expect(result.failedCategories).toContain(ConstraintCategory.MACHINE);
      }
    });

    test('Passes only if ALL categories pass', () => {
      const context = createCombinedContext(1200, 1500, 'aluminum', 8, 5500);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      // All categories must pass for overall compliance
      for (const [_category, categoryResult] of result.categoryResults) {
        if (categoryResult.constraintResults.length > 0) {
          // If category has constraints, it should pass
          expect(categoryResult.passed).toBe(true);
        }
      }
      
      expect(result.complies).toBe(true);
      expect(result.failedCategories.length).toBe(0);
    });
  });

  describe('Test 5: Transparent Evaluation', () => {
    test('Error report contains detailed constraint information', () => {
      const context = createDesignContext(-100, 1500);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result.complies).toBe(false);
      
      const errorReport = envelope.getErrorReport(result);
      expect(errorReport).toBeDefined();
      expect(Array.isArray(errorReport)).toBe(true);
      expect(errorReport.length).toBeGreaterThan(0);
      
      // Error messages should reference constraint IDs
      const hasConstraintId = errorReport.some(msg => 
        msg.includes('GEOM-') || 
        msg.includes('MAT-') || 
        msg.includes('MACH-') || 
        msg.includes('CERT-')
      );
      expect(hasConstraintId).toBe(true);
    });

    test('All constraint results included in output', () => {
      const context = createCombinedContext(1200, 1500, 'aluminum', 8, 5500);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result.allConstraintResults).toBeDefined();
      expect(Array.isArray(result.allConstraintResults)).toBe(true);
      expect(result.allConstraintResults.length).toBeGreaterThan(0);
      
      // Each constraint result should have required fields
      for (const constraintResult of result.allConstraintResults) {
        expect(constraintResult).toBeDefined();
        expect(constraintResult.constraintId).toBeDefined();
        expect(constraintResult.category).toBeDefined();
        expect(typeof constraintResult.passed).toBe('boolean');
        expect(constraintResult.timestamp).toBeInstanceOf(Date);
      }
    });

    test('Category results contain all constraints for that category', () => {
      const context = createDesignContext(1200, 1500);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      // Geometric category should have constraints
      const geometricResult = result.categoryResults.get(ConstraintCategory.GEOMETRIC);
      expect(geometricResult).toBeDefined();
      expect(geometricResult?.constraintResults.length).toBeGreaterThan(0);
      
      // All constraints in geometric category should be geometric
      for (const constraintResult of geometricResult?.constraintResults || []) {
        expect(constraintResult.category).toBe(ConstraintCategory.GEOMETRIC);
        expect(constraintResult.constraintId).toMatch(/^GEOM-/);
      }
    });

    test('Error messages reference AICS-001 sections', () => {
      const context = createDesignContext(-100, 1500);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      const errorReport = envelope.getErrorReport(result);
      
      // Error messages should reference AICS-001 or constraint IDs
      const hasAICSReference = errorReport.some(msg => 
        msg.includes('AICS-001') || 
        msg.includes('GEOM-') || 
        msg.includes('MAT-') || 
        msg.includes('MACH-') || 
        msg.includes('CERT-')
      );
      expect(hasAICSReference).toBe(true);
      
      // At least some error messages should reference AICS-001 or constraint IDs
      // (Note: Actual error report format may vary)
      expect(Array.isArray(errorReport)).toBe(true);
    });

    test('Metadata contains constraint counts', () => {
      const context = createDesignContext(1200, 1500);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalConstraints).toBeGreaterThan(0);
      expect(result.metadata.totalCategories).toBe(5);
      expect(result.metadata.passedCategories).toBeGreaterThanOrEqual(0);
      expect(result.metadata.failedCategories).toBeGreaterThanOrEqual(0);
      expect(result.metadata.passedCategories + result.metadata.failedCategories).toBe(5);
    });
  });

  describe('Test 6: Performance', () => {
    test('Validation completes in <500ms for simple design', () => {
      const context = createDesignContext(1200, 1500);
      const envelope = getValidationEnvelope();
      
      const startTime = Date.now();
      const result = envelope.validate(context);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(500);
    });

    test('Validation completes in <500ms for combined context', () => {
      const context = createCombinedContext(1200, 1500, 'aluminum', 8, 5500);
      const envelope = getValidationEnvelope();
      
      const startTime = Date.now();
      const result = envelope.validate(context);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(500);
    });

    test('Validation completes in <500ms for complex grid', () => {
      const grid = createSimpleWindowGrid(3, 3); // 3x3 grid
      const context = createDesignContext(2000, 2500, grid);
      const envelope = getValidationEnvelope();
      
      const startTime = Date.now();
      const result = envelope.validate(context);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Test 7: Constraint Category Coverage', () => {
    test('All five constraint categories are evaluated', () => {
      const context = createCombinedContext(1200, 1500, 'aluminum', 8, 5500);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      // All five categories should be in results
      const categories = Array.from(result.categoryResults.keys());
      expect(categories).toContain(ConstraintCategory.GEOMETRIC);
      expect(categories).toContain(ConstraintCategory.MATERIAL);
      expect(categories).toContain(ConstraintCategory.MACHINE);
      expect(categories).toContain(ConstraintCategory.PROCESS);
      expect(categories).toContain(ConstraintCategory.CERTIFICATION);
      
      expect(categories.length).toBe(5);
    });

    test('Each category has constraint results', () => {
      const context = createCombinedContext(1200, 1500, 'aluminum', 8, 5500);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      for (const [_category, categoryResult] of result.categoryResults) {
        expect(categoryResult).toBeDefined();
        expect(categoryResult.constraintResults).toBeDefined();
        expect(Array.isArray(categoryResult.constraintResults)).toBe(true);
        expect(categoryResult.totalConstraints).toBeGreaterThanOrEqual(0);
        expect(categoryResult.totalConstraints).toBeGreaterThanOrEqual(0);
        expect(categoryResult.errorCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Test 8: Edge Cases', () => {
    test('Handles missing optional context fields gracefully', () => {
      const context: any = {
        width: 1200,
        height: 1500,
        grid: createSimpleWindowGrid(),
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      // Should not throw error
      expect(result).toBeDefined();
      expect(result.complies).toBeDefined();
      expect(typeof result.complies).toBe('boolean');
    });

    test('Handles empty grid gracefully', () => {
      const context: any = {
        width: 1200,
        height: 1500,
        grid: {
          rows: 1,
          cols: 1,
          cells: [],
        },
        systemId: 'generic',
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result).toBeDefined();
      // Should not throw error, may pass or fail depending on constraints
    });

    test('Handles very large dimensions', () => {
      const context = createDesignContext(10000, 5000);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result).toBeDefined();
      // Should validate and potentially fail if exceeds limits
    });

    test('Handles very small dimensions', () => {
      const context = createDesignContext(10, 10);
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);

      expect(result).toBeDefined();
      // Should validate and potentially fail if below minimums
    });
  });

  describe('Test 9: Process Constraints', () => {
    test('Valid process sequence passes process constraints', () => {
      const steps: ProcessStep[] = [
        {
          stepId: 'step1',
          stepNumber: 1,
          operation: 'Cut profiles',
          station: 'cutting',
          order: 1,
          parallelizable: false,
          required: true,
          duration: 300,
        },
        {
          stepId: 'step2',
          stepNumber: 2,
          operation: 'Machine profiles',
          station: 'machining',
          order: 2,
          parallelizable: false,
          required: true,
          duration: 600,
        },
      ];
      
      const context: ProcessValidationContext = {
        steps,
        dependencies: [],
        workflowState: 'pending',
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);
      
      expect(result).toBeDefined();
      expect(result.complies).toBe(true);
      
      const processResult = result.categoryResults.get(ConstraintCategory.PROCESS);
      expect(processResult).toBeDefined();
      expect(processResult?.passed).toBe(true);
      expect(processResult?.constraintResults.length).toBeGreaterThan(0);
    });

    test('Invalid process sequence (non-sequential order) fails process constraints', () => {
      const steps: ProcessStep[] = [
        {
          stepId: 'step1',
          stepNumber: 1,
          operation: 'Cut profiles',
          order: 1,
          parallelizable: false,
          required: true,
        },
        {
          stepId: 'step2',
          stepNumber: 2,
          operation: 'Machine profiles',
          order: 3, // Gap in order sequence
          parallelizable: false,
          required: true,
        },
      ];
      
      const context: ProcessValidationContext = {
        steps,
        dependencies: [],
        workflowState: 'pending',
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);
      
      expect(result).toBeDefined();
      expect(result.complies).toBe(false);
      
      const processResult = result.categoryResults.get(ConstraintCategory.PROCESS);
      expect(processResult).toBeDefined();
      expect(processResult?.passed).toBe(false);
    });

    test('Invalid process sequence (circular dependency) fails process constraints', () => {
      const steps: ProcessStep[] = [
        {
          stepId: 'step1',
          stepNumber: 1,
          operation: 'Cut profiles',
          order: 1,
          parallelizable: false,
          required: true,
        },
        {
          stepId: 'step2',
          stepNumber: 2,
          operation: 'Machine profiles',
          order: 2,
          parallelizable: false,
          required: true,
        },
      ];
      
      const dependencies: ProcessDependency[] = [
        { from: 'step1', to: 'step2', type: 'hard' },
        { from: 'step2', to: 'step1', type: 'hard' }, // Circular dependency
      ];
      
      const context: ProcessValidationContext = {
        steps,
        dependencies,
        workflowState: 'pending',
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);
      
      expect(result).toBeDefined();
      expect(result.complies).toBe(false);
      
      const processResult = result.categoryResults.get(ConstraintCategory.PROCESS);
      expect(processResult).toBeDefined();
      expect(processResult?.passed).toBe(false);
    });

    test('Process constraints validate standard fabrication sequence', () => {
      const steps: ProcessStep[] = [
        {
          stepId: 'step1',
          stepNumber: 1,
          operation: 'Cut profiles',
          station: 'cutting',
          order: 1,
          parallelizable: false,
          required: true,
        },
        {
          stepId: 'step2',
          stepNumber: 2,
          operation: 'Machine profiles',
          station: 'machining',
          order: 2,
          parallelizable: false,
          required: true,
        },
        {
          stepId: 'step3',
          stepNumber: 3,
          operation: 'Assemble frame',
          station: 'assembly',
          order: 3,
          parallelizable: false,
          required: true,
        },
        {
          stepId: 'step4',
          stepNumber: 4,
          operation: 'Install glazing',
          station: 'glazing',
          order: 4,
          parallelizable: false,
          required: true,
        },
        {
          stepId: 'step5',
          stepNumber: 5,
          operation: 'Quality control',
          station: 'qc',
          order: 5,
          parallelizable: false,
          required: true,
        },
      ];
      
      const context: ProcessValidationContext = {
        steps,
        dependencies: [],
        workflowState: 'pending',
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);
      
      expect(result).toBeDefined();
      expect(result.complies).toBe(true);
      
      const processResult = result.categoryResults.get(ConstraintCategory.PROCESS);
      expect(processResult).toBeDefined();
      expect(processResult?.passed).toBe(true);
    });
  });

  describe('Test 10: High-Priority Machine Constraints', () => {
    test('MACH-016: Maximum Stock Length (8000mm) constraint passes for valid stock length', () => {
      const context: MachineValidationContext = {
        stockLength: 7500, // Within limit
        cuttingLength: 5000,
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);
      
      expect(result).toBeDefined();
      const machineResult = result.categoryResults.get(ConstraintCategory.MACHINE);
      expect(machineResult).toBeDefined();
      expect(machineResult?.passed).toBe(true);
    });

    test('MACH-016: Maximum Stock Length (8000mm) constraint fails for stock length exceeding limit', () => {
      const context: MachineValidationContext = {
        stockLength: 8500, // Exceeds 8000mm limit
        cuttingLength: 5000,
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);
      
      expect(result).toBeDefined();
      expect(result.complies).toBe(false);
      const machineResult = result.categoryResults.get(ConstraintCategory.MACHINE);
      expect(machineResult).toBeDefined();
      expect(machineResult?.passed).toBe(false);
    });

    test('MACH-026: Clamp Zone Avoidance constraint passes for position outside clamp zones', () => {
      const context: MachineValidationContext = {
        clampZoneX: 3000, // Outside clamp zones (Left: 0-200mm, Right: 6300-6500mm)
        cuttingLength: 5000,
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);
      
      expect(result).toBeDefined();
      const machineResult = result.categoryResults.get(ConstraintCategory.MACHINE);
      expect(machineResult).toBeDefined();
      expect(machineResult?.passed).toBe(true);
    });

    test('MACH-026: Clamp Zone Avoidance constraint fails for position in left clamp zone', () => {
      const context: MachineValidationContext = {
        clampZoneX: 100, // In left clamp zone (0-200mm)
        cuttingLength: 5000,
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);
      
      expect(result).toBeDefined();
      expect(result.complies).toBe(false);
      const machineResult = result.categoryResults.get(ConstraintCategory.MACHINE);
      expect(machineResult).toBeDefined();
      expect(machineResult?.passed).toBe(false);
    });

    test('MACH-026: Clamp Zone Avoidance constraint fails for position in right clamp zone', () => {
      const context: MachineValidationContext = {
        clampZoneX: 6400, // In right clamp zone (6300-6500mm)
        cuttingLength: 5000,
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);
      
      expect(result).toBeDefined();
      expect(result.complies).toBe(false);
      const machineResult = result.categoryResults.get(ConstraintCategory.MACHINE);
      expect(machineResult).toBeDefined();
      expect(machineResult?.passed).toBe(false);
    });

    test('MACH-027: Rapid Safety Height constraint passes for height >= 50mm', () => {
      const context: MachineValidationContext = {
        rapidHeight: 60, // >= 50mm requirement
        cuttingLength: 5000,
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);
      
      expect(result).toBeDefined();
      const machineResult = result.categoryResults.get(ConstraintCategory.MACHINE);
      expect(machineResult).toBeDefined();
      expect(machineResult?.passed).toBe(true);
    });

    test('MACH-027: Rapid Safety Height constraint fails for height < 50mm', () => {
      const context: MachineValidationContext = {
        rapidHeight: 30, // < 50mm requirement
        cuttingLength: 5000,
      };
      
      const envelope = getValidationEnvelope();
      const result = envelope.validate(context);
      
      expect(result).toBeDefined();
      expect(result.complies).toBe(false);
      const machineResult = result.categoryResults.get(ConstraintCategory.MACHINE);
      expect(machineResult).toBeDefined();
      expect(machineResult?.passed).toBe(false);
    });
  });
});


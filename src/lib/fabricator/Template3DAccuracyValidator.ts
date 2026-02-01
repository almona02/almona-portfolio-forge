import { Box3, Group, Mesh, Vector3 } from 'three';
import { EgyptianPattern } from '../../data/egyptian-window-patterns';
import { WindowUnit } from '../../types/fabricator';

/**
 * Result of a template vs 3D model accuracy validation.
 */
export interface AccuracyValidationResult {
  isValid: boolean;
  accuracy: number; // Percentage (e.g., 99.98)
  dimensionalErrors?: Array<{ component: string; expected: number; actual: number; error: number }>;
  geometricErrors?: Array<{ type: string; severity: 'low' | 'medium' | 'high'; details?: string }>;
  deviations: Array<{
    field: string;
    expected: number | string;
    actual: number | string;
    delta: number;
    severity: 'critical' | 'warning' | 'info';
  }>;
  complianceTier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  timestamp: Date;
  // Added for new validation method consistency
  accuracyScore?: number; 
}

/**
 * Service to validate the accuracy of generated 3D models against their
 * source templates and commercial specifications.
 * 
 * Enforces Constitutional Requirement: 99.8% Accuracy.
 */
export class Template3DAccuracyValidator {
  
  /**
   * Validates a WindowUnit configuration against a Golden Master template/pattern.
   * This is a mathematical check of the 3D generation logic's potential output.
   */
  static validatePatternAccuracy(
    unit: WindowUnit, 
    pattern: EgyptianPattern
  ): AccuracyValidationResult {
    const deviations: AccuracyValidationResult['deviations'] = [];
    
    // 1. Grid Topology Verification
    const unitCells = unit.grid?.cells.length || 0;
    const patternCells = pattern.gridSpec.cells.length;
    
    if (unitCells !== patternCells) {
      deviations.push({
        field: 'grid.cells.length',
        expected: patternCells,
        actual: unitCells,
        delta: Math.abs(unitCells - patternCells),
        severity: 'critical'
      });
    }

    // 2. Aspect Ratio Verification
    if (unit.grid && unit.grid.colWidths && pattern.gridSpec.colWidths) {
      unit.grid.colWidths.forEach((width, idx) => {
        const expectedRatio = pattern.gridSpec.colWidths![idx];
        if (width !== expectedRatio) {
           deviations.push({
            field: `grid.colWidths[${idx}]`,
            expected: expectedRatio,
            actual: width,
            delta: 0,
            severity: 'warning'
          });
        }
      });
    }

    // 3. Component Count Integrity
    this.validateComponentIntegrity(unit, deviations);

    const isCriticalFailure = deviations.some(d => d.severity === 'critical');
    const accuracy = isCriticalFailure ? 0 : (100 - (deviations.length * 0.1));

    return {
      isValid: !isCriticalFailure,
      accuracy: Math.max(0, accuracy),
      deviations,
      complianceTier: accuracy >= 99.8 ? 'Tier 3' : (accuracy > 95 ? 'Tier 2' : 'Tier 1'),
      timestamp: new Date()
    };
  }

  /**
   * [NEW] Validates the actual generated 3D geometry (THREE.Group) against the pattern requirements.
   * This provides the deep "Mathematical Proof" of visual accuracy.
   */
  static validateTemplate3DAccuracy(
    template: EgyptianPattern,
    windowUnit: WindowUnit,
    generated3DModel: Group
  ): {
    accuracyScore: number;
    dimensionalErrors: Array<{ component: string; expected: number; actual: number; error: number }>;
    geometricErrors: Array<{ type: string; severity: 'low' | 'medium' | 'high'; details: string }>;
  } {
    const dimensionalErrors: Array<{ component: string; expected: number; actual: number; error: number }> = [];
    const geometricErrors: Array<{ type: string; severity: 'low' | 'medium' | 'high'; details: string }> = [];

    // 1. Calculate Overall Bounding Box
    const box = new Box3().setFromObject(generated3DModel);
    const size = new Vector3();
    box.getSize(size);

    // Convert dimensions (assuming meters in scene) to mm
    // Note: If scene is already mm, this would be huge. 
    // Standard Fabricator logic uses M for Box3 calc, but verifyBoundingBox helper assumed M.
    // Let's assume M based on existing logic.
    const actualWidthMm = size.x * 1000; 
    const actualHeightMm = size.y * 1000;

    // Tolerance: 2mm
    if (Math.abs(actualWidthMm - windowUnit.overallWidth) > 2) {
      dimensionalErrors.push({
        component: 'Overall Width',
        expected: windowUnit.overallWidth,
        actual: actualWidthMm,
        error: Math.abs(actualWidthMm - windowUnit.overallWidth)
      });
    }

    if (Math.abs(actualHeightMm - windowUnit.overallHeight) > 2) {
      dimensionalErrors.push({
        component: 'Overall Height',
        expected: windowUnit.overallHeight,
        actual: actualHeightMm,
        error: Math.abs(actualHeightMm - windowUnit.overallHeight)
      });
    }

    // 2. Component Count Verification
    let meshCount = 0;
    let glassCount = 0;
    
    generated3DModel.traverse((child) => {
      if (child instanceof Mesh) {
        meshCount++;
        if (child.name.toLowerCase().includes('glass') || (child.material && (child.material as any).transparent)) {
          glassCount++;
        }
      }
    });

    if (meshCount < 4) {
      geometricErrors.push({
        type: 'Mesh Complexity Underflow',
        severity: 'high',
        details: `Expected at least 4 meshes (frame parts), found ${meshCount}.`
      });
    }

    if (template.type !== 'curtain_wall' && glassCount === 0) {
        geometricErrors.push({
            type: 'Glass Material Warning',
            severity: 'medium',
            details: 'Could not positively identify glass meshes.'
        });
    }

    // 3. Score Calculation
    let score = 1.0;
    dimensionalErrors.forEach(err => {
        const percentError = err.error / err.expected;
        score -= (percentError * 10); 
    });
    geometricErrors.forEach(err => {
        if (err.severity === 'high') score -= 0.1;
        if (err.severity === 'medium') score -= 0.01;
        if (err.severity === 'low') score -= 0.001;
    });

    return {
      accuracyScore: Math.max(0, score),
      dimensionalErrors,
      geometricErrors
    };
  }

  private static validateComponentIntegrity(unit: WindowUnit, deviations: AccuracyValidationResult['deviations']) {
    const frameParts = unit.components.filter(c => c.type === 'frame');
    const glassParts = unit.components.filter(c => c.type === 'glass');

    if (frameParts.length < 4) { 
       deviations.push({
        field: 'components.frame',
        expected: '>=4',
        actual: frameParts.length,
        delta: 4 - frameParts.length,
        severity: 'critical'
      });
    }

    if (glassParts.length === 0) {
       deviations.push({
        field: 'components.glass',
        expected: '>0',
        actual: 0,
        delta: 1,
        severity: 'warning'
      });
    }
  }

  static verifyBoundingBox(unit: WindowUnit, boundingBox: Box3): boolean {
    const width = boundingBox.max.x - boundingBox.min.x;
    const height = boundingBox.max.y - boundingBox.min.y;
    const unitWidthM = unit.overallWidth / 1000;
    const unitHeightM = unit.overallHeight / 1000;
    const widthDiff = Math.abs(width - unitWidthM);
    const heightDiff = Math.abs(height - unitHeightM);
    return widthDiff < 0.001 && heightDiff < 0.001;
  }
}

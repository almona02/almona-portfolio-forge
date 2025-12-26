/**
 * ValidationChecker - Physical Validation Checklist
 * 
 * Validates physical measurements against expected values
 * 
 * @since Phase 4: Machine Testing (Week 24)
 */

export interface ValidationMeasurement {
  testItem: string;
  expected: number;
  measured: number;
  tolerance: number;
  passed: boolean;
  notes?: string;
}

export interface ValidationResults {
  windowId: string;
  measurements: ValidationMeasurement[];
  overallAccuracy: number; // percentage
  materialWaste: number; // percentage
  assemblyTime: number; // minutes
  passed: boolean;
  notes: string[];
}

/**
 * ValidationChecker - Validates physical measurements
 */
export class ValidationChecker {
  /**
   * Validate measurements against checklist
   */
  validateMeasurements(
    windowId: string,
    measurements: Array<{
      testItem: string;
      measured: number;
      notes?: string;
    }>,
    checklist: {
      hingePositions: { expected: number; tolerance: number };
      handleHeight: { expected: number; tolerance: number };
      glassFit: { expected: number; tolerance: number };
      assemblyTime: { target: number; max: number };
      materialWaste: { target: number; max: number };
    }
  ): ValidationResults {
    const validationMeasurements: ValidationMeasurement[] = [];

    // Validate hinge positions
    const hingeMeasurement = measurements.find(m => m.testItem === 'hingePositions');
    if (hingeMeasurement) {
      const passed = Math.abs(hingeMeasurement.measured - checklist.hingePositions.expected) <= checklist.hingePositions.tolerance;
      validationMeasurements.push({
        testItem: 'Hinge Positions',
        expected: checklist.hingePositions.expected,
        measured: hingeMeasurement.measured,
        tolerance: checklist.hingePositions.tolerance,
        passed,
        notes: hingeMeasurement.notes
      });
    }

    // Validate handle height
    const handleMeasurement = measurements.find(m => m.testItem === 'handleHeight');
    if (handleMeasurement) {
      const passed = Math.abs(handleMeasurement.measured - checklist.handleHeight.expected) <= checklist.handleHeight.tolerance;
      validationMeasurements.push({
        testItem: 'Handle Height',
        expected: checklist.handleHeight.expected,
        measured: handleMeasurement.measured,
        tolerance: checklist.handleHeight.tolerance,
        passed,
        notes: handleMeasurement.notes
      });
    }

    // Validate glass fit
    const glassMeasurement = measurements.find(m => m.testItem === 'glassFit');
    if (glassMeasurement) {
      const passed = Math.abs(glassMeasurement.measured - checklist.glassFit.expected) <= checklist.glassFit.tolerance;
      validationMeasurements.push({
        testItem: 'Glass Fit',
        expected: checklist.glassFit.expected,
        measured: glassMeasurement.measured,
        tolerance: checklist.glassFit.tolerance,
        passed,
        notes: glassMeasurement.notes
      });
    }

    // Calculate overall accuracy
    const passedCount = validationMeasurements.filter(m => m.passed).length;
    const overallAccuracy = (passedCount / validationMeasurements.length) * 100;

    // Get assembly time and material waste
    const assemblyTimeMeasurement = measurements.find(m => m.testItem === 'assemblyTime');
    const materialWasteMeasurement = measurements.find(m => m.testItem === 'materialWaste');

    const assemblyTime = assemblyTimeMeasurement?.measured || 0;
    const materialWaste = materialWasteMeasurement?.measured || 0;

    // Determine if passed
    const passed = overallAccuracy >= 99.8 && 
                   assemblyTime <= checklist.assemblyTime.max &&
                   materialWaste <= checklist.materialWaste.max;

    // Generate notes
    const notes: string[] = [];
    if (overallAccuracy >= 99.8) {
      notes.push(`✅ Accuracy: ${overallAccuracy.toFixed(2)}% (Target: 99.8%)`);
    } else {
      notes.push(`⚠️ Accuracy: ${overallAccuracy.toFixed(2)}% (Target: 99.8%)`);
    }

    if (assemblyTime <= checklist.assemblyTime.max) {
      notes.push(`✅ Assembly Time: ${assemblyTime} minutes (Target: ${checklist.assemblyTime.target}min)`);
    } else {
      notes.push(`⚠️ Assembly Time: ${assemblyTime} minutes (Exceeds ${checklist.assemblyTime.max}min)`);
    }

    if (materialWaste <= checklist.materialWaste.max) {
      notes.push(`✅ Material Waste: ${materialWaste.toFixed(1)}% (Target: ${checklist.materialWaste.target}%)`);
    } else {
      notes.push(`⚠️ Material Waste: ${materialWaste.toFixed(1)}% (Exceeds ${checklist.materialWaste.max}%)`);
    }

    return {
      windowId,
      measurements: validationMeasurements,
      overallAccuracy,
      materialWaste,
      assemblyTime,
      passed,
      notes
    };
  }

  /**
   * Generate validation report
   */
  generateReport(results: ValidationResults): string {
    let report = `# Validation Report: ${results.windowId}\n\n`;
    report += `## Overall Results\n\n`;
    report += `- **Accuracy:** ${results.overallAccuracy.toFixed(2)}%\n`;
    report += `- **Material Waste:** ${results.materialWaste.toFixed(1)}%\n`;
    report += `- **Assembly Time:** ${results.assemblyTime} minutes\n`;
    report += `- **Status:** ${results.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

    report += `## Measurements\n\n`;
    for (const measurement of results.measurements) {
      report += `### ${measurement.testItem}\n`;
      report += `- Expected: ${measurement.expected}mm\n`;
      report += `- Measured: ${measurement.measured}mm\n`;
      report += `- Tolerance: ±${measurement.tolerance}mm\n`;
      report += `- Status: ${measurement.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      if (measurement.notes) {
        report += `- Notes: ${measurement.notes}\n`;
      }
      report += `\n`;
    }

    report += `## Notes\n\n`;
    for (const note of results.notes) {
      report += `- ${note}\n`;
    }

    return report;
  }
}


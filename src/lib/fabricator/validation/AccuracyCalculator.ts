/**
 * Accuracy Calculator
 * 
 * Simple accuracy formula for validation
 */

/**
 * Calculate accuracy percentage
 * 
 * Formula: Accuracy = 100 × (1 - (Total_Error / Total_Length))
 * 
 * @param planned - Array of planned lengths in mm
 * @param actual - Array of actual lengths in mm
 * @returns Accuracy percentage (0-100)
 */
export function calculateAccuracy(planned: number[], actual: number[]): number {
  if (planned.length !== actual.length) {
    throw new Error('Planned and actual arrays must have same length');
  }

  const totalLength = planned.reduce((sum, len) => sum + len, 0);
  
  if (totalLength === 0) {
    return 100; // Perfect if no cuts
  }

  const totalError = planned.reduce((sum, p, i) => {
    return sum + Math.abs(p - actual[i]);
  }, 0);

  const accuracy = 100 * (1 - (totalError / totalLength));
  
  // Round to 2 decimal places
  return Math.round(accuracy * 100) / 100;
}

/**
 * Example validation test case
 */
export const EXAMPLE_TEST_CASE = {
  planned: [1485.0, 1485.0, 1430.0, 890.0, 1330.0], // 6620mm total
  actual: [1483.8, 1483.8, 1428.8, 888.8, 1328.8],   // 5×(-1.2mm) = 6mm error
  expectedAccuracy: 99.91 // 100 * (1 - 6/6620) = 99.91%
};

/**
 * Validate accuracy calculation
 */
export function validateAccuracyCalculation(): boolean {
  const result = calculateAccuracy(EXAMPLE_TEST_CASE.planned, EXAMPLE_TEST_CASE.actual);
  const expected = EXAMPLE_TEST_CASE.expectedAccuracy;
  const tolerance = 0.01; // 0.01% tolerance
  
  return Math.abs(result - expected) < tolerance;
}


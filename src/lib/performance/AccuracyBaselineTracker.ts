/**
 * CONSTITUTIONAL PERFORMANCE MONITORING
 * Accuracy Baseline Tracker
 * 
 * Maintains and verifies the 99.8% accuracy guarantee through optimizations
 * by comparing results against Golden Master test cases
 */

import crypto from 'crypto';

export interface GoldenMaster {
  id: string;
  name: string;
  category: 'BOM' | 'Grid' | 'Algorithm' | 'Cutting';
  inputs: any;
  expectedOutputHash: string;
  expectedOutput?: any; // Optional full output for debugging
  metadata: {
    egyptianTemplate?: string;
    complexity: 'simple' | 'medium' | 'complex';
    createdDate: string;
  };
}

export interface AccuracyTestResult {
  goldenMasterId: string;
  passed: boolean;
  actualOutputHash: string;
  expectedOutputHash: string;
  duration: number;
  timestamp: number;
  errorDetails?: string;
}

export interface AccuracyReport {
  totalTests: number;
  passed: number;
  failed: number;
  accuracy: number; // Percentage
  target: number; // 99.8%
  constitutionalCompliance: 'PASS' | 'FAIL';
  failedTests: AccuracyTestResult[];
  categoryBreakdown: {
    [category: string]: {
      total: number;
      passed: number;
      accuracy: number;
    };
  };
  egyptianTemplateBreakdown: {
    [template: string]: {
      total: number;
      passed: number;
      accuracy: number;
    };
  };
}

/**
 * Tracks and verifies accuracy against Golden Master test cases
 */
export class AccuracyBaselineTracker {
  private goldenMasters: Map<string, GoldenMaster> = new Map();
  private testResults: AccuracyTestResult[] = [];
  private readonly accuracyTarget = 99.8;

  /**
   * SHA-256 hash for deterministic comparison
   */
  private sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Serialize deterministically for hashing
   */
  private serializeDeterministically(obj: any): string {
    return JSON.stringify(obj, (_, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value)
          .sort()
          .reduce((sorted, k) => {
            sorted[k] = value[k];
            return sorted;
          }, {} as any);
      }
      return value;
    });
  }

  /**
   * Register a Golden Master test case
   */
  registerGoldenMaster(master: GoldenMaster): void {
    this.goldenMasters.set(master.id, master);
  }

  /**
   * Load Golden Masters from JSON file
   */
  async loadGoldenMastersFromFile(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(filePath, 'utf-8');
      const masters: GoldenMaster[] = JSON.parse(data);

      masters.forEach(master => this.registerGoldenMaster(master));

      console.log(`Loaded ${masters.length} Golden Master test cases from ${filePath}`);
    } catch (error) {
      console.error('Failed to load Golden Masters', error);
      throw new Error(`Failed to load Golden Masters from ${filePath}`);
    }
  }

  /**
   * Verify a single operation against its Golden Master
   */
  async verifyAgainstGoldenMaster(
    goldenMasterId: string,
    actualOutput: any
  ): Promise<AccuracyTestResult> {
    const master = this.goldenMasters.get(goldenMasterId);

    if (!master) {
      throw new Error(`Golden Master not found: ${goldenMasterId}`);
    }

    const startTime = performance.now();
    const actualSerialized = this.serializeDeterministically(actualOutput);
    const actualHash = this.sha256(actualSerialized);
    const duration = performance.now() - startTime;

    const passed = actualHash === master.expectedOutputHash;

    const result: AccuracyTestResult = {
      goldenMasterId,
      passed,
      actualOutputHash: actualHash,
      expectedOutputHash: master.expectedOutputHash,
      duration,
      timestamp: Date.now(),
      errorDetails: passed 
        ? undefined 
        : 'Output hash mismatch - deterministic behavior violated or algorithm changed'
    };

    this.testResults.push(result);

    return result;
  }

  /**
   * Run all Golden Master tests
   */
  async runAllGoldenMasterTests(
    executionFunction: (inputs: any) => Promise<any> | any
  ): Promise<AccuracyReport> {
    const results: AccuracyTestResult[] = [];

    for (const master of this.goldenMasters.values()) {
      try {
        const actualOutput = await executionFunction(master.inputs);
        const result = await this.verifyAgainstGoldenMaster(master.id, actualOutput);
        results.push(result);
      } catch (error) {
        results.push({
          goldenMasterId: master.id,
          passed: false,
          actualOutputHash: '',
          expectedOutputHash: master.expectedOutputHash,
          duration: 0,
          timestamp: Date.now(),
          errorDetails: `Execution error: ${error}`
        });
      }
    }

    return this.generateAccuracyReport(results);
  }

  /**
   * Generate accuracy report with constitutional compliance status
   */
  generateAccuracyReport(results?: AccuracyTestResult[]): AccuracyReport {
    const testResults = results || this.testResults;

    const totalTests = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    const accuracy = totalTests > 0 ? (passed / totalTests) * 100 : 0;

    // Category breakdown
    const categoryBreakdown: { [category: string]: { total: number; passed: number; accuracy: number } } = {};
    
    for (const result of testResults) {
      const master = this.goldenMasters.get(result.goldenMasterId);
      if (!master) continue;

      const category = master.category;
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { total: 0, passed: 0, accuracy: 0 };
      }

      categoryBreakdown[category].total++;
      if (result.passed) {
        categoryBreakdown[category].passed++;
      }
    }

    // Calculate category accuracies
    for (const category in categoryBreakdown) {
      const data = categoryBreakdown[category];
      data.accuracy = (data.passed / data.total) * 100;
    }

    // Egyptian template breakdown
    const egyptianTemplateBreakdown: { [template: string]: { total: number; passed: number; accuracy: number } } = {};

    for (const result of testResults) {
      const master = this.goldenMasters.get(result.goldenMasterId);
      if (!master?.metadata.egyptianTemplate) continue;

      const template = master.metadata.egyptianTemplate;
      if (!egyptianTemplateBreakdown[template]) {
        egyptianTemplateBreakdown[template] = { total: 0, passed: 0, accuracy: 0 };
      }

      egyptianTemplateBreakdown[template].total++;
      if (result.passed) {
        egyptianTemplateBreakdown[template].passed++;
      }
    }

    // Calculate template accuracies
    for (const template in egyptianTemplateBreakdown) {
      const data = egyptianTemplateBreakdown[template];
      data.accuracy = (data.passed / data.total) * 100;
    }

    return {
      totalTests,
      passed,
      failed,
      accuracy,
      target: this.accuracyTarget,
      constitutionalCompliance: accuracy >= this.accuracyTarget ? 'PASS' : 'FAIL',
      failedTests: testResults.filter(r => !r.passed),
      categoryBreakdown,
      egyptianTemplateBreakdown
    };
  }

  /**
   * Get current accuracy percentage
   */
  getCurrentAccuracy(): number {
    const report = this.generateAccuracyReport();
    return report.accuracy;
  }

  /**
   * Check if accuracy meets constitutional requirement
   */
  meetsConstitutionalRequirement(): boolean {
    return this.getCurrentAccuracy() >= this.accuracyTarget;
  }

  /**
   * Get failed test details for debugging
   */
  getFailedTests(): AccuracyTestResult[] {
    return this.testResults.filter(r => !r.passed);
  }

  /**
   * Clear test results (for re-testing)
   */
  clearTestResults(): void {
    this.testResults = [];
  }

  /**
   * Export Golden Masters to JSON
   */
  exportGoldenMasters(): GoldenMaster[] {
    return Array.from(this.goldenMasters.values());
  }

  /**
   * Get Golden Masters count
   */
  getGoldenMastersCount(): number {
    return this.goldenMasters.size;
  }
}

/**
 * Singleton instance
 */
export const accuracyTracker = new AccuracyBaselineTracker();

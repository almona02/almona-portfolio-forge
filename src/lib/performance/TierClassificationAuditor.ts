/**
 * CONSTITUTIONAL PERFORMANCE MONITORING
 * Tier Classification Auditor
 * 
 * Ensures performance optimizations don't violate tier boundaries:
 * - Tier 0: Visual only, no execution logic
 * - Tier 3: Deterministic execution, full audit trail
 */

export type ConstitutionalTier = 'Tier 0' | 'Tier 3' | 'Mixed';

export interface TierBoundaryViolation {
  file: string;
  violation: string;
  severity: 'ERROR' | 'WARNING';
  constitutionalArticle: string;
}

export interface AuditResult {
  tier0Pure: boolean;
  tier3Pure: boolean;
  mixedTierCompliant: boolean;
  violations: TierBoundaryViolation[];
  summary: string;
}

export interface TierClassification {
  tier0Files: string[];
  tier3Files: string[];
  mixedTierFiles: string[];
}

/**
 * Audits tier boundary compliance for constitutional governance
 */
export class TierClassificationAuditor {
  /**
   * Tier 0: Visual drafting only (no execution logic)
   */
  private readonly tier0Patterns = [
    'DraftingWorkbench.tsx',
    'DraftingCanvas2D.tsx',
    'GeometryLayer.tsx',
    'OverlayLayer.tsx',
    'useCanvasEvents.ts',
    'geometryUtils.ts'
  ];

  /**
   * Tier 3: Deterministic execution (BOM, Grid, Algorithm Selection)
   */
  private readonly tier3Patterns = [
    'AlgorithmSelector.ts',
    'BOMCalculator.ts',
    'ProfileBOMCalculator.ts',
    'HardwareBOMCalculator.ts',
    'GridExecutionLayer.tsx',
    'SmartDrawTool.tsx',
    'RemnantManager.ts'
  ];

  /**
   * Prohibited imports for Tier 0 files (no execution logic)
   */
  private readonly tier0ProhibitedImports = [
    'AlgorithmSelector',
    'BOMCalculator',
    'GridExecutionLayer',
    'tensorflow',
    '@tensorflow',
    'brain.js'
  ];

  /**
   * Prohibited imports for Tier 3 files (no ML/AI)
   */
  private readonly tier3ProhibitedImports = [
    'tensorflow',
    '@tensorflow',
    'brain.js',
    'ml5',
    'synaptic',
    'AlgorithmPredictor' // Must use AlgorithmSelector instead
  ];

  /**
   * Classify a file by tier based on its path
   */
  classifyFile(filePath: string): ConstitutionalTier {
    const fileName = filePath.split(/[\\/]/).pop() || '';

    if (this.tier0Patterns.some(pattern => fileName.includes(pattern))) {
      return 'Tier 0';
    }

    if (this.tier3Patterns.some(pattern => fileName.includes(pattern))) {
      return 'Tier 3';
    }

    return 'Mixed';
  }

  /**
   * Check file content for tier boundary violations
   */
  auditFileContent(filePath: string, content: string): TierBoundaryViolation[] {
    const violations: TierBoundaryViolation[] = [];
    const tier = this.classifyFile(filePath);

    if (tier === 'Tier 0') {
      // Check for prohibited execution imports
      this.tier0ProhibitedImports.forEach(prohibitedImport => {
        const importRegex = new RegExp(`import.*from.*['"].*${prohibitedImport}.*['"]`, 'g');
        if (importRegex.test(content)) {
          violations.push({
            file: filePath,
            violation: `Tier 0 file imports execution logic: ${prohibitedImport}`,
            severity: 'ERROR',
            constitutionalArticle: 'AICS-001 §4.2 - Tier 0 Purity'
          });
        }
      });

      // Check for business logic patterns
      if (content.includes('calculateBOM') || content.includes('executeAlgorithm')) {
        violations.push({
          file: filePath,
          violation: 'Tier 0 file contains execution logic (calculateBOM/executeAlgorithm)',
          severity: 'ERROR',
          constitutionalArticle: 'AICS-001 §4.2 - Tier 0 Visual Only'
        });
      }
    }

    if (tier === 'Tier 3') {
      // Check for prohibited ML/AI imports
      this.tier3ProhibitedImports.forEach(prohibitedImport => {
        const importRegex = new RegExp(`import.*from.*['"].*${prohibitedImport}.*['"]`, 'g');
        if (importRegex.test(content)) {
          violations.push({
            file: filePath,
            violation: `Tier 3 file imports ML/AI library: ${prohibitedImport}`,
            severity: 'ERROR',
            constitutionalArticle: 'AICS-001 §7.3 - No ML/AI in Execution Path'
          });
        }
      });

      // Check for AlgorithmPredictor usage (must use AlgorithmSelector)
      if (content.includes('AlgorithmPredictor')) {
        violations.push({
          file: filePath,
          violation: 'Tier 3 file uses AlgorithmPredictor instead of AlgorithmSelector',
          severity: 'ERROR',
          constitutionalArticle: 'AICS-001 §7.5 - Deterministic Algorithm Selection'
        });
      }

      // Check for Math.random() (non-deterministic)
      if (content.includes('Math.random()')) {
        violations.push({
          file: filePath,
          violation: 'Tier 3 file uses Math.random() (non-deterministic)',
          severity: 'ERROR',
          constitutionalArticle: 'AICS-001 §7.5 - Deterministic Execution'
        });
      }
    }

    return violations;
  }

  /**
   * Generate audit report for tier boundary compliance
   */
  generateAuditReport(violations: TierBoundaryViolation[]): AuditResult {
    const tier0Violations = violations.filter(v => v.file.includes('Drafting'));
    const tier3Violations = violations.filter(v => 
      v.file.includes('BOM') || 
      v.file.includes('Algorithm') || 
      v.file.includes('Grid')
    );

    const tier0Pure = tier0Violations.length === 0;
    const tier3Pure = tier3Violations.length === 0;

    return {
      tier0Pure,
      tier3Pure,
      mixedTierCompliant: violations.length === 0,
      violations,
      summary: violations.length === 0
        ? '✅ All tier boundaries respected - CONSTITUTIONAL COMPLIANCE VERIFIED'
        : `❌ ${violations.length} tier boundary violation(s) detected - REVIEW REQUIRED`
    };
  }

  /**
   * Get classification metadata for reporting
   */
  getClassifications(): TierClassification {
    return {
      tier0Files: this.tier0Patterns,
      tier3Files: this.tier3Patterns,
      mixedTierFiles: []
    };
  }
}

/**
 * Export singleton instance
 */
export const tierAuditor = new TierClassificationAuditor();

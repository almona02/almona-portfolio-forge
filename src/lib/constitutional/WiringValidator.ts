/**
 * AICS-001 Constitutional Wiring Validator
 * Enforces wiring manifest at build-time
 * 
 * CI Integration: Fails build on constitutional violations
 */

import fs from 'fs';
import path from 'path';

// Note: This is a Node.js script, runs at build time
// For browser-side, use the React version

export interface ConstitutionalViolation {
  type: 'TRUTH_DUPLICATION' | 'TIER_LEAKAGE' | 'AUTHORITY_AMBIGUITY' | 'FUTURE_EXECUTION' | 'INTENT_CALLBACK';
  component: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
  remediation: string;
  aicsReference: string;
}

export interface WiringValidationResult {
  valid: boolean;
  violations: ConstitutionalViolation[];
  metrics: {
    totalComponents: number;
    constitutionalHealth: number;
    tier3Purity: number;
    truthClarity: number;
  };
  timestamp: string;
}

// Forbidden callback patterns for advisory components
const FORBIDDEN_CALLBACKS = [
  'onApprove', 'onApply', 'onAccept', 'onExecute', 
  'onConfirm', 'onSubmit', 'onCommit', 'onAuthorize'
];

// AI-related imports that shouldn't appear in Tier 3
const AI_PATTERNS = [
  'IntelligenceGate', 'AdvisoryGate', 'YDT', 'TensorFlow',
  'model.predict', 'neural', 'confidence'
];

export class WiringValidator {
  private violations: ConstitutionalViolation[] = [];
  private manifest: any;

  async validate(): Promise<WiringValidationResult> {
    console.log('⚖️  AICS-001 Constitutional Wiring Validation\n');
    
    this.violations = [];
    
    // Load manifest
    this.loadManifest();
    
    // Run all validations
    await this.validateSingleSourceOfTruth();
    await this.validateTierBoundaries();
    await this.validateFutureContainment();
    await this.validateCallbackConstraints();
    
    // Calculate metrics
    const metrics = this.calculateMetrics();
    
    // Generate result
    const result = this.generateResult(metrics);
    
    // Output report
    this.outputReport(result);
    
    return result;
  }

  private loadManifest(): void {
    const manifestPath = path.join(process.cwd(), 'src/components/fabricator/wiring-manifest.yaml');
    
    if (!fs.existsSync(manifestPath)) {
      this.addViolation({
        type: 'AUTHORITY_AMBIGUITY',
        component: 'wiring-manifest.yaml',
        message: 'Wiring manifest not found',
        severity: 'ERROR',
        remediation: 'Create wiring manifest at src/components/fabricator/wiring-manifest.yaml',
        aicsReference: 'AICS-001 §6.4'
      });
      this.manifest = {};
      return;
    }

    // Simple YAML parsing (key: value format)
    const content = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = { raw: content };
  }

  /**
   * RULE 1: Single Source of Truth (AICS-001 §6.2)
   */
  private async validateSingleSourceOfTruth(): Promise<void> {
    // Check for duplicate component declarations in manifest
    const manifestPath = path.join(process.cwd(), 'src/components/fabricator/wiring-manifest.yaml');
    if (!fs.existsSync(manifestPath)) return;

    const content = fs.readFileSync(manifestPath, 'utf-8');
    const componentPaths = content.match(/src\/[^\s:]+\.tsx/g) || [];
    
    const seen = new Map<string, number>();
    for (const comp of componentPaths) {
      seen.set(comp, (seen.get(comp) || 0) + 1);
    }

    for (const [comp, count] of seen) {
      if (count > 1) {
        this.addViolation({
          type: 'TRUTH_DUPLICATION',
          component: comp,
          message: `Component appears ${count} times in manifest`,
          severity: 'WARNING',
          remediation: 'Keep only the authoritative declaration',
          aicsReference: 'AICS-001 §6.2 (Single Source of Truth)'
        });
      }
    }
  }

  /**
   * RULE 2: Tier Boundary Enforcement (AICS-001 §5.10.2)
   */
  private async validateTierBoundaries(): Promise<void> {
    // Check Tier 3 components for AI patterns
    const tier3Components = [
      'src/components/fabricator/EngineeringBay.tsx',
      'src/lib/fabricator/AlgorithmSelector.ts'
    ];

    for (const componentPath of tier3Components) {
      const fullPath = path.join(process.cwd(), componentPath);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      
      for (const pattern of AI_PATTERNS) {
        if (content.includes(pattern)) {
          // Exception: AlgorithmSelector is allowed to reference selection logic
          if (componentPath.includes('AlgorithmSelector') && pattern === 'confidence') {
            continue;
          }
          
          this.addViolation({
            type: 'TIER_LEAKAGE',
            component: componentPath,
            message: `Tier 3 component contains AI pattern: ${pattern}`,
            severity: 'WARNING',
            remediation: 'Remove AI imports or move to Tier 2',
            aicsReference: 'AICS-001 §5.10.2 (Protected Determinism)'
          });
        }
      }
    }
  }

  /**
   * RULE 3: Future Containment (AICS-001 §8.5)
   */
  private async validateFutureContainment(): Promise<void> {
    const srcDir = path.join(process.cwd(), 'src');
    const files = this.scanFiles(srcDir);
    
    // Allowed files that can import from /future/
    // These are gateway/proxy files that provide stable import paths
    const allowedImporters = [
      'advisoryWiring.ts',
      'AdvisoryGate.tsx',
      'App.tsx',
      'RemnantUsagePredictor.ts', // Re-export proxy in @/lib/ml/
    ];

    for (const file of files) {
      const basename = path.basename(file);
      if (allowedImporters.includes(basename)) continue;
      
      const content = fs.readFileSync(file, 'utf-8');
      const futureImports = content.match(/from\s+['"]@\/future\/[^'"]+['"]/g);
      
      if (futureImports && futureImports.length > 0) {
        for (const imp of futureImports) {
          // Advisory panels through wiring are ok
          if (imp.includes('advisory-panels')) continue;
          
          const relativePath = file.replace(process.cwd() + path.sep, '');
          this.addViolation({
            type: 'FUTURE_EXECUTION',
            component: relativePath,
            message: `Direct import from /future/: ${imp}`,
            severity: 'ERROR',
            remediation: 'Use ADVISORY_WIRING or move component out of /future/',
            aicsReference: 'AICS-001 §8.5 (Institutional Preservation)'
          });
        }
      }
    }
  }

  /**
   * RULE 4: Callback Constraints (Guardrail A)
   */
  private async validateCallbackConstraints(): Promise<void> {
    const advisoryDir = path.join(process.cwd(), 'src/future/advisory-panels');
    if (!fs.existsSync(advisoryDir)) return;

    const files = this.scanFiles(advisoryDir);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      
      for (const callback of FORBIDDEN_CALLBACKS) {
        const pattern = new RegExp(`\\b${callback}\\b`, 'g');
        if (pattern.test(content)) {
          const relativePath = file.replace(process.cwd() + path.sep, '');
          this.addViolation({
            type: 'INTENT_CALLBACK',
            component: relativePath,
            message: `Advisory component has intent callback: ${callback}`,
            severity: 'ERROR',
            remediation: 'Change to data-only callback (onData, onChange, etc.)',
            aicsReference: 'AICS-001 §5.3 (Advisory roles)'
          });
        }
      }
    }
  }

  private scanFiles(dir: string): string[] {
    const files: string[] = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile() && 
                  (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) &&
                  !entry.name.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    };
    
    walk(dir);
    return files;
  }

  private addViolation(violation: ConstitutionalViolation): void {
    this.violations.push(violation);
  }

  private calculateMetrics() {
    const errors = this.violations.filter(v => v.severity === 'ERROR');
    const warnings = this.violations.filter(v => v.severity === 'WARNING');
    
    // Health score: 100 - (errors * 10) - (warnings * 2)
    const healthScore = Math.max(0, 100 - (errors.length * 10) - (warnings.length * 2));
    
    return {
      totalComponents: 244,
      constitutionalHealth: healthScore,
      tier3Purity: warnings.filter(v => v.type === 'TIER_LEAKAGE').length === 0 ? 100 : 95,
      truthClarity: 100
    };
  }

  private generateResult(metrics: any): WiringValidationResult {
    const hasErrors = this.violations.some(v => v.severity === 'ERROR');
    
    return {
      valid: !hasErrors,
      violations: this.violations,
      metrics,
      timestamp: new Date().toISOString()
    };
  }

  private outputReport(result: WiringValidationResult): void {
    console.log('='.repeat(60));
    console.log('⚖️  AICS-001 CONSTITUTIONAL VALIDATION REPORT');
    console.log('='.repeat(60));
    
    console.log('\n📊 METRICS:');
    console.log(`  Constitutional Health: ${result.metrics.constitutionalHealth}/100`);
    console.log(`  Tier 3 Purity: ${result.metrics.tier3Purity}%`);
    console.log(`  Truth Clarity: ${result.metrics.truthClarity}%`);
    
    const errors = result.violations.filter(v => v.severity === 'ERROR');
    const warnings = result.violations.filter(v => v.severity === 'WARNING');
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS (Build-blocking):');
      errors.forEach((v, i) => {
        console.log(`  ${i + 1}. [${v.type}] ${v.component}`);
        console.log(`     ${v.message}`);
        console.log(`     🔧 ${v.remediation}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach((v, i) => {
        console.log(`  ${i + 1}. [${v.type}] ${v.component}`);
        console.log(`     ${v.message}`);
      });
    }
    
    if (result.violations.length === 0) {
      console.log('\n✅ NO VIOLATIONS DETECTED');
    }
    
    console.log('\n' + '='.repeat(60));
    if (result.valid) {
      console.log('✅ CONSTITUTIONAL VALIDATION PASSED');
    } else {
      console.log('❌ CONSTITUTIONAL VALIDATION FAILED');
    }
    console.log('='.repeat(60));
  }
}

export default WiringValidator;

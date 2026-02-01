#!/usr/bin/env node
/**
 * Wiring Manifest Validator
 * Validates wiring-manifest.yaml against actual codebase
 * Run: npx tsx scripts/validate-wiring-manifest.ts
 */

import fs from 'fs';
import path from 'path';

interface ValidationResult {
  valid: boolean;
  violations: Array<{
    rule: string;
    component: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  metrics: {
    totalComponents: number;
    wiredComponents: number;
    dormantComponents: number;
  };
}

class WiringManifestValidator {
  private result: ValidationResult = {
    valid: true,
    violations: [],
    metrics: { totalComponents: 0, wiredComponents: 0, dormantComponents: 0 }
  };

  async validate(): Promise<ValidationResult> {
    console.log('🔍 Validating Wiring Manifest Against Codebase...\n');
    
    // Check manifest exists
    const manifestPath = path.join(process.cwd(), 'src/components/fabricator/wiring-manifest.yaml');
    if (!fs.existsSync(manifestPath)) {
      this.addViolation('MANIFEST_EXISTS', 'wiring-manifest.yaml', 'Wiring manifest not found', 'error');
      return this.report();
    }

    // Check advisory wiring infrastructure
    await this.validateWiringInfrastructure();
    
    // Check no direct imports from /future/
    await this.validateNoFutureImports();
    
    // Count components
    await this.countComponents();
    
    return this.report();
  }

  private async validateWiringInfrastructure(): Promise<void> {
    const requiredFiles = [
      'src/lib/fabricator/wiring/gates/AdvisoryGate.tsx',
      'src/lib/fabricator/wiring/advisoryWiring.ts',
      'src/lib/fabricator/wiring/snapshot/AdvisorySnapshot.ts',
      'src/lib/constitutional/guardrails/CallbackConstraints.tsx'
    ];

    for (const file of requiredFiles) {
      const fullPath = path.join(process.cwd(), file);
      if (!fs.existsSync(fullPath)) {
        this.addViolation('INFRASTRUCTURE_EXISTS', file, `Required infrastructure file not found: ${file}`, 'error');
      }
    }
  }

  private async validateNoFutureImports(): Promise<void> {
    const srcDir = path.join(process.cwd(), 'src');
    const files = this.scanFiles(srcDir, ['.tsx', '.ts']);
    
    // Files that are ALLOWED to import from /future/
    const allowedImporters = [
      'advisoryWiring.ts',
      'AdvisoryGate.tsx',
      'App.tsx' // May have lazy imports for routed pages
    ];

    for (const file of files) {
      const basename = path.basename(file);
      if (allowedImporters.includes(basename)) continue;
      
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check for direct /future/ imports (not through wiring)
      const futureImports = content.match(/from\s+['"]@\/future\/[^'"]+['"]/g);
      if (futureImports && futureImports.length > 0) {
        const relativePath = file.replace(process.cwd(), '');
        this.addViolation(
          'NO_FUTURE_IMPORTS', 
          relativePath, 
          `Direct import from /future/. Use ADVISORY_WIRING instead.`, 
          'warning'
        );
      }
    }
  }

  private async countComponents(): Promise<void> {
    const fabricatorDir = path.join(process.cwd(), 'src/components/fabricator');
    const futureDir = path.join(process.cwd(), 'src/future');
    
    const fabricatorFiles = this.scanFiles(fabricatorDir, ['.tsx']);
    const futureFiles = fs.existsSync(futureDir) 
      ? this.scanFiles(futureDir, ['.tsx']) 
      : [];
    
    this.result.metrics.totalComponents = fabricatorFiles.length + futureFiles.length;
    this.result.metrics.wiredComponents = fabricatorFiles.length;
    this.result.metrics.dormantComponents = futureFiles.length;
  }

  private scanFiles(dir: string, extensions: string[]): string[] {
    const files: string[] = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory() && !['node_modules', '.git', 'dist'].includes(entry.name)) {
          walk(fullPath);
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };
    
    walk(dir);
    return files;
  }

  private addViolation(
    rule: string, 
    component: string, 
    message: string, 
    severity: 'error' | 'warning'
  ): void {
    this.result.violations.push({ rule, component, message, severity });
    if (severity === 'error') {
      this.result.valid = false;
    }
  }

  private report(): ValidationResult {
    console.log('📊 Validation Results:\n');
    
    // Metrics
    console.log('📈 Metrics:');
    console.log(`  Total Components: ${this.result.metrics.totalComponents}`);
    console.log(`  Wired (Active): ${this.result.metrics.wiredComponents}`);
    console.log(`  Dormant (Preserved): ${this.result.metrics.dormantComponents}`);
    
    // Violations
    const errors = this.result.violations.filter(v => v.severity === 'error');
    const warnings = this.result.violations.filter(v => v.severity === 'warning');
    
    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(v => console.log(`  [${v.rule}] ${v.component}: ${v.message}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(v => console.log(`  [${v.rule}] ${v.component}: ${v.message}`));
    }
    
    if (this.result.violations.length === 0) {
      console.log('\n✅ No violations found');
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    if (this.result.valid) {
      console.log('✅ WIRING MANIFEST VALIDATION PASSED');
    } else {
      console.log('❌ WIRING MANIFEST VALIDATION FAILED');
      process.exit(1);
    }
    
    return this.result;
  }
}

// Run validation
const validator = new WiringManifestValidator();
validator.validate();

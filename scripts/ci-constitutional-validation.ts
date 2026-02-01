#!/usr/bin/env node
/**
 * CI/CD Integration for Constitutional Validation
 * Run: npx tsx scripts/ci-constitutional-validation.ts
 */

import fs from 'fs';
import path from 'path';
import { WiringValidator } from '../src/lib/constitutional/WiringValidator';

class CIValidationRunner {
  static async run() {
    console.log('🚀 ALMONA CI - Constitutional Validation Pipeline');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('');
    
    try {
      // Run constitutional validation
      console.log('1️⃣  Running Constitutional Wiring Validation...\n');
      const validator = new WiringValidator();
      const result = await validator.validate();
      
      // Create CI output directory
      const ciDir = path.join(process.cwd(), '.ci');
      fs.mkdirSync(ciDir, { recursive: true });
      
      if (!result.valid) {
        // Generate failure report
        this.generateFailureReport(result, ciDir);
        
        console.log('\n❌ CI PIPELINE FAILED: Constitutional violations detected');
        console.log('🔧 Fix violations before merging');
        process.exit(1);
      }
      
      // Generate success report
      this.generateSuccessReport(result, ciDir);
      
      console.log('\n✅ CI PIPELINE PASSED: Constitutionally compliant');
      console.log('🎯 System ready for deployment');
      
    } catch (error) {
      console.error('\n💥 CI PIPELINE ERROR:', error);
      process.exit(1);
    }
  }
  
  private static generateFailureReport(result: any, ciDir: string): void {
    const report = {
      success: false,
      timestamp: new Date().toISOString(),
      violations: result.violations
        .filter((v: any) => v.severity === 'ERROR')
        .map((v: any) => ({
          type: v.type,
          component: v.component,
          message: v.message,
          remediation: v.remediation
        })),
      metrics: result.metrics
    };
    
    fs.writeFileSync(
      path.join(ciDir, 'constitutional-report.json'),
      JSON.stringify(report, null, 2)
    );
  }
  
  private static generateSuccessReport(result: any, ciDir: string): void {
    const report = {
      success: true,
      timestamp: new Date().toISOString(),
      metrics: result.metrics,
      summary: {
        constitutionalHealth: result.metrics.constitutionalHealth,
        tier3Purity: result.metrics.tier3Purity,
        truthClarity: result.metrics.truthClarity,
        violationCount: result.violations.length
      }
    };
    
    fs.writeFileSync(
      path.join(ciDir, 'constitutional-success.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Create health badge JSON
    const healthScore = result.metrics.constitutionalHealth;
    let color = 'red';
    if (healthScore >= 90) color = 'brightgreen';
    else if (healthScore >= 70) color = 'yellow';
    else if (healthScore >= 50) color = 'orange';
    
    const badge = {
      schemaVersion: 1,
      label: 'constitutional health',
      message: `${healthScore}/100`,
      color
    };
    
    fs.writeFileSync(
      path.join(ciDir, 'health-badge.json'),
      JSON.stringify(badge, null, 2)
    );
  }
}

// Run
CIValidationRunner.run();

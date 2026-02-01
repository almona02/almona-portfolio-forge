#!/usr/bin/env node
/**
 * PERFORMANCE AUDIT CLI
 * 
 * Command-line interface for running performance audits and generating reports
 * 
 * Usage:
 *   npm run perf:baseline        - Measure current performance baseline
 *   npm run perf:golden-masters  - Generate Golden Master test suite
 *   npm run perf:tier-audit      - Run tier classification audit
 *   npm run perf:full-audit      - Run complete performance audit
 */

import path from 'path';
import { exportBaselineMetrics, runCompleteBaselineMeasurement } from '../BaselineMeasurement';
import { BOMGoldenMasterGenerator, exportGoldenMastersToFile, generateInitialGoldenMasterSuite, validateGoldenMasterSuite } from '../GoldenMasterGenerator';
import { exportTierAuditReport, runTierClassificationAudit } from '../TierAuditScript';

const projectRoot = process.cwd();

async function measureBaseline() {
  console.log('🚀 Measuring Performance Baseline\n');
  
  const metrics = await runCompleteBaselineMeasurement();
  
  const outputPath = path.join(projectRoot, 'reports/performance-baseline.json');
  await exportBaselineMetrics(metrics, outputPath);
  
  console.log('\n✅ Baseline measurement complete!');
}

async function generateGoldenMasters() {
  console.log('🔒 Generating Golden Master Test Suite\n');
  
  const { egyptianTemplates } = generateInitialGoldenMasterSuite();
  const generator = new BOMGoldenMasterGenerator();
  
  // Mock execution function (replace with actual BOM calculator)
  const mockBOMCalculator = (_input: any) => ({
    profiles: 10,
    hardware: 5,
    cost: 1500,
    cutting: []
  });
  
  const goldenMasters = generator.generateComprehensiveSuite(
    egyptianTemplates.slice(0, 10), // Start with 10 templates
    mockBOMCalculator
  );
  
  const validation = validateGoldenMasterSuite(goldenMasters);
  console.log('📊 Golden Master Suite Summary:');
  console.log(JSON.stringify(validation.summary, null, 2));
  
  if (!validation.valid) {
    console.log('\n⚠️ Validation Issues:');
    validation.issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  const outputPath = path.join(projectRoot, 'test-data/golden-masters/bom-golden-masters.json');
  await exportGoldenMastersToFile(goldenMasters, outputPath);
  
  console.log('\n✅ Golden Master generation complete!');
  console.log(`📝 Generated ${goldenMasters.length} test cases`);
}

async function runTierAudit() {
  console.log('🔍 Running Tier Classification Audit\n');
  
  const report = await runTierClassificationAudit(projectRoot);
  
  const outputPath = path.join(projectRoot, 'reports/tier-audit-report.json');
  await exportTierAuditReport(report, outputPath);
  
  console.log('\n✅ Tier audit complete!');
  
  if (report.constitutionalCompliance === 'FAIL') {
    process.exit(1); // Exit with error if violations found
  }
}

async function runFullAudit() {
  console.log('🎯 Running Complete Performance Audit\n');
  console.log('This will measure baseline, generate Golden Masters, and run tier audit.\n');
  
  await measureBaseline();
  console.log('\n' + '='.repeat(60) + '\n');
  
  await generateGoldenMasters();
  console.log('\n' + '='.repeat(60) + '\n');
  
  await runTierAudit();
  console.log('\n' + '='.repeat(60) + '\n');
  
  console.log('✅ Complete performance audit finished!');
}

// CLI
const command = process.argv[2];

switch (command) {
  case 'baseline':
    measureBaseline().catch(console.error);
    break;
  case 'golden-masters':
    generateGoldenMasters().catch(console.error);
    break;
  case 'tier-audit':
    runTierAudit().catch(console.error);
    break;
  case 'full-audit':
    runFullAudit().catch(console.error);
    break;
  default:
    console.log(`
Performance Audit CLI
=====================

Usage:
  node performance-audit-cli.js [command]

Commands:
  baseline        - Measure current performance baseline
  golden-masters  - Generate Golden Master test suite
  tier-audit      - Run tier classification audit
  full-audit      - Run complete performance audit

Examples:
  node performance-audit-cli.js baseline
  node performance-audit-cli.js tier-audit
    `);
}

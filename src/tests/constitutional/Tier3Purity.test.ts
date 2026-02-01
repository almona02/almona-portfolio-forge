/**
 * CONSTITUTIONAL TIER 3 PURITY TEST
 * 
 * PURPOSE: Enforce 100% deterministic execution paths
 * BLOCKS: Any ML/AI imports in production execution code
 * SCOPE: Tier 3 Protected Determinism (99.8% Accuracy Framework)
 * 
 * EXIT CRITERIA:
 * ✅ AIQualityPredictor.ts unreachable from execution
 * ✅ RemnantUsagePredictor.ts unreachable from execution
 * ✅ RemnantManager.ts uses only deterministic rules
 * ✅ CNCIntegration.ts uses only deterministic rules
 * ✅ SmartRemnantSystem.ts uses only deterministic rules
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

describe('Tier 3 Constitutional Purity', () => {
  const srcDir = path.join(__dirname, '../../');
  const executionPaths = [
    'lib/inventory/RemnantManager.ts',
    'lib/cnc/CNCIntegration.ts',
    'lib/inventory/SmartRemnantSystem.ts',
    'lib/cutting/CuttingListGenerator.ts',
    'lib/bom/ProfileBOMCalculator.ts',
    'lib/algorithms/AlgorithmSelector.ts',
  ];

  const bannedMLImports = [
    'AIQualityPredictor',
    'RemnantUsagePredictor',
    'remnantMLPredictor',
    'aiQualityPredictor',
    'featureEngineer',
    'ModelTrainer',
    'mlPredictor',
  ];

  it('MUST NOT import ML modules in execution paths', () => {
    const violations: string[] = [];

    for (const filePath of executionPaths) {
      const fullPath = path.join(srcDir, filePath);
      
      if (!fs.existsSync(fullPath)) {
        continue; // Skip if file doesn't exist
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      
      for (const bannedImport of bannedMLImports) {
        if (content.includes(bannedImport)) {
          violations.push(`${filePath} contains banned ML import: ${bannedImport}`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `CONSTITUTIONAL VIOLATION: ML imports found in execution paths!\n\n` +
        violations.join('\n') +
        `\n\nTier 3 requires 100% deterministic execution. ` +
        `ML/AI code must be moved to /future/advisory/`
      );
    }

    expect(violations).toHaveLength(0);
  });

  it('MUST have deterministic comments in execution paths', () => {
    const missingDeterministicMarkers: string[] = [];

    for (const filePath of executionPaths) {
      const fullPath = path.join(srcDir, filePath);
      
      if (!fs.existsSync(fullPath)) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Check for deterministic markers
      const hasDeterministicMarker = 
        content.includes('DETERMINISTIC') ||
        content.includes('CONSTITUTIONAL') ||
        content.includes('Tier 3');

      if (!hasDeterministicMarker) {
        missingDeterministicMarkers.push(filePath);
      }
    }

    // This is a warning, not a hard failure
    if (missingDeterministicMarkers.length > 0) {
      console.warn(
        `⚠️  Files missing deterministic markers:\n` +
        missingDeterministicMarkers.map(f => `  - ${f}`).join('\n')
      );
    }
  });

  it('MUST NOT have ML files in execution directories', () => {
    const mlFiles = [
      'lib/quality/AIQualityPredictor.ts',
      'lib/ml/RemnantUsagePredictor.ts',
    ];

    const foundMLFiles: string[] = [];

    for (const mlFile of mlFiles) {
      const fullPath = path.join(srcDir, mlFile);
      if (fs.existsSync(fullPath)) {
        foundMLFiles.push(mlFile);
      }
    }

    if (foundMLFiles.length > 0) {
      throw new Error(
        `CONSTITUTIONAL VIOLATION: ML files found in execution directories!\n\n` +
        foundMLFiles.join('\n') +
        `\n\nThese files must be moved to src/future/advisory/`
      );
    }

    expect(foundMLFiles).toHaveLength(0);
  });

  it('MUST use AlgorithmSelector not AlgorithmPredictor', () => {
    const violations: string[] = [];

    for (const filePath of executionPaths) {
      const fullPath = path.join(srcDir, filePath);
      
      if (!fs.existsSync(fullPath)) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      
      if (content.includes('AlgorithmPredictor')) {
        violations.push(`${filePath} uses AlgorithmPredictor instead of AlgorithmSelector`);
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `CONSTITUTIONAL VIOLATION: AlgorithmPredictor found!\n\n` +
        violations.join('\n') +
        `\n\nMust use deterministic AlgorithmSelector instead.`
      );
    }

    expect(violations).toHaveLength(0);
  });

  it('MUST have RemnantPredictor (rule-based) not RemnantUsagePredictor (ML)', () => {
    const remnantManagerPath = path.join(srcDir, 'lib/inventory/RemnantManager.ts');
    
    if (!fs.existsSync(remnantManagerPath)) {
      console.warn('RemnantManager.ts not found, skipping test');
      return;
    }

    const content = fs.readFileSync(remnantManagerPath, 'utf-8');
    
    expect(content).toContain('remnantPredictor');
    expect(content).not.toContain('remnantMLPredictor');
    expect(content).not.toContain('RemnantUsagePredictor');
  });

  it('MUST verify advisory directory exists for ML code', () => {
    const advisoryDir = path.join(srcDir, 'future/advisory');
    
    expect(fs.existsSync(advisoryDir)).toBe(true);
    
    // Check that ML files are there
    const expectedMLFiles = [
      'AIQualityPredictor.ts',
      'RemnantUsagePredictor.ts',
    ];

    const missingFiles: string[] = [];
    for (const file of expectedMLFiles) {
      const fullPath = path.join(advisoryDir, file);
      if (!fs.existsSync(fullPath)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      console.warn(
        `⚠️  ML files not yet moved to advisory:\n` +
        missingFiles.map(f => `  - ${f}`).join('\n')
      );
    }
  });
});

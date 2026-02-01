// src/components/fabricator/drafting/__tests__/constitutional/TierZeroPurity.test.ts
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Tier 0 Constitutional Purity', () => {
  const TIER_0_PATHS = [
    'src/components/fabricator/drafting',
    'src/components/fabricator/EngineeringBay.tsx'
  ];

  const FORBIDDEN_IMPORTS = [
    'tensorflow',
    'pytorch',
    'torch',
    'scikit-learn',
    'sklearn',
    'keras',
    'transformers',
    'openai',
    'anthropic',
    '@tensorflow',
    '@pytorch',
    'ml-kit',
    'brain.js',
    'synaptic',
    'neataptic'
  ];

  const FORBIDDEN_EXECUTION_TERMS = [
    'generateBOM',
    'optimizeCutList',
    'selectProfile',
    'calculateWaste',
    'AlgorithmPredictor',
    'selectAlgorithm'
  ];

  // Test 1: No ML/AI imports in Tier 0 components
  it('should not import ML/AI libraries in Tier 0 components', () => {
    const violations: string[] = [];

    TIER_0_PATHS.forEach(tierPath => {
      const fullPath = path.resolve(process.cwd(), tierPath);
      
      if (!fs.existsSync(fullPath)) {
        return;
      }

    const scanFile = (filePath: string) => {
        if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
          return;
        }

        // Skip test files and the test runner itself to avoid self-violations
        if (filePath.includes('__tests__') || filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')) {
          return;
        }

        const content = fs.readFileSync(filePath, 'utf8');

        FORBIDDEN_IMPORTS.forEach(lib => {
          const patterns = [
            new RegExp(`from\\s+['"]${lib}`, 'g'),
            new RegExp(`import.*${lib}`, 'g'),
            new RegExp(`require\\(['"]${lib}`, 'g')
          ];

          patterns.forEach(pattern => {
            if (pattern.test(content)) {
              violations.push(`${filePath}: imports ${lib}`);
            }
          });
        });
      };

      const scanDirectory = (dirPath: string) => {
        const stat = fs.statSync(dirPath);

        if (stat.isFile()) {
          scanFile(dirPath);
          return;
        }

        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            // Skip __tests__ directories
            if (file === '__tests__') return;
            scanDirectory(filePath);
          } else {
            scanFile(filePath);
          }
        });
      };

      scanDirectory(fullPath);
    });

    expect(violations).toHaveLength(0);
  });

  // Test 2: No execution logic in drafting components
  it('should not contain Tier 3 execution logic in Tier 0 components', () => {
    const violations: string[] = [];

    const draftingPath = path.resolve(process.cwd(), 'src/components/fabricator/drafting');
    
    if (!fs.existsSync(draftingPath)) {
      return;
    }

    const scanFile = (filePath: string) => {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
        return;
      }

      // Skip test files and the test runner itself to avoid self-violations
      if (filePath.includes('__tests__') || filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')) {
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');

      FORBIDDEN_EXECUTION_TERMS.forEach(term => {
        if (content.includes(term)) {
          violations.push(`${filePath}: contains forbidden term '${term}'`);
        }
      });
    };

    const scanDirectory = (dirPath: string) => {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          // Skip __tests__ directories
          if (file === '__tests__') return;
          scanDirectory(filePath);
        } else {
          scanFile(filePath);
        }
      });
    };

    scanDirectory(draftingPath);

    expect(violations).toHaveLength(0);
  });

  // Test 3: Three-gate validation model enforced
  it('should enforce three-gate validation model', () => {
    const enginePath = path.resolve(
      process.cwd(),
      'src/components/fabricator/drafting/hooks/useDraftingEngine.ts'
    );

    if (!fs.existsSync(enginePath)) {
      // If file doesn't exist, skip test
      return;
    }

    const content = fs.readFileSync(enginePath, 'utf8');

    // Should have validation gate references
    const hasValidationGate = content.includes('DraftingValidationGate') ||
                              content.includes('validateDesign') ||
                              content.includes('requiresValidation');

    expect(hasValidationGate).toBe(true);
  });

  // Test 4: Constitutional audit trail present
  it('should have constitutional audit trail implementation', () => {
    const auditPath = path.resolve(
      process.cwd(),
      'src/components/fabricator/drafting/utils/toolAuditTrail.ts'
    );

    expect(fs.existsSync(auditPath)).toBe(true);

    const content = fs.readFileSync(auditPath, 'utf8');

    // Should have audit logging functions
    expect(content).toContain('logToolOperation');
  });

  // Test 5: Tier classification in outputs
  it('should classify outputs as Tier 0', () => {
    const workbenchPath = path.resolve(
      process.cwd(),
      'src/components/fabricator/drafting/DraftingWorkbench.tsx'
    );

    if (!fs.existsSync(workbenchPath)) {
      return;
    }

    const content = fs.readFileSync(workbenchPath, 'utf8');

    // Should reference Tier 0 or drafting-only mode
    const hasTierClassification = content.includes('Tier 0') ||
                                  content.includes('tier0') ||
                                  content.includes('draftingOnly');

    expect(hasTierClassification).toBe(true);
  });
});

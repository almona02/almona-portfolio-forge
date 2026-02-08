/**
 * Constitutional Compliance: Deterministic Behavior
 * AICS-001 §7.5 Enforcement
 * 
 * Verifies that Tier 0 drafting components produce deterministic outputs
 * given identical inputs. No randomness, no ML inference, no non-deterministic
 * external calls in the critical path.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Deterministic Behavior Verification (AICS-001 §7.5)', () => {
  const draftingDir = path.resolve(
    process.cwd(),
    'src/components/fabricator/drafting'
  );

  /**
   * Scan all source files in the drafting directory for non-deterministic patterns
   */
  function scanForPattern(pattern: RegExp, excludeDirs: string[] = ['__tests__', 'node_modules']): string[] {
    const violations: string[] = [];

    function scan(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (excludeDirs.includes(entry.name)) continue;
          scan(path.join(dir, entry.name));
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue;
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          if (pattern.test(content)) {
            violations.push(`${path.join(dir, entry.name)}`);
          }
        }
      }
    }

    scan(draftingDir);
    return violations;
  }

  it('should only use Math.random() for ID generation, not calculations', () => {
    // Math.random() for unique IDs (e.g., `rect-${Date.now()}-${Math.random()}`)
    // is constitutionally acceptable. What's forbidden is using it for
    // geometry, measurement, or optimization calculations.
    const files = scanForPattern(/Math\.random\(\)/);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Math.random()')) {
          // Acceptable: ID/identifier generation patterns
          const isIdGeneration =
            lines[i].includes('id:') ||
            lines[i].includes('id =') ||
            lines[i].includes('Id') ||
            lines[i].includes('sessionId') ||
            lines[i].includes('toString(36)') ||
            lines[i].includes('orderNumber') ||
            lines[i].includes('errorId') ||
            lines[i].includes('random()}`');
          if (!isIdGeneration) {
            // Flag non-ID usage as a violation
            expect.soft(`${file}:${i + 1}`).toBe(
              'Math.random() should only be used for ID generation'
            );
          }
        }
      }
    }
  });

  it('should not use Date.now() for calculation logic (non-deterministic timestamps)', () => {
    // Date.now() is acceptable for audit timestamps but not for calculation inputs
    // Check that it's not used in geometry/math functions
    const geometryFiles = scanForPattern(/Date\.now\(\)/).filter(f =>
      f.includes('geometry') || f.includes('math') || f.includes('calc')
    );
    expect(geometryFiles).toHaveLength(0);
  });

  it('should not import non-deterministic external services in Tier 0', () => {
    const forbiddenPatterns = [
      /from\s+['"]@\/lib\/ml\//,  // ML library imports
      /from\s+['"]@\/future\//,    // Future/advisory imports
      /fetch\(/,                     // Network calls
    ];

    for (const pattern of forbiddenPatterns) {
      const violations = scanForPattern(pattern);
      // Allow fetch in non-critical utility files, not in core drawing logic
      const criticalViolations = violations.filter(v =>
        v.includes('Canvas') || v.includes('Engine') || v.includes('Draw')
      );
      expect(criticalViolations).toHaveLength(0);
    }
  });

  it('should have deterministic tool audit trail', () => {
    const auditTrailPath = path.join(draftingDir, 'utils', 'toolAuditTrail.ts');
    expect(fs.existsSync(auditTrailPath)).toBe(true);

    const content = fs.readFileSync(auditTrailPath, 'utf8');
    // Must have replay capability for deterministic verification
    expect(content).toContain('replayOperation');
  });
});

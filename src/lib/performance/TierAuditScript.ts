/**
 * TIER CLASSIFICATION AUDIT SCRIPT
 * 
 * Scans ALMONA codebase for constitutional tier boundary violations
 * Ensures Tier 0 (visual) and Tier 3 (execution) remain pure
 */

import type { TierBoundaryViolation } from './TierClassificationAuditor';
import { tierAuditor } from './TierClassificationAuditor';

export interface TierAuditReport {
  timestamp: string;
  filesScanned: number;
  totalViolations: number;
  tier0Violations: TierBoundaryViolation[];
  tier3Violations: TierBoundaryViolation[];
  constitutionalCompliance: 'PASS' | 'FAIL';
  summary: string;
}

/**
 * Scan a directory for tier violations
 */
export async function scanDirectoryForTierViolations(
  directoryPath: string
): Promise<TierBoundaryViolation[]> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const violations: TierBoundaryViolation[] = [];

  async function scanDir(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, .git, etc.
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDir(fullPath);
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          const content = await fs.readFile(fullPath, 'utf-8');
          const fileViolations = tierAuditor.auditFileContent(fullPath, content);
          violations.push(...fileViolations);
        }
      }
    } catch (error) {
      console.warn(`Error scanning ${dir}:`, error);
    }
  }

  await scanDir(directoryPath);
  return violations;
}

/**
 * Run complete tier classification audit
 */
export async function runTierClassificationAudit(
  projectRoot: string
): Promise<TierAuditReport> {
  console.log('🔍 Running Tier Classification Audit...\n');

  // Scan key directories
  const path = await import('path');
  const directories = [
    path.join(projectRoot, 'src/components/fabricator/drafting'),
    path.join(projectRoot, 'src/lib/fabricator/bom'),
    path.join(projectRoot, 'src/lib/fabricator'),
    path.join(projectRoot, 'src/components/fabricator')
  ];

  const allViolations: TierBoundaryViolation[] = [];
  let filesScanned = 0;

  for (const dir of directories) {
    console.log(`Scanning: ${dir}`);
    try {
      const violations = await scanDirectoryForTierViolations(dir);
      allViolations.push(...violations);
      
      const fs = await import('fs/promises');
      const files = await fs.readdir(dir, { recursive: true });
      filesScanned += files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).length;
    } catch (error) {
      console.warn(`Could not scan ${dir}:`, error);
    }
  }

  const tier0Violations = allViolations.filter(v =>
    v.file.includes('Drafting') || v.file.includes('Canvas')
  );

  const tier3Violations = allViolations.filter(v =>
    v.file.includes('BOM') || v.file.includes('Algorithm') || v.file.includes('Grid')
  );

  const constitutionalCompliance = allViolations.length === 0 ? 'PASS' : 'FAIL';

  const summary = allViolations.length === 0
    ? '✅ No constitutional violations detected'
    : `❌ ${allViolations.length} violation(s) found: ${tier0Violations.length} Tier 0, ${tier3Violations.length} Tier 3`;

  const report: TierAuditReport = {
    timestamp: new Date().toISOString(),
    filesScanned,
    totalViolations: allViolations.length,
    tier0Violations,
    tier3Violations,
    constitutionalCompliance,
    summary
  };

  // Print report
  console.log('\n📋 Tier Classification Audit Report');
  console.log('=====================================');
  console.log(`Files Scanned: ${filesScanned}`);
  console.log(`Total Violations: ${allViolations.length}`);
  console.log(`Constitutional Compliance: ${constitutionalCompliance}`);
  console.log(`\n${summary}\n`);

  if (tier0Violations.length > 0) {
    console.log('⚠️ Tier 0 Violations (Visual Layer):');
    tier0Violations.forEach(v => {
      console.log(`  - ${v.file}: ${v.violation}`);
      console.log(`    Article: ${v.constitutionalArticle}`);
    });
  }

  if (tier3Violations.length > 0) {
    console.log('\n⚠️ Tier 3 Violations (Execution Layer):');
    tier3Violations.forEach(v => {
      console.log(`  - ${v.file}: ${v.violation}`);
      console.log(`    Article: ${v.constitutionalArticle}`);
    });
  }

  return report;
}

/**
 * Export audit report to JSON
 */
export async function exportTierAuditReport(
  report: TierAuditReport,
  filePath: string
): Promise<void> {
  const fs = await import('fs/promises');
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`✅ Tier audit report exported to ${filePath}`);
}

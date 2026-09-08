/**
 * Validates wiring-manifest.yaml serviceTruth entries are reachable from production import graph.
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');

/** Production entrypoints that transitively import service components */
const PRODUCTION_ENTRYPOINTS = [
  'src/lib/ticketApi.ts',
  'src/lib/adminTicketApi.ts',
  'src/pages/Services.tsx',
  'src/pages/CustomerSupport.tsx',
  'src/pages/CustomerPortal.tsx',
  'src/pages/TicketDetailPage.tsx',
  'src/pages/AdminDashboard.tsx',
  'src/components/admin/PilotMonitoringDashboard.tsx',
];

function collectImports(filePath: string, visited = new Set<string>()): Set<string> {
  const abs = path.join(REPO_ROOT, filePath);
  if (!fs.existsSync(abs) || visited.has(filePath)) return visited;
  visited.add(filePath);

  const content = fs.readFileSync(abs, 'utf-8');
  const importRegex = /from ['"](@\/[^'"]+|\.[^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    const imp = match[1];
    let resolved: string | null = null;
    if (imp.startsWith('@/')) {
      const candidate = imp.replace('@/', 'src/');
      for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        const p = candidate + ext;
        if (fs.existsSync(path.join(REPO_ROOT, p))) {
          resolved = p;
          break;
        }
      }
      if (!resolved && fs.existsSync(path.join(REPO_ROOT, candidate + '.ts'))) {
        resolved = candidate + '.ts';
      }
    } else if (imp.startsWith('.')) {
      const dir = path.dirname(filePath);
      const candidate = path.normalize(path.join(dir, imp)).replace(/\\/g, '/');
      for (const ext of ['.ts', '.tsx']) {
        const p = candidate + ext;
        if (fs.existsSync(path.join(REPO_ROOT, p))) {
          resolved = p;
          break;
        }
      }
    }
    if (resolved) collectImports(resolved, visited);
  }
  return visited;
}

function extractTier3Locations(manifestContent: string): Array<{ component: string; location: string }> {
  const tier3Block = manifestContent.match(/serviceTruth:\s*[\s\S]*?tier_3:([\s\S]*?)(?=tier_2:|geometryTruth:)/);
  if (!tier3Block) return [];
  const entries: Array<{ component: string; location: string }> = [];
  const componentRegex = /component:\s*(\S+)\s*\n\s*location:\s*(.+)/g;
  let m: RegExpExecArray | null;
  while ((m = componentRegex.exec(tier3Block[1])) !== null) {
    entries.push({ component: m[1], location: m[2].trim() });
  }
  return entries;
}

describe('Wiring manifest — serviceTruth production reachability', () => {
  it('every tier_3 manifest entry is imported by a production entrypoint', () => {
    const manifestPath = path.join(REPO_ROOT, 'src/components/fabricator/wiring-manifest.yaml');
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const tier3 = extractTier3Locations(manifestContent);
    const productionGraph = new Set<string>();
    for (const entry of PRODUCTION_ENTRYPOINTS) {
      collectImports(entry, productionGraph);
    }
    const unreachable: string[] = [];

    for (const entry of tier3) {
      const loc = entry.location.replace(/\\/g, '/');
      const reachable = [...productionGraph].some(
        (f) => f.replace(/\\/g, '/') === loc || f.replace(/\\/g, '/').endsWith(loc.replace('src/', '')),
      );
      if (!reachable) {
        unreachable.push(`${entry.component} (${loc})`);
      }
    }

    expect(unreachable, `Unreachable tier_3 manifest entries: ${unreachable.join(', ')}`).toEqual([]);
  });

  it('production ticket API imports canonical lifecycle engine', () => {
    const governanceSource = fs.readFileSync(
      path.join(REPO_ROOT, 'src/lib/ticketing/TicketGovernanceService.ts'),
      'utf-8',
    );
    expect(governanceSource).toContain('TicketLifecycleEngine');
    expect(governanceSource).toContain('SLACalculator');
    expect(governanceSource).toContain('EscalationEngine');
  });
});

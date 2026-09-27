#!/usr/bin/env node
/**
 * AUDIT-ONLY inventory for regional profile + blueprint scalability.
 *
 * Not imported by runtime. Not a manufacturing authority.
 * Counts structural definitions by reading source text.
 *
 * Usage: node scripts/audit/inventory-regional-profile-blueprint.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'coverage' || name === 'dist' || name === '.git') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function uniqueMatches(source, regex) {
  const ids = new Set();
  for (const match of source.matchAll(regex)) {
    ids.add(match[1]);
  }
  return [...ids];
}

function countRegex(source, regex) {
  return [...source.matchAll(regex)].length;
}

const egyptianTemplates = read('src/components/fabricator/drafting/utils/egyptianTemplates.ts');
const egyptianPatterns = read('src/data/egyptian-window-patterns.ts');
const egyptianRegistry = read('src/data/egyptian-templates-registry.json');
const egyptianJson = read('src/lib/fabricator/egyptian_templates.json');
const projectTemplates = read('src/data/templates/ProjectTemplates.ts');
const systemPacks = read('src/data/systemPacks.ts');
const upvcSystems = read('src/data/upvc-systems.ts');
const certifiedPacks = read('src/data/certified/CertifiedSystemPacks.ts');
const fabricatorTypes = read('src/types/fabricator.ts');
const fenestrationTypes = read('src/types/fenestration.ts');
const profileRoleUtils = read('src/lib/fabricator/profileRoleUtils.ts');

const egyptianTemplateIdAlt = uniqueMatches(egyptianTemplates, /id:\s*'(egyptian_[^']+)'/g);

const patternIds = uniqueMatches(egyptianPatterns, /^\s+id:\s*'([^']+)'/gm);
const egyptianPatternSection = egyptianPatterns.split('export const EGYPTIAN_WINDOW_PATTERNS')[0] ?? egyptianPatterns;
const egyptianWindowPatternSection = egyptianPatterns.split('export const EGYPTIAN_WINDOW_PATTERNS')[1] ?? '';
const egyptianPatternIds = uniqueMatches(egyptianPatternSection, /^\s+id:\s*'([^']+)'/gm);
const egyptianWindowPatternIds = uniqueMatches(egyptianWindowPatternSection, /^\s+id:\s*'([^']+)'/gm);

const registryIds = uniqueMatches(egyptianRegistry, /"id":\s*"([^"]+)"/g);
const jsonTemplateIds = uniqueMatches(egyptianJson, /"id":\s*"([^"]+)"/g);
const projectTemplateIds = [...projectTemplates.matchAll(/id:\s*'((?:res|com)-[^']+)'/g)].map(
  (m) => m[1]
);

const systemPackArraySource = (systemPacks.match(/export const SYSTEM_PACKS[\s\S]*?;/) ?? [''])[0];
const systemPackNamedExports = uniqueMatches(systemPacks, /export const ([A-Z0-9_]+_PACK(?:_[A-Z0-9]+)?)[^=]*=/g);
const systemPackMetaIds = uniqueMatches(systemPacks, /id:\s*'([a-z0-9-]+)'/g).filter((id) =>
  ['rock60', 'jumbo100'].includes(id)
);

const upvcPackIds = uniqueMatches(upvcSystems, /id:\s*'([a-z0-9_]+)'/g).filter((id) =>
  /^(wintech|kompen|veka|rehau|katra|emapen|foxywin)_/.test(id)
);
const profileSystemFiles = [
  'src/data/profileSystems/egyptian/caluminium/ps.ts',
  'src/data/profileSystems/egyptian/panda/panda.ts',
  'src/data/profileSystems/turkish/anadolu/w60.ts',
  'src/data/profileSystems/turkish/kale/kale70.ts',
  'src/data/profileSystems/turkish/asas/asasCW100.ts',
  'src/data/profileSystems/turkish/yilmaz/w60.ts',
];

const packMetaIds = [];
for (const file of profileSystemFiles) {
  packMetaIds.push(...uniqueMatches(read(file), /id:\s*'([a-z0-9-]+)'/g));
}
packMetaIds.push('rock60', 'jumbo100', ...upvcPackIds);
const cellIdNoise = /^\d+-\d+$/;

const upvcProfileIds = uniqueMatches(upvcSystems, /id:\s*'([A-Z0-9-]+)'/g).filter((id) =>
  /^(W-|KOMPEN-|VEKA-|REHAU-|KATRA-|EMA|FOXYWIN-)/.test(id)
);

const fabricatorProfileRoles = uniqueMatches(
  fabricatorTypes,
  /^\s+\|\s+'([a-z_]+)'/gm
);
const fenestrationRoles = uniqueMatches(fenestrationTypes, /role:\s*'([^']+)'/g);
const profileRoleValues = uniqueMatches(profileRoleUtils, /value:\s*'([^']+)'/g);

const srcFiles = walk(join(ROOT, 'src')).filter((f) => /\.(ts|tsx)$/.test(f));
const machineAdapterFiles = srcFiles.filter((f) =>
  /adapter|CNC|MDBExport|CutListAdapter/i.test(relative(ROOT, f)) &&
  /cnc|machines|integrations|exports/i.test(relative(ROOT, f))
);

let deceuninckBranches = 0;
let yilmazBranches = 0;
let upvcBranches = 0;
let aluminumBranches = 0;
let rock60Branches = 0;
const deceuninckFiles = [];
const yilmazFiles = [];

for (const file of srcFiles) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (rel.includes('__pycache__') || rel.includes('coverage')) continue;
  const text = readFileSync(file, 'utf8');
  const d = countRegex(text, /Deceuninck/g);
  const y = countRegex(text, /Yilmaz|Yılmaz|YILMAZ/g);
  const u = countRegex(text, /\bupvc\b/gi);
  const a = countRegex(text, /\balumin(i)?um\b/gi);
  const r = countRegex(text, /ROCK\s*60|rock60|ROCK60/g);
  if (d) {
    deceuninckBranches += d;
    deceuninckFiles.push({ file: rel, count: d });
  }
  if (y) {
    yilmazBranches += y;
    yilmazFiles.push({ file: rel, count: y });
  }
  upvcBranches += u;
  aluminumBranches += a;
  rock60Branches += r;
}

const adapterClassFiles = [
  'src/lib/cnc/adapters/BaseCNCAdapter.ts',
  'src/lib/cnc/adapters/YilmazAdapter.ts',
  'src/lib/cnc/adapters/ElumatecAdapter.ts',
  'src/integrations/yilmaz/YilmazCutListAdapter.ts',
  'src/integrations/yilmaz/YilmazCNC.ts',
  'src/integrations/cnc/ElumatecCNC.ts',
  'src/integrations/cnc/HomagCNC.ts',
  'src/integrations/cnc/BiesseCNC.ts',
  'src/integrations/cnc/TrumpfCNC.ts',
  'src/lib/exports/ALM6510MDBExport.ts',
  'src/lib/machines/ALM6510MachineSet.ts',
  'src/lib/machines/AIM3410MachineSet.ts',
];

const report = {
  generatedAt: 'AUDIT-ONLY',
  note: 'Counts are source-text inventories, not runtime guarantees. Manufacturer/material branch counts are occurrence counts, not distinct semantic branches.',
  templates: {
    egyptianTemplates_claimedInComment: '50+',
    egyptianTemplates_uniqueIds: egyptianTemplateIdAlt.length,
    egyptianTemplateIds: egyptianTemplateIdAlt,
    egyptianPatterns_ids: egyptianPatternIds.length,
    egyptianPatternIds,
    egyptianWindowPatterns_ids: egyptianWindowPatternIds.length,
    egyptianWindowPatternIds,
    overlappingPatternIds: egyptianPatternIds.filter((id) => egyptianWindowPatternIds.includes(id)),
    egyptianTemplatesRegistryJson: registryIds.length,
    registryIds,
    egyptian_templates_json: jsonTemplateIds.length,
    jsonTemplateIds,
    projectTemplates: projectTemplateIds.length,
    projectTemplateIds,
    projectTemplateIdNote: 'Only top-level res-/com- ids. Cell ids such as 0-0 are not templates.',
  },
  profileSystems: {
    SYSTEM_PACKS_namedConstants: systemPackNamedExports,
    SYSTEM_PACKS_sourceArrayIncludesEgyptianUpvcSpread: /EGYPTIAN_UPVC_SYSTEMS/.test(systemPacks),
    profileSystemPackMetaIds: [...new Set(packMetaIds)].filter((id) => !cellIdNoise.test(id)),
    profileSystemPackMetaIdCount: new Set(packMetaIds.filter((id) => !cellIdNoise.test(id))).size,
    egyptianUpvcSystemPackIds: upvcPackIds,
    egyptianUpvcSystemPackCount: upvcPackIds.length,
    certifiedSystemPacks: uniqueMatches(certifiedPacks, /id:\s*'([^']+)'/g),
    deceuninckInSYSTEM_PACKS: /Deceuninck/.test(systemPacks),
    alumilTokenInSYSTEM_PACKS_file: /ALUMIL/.test(systemPacks),
    alumilShippedInSYSTEM_PACKS_array: /ALUMIL_EGYPT_NC_PACK,/.test(
      systemPackArraySource.replace(/\/\/.*$/gm, '')
    ),
    note: 'alumilToken is a commented Coming Soon line, not a shipped pack. Cell ids like 0-0 are excluded from pack meta counts.',
  },
  profiles: {
    upvcProfileObjectIds: upvcProfileIds.length,
    upvcProfileObjectIdSample: upvcProfileIds.slice(0, 20),
    note: 'Aluminum profiles in SystemPacks are often nested in windowSystemSpec JSON, not a uniform Profile[] array. Exact aluminum profile count is UNPROVEN without executing pack parsers.',
  },
  roles: {
    fabricatorProfileRoleUnionApprox: fabricatorProfileRoles.filter((r) =>
      [
        'frame',
        'sash',
        'mullion',
        'transom',
        'glazing_bead',
        'interlock',
        'reinforcement',
        'threshold',
        'gasket',
      ].includes(r)
    ),
    profileRoleUtilsValues: profileRoleValues,
    fenestrationRoles,
  },
  branches: {
    Deceuninck_occurrences: deceuninckBranches,
    Deceuninck_files: deceuninckFiles.length,
    Yilmaz_occurrences: yilmazBranches,
    Yilmaz_files: yilmazFiles.length,
    upvc_occurrences: upvcBranches,
    aluminum_occurrences: aluminumBranches,
    ROCK60_occurrences: rock60Branches,
    note: 'UNPROVEN as distinct control-flow branches. These are token occurrence counts.',
  },
  machineAdapters: {
    expectedAdapterFiles: adapterClassFiles,
    existingAdapterFiles: adapterClassFiles.filter((f) => {
      try {
        read(f);
        return true;
      } catch {
        return false;
      }
    }),
    relatedPathMatches: machineAdapterFiles.map((f) => relative(ROOT, f).replace(/\\/g, '/')),
  },
};

console.log(JSON.stringify(report, null, 2));
console.log('\n--- SUMMARY ---');
console.log(`EgyptianTemplate unique IDs: ${egyptianTemplateIdAlt.length}`);
console.log(`EGYPTIAN_PATTERNS IDs: ${egyptianPatternIds.length}`);
console.log(`EGYPTIAN_WINDOW_PATTERNS IDs: ${egyptianWindowPatternIds.length}`);
console.log(`Overlapping pattern IDs: ${report.templates.overlappingPatternIds.join(', ') || '(none)'}`);
console.log(`egyptian-templates-registry.json: ${registryIds.length}`);
console.log(`egyptian_templates.json: ${jsonTemplateIds.length}`);
console.log(`ProjectTemplates: ${projectTemplateIds.length}`);
console.log(`Egyptian UPVC pack IDs: ${upvcPackIds.length}`);
console.log(`Profile-system meta IDs (deduped): ${new Set(packMetaIds.filter((id) => !cellIdNoise.test(id))).size}`);
console.log(`Certified packs: ${report.profileSystems.certifiedSystemPacks.join(', ')}`);
console.log(`Deceuninck in SYSTEM_PACKS.ts: ${report.profileSystems.deceuninckInSYSTEM_PACKS}`);
console.log(`UPVC Profile[] ids: ${upvcProfileIds.length}`);
console.log(`profileRole utils values: ${profileRoleValues.length}`);
console.log(`Deceuninck occurrences: ${deceuninckBranches} across ${deceuninckFiles.length} files`);
console.log(`Yilmaz occurrences: ${yilmazBranches} across ${yilmazFiles.length} files`);
console.log(`Adapter files present: ${report.machineAdapters.existingAdapterFiles.length}/${adapterClassFiles.length}`);

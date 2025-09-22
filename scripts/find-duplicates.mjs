#!/usr/bin/env node
/**
 * Scan repository for duplicate files by filename and by content hash.
 * Outputs:
 *  - duplicates-report.json (full detail)
 *  - duplicates-report.md (human-friendly summary)
 */

import { createHash } from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

const ROOT = process.cwd();

const DEFAULT_IGNORE_DIRS = new Set([
  '.git',
  '.svn',
  '.hg',
  'node_modules',
  '.turbo',
  '.next',
  '.vercel',
  'dist',
  'build',
  'out',
  '.output',
  '.storybook',
  'storybook-static',
  'coverage',
  '.nyc_output',
  '.cache',
  '.vscode',
  '.idea'
]);

const DEFAULT_IGNORE_FILES = new Set([
  // lockfiles and logs often duplicated by design; still allow hashing if needed, but skip noise
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
]);

const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB safety limit

/**
 * Simple CLI args: --root, --include-hidden, --no-ignore-images, --ext=.png,.jpg
 */
const argv = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.includes('=') ? a.split('=') : [a, 'true'];
    return [k.replace(/^--/, ''), v];
  })
);

const SCAN_ROOT = path.resolve(argv.get('root') || ROOT);
const INCLUDE_HIDDEN = argv.get('include-hidden') === 'true' || false;
const ONLY_EXTS = (argv.get('ext') || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isHidden(p) {
  return path.basename(p).startsWith('.');
}

function shouldIgnoreDir(dirName) {
  if (!INCLUDE_HIDDEN && dirName.startsWith('.')) return true;
  return DEFAULT_IGNORE_DIRS.has(dirName);
}

function shouldConsiderFile(filePath) {
  const base = path.basename(filePath);
  if (!INCLUDE_HIDDEN && base.startsWith('.')) return false;
  if (DEFAULT_IGNORE_FILES.has(base)) return true; // allow but de-prioritize; we don't exclude by default
  if (ONLY_EXTS.length) {
    const ext = path.extname(base).toLowerCase();
    return ONLY_EXTS.includes(ext);
  }
  return true;
}

async function walk(dir, out = []) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (shouldIgnoreDir(ent.name)) continue;
      await walk(full, out);
    } else if (ent.isFile()) {
      if (!shouldConsiderFile(full)) continue;
      out.push(full);
    }
  }
  return out;
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    const s = fs.createReadStream(filePath);
    s.on('error', reject);
    s.on('data', (chunk) => h.update(chunk));
    s.on('end', () => resolve(h.digest('hex')));
  });
}

async function safeStat(p) {
  try {
    return await fsp.stat(p);
  } catch (e) {
    return null;
  }
}

function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

async function main() {
  console.log(`Scanning for duplicates in: ${SCAN_ROOT}`);
  const files = await walk(SCAN_ROOT);
  console.log(`Found ${files.length} candidate files`);

  const byName = new Map(); // name -> [{ path, size, hash? }]
  const byHash = new Map(); // hash -> [{ path, size, name, ext }]
  const errors = [];
  let skippedBySize = 0;

  for (const p of files) {
    const st = await safeStat(p);
    if (!st || !st.isFile()) continue;
    if (st.size > MAX_FILE_SIZE_BYTES) {
      skippedBySize++;
      continue;
    }
    const base = path.basename(p);
    const ext = path.extname(base).toLowerCase();
    try {
      const h = await hashFile(p);
      const rec = { path: path.relative(SCAN_ROOT, p), size: st.size, name: base, ext, hash: h };

      if (!byName.has(base)) byName.set(base, []);
      byName.get(base).push({ path: rec.path, size: rec.size, hash: h });

      if (!byHash.has(h)) byHash.set(h, []);
      byHash.get(h).push({ path: rec.path, size: rec.size, name: base, ext });
    } catch (e) {
      errors.push({ path: p, error: String(e) });
    }
  }

  // Build groups
  const duplicatesByHash = Array.from(byHash.entries())
    .filter(([, arr]) => arr.length > 1)
    .map(([hash, arr]) => ({
      hash,
      count: arr.length,
      totalBytes: arr.reduce((a, b) => a + b.size, 0),
      files: arr.sort((a, b) => a.path.localeCompare(b.path))
    }))
    .sort((a, b) => b.count - a.count || b.totalBytes - a.totalBytes);

  const duplicatesByName = Array.from(byName.entries())
    .filter(([, arr]) => arr.length > 1)
    .map(([name, arr]) => ({
      name,
      count: arr.length,
      files: arr
        .map((r) => ({ ...r }))
        .sort((a, b) => a.path.localeCompare(b.path))
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const sameNameDifferentContent = duplicatesByName
    .map((g) => ({
      name: g.name,
      variants: Array.from(
        new Map(g.files.map((f) => [f.hash, []])).keys()
      ),
      variantCounts: Object.values(
        g.files.reduce((acc, f) => {
          acc[f.hash] = (acc[f.hash] || 0) + 1;
          return acc;
        }, {})
      ).length,
      files: g.files
    }))
    .filter((g) => g.variantCounts > 1)
    .sort((a, b) => b.files.length - a.files.length || a.name.localeCompare(b.name));

  const totalBytes = files
    .map((p) => fs.existsSync(p) ? fs.statSync(p).size : 0)
    .reduce((a, b) => a + b, 0);
  const duplicateBytesSavings = duplicatesByHash.reduce((sum, grp) => {
    // Keep one copy, delete the rest
    if (!grp.files.length) return sum;
    const sizePerFile = grp.files[0].size; // all identical content hashes share size, but be safe
    // If sizes differ but hashes same (shouldn't), fallback to max size logic
    const sizes = grp.files.map((f) => f.size);
    const maxSize = Math.max(...sizes);
    // Savings if keeping the largest one once
    return sum + (sizes.reduce((a, b) => a + b, 0) - maxSize);
  }, 0);

  const summary = {
    scannedRoot: SCAN_ROOT,
    filesConsidered: files.length,
    totalBytes,
    totalBytesHuman: formatBytes(totalBytes),
    duplicatesByHashCount: duplicatesByHash.length,
    duplicatesByNameCount: duplicatesByName.length,
    sameNameDifferentContentCount: sameNameDifferentContent.length,
    potentialSpaceSavingsBytes: duplicateBytesSavings,
    potentialSpaceSavingsHuman: formatBytes(duplicateBytesSavings),
    skippedOverSize: skippedBySize,
    errors: errors.length
  };

  // Write JSON report
  const jsonReport = {
    summary,
    duplicatesByHash,
    duplicatesByName,
    sameNameDifferentContent,
    errors
  };

  const jsonPath = path.join(SCAN_ROOT, 'duplicates-report.json');
  const mdPath = path.join(SCAN_ROOT, 'duplicates-report.md');
  await fsp.writeFile(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');

  // Write Markdown summary (top groups)
  const TOP_N = 50;
  const md = [];
  md.push(`# Duplicate Scan Report`);
  md.push('');
  md.push(`Root: ${SCAN_ROOT}`);
  md.push('');
  md.push(`- Files scanned: ${summary.filesConsidered}`);
  md.push(`- Total size: ${summary.totalBytesHuman}`);
  md.push(`- Duplicate content groups: ${summary.duplicatesByHashCount}`);
  md.push(`- Duplicate filename groups: ${summary.duplicatesByNameCount}`);
  md.push(`- Same name, different content: ${summary.sameNameDifferentContentCount}`);
  md.push(`- Potential space savings: ${summary.potentialSpaceSavingsHuman}`);
  if (summary.skippedOverSize) md.push(`- Skipped due to size: ${summary.skippedOverSize}`);
  if (summary.errors) md.push(`- Errors: ${summary.errors}`);
  md.push('');

  md.push('## Top duplicate content groups (by count)');
  md.push('');
  duplicatesByHash.slice(0, TOP_N).forEach((grp, i) => {
    md.push(`### ${i + 1}. Hash ${grp.hash} — ${grp.count} files, ${formatBytes(grp.totalBytes)}`);
    grp.files.forEach((f) => md.push(`- ${f.path} (${formatBytes(f.size)})`));
    md.push('');
  });

  md.push('## Top duplicate filenames (by count)');
  md.push('');
  duplicatesByName.slice(0, TOP_N).forEach((grp, i) => {
    md.push(`### ${i + 1}. ${grp.name} — ${grp.count} files`);
    grp.files.forEach((f) => md.push(`- ${f.path} (${formatBytes(f.size)})`));
    md.push('');
  });

  md.push('## Same filename, different content (by total variants)');
  md.push('');
  sameNameDifferentContent.slice(0, TOP_N).forEach((grp, i) => {
    md.push(`### ${i + 1}. ${grp.name} — ${grp.variantCounts} content variants across ${grp.files.length} files`);
    grp.files.forEach((f) => md.push(`- ${f.path} — hash ${f.hash}`));
    md.push('');
  });

  await fsp.writeFile(mdPath, md.join('\n'), 'utf8');

  console.log('Done. Reports written:');
  console.log(`  - ${path.relative(SCAN_ROOT, jsonPath)}`);
  console.log(`  - ${path.relative(SCAN_ROOT, mdPath)}`);
}

main().catch((e) => {
  console.error('Duplicate scan failed:', e);
  process.exit(1);
});

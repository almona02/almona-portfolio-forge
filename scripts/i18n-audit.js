#!/usr/bin/env node
/*
 * Simple i18n key audit: compares keys between languages & reports missing ones.
 * Usage: node scripts/i18n-audit.js
 */
import fs from 'fs';
import path from 'path';

const localesDir = path.resolve(process.cwd(), 'locales');
if (!fs.existsSync(localesDir)) {
  console.error('No locales directory found.');
  process.exit(1);
}

const languages = fs.readdirSync(localesDir).filter(f => fs.statSync(path.join(localesDir, f)).isDirectory());
const trees = {};

function loadLang(lang) {
  const dir = path.join(localesDir, lang);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const root = {};
  for (const file of files) {
    const ns = file.replace(/\.json$/, '');
    const json = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
    root[ns] = json;
  }
  return root;
}

for (const lang of languages) {
  trees[lang] = loadLang(lang);
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    const key = prefix ? `${prefix}.${k}` : k;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(out, flatten(val, key));
    } else {
      out[key] = true;
    }
  }
  return out;
}

// Use first language as baseline
const baseline = languages[0];
const baselineFlat = {};
for (const ns of Object.keys(trees[baseline])) {
  baselineFlat[ns] = flatten(trees[baseline][ns]);
}

const report = [];
for (const lang of languages) {
  if (lang === baseline) continue;
  for (const ns of Object.keys(baselineFlat)) {
    const current = trees[lang][ns] ? flatten(trees[lang][ns]) : {};
    const missing = Object.keys(baselineFlat[ns]).filter(k => !current[k]);
    if (missing.length) {
      report.push({ lang, namespace: ns, missing });
    }
  }
}

if (!report.length) {
  console.log('All languages complete relative to baseline:', baseline);
  process.exit(0);
}

console.log('i18n Missing Keys Report (baseline =', baseline, ')');
for (const r of report) {
  console.log(`\n[${r.lang}] namespace: ${r.namespace}`);
  for (const k of r.missing.slice(0, 50)) {
    console.log('  -', k);
  }
  if (r.missing.length > 50) console.log(`  ... (+${r.missing.length - 50} more)`);
}
process.exit(1);

// Constitutional ML/AI Import Scanner
// AICS-001 §5.10.2 Enforcement
// Scans Tier 0 components for forbidden ML/AI library imports

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const TIER_0_PATHS = [
  'src/components/fabricator/drafting',
  'src/components/fabricator/EngineeringBay.tsx'
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];

  FORBIDDEN_IMPORTS.forEach(lib => {
    const patterns = [
      new RegExp(`from\\s+['"]${lib}`, 'g'),
      new RegExp(`import.*${lib}`, 'g'),
      new RegExp(`require\\(['"]${lib}`, 'g')
    ];

    patterns.forEach(pattern => {
      if (pattern.test(content)) {
        violations.push({
          file: filePath,
          library: lib,
          type: 'ML/AI Import'
        });
      }
    });
  });

  return violations;
}

function scanDirectory(dirPath) {
  let violations = [];

  if (!fs.existsSync(dirPath)) {
    console.warn(`⚠️  Path does not exist: ${dirPath}`);
    return violations;
  }

  const stat = fs.statSync(dirPath);

  if (stat.isFile()) {
    return scanFile(dirPath);
  }

  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      violations = violations.concat(scanDirectory(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      violations = violations.concat(scanFile(filePath));
    }
  });

  return violations;
}

function main() {
  console.log('🔍 Scanning Tier 0 components for ML/AI imports...\n');

  let allViolations = [];
  const projectRoot = path.resolve(__dirname, '..');

  TIER_0_PATHS.forEach(tierPath => {
    const fullPath = path.join(projectRoot, tierPath);
    console.log(`Scanning: ${tierPath}`);
    const violations = scanDirectory(fullPath);
    allViolations = allViolations.concat(violations);
  });

  if (allViolations.length > 0) {
    console.log(`\n🚨 CONSTITUTIONAL VIOLATION DETECTED\n`);
    console.log(`Found ${allViolations.length} ML/AI import(s) in Tier 0 components:\n`);

    allViolations.forEach(v => {
      console.log(`  ❌ ${v.file}`);
      console.log(`     Library: ${v.library}`);
      console.log(`     Type: ${v.type}\n`);
    });

    console.log('AICS-001 §5.10.2 Violation: No ML/AI in Tier 0 execution paths');
    process.exit(1);
  } else {
    console.log('\n✅ No ML/AI contamination detected in Tier 0 components');
    console.log('AICS-001 §5.10.2: COMPLIANT\n');
    process.exit(0);
  }
}

main();

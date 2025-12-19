import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 FINDING STATS.JS IMPORTS\n');

// Search in source files
const srcDir = path.join(process.cwd(), 'src');
const files = [];

function searchDir(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (
      item.endsWith('.ts') ||
      item.endsWith('.tsx') ||
      item.endsWith('.js') ||
      item.endsWith('.jsx')
    ) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.includes('stats.js')) {
        files.push(fullPath);

        // Find the exact import
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('stats.js')) {
            console.log(`📄 ${path.relative(process.cwd(), fullPath)}:${index + 1}`);
            console.log(`   ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchDir(srcDir);

if (files.length === 0) {
  console.log('No stats.js imports found in source files.');
  console.log('\nChecking node_modules for transitive dependencies...');

  // Check if any dependency uses stats.js
  const packageLockPath = path.join(process.cwd(), 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf-8'));
    Object.entries(packageLock.packages || {}).forEach(([pkgName, pkgData]) => {
      if (pkgName.includes('stats.js')) {
        console.log(`📦 ${pkgName}: ${JSON.stringify(pkgData, null, 2)}`);
      }
    });
  }
}

console.log('\n✅ Search complete');

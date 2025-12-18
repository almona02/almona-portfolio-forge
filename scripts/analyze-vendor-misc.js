import fs from 'fs';
import path from 'path';

// Read the bundle stats
const statsPath = path.join(process.cwd(), 'dist', 'stats.json');

if (!fs.existsSync(statsPath)) {
  console.error('❌ stats.json not found. Run: ANALYZE=true npm run build');
  process.exit(1);
}

const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));

// Find vendor-misc chunk
const vendorMisc = stats.chunks?.find(chunk => 
  chunk.names?.some(name => name.includes('vendor-misc') && name.endsWith('.js'))
);

if (!vendorMisc) {
  console.error('❌ vendor-misc chunk not found');
  console.log('Available chunks:', stats.chunks?.map(c => c.names?.[0]).join(', '));
  process.exit(1);
}

console.log('🔍 Analyzing vendor-misc chunk\n');
console.log(`Total size: ${(vendorMisc.size / 1024).toFixed(2)} KB (${(vendorMisc.size / 1024 / 1024).toFixed(2)} MB)\n`);

// Extract modules and group by library
const modules = Object.entries(vendorMisc.modules || {});
const libraryMap = new Map();

modules.forEach(([modulePath, moduleData]) => {
  const size = moduleData.size || 0;
  
  // Extract library name from path
  let library = 'unknown';
  
  if (modulePath.includes('node_modules/')) {
    const parts = modulePath.split('node_modules/')[1].split('/');
    library = parts[0];
    
    // Handle scoped packages
    if (library.startsWith('@')) {
      library = parts.slice(0, 2).join('/');
    }
  } else {
    library = 'app-code';
  }
  
  if (!libraryMap.has(library)) {
    libraryMap.set(library, { size: 0, modules: [] });
  }
  
  libraryMap.get(library).size += size;
  libraryMap.get(library).modules.push({
    path: modulePath,
    size: size
  });
});

// Sort by size
const sortedLibraries = Array.from(libraryMap.entries())
  .sort((a, b) => b[1].size - a[1].size);

console.log('📊 Top 20 Libraries in vendor-misc:\n');
sortedLibraries.slice(0, 20).forEach(([lib, data], index) => {
  const sizeKB = (data.size / 1024).toFixed(2);
  const sizeMB = (data.size / 1024 / 1024).toFixed(2);
  const percentage = ((data.size / vendorMisc.size) * 100).toFixed(1);
  console.log(`${(index + 1).toString().padStart(2)}. ${lib.padEnd(40)} ${sizeKB.padStart(10)} KB (${sizeMB} MB) - ${percentage}%`);
});

console.log('\n🎯 Top 5 Largest Libraries:\n');
sortedLibraries.slice(0, 5).forEach(([lib, data], index) => {
  const sizeMB = (data.size / 1024 / 1024).toFixed(2);
  console.log(`${index + 1}. ${lib}: ${sizeMB} MB`);
  console.log(`   Sample modules:`);
  data.modules
    .sort((a, b) => b.size - a.size)
    .slice(0, 3)
    .forEach(mod => {
      console.log(`   - ${(mod.size / 1024).toFixed(2)} KB: ${mod.path.split('node_modules/')[1] || mod.path}`);
    });
  console.log('');
});


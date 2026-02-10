
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const statsPath = path.join(__dirname, '../stats.json');

try {
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  console.log('📦 Bundle Composition Analysis');
  console.log('==================================================');

  // Helper to find large modules recursively
  function findLargeModules(node, nodeParts) {
    let modules = [];
    
    // Check if node has children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        modules = modules.concat(findLargeModules(child, nodeParts));
      });
    } else {
       // Leaf node (file) or a node with size
       // Visualizer stats have 'uid' which maps to data in nodeParts
       if (node.uid && nodeParts[node.uid]) {
         modules.push({
           name: node.name || node.id || 'unknown',
           size: nodeParts[node.uid].renderedLength || 0,
           uid: node.uid
         });
       } else if (node.uid || node.id) {
          // Fallback if no nodeParts entry (shouldn't happen for leaves)
         modules.push({
           name: node.name || node.id || 'unknown',
           size: node.renderedLength || node.size || 0,
           uid: node.uid
         });
       }
    }
    return modules;
  }

  // Visualizer structure for raw-data is usually:
  // { tree: { children: [...] } }
  
  let chunks = [];
  if (stats.tree && stats.tree.children) {
      chunks = stats.tree.children;
  } else if (stats.children) {
      chunks = stats.children;
  } else {
      console.error('Unexpected JSON structure: no tree.children or children');
      process.exit(1);
  }
  
  chunks.forEach(chunk => {
    // Filter for our target chunks or large chunks in general
    if (
      chunk.name.includes('vendor-3d') || 
      chunk.name.includes('vendor-documents') || 
      chunk.name.includes('vendor-ml') ||
      chunk.name.includes('vendor-pdf') ||
      chunk.name.includes('vendor-excel')
    ) {
        const sizeKB = (chunk.renderedLength || chunk.size || 0) / 1024;
        console.log(`\n🔹 Chunk: ${chunk.name}`);
        console.log(`   Size: ${sizeKB.toFixed(2)} KB`);
        console.log('   Top 20 Modules:');
        
        let modules = findLargeModules(chunk, stats.nodeParts || {});
        
        // Deduplicate modules if necessary (sometimes same id appears in different paths if not careful, but visualizer should be unique per chunk)
        // Sort by size
        modules.sort((a, b) => b.size - a.size);
        
        modules.slice(0, 20).forEach(mod => {
            const modSizeKB = mod.size / 1024;
            // Shorten name for readability
            let name = mod.name;
            if (name.includes('node_modules')) {
                name = name.split('node_modules/').pop();
            }
            console.log(`   - ${modSizeKB.toFixed(2)} KB : ${name}`);
        });
    }
  });

} catch (err) {
  console.error('Error analyzing stats.json:', err.message);
}

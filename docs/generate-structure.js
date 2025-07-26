import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current module path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateDirectoryTree(dir, prefix = '') {
  let result = '';
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    entries.forEach((entry, index) => {
      const isLast = index === entries.length - 1;
      const location = path.join(dir, entry.name);
      
      // Skip node_modules and other non-essential directories
      if (entry.name === 'node_modules' || entry.name === '.git') return;
      
      result += prefix + (isLast ? '└── ' : '├── ') + entry.name + '\n';
      
      if (entry.isDirectory()) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        result += generateDirectoryTree(location, newPrefix);
      }
    });
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error);
  }
  
  return result;
}

try {
  const projectRoot = path.join(__dirname, '..');
  const treeStructure = generateDirectoryTree(projectRoot);
  const outputPath = path.join(__dirname, 'project-structure.md');
  fs.writeFileSync(outputPath, `# Project Structure\n\n\`\`\`\n${treeStructure}\n\`\`\``);
  console.log(`Project structure generated at ${outputPath}`);
} catch (error) {
  console.error('Failed to generate project structure:', error);
  process.exit(1);
}
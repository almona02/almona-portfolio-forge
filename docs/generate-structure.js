import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current module path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File descriptions for better documentation
const fileDescriptions = {
  // Configuration files
  '.blackboxrules': 'Project-specific AI assistant rules and guidelines',
  '.gitignore': 'Git ignore patterns for version control',
  '.vercelignore': 'Vercel deployment ignore patterns',
  'components.json': 'shadcn/ui component configuration',
  'eslint.config.js': 'ESLint linting configuration',
  'postcss.config.js': 'PostCSS processing configuration',
  'tailwind.config.ts': 'Tailwind CSS framework configuration',
  'tsconfig.json': 'TypeScript compiler configuration',
  'vite.config.ts': 'Vite build tool configuration',
  'vitest.config.ts': 'Vitest testing framework configuration',
  'vercel.json': 'Vercel deployment configuration',
  'package.json': 'Node.js dependencies and scripts',
  
  // Documentation
  'README.md': 'Main project documentation and setup guide',
  'DEVELOPMENT_GUIDE.md': 'Development guidelines and best practices',
  'MCP_SETUP.md': 'Model Context Protocol setup instructions',
  'CODE_PRINCIPLES_EVALUATION.md': 'Code quality evaluation and standards',
  'SECURITY_IMPROVEMENTS_SUMMARY.md': 'Security enhancements and fixes',
  
  // Database
  'database-schema.sql': 'Complete e-commerce database schema',
  'service-ticketing-system-secure.sql': 'Secure service ticketing system schema',
  
  // Main application files
  'index.html': 'Main HTML template for the React application',
  'App.tsx': 'Root React application component',
  'main.tsx': 'Application entry point and React DOM rendering',
  
  // Key directories
  'src': 'React application source code',
  'public': 'Static assets and files served directly',
  'python_backend': 'FastAPI backend with AI services',
  'docs': 'Project documentation and guides',
  'locales': 'Internationalization translation files',
  'scripts': 'Build and utility scripts',
  
  // Component directories
  'components': 'Reusable React UI components',
  '3d-model': '3D visualization and AR components',
  'about': 'Company information and team components',
  'auth': 'Authentication and user management',
  'shop': 'E-commerce and product catalog',
  'services': 'Service management and customer portal',
  'support': 'Customer support and ticketing',
  'quotes': 'Quote request and management system',
  
  // Backend directories
  'apis': 'FastAPI route handlers and endpoints',
  'ai_services': 'Machine learning and AI-powered features',
  'core': 'Core application logic and configurations',
  'models': 'Pydantic data models for API validation',
  'tests': 'Comprehensive testing suite',
  'templates': 'Email notification templates'
};

function getFileDescription(fileName, isDirectory = false) {
  const description = fileDescriptions[fileName];
  if (description) {
    return ` # ${description}`;
  }
  return '';
}

function generateDirectoryTree(dir, prefix = '', maxDepth = 4, currentDepth = 0) {
  let result = '';
  
  // Limit depth to prevent overly deep trees
  if (currentDepth >= maxDepth) {
    return result;
  }
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    // Filter and sort entries
    const filteredEntries = entries.filter(entry => {
      // Skip common directories that clutter the tree
      const skipDirs = [
        'node_modules', '.git', '.next', 'dist', 'build', 
        '.vercel', '.vscode', '__pycache__', '.pytest_cache',
        'coverage', '.nyc_output', 'uploads'
      ];
      
      // Skip common files that aren't essential for structure
      const skipFiles = [
        '.DS_Store', 'Thumbs.db', '*.log', '*.tmp',
        'package-lock.json', 'yarn.lock', '.env', '.env.local'
      ];
      
      if (skipDirs.includes(entry.name)) return false;
      if (skipFiles.some(pattern => entry.name.match(pattern.replace('*', '.*')))) return false;
      
      return true;
    }).sort((a, b) => {
      // Sort directories first, then files
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
    
    filteredEntries.forEach((entry, index) => {
      const isLast = index === filteredEntries.length - 1;
      const location = path.join(dir, entry.name);
      const description = getFileDescription(entry.name, entry.isDirectory());
      
      result += prefix + (isLast ? '└── ' : '├── ') + entry.name + description + '\n';
      
      if (entry.isDirectory()) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        result += generateDirectoryTree(location, newPrefix, maxDepth, currentDepth + 1);
      }
    });
  } catch (error) {
    console.error(`Error processing directory ${dir}:`, error);
  }
  
  return result;
}

function generateMarkdownContent(treeStructure) {
  const timestamp = new Date().toISOString().split('T')[0];
  
  return `# Almona Portfolio Forge - Project Structure

*Auto-generated on ${timestamp}*

This document provides a comprehensive overview of the project file structure with descriptions for key files and directories.

## 📁 Complete Project Structure

\`\`\`
${treeStructure}
\`\`\`

## 🔄 Regenerating This File

To update this structure documentation, run:

\`\`\`bash
npm run gen:structure
\`\`\`

Or directly:

\`\`\`bash
node docs/generate-structure.js
\`\`\`

## 📝 Key Directory Descriptions

### **Frontend (src/)**
- **components/**: Reusable React UI components organized by feature
- **pages/**: Route components for different application pages
- **hooks/**: Custom React hooks for shared functionality
- **lib/**: Utility libraries and service integrations
- **context/**: React context providers for global state
- **types/**: TypeScript type definitions and interfaces

### **Backend (python_backend/)**
- **apis/**: FastAPI route handlers with versioned endpoints
- **ai_services/**: Machine learning and AI-powered features
- **core/**: Core application logic and configurations
- **models/**: Pydantic data models for API validation
- **tests/**: Comprehensive testing suite with multiple test types

### **Configuration**
- **Root level**: Build tools, linting, and deployment configuration
- **Database**: SQL schemas for e-commerce and service management
- **Internationalization**: Translation files for Arabic and English

## 🛠️ Development Notes

- The structure follows feature-based organization for better maintainability
- Components are grouped by business functionality (shop, services, support)
- Backend uses clean architecture with separated concerns
- Testing is comprehensive with unit, integration, and E2E tests
- Documentation is maintained alongside code for better developer experience

---

*This file is automatically generated. Do not edit manually.*
`;
}

try {
  const projectRoot = path.join(__dirname, '..');
  console.log('Generating project structure...');
  
  const treeStructure = generateDirectoryTree(projectRoot);
  const markdownContent = generateMarkdownContent(treeStructure);
  
  const outputPath = path.join(__dirname, 'project-structure-auto.md');
  fs.writeFileSync(outputPath, markdownContent);
  
  console.log(`✅ Project structure generated successfully!`);
  console.log(`📄 Output: ${outputPath}`);
  console.log(`📊 Generated ${treeStructure.split('\n').length} lines of structure`);
  
} catch (error) {
  console.error('❌ Failed to generate project structure:', error);
  process.exit(1);
}

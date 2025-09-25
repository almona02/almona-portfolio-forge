import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_TREE_DEPTH = 6;
const MAX_README_SIZE_BYTES = 512 * 1024; // 512KB per README to avoid huge embeds

const skipDirs = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', '.vercel', '.vscode',
  '__pycache__', '.pytest_cache', 'coverage', '.nyc_output', 'uploads'
]);

const skipFilesPatterns = ['.DS_Store', 'Thumbs.db', '.log', '.tmp'];

function shouldSkipFile(name) {
  return skipFilesPatterns.some(pattern => name.endsWith(pattern));
}

function readSafe(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_README_SIZE_BYTES) {
      const buf = fs.readFileSync(filePath, { encoding: 'utf8' });
      return buf.slice(0, MAX_README_SIZE_BYTES) + '\n\n<!-- README truncated due to size limit -->\n';
    }
    return fs.readFileSync(filePath, { encoding: 'utf8' });
  } catch {
    return '';
  }
}

function buildTree(dir, prefix = '', depth = 0) {
  if (depth >= MAX_TREE_DEPTH) return '';
  let out = '';
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  const filtered = entries
    .filter(e => {
      if (e.isDirectory() && skipDirs.has(e.name)) return false;
      if (!e.isDirectory() && shouldSkipFile(e.name)) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
  filtered.forEach((e, i) => {
    const isLast = i === filtered.length - 1;
    const join = path.join(dir, e.name);
    out += `${prefix}${isLast ? '└──' : '├──'} ${e.name}\n`;
    if (e.isDirectory()) {
      const np = prefix + (isLast ? '    ' : '│   ');
      out += buildTree(join, np, depth + 1);
    }
  });
  return out;
}

function findReadmes(dir) {
  const found = [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (skipDirs.has(e.name)) continue;
      found.push(...findReadmes(path.join(dir, e.name)));
    } else if (/^readme\.md$/i.test(e.name)) {
      found.push(path.join(dir, e.name));
    }
  }
  return found;
}

function headerForReadme(fp, projectRoot) {
  const rel = path.relative(projectRoot, path.dirname(fp)) || '.';
  return `### README for \`${rel}\``;
}

function generate(projectRoot) {
  const date = new Date().toISOString();
  const tree = buildTree(projectRoot);
  const readmes = findReadmes(projectRoot);
  let content = '';
  content += `# Almona Portfolio Forge - Full Structure with READMEs\n\n`;
  content += `Generated: ${date}\n\n`;
  content += `## Project Tree\n\n`;
  content += '```\n' + tree + '```\n\n';
  content += `## Collected READMEs\n\n`;
  if (readmes.length === 0) {
    content += '_No README.md files found._\n';
  } else {
    for (const fp of readmes.sort()) {
      content += headerForReadme(fp, projectRoot) + '\n\n';
      const body = readSafe(fp).trim();
      content += body ? body + '\n\n' : '_Empty README._\n\n';
      content += '---\n\n';
    }
  }
  return content;
}

try {
  const projectRoot = path.join(__dirname, '..');
  const outputPath = path.join(__dirname, 'project-structure-with-readmes.md');
  const md = generate(projectRoot);
  fs.writeFileSync(outputPath, md);
  console.log('Wrote', outputPath);
} catch (err) {
  console.error('Failed to generate structure with READMEs:', err);
  process.exit(1);
}



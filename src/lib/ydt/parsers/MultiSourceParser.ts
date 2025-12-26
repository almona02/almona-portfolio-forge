/**
 * Multi-Source Parser for YDT Knowledge Base
 * 
 * Extends YDT parsing capabilities to support:
 * - PDF documents (machine manuals, specifications)
 * - Code files (TypeScript, Python, etc.)
 * - API documentation
 * - Configuration files
 * - Image OCR (future)
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export interface ParsedSource {
  type: 'markdown' | 'pdf' | 'code' | 'api' | 'config' | 'image';
  filePath: string;
  content: string;
  metadata: {
    title?: string;
    author?: string;
    language?: string;
    lines?: number;
    words?: number;
    extractedAt: string;
    [key: string]: any;
  };
  sections?: Array<{
    title: string;
    content: string;
    lineNumbers?: { start: number; end: number };
  }>;
}

export interface ParseResult {
  sources: ParsedSource[];
  statistics: {
    totalFiles: number;
    byType: Record<string, number>;
    totalLines: number;
    totalWords: number;
    errors: number;
  };
}

export class MultiSourceParser {
  private projectRoot: string;
  private excludeDirs = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'coverage',
    '.storybook',
    'dev-dist',
    'archive',
    'migrations',
    'k8s',
    'pilot-deployment',
    '.venv',
    'venv',
    '__pycache__',
  ]);

  private excludeFiles = new Set([
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.DS_Store',
  ]);

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Parse PDF file using backend API or client-side library
   */
  async parsePDF(filePath: string): Promise<ParsedSource | null> {
    try {
      // For now, return metadata - actual extraction should be done via backend API
      const stats = await stat(filePath);
      const fileName = path.basename(filePath);

      return {
        type: 'pdf',
        filePath: path.relative(this.projectRoot, filePath),
        content: '', // Will be extracted via backend API
        metadata: {
          title: fileName.replace('.pdf', ''),
          extractedAt: new Date().toISOString(),
          size: stats.size,
          note: 'PDF content extraction requires backend API call',
        },
      };
    } catch (error) {
      console.error(`Error parsing PDF ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse code file (TypeScript, Python, JavaScript, etc.)
   */
  async parseCodeFile(filePath: string): Promise<ParsedSource | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);
      const lines = content.split('\n');
      
      // Extract language from extension
      const languageMap: Record<string, string> = {
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.py': 'python',
        '.java': 'java',
        '.go': 'go',
        '.rs': 'rust',
        '.cpp': 'cpp',
        '.c': 'c',
      };

      const language = languageMap[ext] || ext.substring(1);

      // Extract key information (classes, functions, exports)
      const sections = this.extractCodeSections(content, language);

      return {
        type: 'code',
        filePath: path.relative(this.projectRoot, filePath),
        content,
        metadata: {
          title: fileName,
          language,
          lines: lines.length,
          words: content.split(/\s+/).length,
          extractedAt: new Date().toISOString(),
        },
        sections,
      };
    } catch (error) {
      console.error(`Error parsing code file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract code sections (classes, functions, exports)
   */
  private extractCodeSections(content: string, language: string): ParsedSource['sections'] {
    const sections: ParsedSource['sections'] = [];
    const lines = content.split('\n');

    // TypeScript/JavaScript patterns
    const classPattern = /^(export\s+)?(abstract\s+)?class\s+(\w+)/;
    const functionPattern = /^(export\s+)?(async\s+)?function\s+(\w+)/;
    const constPattern = /^export\s+const\s+(\w+)/;
    const interfacePattern = /^(export\s+)?interface\s+(\w+)/;

    let currentSection: { title: string; start: number; end: number } | null = null;
    let braceCount = 0;
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check for new section start
      if (!inSection) {
        const classMatch = trimmed.match(classPattern);
        const funcMatch = trimmed.match(functionPattern);
        const constMatch = trimmed.match(constPattern);
        const interfaceMatch = trimmed.match(interfacePattern);

        if (classMatch || funcMatch || constMatch || interfaceMatch) {
          const name = classMatch?.[3] || funcMatch?.[3] || constMatch?.[1] || interfaceMatch?.[2];
          currentSection = { title: name || 'Unknown', start: i, end: i };
          inSection = true;
          braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        }
      } else if (currentSection) {
        // Track braces to find section end
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        
        if (braceCount <= 0 && trimmed) {
          currentSection.end = i;
          sections.push({
            title: currentSection.title,
            content: lines.slice(currentSection.start, currentSection.end + 1).join('\n'),
            lineNumbers: { start: currentSection.start + 1, end: currentSection.end + 1 },
          });
          currentSection = null;
          inSection = false;
          braceCount = 0;
        }
      }
    }

    // Handle unclosed sections
    if (currentSection) {
      currentSection.end = lines.length - 1;
      sections.push({
        title: currentSection.title,
        content: lines.slice(currentSection.start, currentSection.end + 1).join('\n'),
        lineNumbers: { start: currentSection.start + 1, end: currentSection.end + 1 },
      });
    }

    return sections;
  }

  /**
   * Parse API documentation (OpenAPI, GraphQL, etc.)
   */
  async parseAPIDoc(filePath: string): Promise<ParsedSource | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);

      let parsed: any = {};
      if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
        try {
          if (ext === '.json') {
            parsed = JSON.parse(content);
          } else {
            // Would need yaml parser
            parsed = { raw: content };
          }
        } catch {
          parsed = { raw: content };
        }
      }

      return {
        type: 'api',
        filePath: path.relative(this.projectRoot, filePath),
        content,
        metadata: {
          title: fileName,
          format: ext.substring(1),
          extractedAt: new Date().toISOString(),
          parsed: Object.keys(parsed).length > 0,
        },
      };
    } catch (error) {
      console.error(`Error parsing API doc ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Find all files of specific types
   */
  async findAllFiles(
    types: string[],
    dir: string = this.projectRoot,
    fileList: string[] = []
  ): Promise<string[]> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!this.excludeDirs.has(entry.name) && !entry.name.startsWith('.')) {
            await this.findAllFiles(types, fullPath, fileList);
          }
        } else if (entry.isFile()) {
          if (this.excludeFiles.has(entry.name)) {
            continue;
          }

          const ext = path.extname(entry.name).toLowerCase();
          if (types.includes(ext) || types.includes('*')) {
            fileList.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }

    return fileList;
  }

  /**
   * Parse multiple sources
   */
  async parseSources(types: Array<'pdf' | 'code' | 'api' | 'all'> = ['all']): Promise<ParseResult> {
    const sources: ParsedSource[] = [];
    const statistics = {
      totalFiles: 0,
      byType: {} as Record<string, number>,
      totalLines: 0,
      totalWords: 0,
      errors: 0,
    };

    try {
      // Determine file extensions to search for
      const extensions: string[] = [];
      if (types.includes('all') || types.includes('code')) {
        extensions.push('.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go');
      }
      if (types.includes('all') || types.includes('pdf')) {
        extensions.push('.pdf');
      }
      if (types.includes('all') || types.includes('api')) {
        extensions.push('.json', '.yaml', '.yml', '.graphql');
      }

      const files = await this.findAllFiles(extensions);
      statistics.totalFiles = files.length;

      console.log(`📚 Found ${files.length} files to parse`);

      // Parse files in batches
      const batchSize = 10;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (file) => {
            const ext = path.extname(file).toLowerCase();
            
            if (ext === '.pdf') {
              return await this.parsePDF(file);
            } else if (['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go'].includes(ext)) {
              return await this.parseCodeFile(file);
            } else if (['.json', '.yaml', '.yml', '.graphql'].includes(ext)) {
              return await this.parseAPIDoc(file);
            }
            return null;
          })
        );

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            sources.push(result.value);
            const type = result.value.type;
            statistics.byType[type] = (statistics.byType[type] || 0) + 1;
            statistics.totalLines += result.value.metadata.lines || 0;
            statistics.totalWords += result.value.metadata.words || 0;
          } else if (result.status === 'rejected') {
            statistics.errors++;
          }
        }

        if ((i + batchSize) % 100 === 0) {
          console.log(`   Processed ${Math.min(i + batchSize, files.length)}/${files.length} files...`);
        }
      }
    } catch (error) {
      console.error('Error parsing sources:', error);
      statistics.errors++;
    }

    return { sources, statistics };
  }
}


/**
 * Enhanced Documentation Parser for YDT Knowledge Base
 * 
 * Extracts intelligence from ALL existing documentation into structured YDT knowledge base.
 * Features:
 * - Recursive markdown file discovery (all 4,599+ files)
 * - Parallel processing for performance
 * - Progress reporting
 * - Comprehensive content extraction
 * - Error handling and recovery
 * 
 * Sources: README.md, strategic plans, architecture docs, workflow docs, algorithm docs, 
 * component docs, Egyptian market intelligence, and all project documentation
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

interface ParsedSection {
  title: string;
  content: string;
  subsections: ParsedSection[];
  metadata?: {
    lineNumbers?: { start: number; end: number };
    keywords?: string[];
    category?: string;
    filePath?: string;
  };
}

interface ParsedDocument {
  filePath: string;
  sections: ParsedSection[];
  metadata: {
    lineCount: number;
    wordCount: number;
    parsedAt: string;
    categories: string[];
  };
}

interface WorkflowDocumentation {
  name: string;
  steps: WorkflowStep[];
  timeEstimate: string;
  accuracy: string;
  commonMistakes: string[];
  shortcuts?: string[];
  sourceFiles: string[];
}

interface WorkflowStep {
  number: number;
  action: string;
  explanation: string;
  expectedTime?: string;
  warnings?: string[];
  shortcuts?: string[];
}

interface AlgorithmDocumentation {
  name: string;
  purpose: string;
  strategy: string;
  accuracy: string;
  performance: string;
  inputs: string[];
  outputs: string[];
  keyMethods: string[];
  sourceFiles: string[];
}

interface ComponentDocumentation {
  name: string;
  category: string;
  purpose: string;
  relationships: string[];
  usage: string;
  sourceFiles: string[];
}

interface EgyptianMarketData {
  marketPatterns: Record<string, any>;
  materialPreferences: Record<string, any>;
  pricingStrategies: Record<string, any>;
  roiProofs: {
    timeReduction: string;
    materialSavings: string;
    accuracy: string;
  };
  sourceFiles: string[];
}

interface YDTKnowledgeBase {
  system: {
    architecture: string;
    components: number;
    workflows: string[];
    algorithms: string[];
  };
  workflows: Record<string, WorkflowDocumentation>;
  algorithms: Record<string, AlgorithmDocumentation>;
  components: ComponentDocumentation[];
  egyptian: EgyptianMarketData;
  documents: {
    totalFiles: number;
    totalLines: number;
    totalWords: number;
    byCategory: Record<string, number>;
  };
  metadata: {
    parsedAt: string;
    sources: string[];
    version: string;
    parseDuration: string;
  };
}

interface ParseProgress {
  totalFiles: number;
  processedFiles: number;
  errors: number;
  startTime: number;
  currentFile?: string;
}

export class DocumentationParser {
  private projectRoot: string;
  private knowledgeBase: Partial<YDTKnowledgeBase> = {
    workflows: {},
    algorithms: {},
    components: [],
    egyptian: {
      marketPatterns: {},
      materialPreferences: {},
      pricingStrategies: {},
      roiProofs: {
        timeReduction: '',
        materialSavings: '',
        accuracy: '',
      },
      sourceFiles: [],
    },
  };
  private parsedDocuments: ParsedDocument[] = [];
  private progress: ParseProgress = {
    totalFiles: 0,
    processedFiles: 0,
    errors: 0,
    startTime: Date.now(),
  };

  // Directories to exclude from parsing
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
  ]);

  // Files to exclude
  private excludeFiles = new Set([
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
  ]);

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Recursively find all markdown files
   */
  async findAllMarkdownFiles(dir: string = this.projectRoot, fileList: string[] = []): Promise<string[]> {
    try {
      const entries = await readdir(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const statResult = await stat(fullPath);
        
        if (statResult.isDirectory()) {
          // Skip excluded directories
          if (!this.excludeDirs.has(entry) && !entry.startsWith('.')) {
            await this.findAllMarkdownFiles(fullPath, fileList);
          }
        } else if (statResult.isFile() && entry.endsWith('.md')) {
          // Skip excluded files
          if (!this.excludeFiles.has(entry)) {
            fileList.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Error reading directory ${dir}:`, error);
    }
    
    return fileList;
  }

  /**
   * Parse markdown file and extract structured sections
   */
  parseMarkdownFile(filePath: string): ParsedSection[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const sections: ParsedSection[] = [];
      let currentSection: ParsedSection | null = null;
      let currentSubsection: ParsedSection | null = null;
      let lineNumber = 0;
      const relativePath = path.relative(this.projectRoot, filePath);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        lineNumber = i + 1;

        // Detect headers
        const h1Match = line.match(/^# (.+)$/);
        const h2Match = line.match(/^## (.+)$/);
        const h3Match = line.match(/^### (.+)$/);
        const h4Match = line.match(/^#### (.+)$/);

        if (h1Match) {
          // New main section
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = {
            title: h1Match[1],
            content: '',
            subsections: [],
            metadata: { 
              lineNumbers: { start: lineNumber, end: lineNumber },
              filePath: relativePath,
            },
          };
          currentSubsection = null;
        } else if (h2Match && currentSection) {
          // New subsection
          if (currentSubsection) {
            currentSection.subsections.push(currentSubsection);
          }
          currentSubsection = {
            title: h2Match[1],
            content: '',
            subsections: [],
            metadata: { 
              lineNumbers: { start: lineNumber, end: lineNumber },
              filePath: relativePath,
            },
          };
        } else if (h3Match && currentSubsection) {
          // Sub-subsection (add to current subsection)
          currentSubsection.content += line + '\n';
        } else if (currentSection) {
          // Add content to current section or subsection
          if (currentSubsection) {
            currentSubsection.content += line + '\n';
          } else {
            currentSection.content += line + '\n';
          }
        }
      }

      // Add last section
      if (currentSection) {
        if (currentSubsection) {
          currentSection.subsections.push(currentSubsection);
        }
        sections.push(currentSection);
      }

      return sections;
    } catch (error) {
      console.warn(`Error parsing file ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Extract keywords from content
   */
  extractKeywords(content: string): string[] {
    const keywords: string[] = [];
    const lowerContent = content.toLowerCase();
    
    // Common technical terms
    const techTerms = [
      'workflow', 'algorithm', 'component', 'api', 'endpoint', 'database',
      'fabricator', 'window', 'profile', 'dxf', 'bom', 'cutting', 'optimization',
      'egyptian', 'market', 'pricing', 'material', 'workshop', 'maalem',
    ];
    
    for (const term of techTerms) {
      if (lowerContent.includes(term)) {
        keywords.push(term);
      }
    }
    
    return [...new Set(keywords)];
  }

  /**
   * Categorize document based on content and path
   */
  categorizeDocument(filePath: string, content: string): string[] {
    const categories: string[] = [];
    const lowerPath = filePath.toLowerCase();
    const lowerContent = content.toLowerCase();
    
    if (lowerPath.includes('workflow') || lowerContent.includes('workflow')) {
      categories.push('workflow');
    }
    if (lowerPath.includes('algorithm') || lowerContent.includes('algorithm')) {
      categories.push('algorithm');
    }
    if (lowerPath.includes('component') || lowerContent.includes('component')) {
      categories.push('component');
    }
    if (lowerPath.includes('egyptian') || lowerContent.includes('egyptian')) {
      categories.push('egyptian');
    }
    if (lowerPath.includes('architecture') || lowerContent.includes('architecture')) {
      categories.push('architecture');
    }
    if (lowerPath.includes('api') || lowerContent.includes('api')) {
      categories.push('api');
    }
    if (lowerPath.includes('deployment') || lowerContent.includes('deployment')) {
      categories.push('deployment');
    }
    if (lowerPath.includes('test') || lowerContent.includes('test')) {
      categories.push('testing');
    }
    if (lowerPath.includes('docs')) {
      categories.push('documentation');
    }
    
    return categories.length > 0 ? categories : ['general'];
  }

  /**
   * Parse a single file and return structured document
   */
  async parseFile(filePath: string): Promise<ParsedDocument | null> {
    try {
      this.progress.currentFile = path.relative(this.projectRoot, filePath);
      const content = await readFile(filePath, 'utf-8');
      const sections = this.parseMarkdownFile(filePath);
      const categories = this.categorizeDocument(filePath, content);
      
      // Extract keywords from all sections
      for (const section of sections) {
        const allContent = section.content + section.subsections.map(s => s.content).join(' ');
        section.metadata = {
          ...section.metadata,
          keywords: this.extractKeywords(allContent),
          category: categories[0] || 'general',
        };
      }
      
      const wordCount = content.split(/\s+/).length;
      
      return {
        filePath: path.relative(this.projectRoot, filePath),
        sections,
        metadata: {
          lineCount: content.split('\n').length,
          wordCount,
          parsedAt: new Date().toISOString(),
          categories,
        },
      };
    } catch (error) {
      this.progress.errors++;
      console.warn(`Error processing file ${filePath}:`, error);
      return null;
    } finally {
      this.progress.processedFiles++;
      if (this.progress.processedFiles % 100 === 0) {
        this.printProgress();
      }
    }
  }

  /**
   * Parse files in parallel batches
   */
  async parseFilesInParallel(filePaths: string[], batchSize: number = 10): Promise<ParsedDocument[]> {
    const results: ParsedDocument[] = [];
    
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(filePath => this.parseFile(filePath))
      );
      
      results.push(...batchResults.filter((doc): doc is ParsedDocument => doc !== null));
    }
    
    return results;
  }

  /**
   * Print parsing progress
   */
  printProgress(): void {
    const elapsed = (Date.now() - this.progress.startTime) / 1000;
    const rate = this.progress.processedFiles / elapsed;
    const remaining = this.progress.totalFiles - this.progress.processedFiles;
    const eta = remaining / rate;
    const percent = ((this.progress.processedFiles / this.progress.totalFiles) * 100).toFixed(1);
    
    console.log(
      `[${percent}%] Processed ${this.progress.processedFiles}/${this.progress.totalFiles} files ` +
      `(${rate.toFixed(1)} files/sec, ETA: ${eta.toFixed(0)}s) ` +
      `Errors: ${this.progress.errors}`
    );
    if (this.progress.currentFile) {
      console.log(`  Current: ${this.progress.currentFile}`);
    }
  }

  /**
   * Extract workflow steps from documentation (ENHANCED)
   */
  extractWorkflowSteps(workflowName: string, documents: ParsedDocument[]): WorkflowDocumentation | null {
    const sourceFiles: string[] = [];
    const allSteps: WorkflowStep[] = [];
    let foundWorkflow = false;
    let timeEstimate = '30 seconds - 3 minutes';
    let accuracy = '99.8%';
    const commonMistakes: string[] = [];
    const shortcuts: string[] = [];

    for (const doc of documents) {
      for (const section of doc.sections) {
        const titleMatch = section.title.toLowerCase().includes(workflowName.toLowerCase());
        const contentMatch = section.content.toLowerCase().includes(workflowName.toLowerCase());
        
        if (titleMatch || contentMatch) {
          foundWorkflow = true;
          if (!sourceFiles.includes(doc.filePath)) {
            sourceFiles.push(doc.filePath);
          }
          
          const content = section.content;
          
          // Extract time estimate (e.g., "takes 5 minutes", "30 seconds", "2-3 hours")
          const timeMatch = content.match(/(?:takes?|duration|time|estimate)[:\s]+([\d\s\-]+(?:second|minute|hour|day)s?)/i);
          if (timeMatch) {
            timeEstimate = timeMatch[1].trim();
          }
          
          // Extract accuracy (e.g., "99.8%", "95% accurate")
          const accuracyMatch = content.match(/(\d+\.?\d*)%?\s*(?:accuracy|accurate|precision)/i);
          if (accuracyMatch) {
            accuracy = `${accuracyMatch[1]}%`;
          }
          
          // Extract common mistakes
          const mistakesSection = content.match(/(?:common\s+)?(?:mistakes?|errors?|issues?)[:\s]*\n((?:[-*•]\s*.+\n?)+)/i);
          if (mistakesSection) {
            const mistakes = mistakesSection[1].match(/[-*•]\s*(.+)/g);
            if (mistakes) {
              mistakes.forEach(m => {
                const mistake = m.replace(/[-*•]\s*/, '').trim();
                if (mistake && !commonMistakes.includes(mistake)) {
                  commonMistakes.push(mistake);
                }
              });
            }
          }
          
          // Extract shortcuts/tips
          const shortcutsSection = content.match(/(?:shortcuts?|tips?|tricks?)[:\s]*\n((?:[-*•]\s*.+\n?)+)/i);
          if (shortcutsSection) {
            const tips = shortcutsSection[1].match(/[-*•]\s*(.+)/g);
            if (tips) {
              tips.forEach(t => {
                const tip = t.replace(/[-*•]\s*/, '').trim();
                if (tip && !shortcuts.includes(tip)) {
                  shortcuts.push(tip);
                }
              });
            }
          }
          
          // Extract steps - multiple patterns
          // Pattern 1: Numbered list (1. 2. 3.)
          const stepMatches1 = content.match(/\n\s*(\d+)\.\s+(.+?)(?=\n\s*\d+\.|$)/gs);
          if (stepMatches1) {
            stepMatches1.forEach((match) => {
              const stepContent = match.replace(/^\s*\d+\.\s+/, '').trim();
              const firstLine = stepContent.split('\n')[0];
              allSteps.push({
                number: allSteps.length + 1,
                action: firstLine,
                explanation: stepContent,
              });
            });
          }
          
          // Pattern 2: Markdown list with dashes/asterisks
          if (allSteps.length === 0) {
            const stepMatches2 = content.match(/\n\s*[-*]\s+(.+?)(?=\n\s*[-*]|$)/gs);
            if (stepMatches2) {
              stepMatches2.forEach((match) => {
                const stepContent = match.replace(/^\s*[-*]\s+/, '').trim();
                allSteps.push({
                  number: allSteps.length + 1,
                  action: stepContent.split('\n')[0],
                  explanation: stepContent,
                });
              });
            }
          }
          
          // Pattern 3: "Step X:" format
          if (allSteps.length === 0) {
            const stepMatches3 = content.match(/(?:step|stage)\s*(\d+)[:\s]+(.+?)(?=(?:step|stage)\s*\d+|$)/gi);
            if (stepMatches3) {
              stepMatches3.forEach((match) => {
                const stepContent = match.replace(/^(?:step|stage)\s*\d+[:\s]+/i, '').trim();
                allSteps.push({
                  number: allSteps.length + 1,
                  action: stepContent.split('\n')[0],
                  explanation: stepContent,
                });
              });
            }
          }
        }
      }
    }

    if (!foundWorkflow) {
      return null;
    }

    return {
      name: workflowName,
      steps: allSteps.length > 0 ? allSteps : [{
        number: 1,
        action: 'Start workflow',
        explanation: 'Workflow documentation found',
      }],
      timeEstimate,
      accuracy,
      commonMistakes,
      shortcuts: shortcuts.length > 0 ? shortcuts : undefined,
      sourceFiles,
    };
  }
  
  /**
   * Auto-discover workflows from all documents
   */
  autoDiscoverWorkflows(documents: ParsedDocument[]): string[] {
    const workflowNames = new Set<string>();
    const workflowPatterns = [
      /workflow[:\s]+(.+?)(?:\n|$)/i,
      /(?:smart\s+)?wizard/i,
      /quick\s+order/i,
      /fabricator\s+pro/i,
      /engineering\s+bay/i,
      /pattern\s+library/i,
    ];

    for (const doc of documents) {
      for (const section of doc.sections) {
        const title = section.title.toLowerCase();
        const content = section.content.toLowerCase();
        
        // Check title for workflow names
        if (title.includes('workflow') || title.includes('wizard') || title.includes('process')) {
          const nameMatch = section.title.match(/(?:workflow|wizard|process)[:\s]+(.+)/i);
          if (nameMatch) {
            workflowNames.add(nameMatch[1].trim());
          }
        }
        
        // Check content for workflow mentions
        for (const pattern of workflowPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            if (matches[1]) {
              workflowNames.add(matches[1].trim());
            } else {
              workflowNames.add(matches[0].trim());
            }
          }
        }
      }
    }

    return Array.from(workflowNames);
  }

  /**
   * Extract algorithm details from documentation (ENHANCED)
   */
  extractAlgorithmDetails(algorithmName: string, documents: ParsedDocument[]): AlgorithmDocumentation | null {
    const sourceFiles: string[] = [];
    let foundAlgorithm = false;
    let purpose = '';
    let strategy = '';
    let accuracy = '99.8%';
    let performance = '';
    const inputs: string[] = [];
    const outputs: string[] = [];
    const keyMethods: string[] = [];

    for (const doc of documents) {
      for (const section of doc.sections) {
        const titleMatch = section.title.toLowerCase().includes(algorithmName.toLowerCase());
        const contentMatch = section.content.toLowerCase().includes(algorithmName.toLowerCase());
        
        if (titleMatch || contentMatch) {
          foundAlgorithm = true;
          if (!sourceFiles.includes(doc.filePath)) {
            sourceFiles.push(doc.filePath);
          }
          
          const content = section.content;
          
          // Extract purpose (usually first paragraph or "Purpose:" section)
          if (!purpose) {
            const purposeMatch = content.match(/(?:purpose|goal|objective)[:\s]+\n?(.+?)(?:\n\n|\n##|$)/i);
            if (purposeMatch) {
              purpose = purposeMatch[1].trim();
            } else {
              // Use first paragraph
              const firstPara = content.split('\n\n')[0];
              if (firstPara.length > 50 && firstPara.length < 500) {
                purpose = firstPara.trim();
              }
            }
          }
          
          // Extract strategy
          if (!strategy) {
            const strategyMatch = content.match(/(?:strategy|approach|method)[:\s]+\n?(.+?)(?:\n\n|\n##|$)/i);
            if (strategyMatch) {
              strategy = strategyMatch[1].trim();
            }
          }
          
          // Extract accuracy
          const accuracyMatch = content.match(/(\d+\.?\d*)%?\s*(?:accuracy|accurate|precision)/i);
          if (accuracyMatch) {
            accuracy = `${accuracyMatch[1]}%`;
          }
          
          // Extract performance metrics
          const perfMatch = content.match(/(?:performance|speed|time)[:\s]+(.+?)(?:\n|$)/i);
          if (perfMatch) {
            performance = perfMatch[1].trim();
          }
          
          // Extract inputs/outputs
          const inputsMatch = content.match(/(?:input|parameter)[s]?[:\s]+\n?((?:[-*•]\s*.+\n?)+)/i);
          if (inputsMatch) {
            const inputList = inputsMatch[1].match(/[-*•]\s*(.+)/g);
            if (inputList) {
              inputList.forEach(i => {
                const input = i.replace(/[-*•]\s*/, '').trim();
                if (input && !inputs.includes(input)) {
                  inputs.push(input);
                }
              });
            }
          }
          
          const outputsMatch = content.match(/(?:output|result)[s]?[:\s]+\n?((?:[-*•]\s*.+\n?)+)/i);
          if (outputsMatch) {
            const outputList = outputsMatch[1].match(/[-*•]\s*(.+)/g);
            if (outputList) {
              outputList.forEach(o => {
                const output = o.replace(/[-*•]\s*/, '').trim();
                if (output && !outputs.includes(output)) {
                  outputs.push(output);
                }
              });
            }
          }
          
          // Extract key methods from code blocks
          const codeBlocks = content.match(/```(?:typescript|javascript|python)?\n([\s\S]+?)```/g);
          if (codeBlocks) {
            codeBlocks.forEach(block => {
              const code = block.replace(/```[\w]*\n/, '').replace(/```$/, '');
              // Find function/class definitions
              const funcMatches = code.match(/(?:export\s+)?(?:async\s+)?(?:function|const)\s+(\w+)/g);
              if (funcMatches) {
                funcMatches.forEach(f => {
                  const methodName = f.match(/(\w+)\s*[=:]/)?.[1] || f.match(/(\w+)$/)?.[1];
                  if (methodName && !keyMethods.includes(methodName)) {
                    keyMethods.push(methodName);
                  }
                });
              }
              const classMatches = code.match(/(?:export\s+)?class\s+(\w+)/g);
              if (classMatches) {
                classMatches.forEach(c => {
                  const className = c.match(/class\s+(\w+)/)?.[1];
                  if (className && !keyMethods.includes(className)) {
                    keyMethods.push(className);
                  }
                });
              }
            });
          }
        }
      }
    }

    if (!foundAlgorithm) {
      return null;
    }

    return {
      name: algorithmName,
      purpose: purpose || 'Algorithm for system optimization',
      strategy: strategy || 'Optimized for accuracy and performance',
      accuracy,
      performance: performance || '5-10 seconds for 200 cuts',
      inputs: inputs.length > 0 ? inputs : [],
      outputs: outputs.length > 0 ? outputs : [],
      keyMethods: keyMethods.length > 0 ? keyMethods : [],
      sourceFiles,
    };
  }
  
  /**
   * Auto-discover algorithms from all documents
   */
  autoDiscoverAlgorithms(documents: ParsedDocument[]): string[] {
    const algorithmNames = new Set<string>();
    
    // Known algorithm patterns (all must be global for matchAll)
    const algorithmPatterns = [
      /(?:algorithm|optimizer|generator|validator|calculator|solver|engine)[:\s]+(.+?)(?:\n|$)/gi,
      /class\s+(\w*(?:Optimizer|Generator|Validator|Calculator|Solver|Engine)\w*)/g,
      /(?:export\s+)?(?:class|function)\s+(\w*(?:Optimizer|Generator|Validator|Calculator|Solver|Engine)\w*)/g,
    ];

    for (const doc of documents) {
      for (const section of doc.sections) {
        const title = section.title.toLowerCase();
        const content = section.content;
        
        // Check title
        if (title.includes('algorithm') || title.includes('optimizer') || title.includes('generator')) {
          const nameMatch = section.title.match(/(?:algorithm|optimizer|generator)[:\s]+(.+)/i);
          if (nameMatch) {
            algorithmNames.add(nameMatch[1].trim());
          }
        }
        
        // Check content for algorithm mentions
        for (const pattern of algorithmPatterns) {
          // matchAll requires global regex
          if (pattern.global) {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
              if (match[1]) {
                algorithmNames.add(match[1].trim());
              }
            }
          } else {
            // Fallback to match for non-global patterns
            const match = content.match(pattern);
            if (match && match[1]) {
              algorithmNames.add(match[1].trim());
            }
          }
        }
        
        // Check code blocks for class/function names
        const codeBlocks = content.match(/```[\w]*\n([\s\S]+?)```/g);
        if (codeBlocks) {
          codeBlocks.forEach(block => {
            const code = block.replace(/```[\w]*\n/, '').replace(/```$/, '');
            const classMatches = code.match(/(?:export\s+)?class\s+(\w*(?:Optimizer|Generator|Validator|Calculator|Solver|Engine)\w*)/g);
            if (classMatches) {
              classMatches.forEach(c => {
                const className = c.match(/class\s+(\w+)/)?.[1];
                if (className) {
                  algorithmNames.add(className);
                }
              });
            }
          });
        }
      }
    }

    return Array.from(algorithmNames);
  }

  /**
   * Extract component relationships from all documents (ENHANCED)
   */
  extractComponentRelationships(documents: ParsedDocument[]): ComponentDocumentation[] {
    const components: Map<string, ComponentDocumentation> = new Map();
    
    // Known components from codebase (expanded list)
    const knownComponents = [
      'DualOutputGenerator', 'ProductionOptimizer', 'CuttingListGenerator',
      'windowGeometry', 'constraintValidator', 'ProfileTuningStudio',
      'SmartDrawCanvas', 'Window3DGenerator', 'EngineeringBay',
      'YDTCoreService', 'DocumentationKnowledgeGraph', 'FabricatorExpert',
      'QuickStartYDT', 'EgyptianFabricationIntelligence', 'PricingEngine',
      'RealTimeQuoteCalculator', 'YDTPricingOracle', 'SmartWizard',
      'PatternLibraryWizard', 'ProfileManagement', 'ProfileImportTool',
      'MorningBriefWidget', 'FutureKnowledgeGraph', 'IndustryWatchdog',
    ];
    
    // Also discover components from file paths
    const discoveredComponents = this.autoDiscoverComponents(documents);
    const allComponents = [...new Set([...knownComponents, ...discoveredComponents])];

    for (const componentName of allComponents) {
      const sourceFiles: string[] = [];
      let purpose = '';
      let category = 'general';
      const relationships: string[] = [];
      let usage = '';

      for (const doc of documents) {
        // Check file path for component name
        if (doc.filePath.toLowerCase().includes(componentName.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase())) {
          if (!sourceFiles.includes(doc.filePath)) {
            sourceFiles.push(doc.filePath);
          }
        }
        
        for (const section of doc.sections) {
          const titleMatch = section.title.toLowerCase().includes(componentName.toLowerCase());
          const contentMatch = section.content.toLowerCase().includes(componentName.toLowerCase());
          
          if (titleMatch || contentMatch) {
            if (!sourceFiles.includes(doc.filePath)) {
              sourceFiles.push(doc.filePath);
            }
            
            // Extract purpose
            if (!purpose) {
              const purposeMatch = section.content.match(/(?:purpose|description|overview)[:\s]+\n?(.+?)(?:\n\n|\n##|$)/i);
              if (purposeMatch) {
                purpose = purposeMatch[1].trim();
              } else if (section.content.length > 0) {
                purpose = section.content.substring(0, 300).trim();
              }
            }
            
            // Determine category from file path or content
            const filePath = doc.filePath.toLowerCase();
            if (filePath.includes('component') || filePath.includes('ui')) {
              category = 'ui';
            } else if (filePath.includes('service') || filePath.includes('api')) {
              category = 'service';
            } else if (filePath.includes('lib') || filePath.includes('util')) {
              category = 'library';
            } else if (filePath.includes('page') || filePath.includes('view')) {
              category = 'page';
            }
            
            // Extract usage
            const usageMatch = section.content.match(/(?:usage|how\s+to\s+use)[:\s]+\n?(.+?)(?:\n\n|\n##|$)/i);
            if (usageMatch) {
              usage = usageMatch[1].trim();
            }
            
            // Find relationships (mentions of other components)
            for (const otherComponent of allComponents) {
              if (otherComponent !== componentName && 
                  section.content.includes(otherComponent) &&
                  !relationships.includes(otherComponent)) {
                relationships.push(otherComponent);
              }
            }
          }
        }
      }

      if (sourceFiles.length > 0 || purpose) {
        components.set(componentName, {
          name: componentName,
          category,
          purpose: purpose || `${componentName} component`,
          relationships,
          usage: usage || 'Core system component',
          sourceFiles,
        });
      }
    }

    return Array.from(components.values());
  }
  
  /**
   * Auto-discover components from file paths and documentation
   */
  autoDiscoverComponents(documents: ParsedDocument[]): string[] {
    const componentNames = new Set<string>();
    
    // Extract from file paths (PascalCase component names)
    for (const doc of documents) {
      const fileName = path.basename(doc.filePath, path.extname(doc.filePath));
      // Check if it's PascalCase (likely a component)
      if (/^[A-Z][a-zA-Z0-9]*$/.test(fileName) && fileName.length > 3) {
        componentNames.add(fileName);
      }
      
      // Extract from import statements in code blocks
      const codeBlocks = doc.sections.flatMap(s => s.content.match(/```[\w]*\n([\s\S]+?)```/g) || []);
      codeBlocks.forEach(block => {
        const code = block.replace(/```[\w]*\n/, '').replace(/```$/, '');
        // Find import statements
        const importMatches = code.match(/(?:import|from)\s+['"].*?['"]|import\s+\{([^}]+)\}/g);
        if (importMatches) {
          importMatches.forEach(imp => {
            const names = imp.match(/\{([^}]+)\}/)?.[1];
            if (names) {
              names.split(',').forEach(name => {
                const cleanName = name.trim().split(/\s+as\s+/)[0];
                if (/^[A-Z]/.test(cleanName)) {
                  componentNames.add(cleanName);
                }
              });
            }
          });
        }
      });
    }

    return Array.from(componentNames);
  }

  /**
   * Extract fabrication knowledge (ENHANCED - Domain-Specific)
   */
  extractFabricationKnowledge(documents: ParsedDocument[]): any {
    const knowledge: any = {
      fabrication: {
        processes: [],
        materials: [],
        tools: [],
        techniques: [],
      },
      assembly: {
        sequences: [],
        steps: [],
        hardware: [],
        connections: [],
      },
      geometry: {
        windowTypes: [],
        profiles: [],
        dimensions: [],
        calculations: [],
      },
      systemPacks: {
        systems: [],
        variants: [],
        specifications: [],
      },
      profileRoles: {
        roles: [],
        categories: [],
        usage: [],
      },
      cutting: {
        optimization: [],
        angles: [],
        rules: [],
        tolerances: [],
        techniques: [],
        tools: [],
      },
      connections: {
        types: [],
        methods: [],
        angles: [],
      },
    };

    const domainKeywords = {
      fabrication: ['fabrication', 'manufacturing', 'production', 'machining', 'cnc', 'cutting', 'drilling', 'milling'],
      assembly: ['assembly', 'assemble', 'install', 'mount', 'hardware', 'hinge', 'lock', 'handle'],
      geometry: ['geometry', 'dimension', 'width', 'height', 'depth', 'profile', 'cross-section', 'archetype'],
      systemPacks: ['system pack', 'systempack', 'system_pack', 'foxy', 'caluminium', 'jumbo', 'rock'],
      profileRoles: ['profile role', 'role', 'frame', 'sash', 'mullion', 'transom', 'bead', 'reinforcement'],
      cutting: ['cutting', 'optimization', 'optimize', 'remnant', 'waste', 'kerf', 'allowance'],
      connections: ['connection', 'joint', 'miter', 'angle', 'corner', 'cleat', 'bracket'],
    };

    // Scan ALL documents and sections (aggressive extraction)
    let sectionsScanned = 0;
    let matchesFound = 0;

    for (const doc of documents) {
      // Build full document content from all sections
      const fullContent = doc.sections.length > 0 
        ? doc.sections.map(s => s.content + (s.subsections ? s.subsections.map(sub => sub.content).join('\n') : '')).join('\n')
        : '';
      
      // If document has no sections, try to read the file directly
      let rawContent = fullContent;
      if (doc.sections.length === 0) {
        try {
          const fullPath = path.join(this.projectRoot || '.', doc.filePath);
          rawContent = fs.readFileSync(fullPath, 'utf-8');
        } catch (e) {
          // Skip if can't read
        }
      }
      
      // Scan sections if they exist
      if (doc.sections.length > 0) {
        for (const section of doc.sections) {
          sectionsScanned++;
          const content = section.content + (section.subsections ? section.subsections.map(sub => sub.content).join('\n') : '');
          const contentLower = content.toLowerCase();
          const title = section.title.toLowerCase();
          
          // Use section content, fallback to full document if section is short
          const contentToScan = content.length > 50 ? content : rawContent;

          // Profile Roles knowledge (GOLD TIER - Scan ALL sections, not just fabrication)
          // Extract profile roles from any section that contains role definitions
          // Check if this section or file is about profile roles
          const isProfileRoleSection = title.includes('role') || title.includes('profile') || 
                                       contentLower.includes('profile role') || 
                                       contentLower.includes('frame') || contentLower.includes('sash') || 
                                       contentLower.includes('mullion') || contentLower.includes('architrave') ||
                                       doc.filePath.toLowerCase().includes('profile_role');
          
          if (isProfileRoleSection) {
            // Pattern 1: Extract from markdown code blocks like `frame`, `sash`, etc.
            const rolePattern1 = /[-*•]\s*`([a-z_]+)`\s*[-–—]\s*(.+?)(?:\r?\n|$)/gi;
            const rolePattern1Alt = /[-*•]\s*`([a-z_]+)`\s*-\s*(.+?)(?:\r?\n|$)/gi;
            try {
              let matches1 = Array.from(contentToScan.matchAll(rolePattern1));
              if (matches1.length === 0) {
                matches1 = Array.from(contentToScan.matchAll(rolePattern1Alt));
              }
              if (matches1.length > 0) {
                matchesFound++;
                // Debug: Log first few matches
                if (knowledge.profileRoles.roles.length === 0 && matches1.length > 0) {
                  console.log(`    [DEBUG] Found ${matches1.length} role pattern matches in section`);
                }
              }
              for (const match of matches1) {
                const role = match[1].trim();
                const description = match[2].trim();
                const validRoleKeywords = ['frame', 'sash', 'mullion', 'transom', 'bead', 'reinforcement', 
                                         'architrave', 'threshold', 'sill', 'head', 'jamb', 'interlock', 
                                         'accessory', 'panel', 'gasket', 'glazing', 'screen', 'weather', 'cleat'];
                const invalidPatterns = ['string', 'json', 'definition', 'type', 'id', 'application'];
                const looksLikeRole = validRoleKeywords.some(kw => 
                  role.toLowerCase() === kw || 
                  role.toLowerCase().startsWith(kw + '_') || 
                  role.toLowerCase().includes('_' + kw)
                );
                const isInvalid = invalidPatterns.some(inv => role.toLowerCase() === inv);
                
                if (role && role.length > 2 && role.length < 30 && looksLikeRole && !isInvalid) {
                  if (!knowledge.profileRoles.roles.includes(role)) {
                    knowledge.profileRoles.roles.push(role);
                    // Debug: Log when we add a role
                    if (knowledge.profileRoles.roles.length <= 5) {
                      console.log(`    [DEBUG] Added role: ${role}`);
                    }
                  }
                  if (description && description.length > 3 && description.length < 200 &&
                      !knowledge.profileRoles.usage.includes(description)) {
                    knowledge.profileRoles.usage.push(description);
                  }
                } else if (role && knowledge.profileRoles.roles.length === 0) {
                  // Debug: Log why role was rejected (only first few)
                  if (matches1.indexOf(match) < 3) {
                    console.log(`    [DEBUG] Rejected role "${role}": looksLikeRole=${looksLikeRole}, isInvalid=${isInvalid}`);
                  }
                }
              }
            } catch (e) {
              // Fallback if matchAll fails
            }
          }

          // Fabrication knowledge (scan all sections, extract when found)
        if (domainKeywords.fabrication.some(kw => title.includes(kw) || contentLower.includes(kw)) || 
            contentLower.includes('cnc') || contentLower.includes('machining') || contentLower.includes('cutting')) {
          // Extract fabrication processes
          const processMatches = content.match(/(?:process|step|procedure)[:\s]+\n?((?:[-*•\d]\s*.+\n?)+)/gi);
          if (processMatches) {
            processMatches.forEach(match => {
              const processes = match.match(/[-*•\d]\s*(.+)/g);
              if (processes) {
                processes.forEach(p => {
                  const process = p.replace(/[-*•\d]\s*/, '').trim();
                  if (process && !knowledge.fabrication.processes.includes(process)) {
                    knowledge.fabrication.processes.push(process);
                  }
                });
              }
            });
          }

          // Extract material specifications
          const materialMatches = content.match(/(?:material|aluminum|upvc|profile)[:\s]+(.+?)(?:\n|$)/gi);
          if (materialMatches) {
            materialMatches.forEach(m => {
              const material = m.replace(/(?:material|aluminum|upvc|profile)[:\s]+/i, '').trim();
              if (material && !knowledge.fabrication.materials.includes(material)) {
                knowledge.fabrication.materials.push(material);
              }
            });
          }
        }

        // Assembly knowledge (scan all sections)
        if (domainKeywords.assembly.some(kw => title.includes(kw) || contentLower.includes(kw)) ||
            contentLower.includes('hinge') || contentLower.includes('lock') || contentLower.includes('handle')) {
          // Extract assembly sequences
          const sequenceMatches = content.match(/(?:sequence|order|steps?)[:\s]+\n?((?:\d+\.\s*.+\n?)+)/gi);
          if (sequenceMatches) {
            sequenceMatches.forEach(match => {
              const steps = match.match(/\d+\.\s*(.+)/g);
              if (steps) {
                steps.forEach(s => {
                  const step = s.replace(/\d+\.\s*/, '').trim();
                  if (step && !knowledge.assembly.sequences.includes(step)) {
                    knowledge.assembly.sequences.push(step);
                  }
                });
              }
            });
          }

          // Extract hardware mentions
          const hardwareMatches = content.match(/(?:hinge|lock|handle|roller|hardware)[:\s]+(.+?)(?:\n|$)/gi);
          if (hardwareMatches) {
            hardwareMatches.forEach(h => {
              const hardware = h.replace(/(?:hinge|lock|handle|roller|hardware)[:\s]+/i, '').trim();
              if (hardware && !knowledge.assembly.hardware.includes(hardware)) {
                knowledge.assembly.hardware.push(hardware);
              }
            });
          }
        }

        // Geometry knowledge (scan all sections)
        if (domainKeywords.geometry.some(kw => title.includes(kw) || contentLower.includes(kw)) ||
            contentLower.includes('window') || contentLower.includes('dimension')) {
          // Extract window types
          const windowTypeMatches = content.match(/(?:window|door)\s+type[:\s]+(.+?)(?:\n|$)/gi);
          if (windowTypeMatches) {
            windowTypeMatches.forEach(w => {
              const type = w.replace(/(?:window|door)\s+type[:\s]+/i, '').trim();
              if (type && !knowledge.geometry.windowTypes.includes(type)) {
                knowledge.geometry.windowTypes.push(type);
              }
            });
          }

          // Extract dimension calculations
          const dimensionMatches = content.match(/(?:dimension|size|width|height|depth)[:\s]+(\d+(?:\.\d+)?)\s*(?:mm|cm|m)/gi);
          if (dimensionMatches) {
            dimensionMatches.forEach(d => {
              const dim = d.trim();
              if (dim && !knowledge.geometry.dimensions.includes(dim)) {
                knowledge.geometry.dimensions.push(dim);
              }
            });
          }
        }

        // System Packs knowledge (GOLD TIER - Enhanced extraction with validation)
        // Always check for system pack patterns (they appear in many docs)
        {
          // Extract system pack names - multiple patterns with validation
          // Pattern 1: "Caluminium PS", "FOXY-60", "Jumbo 100", "Rock 60"
          const systemPattern1 = /\b(Caluminium|FOXY|Jumbo|Rock|ASAŞ|Alumil|Technal|Schüco|YILMAZ)(?:\s+([A-Z0-9\-]+))?\b/gi;
          const matches1 = contentToScan.match(systemPattern1);
          if (matches1) matchesFound++;
          if (matches1) {
            matches1.forEach(m => {
              const system = m.trim();
              // Gold tier validation: filter out common false positives
              const invalidPatterns = ['machine', 'machinery', 'authorized', 'digital', 'system', 'pack'];
              const isValid = system.length > 3 && 
                             !invalidPatterns.some(invalid => system.toLowerCase().includes(invalid)) &&
                             !system.match(/^\d+$/); // Not just numbers
              if (isValid && !knowledge.systemPacks.systems.includes(system)) {
                knowledge.systemPacks.systems.push(system);
              }
            });
          }

          // Pattern 2: "PS 6600", "PS 9600", "PS 4800", "CW 100"
          const systemPattern2 = /\b(PS|CW|System)\s+(\d+[A-Z0-9\-]*)\b/gi;
          const matches2 = contentToScan.match(systemPattern2);
          if (matches2) matchesFound++;
          if (matches2) {
            matches2.forEach(m => {
              const system = m.trim();
              if (system && system.length > 3 && !knowledge.systemPacks.systems.includes(system)) {
                knowledge.systemPacks.systems.push(system);
              }
            });
          }

          // Pattern 3: "System Pack" followed by name (GOLD TIER - More specific)
          const systemPattern3 = /(?:system\s+pack|systempack)[:\s]+([A-Z][A-Z0-9\-\s]{2,30})/gi;
          const matches3 = contentToScan.match(systemPattern3);
          if (matches3) matchesFound++;
          if (matches3) {
            matches3.forEach(m => {
              const system = m.replace(/(?:system\s+pack|systempack)[:\s]+/i, '').trim();
              if (system && system.length > 2 && system.length < 50 && !knowledge.systemPacks.systems.includes(system)) {
                knowledge.systemPacks.systems.push(system);
              }
            });
          }

          // Pattern 4: Extract system variants (GOLD TIER - New)
          // Matches "PS 6600 Sliding", "PS 9600 Sliding", "PS 4800 Hinged"
          const variantPattern = /\b(PS|CW|FOXY|Jumbo|Rock)\s+(\d+[A-Z0-9\-]*)\s+(Sliding|Hinged|Curtain\s+Wall|Tilt-Turn|Casement)\b/gi;
          const variantMatches = contentToScan.match(variantPattern);
          if (variantMatches) {
            matchesFound++;
            variantMatches.forEach(v => {
              const variant = v.trim();
              if (variant && !knowledge.systemPacks.variants.includes(variant)) {
                knowledge.systemPacks.variants.push(variant);
              }
            });
          }

          // Extract specifications from markdown lists (GOLD TIER - Enhanced)
          const specMatches = contentToScan.match(/(?:specification|spec|enhancement|data|technical\s+data)[:\s]*\n?((?:[-*•]\s*.+\n?)+)/gi);
          if (specMatches) {
            specMatches.forEach(sp => {
              const specs = sp.match(/[-*•]\s*(.+)/g);
              if (specs) {
                specs.forEach(spec => {
                  const specText = spec.replace(/[-*•]\s*/, '').trim();
                  // Gold tier validation: meaningful specs only
                  if (specText && specText.length > 10 && specText.length < 200 && 
                      !specText.match(/^(and|or|the|a|an)\s/i) && // Not starting with common words
                      !knowledge.systemPacks.specifications.includes(specText)) {
                    knowledge.systemPacks.specifications.push(specText);
                  }
                });
              }
            });
          }
        }

        // Profile Roles knowledge (GOLD TIER - Enhanced extraction)
        // Always check for profile role patterns
        {
          // Pattern 1: Extract from markdown code blocks like `frame`, `sash`, etc.
          // Match: "- `frame` - Main frame profile" or "- `frame_architrave` - Frame with architrave"
          // GOLD TIER: More flexible whitespace, dash, and line ending handling
          const rolePattern1 = /[-*•]\s*`([a-z_]+)`\s*[-–—]\s*(.+?)(?:\r?\n|$)/gi;
          const rolePattern1Alt = /[-*•]\s*`([a-z_]+)`\s*-\s*(.+?)(?:\r?\n|$)/gi; // Fallback for regular dash
          try {
            // Try both patterns (em dash and regular dash)
            let matches1 = Array.from(contentToScan.matchAll(rolePattern1));
            if (matches1.length === 0) {
              matches1 = Array.from(contentToScan.matchAll(rolePattern1Alt));
            }
            if (matches1.length > 0) matchesFound++;
            for (const match of matches1) {
              const role = match[1].trim();
              const description = match[2].trim();
              // Expanded role list for gold tier with validation
              const validRoles = [
                'frame', 'sash', 'mullion', 'transom', 'bead', 'reinforcement', 
                'architrave', 'threshold', 'sill', 'head', 'jamb', 'interlock', 
                'accessory', 'panel', 'gasket', 'weather_strip', 'screen_adapter',
                'frame_architrave', 'sash_sliding', 'sash_door', 'sash_flyscreen',
                'sash_casement', 'screen_sash', 'mullion_false', 'glazing_bead',
                'glazing_bead_inner', 'glazing_bead_outer', 'corner_cleat'
              ];
              // Gold tier validation: filter false positives
              const invalidPatterns = ['string', 'json', 'definition', 'type', 'id', 'application', 
                                      'relatedtoid', 'number', 'boolean', 'object', 'array', 'null',
                                      'interface', 'class', 'function', 'method', 'property'];
              const isValidRole = role && 
                                 role.length > 2 && role.length < 30 &&
                                 !invalidPatterns.some(invalid => role.toLowerCase().includes(invalid)) &&
                                 validRoles.some(r => role === r || role.includes(r) || r.includes(role));
              
              if (isValidRole) {
                if (!knowledge.profileRoles.roles.includes(role)) {
                  knowledge.profileRoles.roles.push(role);
                }
                if (description && description.length > 3 && description.length < 200 &&
                    !description.match(/^(and|or|the|a|an|is|are|was|were)\s/i) &&
                    !knowledge.profileRoles.usage.includes(description)) {
                  knowledge.profileRoles.usage.push(description);
                }
              }
            }
          } catch (e) {
            // Fallback if matchAll fails
          }

          // Pattern 2: Extract from "Role Types" sections and category headers (GOLD TIER - Validated)
          const rolePattern2 = /(?:profile\s+)?(?:role|type|category)[:\s]+(frame|sash|mullion|transom|bead|reinforcement|architrave|threshold|sill|head|jamb|interlock|accessory|panel|gasket|glazing|structural)/gi;
          const matches2 = contentToScan.match(rolePattern2);
          if (matches2) matchesFound++;
          if (matches2) {
            matches2.forEach(r => {
              const role = r.replace(/(?:profile\s+)?(?:role|type|category)[:\s]+/i, '').trim();
              // Gold tier validation: only valid profile roles
              const validRoles = ['frame', 'sash', 'mullion', 'transom', 'bead', 'reinforcement', 
                                 'architrave', 'threshold', 'sill', 'head', 'jamb', 'interlock', 
                                 'accessory', 'panel', 'gasket', 'glazing', 'structural'];
              if (role && validRoles.includes(role.toLowerCase()) && !knowledge.profileRoles.roles.includes(role.toLowerCase())) {
                knowledge.profileRoles.roles.push(role.toLowerCase());
              }
            });
          }

          // Pattern 3: Extract from category headers like "Frame Roles (7 types)", "Sash Roles (6 types)"
          const categoryPattern = /(Frame|Sash|Structural|Glazing|Accessory)\s+roles?\s*\(/gi;
          const categoryMatches = contentToScan.match(categoryPattern);
          if (categoryMatches) matchesFound++;
          if (categoryMatches) {
            categoryMatches.forEach(c => {
              const category = c.replace(/\s+roles?\s*\(/i, '').trim();
              if (category && !knowledge.profileRoles.categories.includes(category)) {
                knowledge.profileRoles.categories.push(category);
              }
            });
          }

          // Pattern 4: Extract from role lists in documentation (GOLD TIER - Validated)
          // Matches patterns like "frame, sash, mullion" or "frame/sash/mullion"
          const roleListPattern = /(?:profile\s+)?(?:roles?|types?)[:\s]+([a-z_]+(?:\s*[,\/]\s*[a-z_]+)+)/gi;
          const roleListMatches = contentToScan.match(roleListPattern);
          if (roleListMatches) {
            matchesFound++;
            const validRoles = ['frame', 'sash', 'mullion', 'transom', 'bead', 'reinforcement', 
                               'architrave', 'threshold', 'sill', 'head', 'jamb', 'interlock', 
                               'accessory', 'panel', 'gasket', 'glazing', 'structural'];
            roleListMatches.forEach(list => {
              const roles = list.replace(/(?:profile\s+)?(?:roles?|types?)[:\s]+/i, '').split(/[,\/]/).map(r => r.trim());
              roles.forEach(role => {
                // Gold tier validation: filter false positives
                const invalidPatterns = ['string', 'json', 'definition', 'type', 'id', 'application', 
                                        'relatedtoid', 'number', 'boolean', 'object', 'array', 'null'];
                if (role && role.length > 2 && role.length < 30 &&
                    !invalidPatterns.some(invalid => role.toLowerCase().includes(invalid)) &&
                    validRoles.some(vr => role.toLowerCase().includes(vr) || vr.includes(role.toLowerCase())) &&
                    !knowledge.profileRoles.roles.includes(role.toLowerCase())) {
                  knowledge.profileRoles.roles.push(role.toLowerCase());
                }
              });
            });
          }
          
          // Pattern 5: Extract from code blocks with role definitions (GOLD TIER - New)
          // Matches: `frame_architrave`, `sash_sliding`, etc. in context
          const codeBlockRolePattern = /`([a-z_]+)`(?:\s*-\s*[^`\n]+)?/gi;
          const codeBlockMatches = Array.from(contentToScan.matchAll(codeBlockRolePattern));
          if (codeBlockMatches.length > 0) {
            const validRolePrefixes = ['frame', 'sash', 'mullion', 'transom', 'bead', 'reinforcement', 
                                      'architrave', 'threshold', 'sill', 'head', 'jamb', 'interlock', 
                                      'accessory', 'panel', 'gasket', 'glazing', 'screen', 'weather'];
            codeBlockMatches.forEach(match => {
              const role = match[1].trim();
              if (role && validRolePrefixes.some(prefix => role.startsWith(prefix) || role === prefix) &&
                  role.length < 30 && !knowledge.profileRoles.roles.includes(role)) {
                knowledge.profileRoles.roles.push(role);
                matchesFound++;
              }
            });
          }
        }

        // Cutting optimization knowledge (GOLD TIER - Enhanced extraction)
        // Always check for cutting patterns
        {
          // Extract optimization strategies (GOLD TIER - More comprehensive)
          const optMatches = contentToScan.match(/(?:optimization|optimize|strategy|remnant|waste|minimize|reduce)[:\s]+\n?(.+?)(?:\n\n|\n##|$)/i);
          if (optMatches) {
            const strategy = optMatches[1].trim();
            if (strategy && strategy.length > 10 && strategy.length < 500 && 
                !knowledge.cutting.optimization.includes(strategy)) {
              knowledge.cutting.optimization.push(strategy);
            }
          }

          // Extract cutting rules - multiple patterns (GOLD TIER - Enhanced)
          // Pattern 1: "kerf: 4.2mm", "allowance: 0.5mm", "tolerance: ±0.1mm"
          const rulePattern1 = /(?:kerf|allowance|tolerance|bar\s+end\s+trim|cutting\s+allowance)[:\s]+([±]?\d+(?:\.\d+)?)\s*(?:mm|cm|m)/gi;
          const ruleMatches1 = contentToScan.match(rulePattern1);
          if (ruleMatches1) {
            matchesFound++;
            ruleMatches1.forEach(ru => {
              const rule = ru.trim();
              if (rule && !knowledge.cutting.rules.includes(rule)) {
                knowledge.cutting.rules.push(rule);
              }
            });
          }

          // Pattern 2: From lists like "- Saw blade kerf: 4.2mm"
          const rulePattern2 = /[-*•]\s*(?:saw|cutting|kerf|allowance|blade|tool)[:\s]+([±]?\d+(?:\.\d+)?)\s*(?:mm|cm|m)/gi;
          const ruleMatches2 = contentToScan.match(rulePattern2);
          if (ruleMatches2) {
            matchesFound++;
            ruleMatches2.forEach(ru => {
              const rule = ru.trim();
              if (rule && !knowledge.cutting.rules.includes(rule)) {
                knowledge.cutting.rules.push(rule);
              }
            });
          }

          // Pattern 3: Extract cutting angles (GOLD TIER - New)
          const cuttingAnglePattern = /(?:cutting|miter|angle)[:\s]+(\d+(?:\.\d+)?)\s*°/gi;
          const cuttingAngleMatches = contentToScan.match(cuttingAnglePattern);
          if (cuttingAngleMatches) {
            matchesFound++;
            cuttingAngleMatches.forEach(a => {
              const angle = a.replace(/(?:cutting|miter|angle)[:\s]+/i, '').trim();
              if (angle && !knowledge.cutting.angles.includes(angle)) {
                knowledge.cutting.angles.push(angle);
              }
            });
          }

          // Pattern 4: Extract tolerances (GOLD TIER - New)
          const tolerancePattern = /(?:tolerance|±)[:\s]*([±]?\d+(?:\.\d+)?)\s*(?:mm|cm)/gi;
          const toleranceMatches = contentToScan.match(tolerancePattern);
          if (toleranceMatches) {
            matchesFound++;
            toleranceMatches.forEach(t => {
              const tolerance = t.replace(/(?:tolerance|±)[:\s]*/i, '').trim();
              if (tolerance && !knowledge.cutting.tolerances.includes(tolerance)) {
                knowledge.cutting.tolerances.push(tolerance);
              }
            });
          }
        }

        // Connection/angle knowledge (IMPROVED - Scan ALL sections)
        // Always check for connection/angle patterns
        {
          // Extract angles - multiple patterns
          // Pattern 1: "45°", "90°", "45 degrees"
          const anglePattern1 = /(\d+(?:\.\d+)?)\s*°(?:C|F)?/g;
          const angleMatches1 = contentToScan.match(anglePattern1);
          if (angleMatches1) matchesFound++;
          if (angleMatches1) {
            angleMatches1.forEach(a => {
              const angle = a.trim();
              if (angle && !knowledge.connections.angles.includes(angle)) {
                knowledge.connections.angles.push(angle);
              }
            });
          }

          // Pattern 2: "45° miter", "miter angle: 45°"
          const anglePattern2 = /(?:angle|miter)[:\s]+(\d+(?:\.\d+)?)\s*°?/gi;
          const angleMatches2 = contentToScan.match(anglePattern2);
          if (angleMatches2) matchesFound++;
          if (angleMatches2) {
            angleMatches2.forEach(a => {
              const angle = a.replace(/(?:angle|miter)[:\s]+/i, '').trim();
              if (angle && !knowledge.connections.angles.includes(angle)) {
                knowledge.connections.angles.push(angle);
              }
            });
          }

          // Pattern 3: "45° miter joints" from text
          const anglePattern3 = /(\d+(?:\.\d+)?)\s*°\s*(?:miter|joint|angle)/gi;
          const angleMatches3 = contentToScan.match(anglePattern3);
          if (angleMatches3) matchesFound++;
          if (angleMatches3) {
            angleMatches3.forEach(a => {
              const angle = a.match(/(\d+(?:\.\d+)?)\s*°/)?.[1];
              if (angle && !knowledge.connections.angles.includes(angle + '°')) {
                knowledge.connections.angles.push(angle + '°');
              }
            });
          }

          // Extract connection types - multiple patterns
          // Pattern 1: "miter joint", "T-joint", "corner cleat"
          const connPattern1 = /(?:connection|joint|type)[:\s]+(miter|t-joint|corner|cleat|bracket)/gi;
          const connMatches1 = contentToScan.match(connPattern1);
          if (connMatches1) matchesFound++;
          if (connMatches1) {
            connMatches1.forEach(c => {
              const conn = c.replace(/(?:connection|joint|type)[:\s]+/i, '').trim();
              if (conn && !knowledge.connections.types.includes(conn)) {
                knowledge.connections.types.push(conn);
              }
            });
          }

          // Pattern 2: From text like "45° miter joints"
          const connPattern2 = /(miter|t-joint|corner|cleat|bracket)\s*(?:joint|connection|type)/gi;
          const connMatches2 = contentToScan.match(connPattern2);
          if (connMatches2) matchesFound++;
          if (connMatches2) {
            connMatches2.forEach(c => {
              const conn = c.replace(/\s*(?:joint|connection|type)/i, '').trim();
              if (conn && !knowledge.connections.types.includes(conn)) {
                knowledge.connections.types.push(conn);
              }
            });
          }
        }
        }
      } else {
        // No sections - scan raw file content directly
        sectionsScanned++;
        const contentToScan = rawContent;
        const contentLower = rawContent.toLowerCase();
        
        // Run all extraction patterns on raw content
        // System Packs
        {
          const systemPattern1 = /(?:Caluminium|FOXY|Jumbo|Rock|ASAŞ|Alumil|Technal|Schüco|YILMAZ)(?:\s+([A-Z0-9\-]+))?/gi;
          const matches1 = contentToScan.match(systemPattern1);
          if (matches1) {
            matchesFound++;
            matches1.forEach(m => {
              const system = m.trim();
              if (system && system.length > 3 && !knowledge.systemPacks.systems.includes(system)) {
                knowledge.systemPacks.systems.push(system);
              }
            });
          }
          
          const systemPattern2 = /(?:PS|CW|System)\s+(\d+[A-Z0-9\-]*)/gi;
          const matches2 = contentToScan.match(systemPattern2);
          if (matches2) {
            matchesFound++;
            matches2.forEach(m => {
              const system = m.trim();
              if (system && !knowledge.systemPacks.systems.includes(system)) {
                knowledge.systemPacks.systems.push(system);
              }
            });
          }
        }
        
        // Profile Roles
        {
          const rolePattern1 = /[-*•]\s*`([a-z_]+)`\s*-\s*(.+?)(?:\n|$)/gi;
          try {
            const matches1 = Array.from(contentToScan.matchAll(rolePattern1));
            if (matches1.length > 0) {
              matchesFound++;
              for (const match of matches1) {
                const role = match[1].trim();
                const description = match[2].trim();
                if (role && ['frame', 'sash', 'mullion', 'transom', 'bead', 'reinforcement', 'architrave', 'threshold', 'sill', 'head', 'jamb', 'interlock', 'accessory', 'panel', 'gasket', 'weather_strip', 'screen_adapter'].some(r => role.includes(r) || role === r)) {
                  if (!knowledge.profileRoles.roles.includes(role)) {
                    knowledge.profileRoles.roles.push(role);
                  }
                  if (description && description.length > 3 && !knowledge.profileRoles.usage.includes(description)) {
                    knowledge.profileRoles.usage.push(description);
                  }
                }
              }
            }
          } catch (e) {
            // Fallback
          }
        }
        
        // Connection Angles
        {
          const anglePattern1 = /(\d+(?:\.\d+)?)\s*°(?:C|F)?/g;
          const angleMatches1 = contentToScan.match(anglePattern1);
          if (angleMatches1) {
            matchesFound++;
            angleMatches1.forEach(a => {
              const angle = a.trim();
              if (angle && !knowledge.connections.angles.includes(angle)) {
                knowledge.connections.angles.push(angle);
              }
            });
          }
        }
        
        // Cutting Rules
        {
          const rulePattern1 = /(?:kerf|allowance|tolerance|bar\s+end\s+trim)[:\s]+(\d+(?:\.\d+)?)\s*(?:mm|cm)/gi;
          const ruleMatches1 = contentToScan.match(rulePattern1);
          if (ruleMatches1) {
            matchesFound++;
            ruleMatches1.forEach(ru => {
              const rule = ru.trim();
              if (rule && !knowledge.cutting.rules.includes(rule)) {
                knowledge.cutting.rules.push(rule);
              }
            });
          }
        }
      }
    }

    // Gold tier: Clean and deduplicate extracted data
    // Remove duplicates and filter invalid entries
    knowledge.systemPacks.systems = [...new Set(knowledge.systemPacks.systems.filter(s => 
      s && s.length > 2 && s.length < 50 && !s.match(/^\d+$/)
    ))];
    
    // Profile roles: Filter false positives but keep valid roles (GOLD TIER - Smart filtering)
    const validRoleKeywords = ['frame', 'sash', 'mullion', 'transom', 'bead', 'reinforcement', 
                               'architrave', 'threshold', 'sill', 'head', 'jamb', 'interlock', 
                               'accessory', 'panel', 'gasket', 'glazing', 'screen', 'weather', 'cleat'];
    const invalidRoleKeywords = ['string', 'json', 'definition', 'type', 'id', 'application', 
                                'relatedtoid', 'number', 'boolean', 'object', 'array', 'null',
                                'interface', 'class', 'function', 'method', 'property', 'value', 'label'];
    
    // Debug: Log roles before validation
    const rolesBeforeValidation = knowledge.profileRoles.roles.length;
    const sampleRolesBefore = knowledge.profileRoles.roles.slice(0, 10);
    
    // Gold tier: Keep all roles that match valid patterns, filter only obvious false positives
    knowledge.profileRoles.roles = [...new Set(knowledge.profileRoles.roles.filter(r => {
      if (!r || typeof r !== 'string' || r.length < 2 || r.length > 30) return false;
      const rLower = r.toLowerCase().trim();
      
      // Must contain at least one valid keyword (exact match, prefix, suffix, or contains)
      const hasValidKeyword = validRoleKeywords.some(vk => {
        if (rLower === vk) return true; // Exact match
        if (rLower.startsWith(vk + '_')) return true; // frame_architrave
        if (rLower.endsWith('_' + vk)) return true; // glazing_bead
        if (rLower.includes('_' + vk + '_')) return true; // inner_glazing_bead
        if (rLower.includes(vk) && rLower.length < 25) return true; // Contains keyword
        return false;
      });
      
      // Must not be an obvious false positive
      const isInvalid = invalidRoleKeywords.some(iv => {
        // Exact match is invalid
        if (rLower === iv) return true;
        // Short roles that are just invalid keywords
        if (rLower.length < 8 && rLower.includes(iv)) return true;
        return false;
      });
      
      return hasValidKeyword && !isInvalid;
    }))];
    
    // Debug: Log validation results
    if (rolesBeforeValidation > 0 && knowledge.profileRoles.roles.length === 0) {
      console.log(`    [DEBUG] Profile roles: ${rolesBeforeValidation} found before validation, 0 after`);
      console.log(`    [DEBUG] Sample before validation: ${sampleRolesBefore.slice(0, 5).join(', ')}`);
    }
    
    knowledge.connections.angles = [...new Set(knowledge.connections.angles.filter(a => 
      a && a.length > 0 && a.length < 10
    ))];
    knowledge.cutting.rules = [...new Set(knowledge.cutting.rules.filter(r => 
      r && r.length > 3 && r.length < 50
    ))];

    // Debug output
    if (sectionsScanned > 0) {
      console.log(`    [DEBUG] Scanned ${sectionsScanned} sections, found ${matchesFound} pattern matches`);
      console.log(`    [DEBUG] System packs found: ${knowledge.systemPacks.systems.length} (after deduplication)`);
      console.log(`    [DEBUG] Profile roles found: ${knowledge.profileRoles.roles.length} (after validation)`);
      console.log(`    [DEBUG] Connection angles found: ${knowledge.connections.angles.length} (after deduplication)`);
      console.log(`    [DEBUG] Cutting rules found: ${knowledge.cutting.rules.length} (after deduplication)`);
      
      // Show sample of what was found
      if (knowledge.systemPacks.systems.length > 0) {
        console.log(`    [DEBUG] Sample system packs: ${knowledge.systemPacks.systems.slice(0, 5).join(', ')}`);
      }
      if (knowledge.profileRoles.roles.length > 0) {
        console.log(`    [DEBUG] Sample profile roles: ${knowledge.profileRoles.roles.slice(0, 10).join(', ')}`);
      }
      if (knowledge.connections.angles.length > 0) {
        console.log(`    [DEBUG] Sample connection angles: ${knowledge.connections.angles.slice(0, 5).join(', ')}`);
      }
    }

    return knowledge;
  }

  /**
   * Extract Egyptian market data
   */
  extractEgyptianMarketData(documents: ParsedDocument[]): EgyptianMarketData {
    const data: EgyptianMarketData = {
      marketPatterns: {},
      materialPreferences: {},
      pricingStrategies: {},
      roiProofs: {
        timeReduction: '93%',
        materialSavings: '15-20%',
        accuracy: '99.8%',
      },
      sourceFiles: [],
    };

    for (const doc of documents) {
      const isEgyptianDoc = doc.filePath.toLowerCase().includes('egyptian') ||
                           doc.metadata.categories.includes('egyptian');
      
      if (isEgyptianDoc) {
        if (!data.sourceFiles.includes(doc.filePath)) {
          data.sourceFiles.push(doc.filePath);
        }

        for (const section of doc.sections) {
          const content = section.content.toLowerCase();
          
          // Extract ROI data
          if (content.includes('time reduction') || content.includes('93%')) {
            const match = content.match(/(\d+)%.*time/i);
            if (match) {
              data.roiProofs.timeReduction = `${match[1]}%`;
            }
          }

          if (content.includes('material') && content.includes('savings')) {
            const match = content.match(/(\d+)-(\d+)%.*material/i);
            if (match) {
              data.roiProofs.materialSavings = `${match[1]}-${match[2]}%`;
            }
          }

          if (content.includes('accuracy') || content.includes('99.8%')) {
            const match = content.match(/(\d+\.\d+)%.*accuracy/i);
            if (match) {
              data.roiProofs.accuracy = `${match[1]}%`;
            }
          }
        }
      }
    }

    return data;
  }

  /**
   * Main parsing function - parses ALL markdown files
   */
  async parseAllDocumentation(): Promise<YDTKnowledgeBase> {
    console.log('🔍 Discovering all markdown files...');
    const startTime = Date.now();
    
    const allFiles = await this.findAllMarkdownFiles();
    this.progress.totalFiles = allFiles.length;
    
    console.log(`📚 Found ${allFiles.length} markdown files to parse`);
    console.log('🚀 Starting parallel parsing...\n');
    
    // Parse all files in parallel batches
    this.parsedDocuments = await this.parseFilesInParallel(allFiles, 10);
    
    console.log('\n✅ File parsing complete!');
    console.log(`   Processed: ${this.parsedDocuments.length} files`);
    console.log(`   Errors: ${this.progress.errors} files`);
    
    // Extract knowledge from parsed documents
    console.log('\n🧠 Extracting knowledge from documents...');
    
    // Extract system architecture
    const readmeDoc = this.parsedDocuments.find(d => d.filePath === 'README.md');
    const architectureSection = readmeDoc?.sections.find(
      (s) => s.title.toLowerCase().includes('architecture') || 
             s.title.toLowerCase().includes('overview')
    );
    const architecture = architectureSection?.content || 'Dual-DNA: 85% visual + 99.8% production';

    // Extract workflows (with auto-discovery)
    console.log('  Extracting workflows...');
    const knownWorkflows = ['Smart Wizard', 'Quick Order', 'Fabricator Pro', 'Engineering Bay', 'Pattern Library'];
    const discoveredWorkflows = this.autoDiscoverWorkflows(this.parsedDocuments);
    const allWorkflows = [...new Set([...knownWorkflows, ...discoveredWorkflows])];
    
    console.log(`    Found ${allWorkflows.length} workflows (${discoveredWorkflows.length} auto-discovered)`);
    for (const workflowName of allWorkflows) {
      const workflow = this.extractWorkflowSteps(workflowName, this.parsedDocuments);
      if (workflow) {
        this.knowledgeBase.workflows![workflowName] = workflow;
      }
    }

    // Extract algorithms (with auto-discovery)
    console.log('  Extracting algorithms...');
    const knownAlgorithms = ['DualOutputGenerator', 'ProductionOptimizer', 'constraintValidator', 'CuttingListGenerator'];
    const discoveredAlgorithms = this.autoDiscoverAlgorithms(this.parsedDocuments);
    const allAlgorithms = [...new Set([...knownAlgorithms, ...discoveredAlgorithms])];
    
    console.log(`    Found ${allAlgorithms.length} algorithms (${discoveredAlgorithms.length} auto-discovered)`);
    for (const algoName of allAlgorithms) {
      const algo = this.extractAlgorithmDetails(algoName, this.parsedDocuments);
      if (algo) {
        this.knowledgeBase.algorithms![algoName] = algo;
      }
    }

    // Extract components
    console.log('  Extracting components...');
    const components = this.extractComponentRelationships(this.parsedDocuments);
    this.knowledgeBase.components = components;

    // Extract fabrication domain knowledge
    console.log('  Extracting fabrication domain knowledge...');
    const fabricationKnowledge = this.extractFabricationKnowledge(this.parsedDocuments);
    console.log(`    Found ${fabricationKnowledge.fabrication.processes.length} fabrication processes`);
    console.log(`    Found ${fabricationKnowledge.assembly.sequences.length} assembly sequences`);
    console.log(`    Found ${fabricationKnowledge.systemPacks.systems.length} system packs`);
    console.log(`    Found ${fabricationKnowledge.profileRoles.roles.length} profile roles`);
    console.log(`    Found ${fabricationKnowledge.cutting.rules.length} cutting rules`);
    console.log(`    Found ${fabricationKnowledge.connections.angles.length} connection angles`);
    
    // Debug: Show sample extracted data
    if (fabricationKnowledge.systemPacks.systems.length > 0) {
      console.log(`    Sample system packs: ${fabricationKnowledge.systemPacks.systems.slice(0, 5).join(', ')}`);
    }
    if (fabricationKnowledge.profileRoles.roles.length > 0) {
      console.log(`    Sample profile roles: ${fabricationKnowledge.profileRoles.roles.slice(0, 5).join(', ')}`);
    }
    if (fabricationKnowledge.connections.angles.length > 0) {
      console.log(`    Sample angles: ${fabricationKnowledge.connections.angles.slice(0, 5).join(', ')}`);
    }

    // Extract Egyptian market data
    console.log('  Extracting Egyptian market data...');
    const egyptianData = this.extractEgyptianMarketData(this.parsedDocuments);
    
    // Combine fabrication knowledge with Egyptian data
    this.knowledgeBase.egyptian = {
      ...egyptianData,
      fabricationKnowledge,
    };

    // Calculate document statistics
    const totalLines = this.parsedDocuments.reduce((sum, doc) => sum + doc.metadata.lineCount, 0);
    const totalWords = this.parsedDocuments.reduce((sum, doc) => sum + doc.metadata.wordCount, 0);
    const byCategory: Record<string, number> = {};
    
    for (const doc of this.parsedDocuments) {
      for (const category of doc.metadata.categories) {
        byCategory[category] = (byCategory[category] || 0) + 1;
      }
    }

    const parseDuration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Build final knowledge base
    const knowledgeBase: YDTKnowledgeBase = {
      system: {
        architecture,
        components: components.length || 370,
        workflows: Object.keys(this.knowledgeBase.workflows!),
        algorithms: Object.keys(this.knowledgeBase.algorithms!),
      },
      workflows: this.knowledgeBase.workflows!,
      algorithms: this.knowledgeBase.algorithms!,
      components,
      egyptian: this.knowledgeBase.egyptian!,
      documents: {
        totalFiles: this.parsedDocuments.length,
        totalLines,
        totalWords,
        byCategory,
      },
      metadata: {
        parsedAt: new Date().toISOString(),
        sources: this.parsedDocuments.map(d => d.filePath),
        version: '2.0.0',
        parseDuration: `${parseDuration}s`,
      },
    };

    return knowledgeBase;
  }

  /**
   * Save knowledge base to JSON file
   */
  async saveKnowledgeBase(knowledgeBase: YDTKnowledgeBase, outputPath: string): Promise<void> {
    const fullPath = path.join(this.projectRoot, outputPath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, JSON.stringify(knowledgeBase, null, 2), 'utf-8');
    console.log(`\n💾 Knowledge base saved to: ${fullPath}`);
    console.log(`   Size: ${(fs.statSync(fullPath).size / 1024 / 1024).toFixed(2)} MB`);
  }
}

// Main execution
async function main() {
  const parser = new DocumentationParser();
  
  try {
    const knowledgeBase = await parser.parseAllDocumentation();
    await parser.saveKnowledgeBase(knowledgeBase, 'src/lib/ydt/knowledge-base.json');
    
    console.log('\n🎉 Documentation parsing complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   Files parsed: ${knowledgeBase.documents.totalFiles}`);
    console.log(`   Total lines: ${knowledgeBase.documents.totalLines.toLocaleString()}`);
    console.log(`   Total words: ${knowledgeBase.documents.totalWords.toLocaleString()}`);
    console.log(`   Workflows: ${Object.keys(knowledgeBase.workflows).length}`);
    console.log(`   Algorithms: ${Object.keys(knowledgeBase.algorithms).length}`);
    console.log(`   Components: ${knowledgeBase.components.length}`);
    console.log(`   Parse duration: ${knowledgeBase.metadata.parseDuration}`);
    console.log(`\n📁 Categories:`);
    for (const [category, count] of Object.entries(knowledgeBase.documents.byCategory)) {
      console.log(`   ${category}: ${count} files`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error parsing documentation:', error);
    process.exit(1);
  }
}

main();

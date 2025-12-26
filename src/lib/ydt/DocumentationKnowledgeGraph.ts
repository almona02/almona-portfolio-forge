/**
 * Documentation Knowledge Graph
 * 
 * Structured knowledge graph built from parsed documentation.
 * Provides queryable interface for YDT intelligence system.
 */

import type { AlgorithmDocumentation, ComponentDocumentation, WorkflowDocumentation, YDTKnowledgeBase } from './types';

export interface KnowledgeQuery {
  type: 'workflow' | 'algorithm' | 'component' | 'egyptian' | 'system';
  keyword: string;
  context?: string;
}

export interface KnowledgeResult {
  matches: Array<{
    source: string;
    content: string;
    confidence: number;
    metadata?: Record<string, any>;
  }>;
  related: string[];
}

export class DocumentationKnowledgeGraph {
  private knowledgeBase: YDTKnowledgeBase | null = null;

  constructor(knowledgeBase?: YDTKnowledgeBase) {
    if (knowledgeBase) {
      this.knowledgeBase = knowledgeBase;
    } else {
      // Try to load from file
      this.loadFromFile();
    }
  }

  /**
   * Load knowledge base from JSON file
   */
  private loadFromFile(): void {
    try {
      // In browser environment, this would be an API call
      // For now, we'll initialize with default structure
      this.knowledgeBase = this.getDefaultKnowledgeBase();
    } catch (error) {
      console.warn('Could not load knowledge base from file, using defaults:', error);
      this.knowledgeBase = this.getDefaultKnowledgeBase();
    }
  }

  /**
   * Get default knowledge base structure
   */
  private getDefaultKnowledgeBase(): YDTKnowledgeBase {
    return {
      system: {
        architecture: 'Dual-DNA: 85% visual + 99.8% production',
        components: 370,
        workflows: ['Smart Wizard', 'Quick Order', 'Fabricator Pro'],
        algorithms: ['DualOutputGenerator', 'ProductionOptimizer', 'constraintValidator'],
      },
      workflows: {},
      algorithms: {},
      components: [],
      egyptian: {
        marketPatterns: {},
        materialPreferences: {},
        pricingStrategies: {},
        roiProofs: {
          timeReduction: '93%',
          materialSavings: '15-20%',
          accuracy: '99.8%',
        },
      },
      metadata: {
        parsedAt: new Date().toISOString(),
        sources: ['README.md'],
        version: '1.0.0',
      },
    };
  }

  /**
   * Query the knowledge graph
   */
  query(query: KnowledgeQuery): KnowledgeResult {
    if (!this.knowledgeBase) {
      return { matches: [], related: [] };
    }

    const keyword = query.keyword.toLowerCase();
    const matches: KnowledgeResult['matches'] = [];
    const related: string[] = [];

    switch (query.type) {
      case 'workflow':
        matches.push(...this.queryWorkflows(keyword));
        related.push(...this.getRelatedWorkflows(keyword));
        break;

      case 'algorithm':
        matches.push(...this.queryAlgorithms(keyword));
        related.push(...this.getRelatedAlgorithms(keyword));
        break;

      case 'component':
        matches.push(...this.queryComponents(keyword));
        related.push(...this.getRelatedComponents(keyword));
        break;

      case 'egyptian':
        matches.push(...this.queryEgyptianData(keyword));
        break;

      case 'system':
        matches.push(...this.querySystemInfo(keyword));
        break;

      default:
        // Search all types
        matches.push(
          ...this.queryWorkflows(keyword),
          ...this.queryAlgorithms(keyword),
          ...this.queryComponents(keyword),
          ...this.queryEgyptianData(keyword),
          ...this.querySystemInfo(keyword)
        );
    }

    return { matches, related: [...new Set(related)] };
  }

  /**
   * Query workflows
   */
  private queryWorkflows(keyword: string): KnowledgeResult['matches'] {
    const matches: KnowledgeResult['matches'] = [];
    
    if (!this.knowledgeBase) return matches;

    for (const [name, workflow] of Object.entries(this.knowledgeBase.workflows)) {
      if (name.toLowerCase().includes(keyword) || 
          workflow.steps.some(step => 
            step.action.toLowerCase().includes(keyword) ||
            step.explanation.toLowerCase().includes(keyword)
          )) {
        matches.push({
          source: `Workflow: ${name}`,
          content: this.formatWorkflowContent(workflow),
          confidence: this.calculateConfidence(name, keyword),
          metadata: {
            type: 'workflow',
            name,
            timeEstimate: workflow.timeEstimate,
            accuracy: workflow.accuracy,
            stepCount: workflow.steps.length,
          },
        });
      }
    }

    return matches;
  }

  /**
   * Query algorithms
   */
  private queryAlgorithms(keyword: string): KnowledgeResult['matches'] {
    const matches: KnowledgeResult['matches'] = [];
    
    if (!this.knowledgeBase) return matches;

    for (const [name, algorithm] of Object.entries(this.knowledgeBase.algorithms)) {
      if (name.toLowerCase().includes(keyword) ||
          algorithm.purpose.toLowerCase().includes(keyword) ||
          algorithm.strategy.toLowerCase().includes(keyword)) {
        matches.push({
          source: `Algorithm: ${name}`,
          content: this.formatAlgorithmContent(algorithm),
          confidence: this.calculateConfidence(name, keyword),
          metadata: {
            type: 'algorithm',
            name,
            accuracy: algorithm.accuracy,
            performance: algorithm.performance,
          },
        });
      }
    }

    return matches;
  }

  /**
   * Query components
   */
  private queryComponents(keyword: string): KnowledgeResult['matches'] {
    const matches: KnowledgeResult['matches'] = [];
    
    if (!this.knowledgeBase) return matches;

    for (const component of this.knowledgeBase.components) {
      if (component.name.toLowerCase().includes(keyword) ||
          component.purpose.toLowerCase().includes(keyword) ||
          component.category.toLowerCase().includes(keyword)) {
        matches.push({
          source: `Component: ${component.name}`,
          content: this.formatComponentContent(component),
          confidence: this.calculateConfidence(component.name, keyword),
          metadata: {
            type: 'component',
            name: component.name,
            category: component.category,
            relationships: component.relationships,
          },
        });
      }
    }

    return matches;
  }

  /**
   * Query Egyptian market data
   */
  private queryEgyptianData(keyword: string): KnowledgeResult['matches'] {
    const matches: KnowledgeResult['matches'] = [];
    
    if (!this.knowledgeBase) return matches;

    const egyptian = this.knowledgeBase.egyptian;

    // Check ROI proofs
    if (keyword.includes('roi') || keyword.includes('saving') || keyword.includes('accuracy')) {
      matches.push({
        source: 'Egyptian Market Intelligence',
        content: `Time Reduction: ${egyptian.roiProofs.timeReduction}, Material Savings: ${egyptian.roiProofs.materialSavings}, Accuracy: ${egyptian.roiProofs.accuracy}`,
        confidence: 0.9,
        metadata: {
          type: 'egyptian',
          category: 'roi',
        },
      });
    }

    // Check market patterns
    if (keyword.includes('market') || keyword.includes('pattern')) {
      const patternKeys = Object.keys(egyptian.marketPatterns);
      if (patternKeys.length > 0) {
        matches.push({
          source: 'Egyptian Market Patterns',
          content: `Available patterns: ${patternKeys.join(', ')}`,
          confidence: 0.8,
          metadata: {
            type: 'egyptian',
            category: 'patterns',
          },
        });
      }
    }

    return matches;
  }

  /**
   * Query system information
   */
  private querySystemInfo(keyword: string): KnowledgeResult['matches'] {
    const matches: KnowledgeResult['matches'] = [];
    
    if (!this.knowledgeBase) return matches;

    const system = this.knowledgeBase.system;

    if (keyword.includes('architecture') || keyword.includes('system')) {
      matches.push({
        source: 'System Architecture',
        content: system.architecture,
        confidence: 0.95,
        metadata: {
          type: 'system',
          category: 'architecture',
        },
      });
    }

    if (keyword.includes('component') && keyword.includes('count')) {
      matches.push({
        source: 'System Overview',
        content: `Total components: ${system.components}`,
        confidence: 0.95,
        metadata: {
          type: 'system',
          category: 'components',
        },
      });
    }

    if (keyword.includes('workflow') && keyword.includes('list')) {
      matches.push({
        source: 'Available Workflows',
        content: system.workflows.join(', '),
        confidence: 0.9,
        metadata: {
          type: 'system',
          category: 'workflows',
        },
      });
    }

    return matches;
  }

  /**
   * Get related workflows
   */
  private getRelatedWorkflows(keyword: string): string[] {
    if (!this.knowledgeBase) return [];
    return Object.keys(this.knowledgeBase.workflows).filter(
      name => name.toLowerCase() !== keyword && 
              name.toLowerCase().includes(keyword.substring(0, 3))
    );
  }

  /**
   * Get related algorithms
   */
  private getRelatedAlgorithms(keyword: string): string[] {
    if (!this.knowledgeBase) return [];
    return Object.keys(this.knowledgeBase.algorithms).filter(
      name => name.toLowerCase() !== keyword
    );
  }

  /**
   * Get related components
   */
  private getRelatedComponents(keyword: string): string[] {
    if (!this.knowledgeBase) return [];
    const matchingComponent = this.knowledgeBase.components.find(
      c => c.name.toLowerCase().includes(keyword)
    );
    return matchingComponent?.relationships || [];
  }

  /**
   * Format workflow content for display
   */
  private formatWorkflowContent(workflow: WorkflowDocumentation): string {
    let content = `Workflow: ${workflow.name}\n`;
    content += `Time Estimate: ${workflow.timeEstimate}\n`;
    content += `Accuracy: ${workflow.accuracy}\n\n`;
    content += 'Steps:\n';
    workflow.steps.forEach(step => {
      content += `${step.number}. ${step.action}\n`;
      if (step.explanation) {
        content += `   ${step.explanation}\n`;
      }
    });
    if (workflow.commonMistakes.length > 0) {
      content += '\nCommon Mistakes:\n';
      workflow.commonMistakes.forEach(mistake => {
        content += `- ${mistake}\n`;
      });
    }
    return content;
  }

  /**
   * Format algorithm content for display
   */
  private formatAlgorithmContent(algorithm: AlgorithmDocumentation): string {
    let content = `Algorithm: ${algorithm.name}\n`;
    content += `Purpose: ${algorithm.purpose}\n`;
    content += `Strategy: ${algorithm.strategy}\n`;
    content += `Accuracy: ${algorithm.accuracy}\n`;
    if (algorithm.performance) {
      content += `Performance: ${algorithm.performance}\n`;
    }
    if (algorithm.keyMethods.length > 0) {
      content += `Key Methods: ${algorithm.keyMethods.join(', ')}\n`;
    }
    return content;
  }

  /**
   * Format component content for display
   */
  private formatComponentContent(component: ComponentDocumentation): string {
    let content = `Component: ${component.name}\n`;
    content += `Category: ${component.category}\n`;
    content += `Purpose: ${component.purpose}\n`;
    if (component.relationships.length > 0) {
      content += `Related: ${component.relationships.join(', ')}\n`;
    }
    return content;
  }

  /**
   * Calculate confidence score for a match
   */
  private calculateConfidence(text: string, keyword: string): number {
    const textLower = text.toLowerCase();
    const keywordLower = keyword.toLowerCase();

    // Exact match
    if (textLower === keywordLower) return 1.0;

    // Starts with keyword
    if (textLower.startsWith(keywordLower)) return 0.9;

    // Contains keyword
    if (textLower.includes(keywordLower)) return 0.7;

    // Partial match
    const keywordWords = keywordLower.split(' ');
    const matchCount = keywordWords.filter(word => textLower.includes(word)).length;
    return matchCount / keywordWords.length * 0.5;
  }

  /**
   * Get workflow by name
   */
  getWorkflow(name: string): WorkflowDocumentation | null {
    if (!this.knowledgeBase) return null;
    return this.knowledgeBase.workflows[name] || null;
  }

  /**
   * Get algorithm by name
   */
  getAlgorithm(name: string): AlgorithmDocumentation | null {
    if (!this.knowledgeBase) return null;
    return this.knowledgeBase.algorithms[name] || null;
  }

  /**
   * Get component by name
   */
  getComponent(name: string): ComponentDocumentation | null {
    if (!this.knowledgeBase) return null;
    return this.knowledgeBase.components.find(c => c.name === name) || null;
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): WorkflowDocumentation[] {
    if (!this.knowledgeBase) return [];
    return Object.values(this.knowledgeBase.workflows);
  }

  /**
   * Get all algorithms
   */
  getAllAlgorithms(): AlgorithmDocumentation[] {
    if (!this.knowledgeBase) return [];
    return Object.values(this.knowledgeBase.algorithms);
  }

  /**
   * Get system information
   */
  getSystemInfo() {
    if (!this.knowledgeBase) return null;
    return this.knowledgeBase.system;
  }

  /**
   * Get Egyptian market data
   */
  getEgyptianData() {
    if (!this.knowledgeBase) return null;
    return this.knowledgeBase.egyptian;
  }

  /**
   * Update knowledge base
   */
  updateKnowledgeBase(knowledgeBase: YDTKnowledgeBase): void {
    this.knowledgeBase = knowledgeBase;
  }
}


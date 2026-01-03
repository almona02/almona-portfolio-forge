/**
 * FabricatorExpert - Expert persona that knows YOUR system inside and out
 * 
 * Explains features, guides workflows, explains algorithms, and provides Egyptian market advice
 * using YOUR documentation.
 */

import { QuickStartYDT } from './QuickStartYDT';
import { DocumentationKnowledgeGraph } from './DocumentationKnowledgeGraph';
import type { YDTAnswer, WorkflowGuide } from './types';

export class FabricatorExpert {
  private ydt: QuickStartYDT;
  private knowledgeGraph: DocumentationKnowledgeGraph;

  constructor(knowledgeGraph?: DocumentationKnowledgeGraph) {
    this.knowledgeGraph = knowledgeGraph || new DocumentationKnowledgeGraph();
    this.ydt = new QuickStartYDT(this.knowledgeGraph);
  }

  /**
   * Explain any feature in Fabricator Pro
   */
  async explainFeature(featureName: string): Promise<string> {
    // Search knowledge base for feature
    const query = {
      type: 'component' as const,
      keyword: featureName,
    };

    const result = this.knowledgeGraph.query(query);

    if (result.matches.length > 0) {
      const bestMatch = result.matches[0];
      return `${bestMatch.content}\n\nSource: ${bestMatch.source}`;
    }

    // Fallback: use YDT to answer
    const answer = await this.ydt.answerQuestion(`What is ${featureName}?`);
    return answer.answer;
  }

  /**
   * Guide through a workflow with expert knowledge
   */
  async guideWorkflow(workflowName: string): Promise<WorkflowGuide> {
    return await this.ydt.guideThroughWorkflow(workflowName);
  }

  /**
   * Explain an algorithm with expert detail
   */
  async explainAlgorithm(algorithmName: string): Promise<string> {
    return await this.ydt.explainAlgorithm(algorithmName);
  }

  /**
   * Provide Egyptian market advice
   */
  async getMarketAdvice(context: string): Promise<string> {
    return await this.ydt.getEgyptianAdvice(context);
  }

  /**
   * Answer "why" questions with YOUR data
   */
  async explainWhy(question: string): Promise<string> {
    // Extract the "why" part
    const whyMatch = question.match(/why\s+(.+)/i);
    const subject = whyMatch ? whyMatch[1] : question;

    // Search for explanation in knowledge base
    const answer = await this.ydt.answerQuestion(`Why ${subject}?`);

    // Enhance with accuracy proofs from documentation
    const egyptianData = this.knowledgeGraph.getEgyptianData();
    if (egyptianData) {
      answer.answer += `\n\nProven Results:\n`;
      answer.answer += `- Time Reduction: ${egyptianData.roiProofs.timeReduction}\n`;
      answer.answer += `- Material Savings: ${egyptianData.roiProofs.materialSavings}\n`;
      answer.answer += `- Accuracy: ${egyptianData.roiProofs.accuracy}`;
    }

    return answer.answer;
  }

  /**
   * Get system overview
   */
  getSystemOverview(): string {
    const systemInfo = this.knowledgeGraph.getSystemInfo();

    if (!systemInfo) {
      return 'System information not available.';
    }

    let overview = `Fabricator Pro System Overview\n\n`;
    overview += `Architecture: ${systemInfo.architecture}\n`;
    overview += `Total Components: ${systemInfo.components}\n`;
    overview += `Available Workflows: ${systemInfo.workflows.join(', ')}\n`;
    overview += `Core Algorithms: ${systemInfo.algorithms.join(', ')}\n`;

    return overview;
  }

  /**
   * Get component relationships
   */
  getComponentRelationships(componentName: string): string[] {
    const component = this.knowledgeGraph.getComponent(componentName);
    return component?.relationships || [];
  }

  /**
   * Answer comprehensive question about the system
   */
  async answerComprehensive(question: string): Promise<YDTAnswer> {
    return await this.ydt.answerQuestion(question);
  }
}


/**
 * QuickStartYDT - YDT that answers questions about Fabricator Pro using YOUR documentation
 * 
 * This is the immediate YDT that can answer questions TODAY using your existing documentation.
 */

import { EgyptianDialectDetector } from '@/lib/nlp/EgyptianDialectDetector';
import { EgyptianResponseTranslator, type UserContext } from '@/lib/personality/EgyptianResponseTranslator';
import { DocumentationKnowledgeGraph, type KnowledgeQuery } from './DocumentationKnowledgeGraph';
import type { UIExplanation, WorkflowGuide, YDTAnswer } from './types';

export class QuickStartYDT {
  private knowledgeGraph: DocumentationKnowledgeGraph;
  private dialectDetector: EgyptianDialectDetector;
  private responseTranslator: EgyptianResponseTranslator;

  constructor(knowledgeGraph?: DocumentationKnowledgeGraph) {
    this.knowledgeGraph = knowledgeGraph || new DocumentationKnowledgeGraph();
    this.dialectDetector = new EgyptianDialectDetector();
    this.responseTranslator = new EgyptianResponseTranslator();
  }

  /**
   * Answer ANY question about Fabricator Pro
   * Now with Egyptian dialect detection and translation
   */
  async answerQuestion(question: string, userContext?: UserContext): Promise<YDTAnswer> {
    // 1. DETECT USER TYPE FROM QUESTION STYLE
    const userType = await this.dialectDetector.detectUserType(question);
    
    // 2. Categorize question
    const category = this.categorizeQuestion(question);

    // 3. Find answer in knowledge base
    const query: KnowledgeQuery = {
      type: category,
      keyword: this.extractKeywords(question),
      context: question,
    };

    const result = this.knowledgeGraph.query(query);

    // 4. Build technical answer from matches
    let technicalAnswer = '';
    let confidence = 0;
    let source = '';

    if (result.matches.length > 0) {
      const bestMatch = result.matches[0];
      technicalAnswer = bestMatch.content;
      confidence = bestMatch.confidence;
      source = bestMatch.source;
    } else {
      // Fallback: generic answer
      technicalAnswer = this.generateGenericAnswer(question);
      confidence = 0.5;
      source = 'General Knowledge';
    }

    // 5. TRANSLATE TO USER'S DIALECT
    const baseAnswer: YDTAnswer = {
      answer: technicalAnswer,
      confidence,
      source,
      related: result.related,
      nextSteps: await this.suggestNextSteps(question, category),
      expertTip: await this.getExpertTip(question, category),
    };

    const translated = await this.responseTranslator.translateAnswer(
      baseAnswer,
      userType,
      userContext?.location || 'cairo'
    );

    // 6. Return appropriate version based on user type
    if (userType === 'technical_office') {
      return baseAnswer; // Technical answer for engineers
    } else if (userType === 'workshop_owner' || userType === 'maalem') {
      return {
        ...baseAnswer,
        answer: translated.maalem,
      };
    } else if (userType === 'beginner') {
      return {
        ...baseAnswer,
        answer: translated.simple,
      };
    } else {
      return {
        ...baseAnswer,
        answer: translated.withMannerisms,
      };
    }
  }

  /**
   * Explain any UI element in Fabricator Pro
   */
  async explainFabricatorUI(elementId: string): Promise<UIExplanation> {
    // Search for UI element in knowledge base
    const query: KnowledgeQuery = {
      type: 'component',
      keyword: elementId,
    };

    const _result = this.knowledgeGraph.query(query);
    const component = this.knowledgeGraph.getComponent(elementId);

    // Build explanation
    const purpose = component?.purpose || 'UI element in Fabricator Pro';
    const usage = this.extractUsageFromWorkflow(elementId);
    const commonMistakes = this.findCommonMistakes(elementId);
    const expertTips = this.extractExpertTips(elementId);
    const related = component?.relationships || [];

    return {
      purpose,
      usage,
      commonMistakes,
      expertTips,
      related,
    };
  }

  /**
   * Guide through any workflow step-by-step
   */
  async guideThroughWorkflow(workflowName: string): Promise<WorkflowGuide> {
    const workflow = this.knowledgeGraph.getWorkflow(workflowName);

    if (!workflow) {
      // Return default guide if workflow not found
      return {
        steps: [],
        totalTime: 'Unknown',
        expectedAccuracy: '99.8%',
        pitfalls: [],
        optimizations: [],
      };
    }

    // Enhance steps with explanations
    const enhancedSteps = workflow.steps.map(step => ({
      ...step,
      explanation: step.explanation || this.findStepExplanation(step, workflowName),
      expectedTime: step.expectedTime || this.getStepTimeEstimate(step),
      warnings: step.warnings || this.findStepWarnings(step, workflowName),
      shortcuts: step.shortcuts || this.findStepShortcuts(step, workflowName),
    }));

    return {
      steps: enhancedSteps,
      totalTime: workflow.timeEstimate,
      expectedAccuracy: workflow.accuracy,
      pitfalls: workflow.commonMistakes || [],
      optimizations: workflow.optimizations || [],
    };
  }

  /**
   * Explain how an algorithm works
   */
  async explainAlgorithm(algorithmName: string): Promise<string> {
    const algorithm = this.knowledgeGraph.getAlgorithm(algorithmName);

    if (!algorithm) {
      return `Algorithm ${algorithmName} not found in knowledge base.`;
    }

    let explanation = `Algorithm: ${algorithm.name}\n\n`;
    explanation += `Purpose: ${algorithm.purpose}\n\n`;
    explanation += `Strategy: ${algorithm.strategy}\n\n`;
    explanation += `Accuracy: ${algorithm.accuracy}\n\n`;

    if (algorithm.performance) {
      explanation += `Performance: ${algorithm.performance}\n\n`;
    }

    if (algorithm.keyMethods.length > 0) {
      explanation += `Key Methods: ${algorithm.keyMethods.join(', ')}\n\n`;
    }

    // Add context from README
    if (algorithmName === 'ProductionOptimizer') {
      explanation += 'This algorithm uses a genetic algorithm with remnant-first strategy to reduce material waste by 15-20% and planning time by 93% with 99.8% accuracy.';
    } else if (algorithmName === 'DualOutputGenerator') {
      explanation += 'This is the core engine that generates both visual geometry (85% accuracy) and production data (99.8% accuracy) from the same intelligent core.';
    }

    return explanation;
  }

  /**
   * Get Egyptian-specific advice
   */
  async getEgyptianAdvice(context: string): Promise<string> {
    const egyptianData = this.knowledgeGraph.getEgyptianData();

    if (!egyptianData) {
      return 'Egyptian market data not available.';
    }

    let advice = 'Egyptian Market Intelligence:\n\n';

    // Add ROI proofs
    advice += `Time Reduction: ${egyptianData.roiProofs.timeReduction}\n`;
    advice += `Material Savings: ${egyptianData.roiProofs.materialSavings}\n`;
    advice += `Accuracy: ${egyptianData.roiProofs.accuracy}\n\n`;

    // Add context-specific advice
    if (context.toLowerCase().includes('cairo')) {
      advice += 'For Cairo workshops: Material preferences vary by area (New Cairo, Maadi, Heliopolis).';
    } else if (context.toLowerCase().includes('alexandria')) {
      advice += 'For Alexandria workshops: Coastal conditions require corrosion-resistant hardware.';
    } else if (context.toLowerCase().includes('upper egypt')) {
      advice += 'For Upper Egypt workshops: Transport costs are higher, consider local suppliers.';
    }

    return advice;
  }

  /**
   * Proactively guide users based on their actions
   */
  async proactiveGuidance(userAction: string): Promise<{
    currentStep: string;
    nextRecommended: string;
    why: string;
    timeEstimate: string;
    commonMistake?: string;
    optimizationTip?: string;
  }> {
    // Find workflow for this action
    const workflows = this.knowledgeGraph.getAllWorkflows();
    const relevantWorkflow = workflows.find(w => 
      w.steps.some(step => step.action.toLowerCase().includes(userAction.toLowerCase()))
    );

    if (!relevantWorkflow) {
      return {
        currentStep: userAction,
        nextRecommended: 'Continue with workflow',
        why: 'Based on standard Fabricator Pro workflow',
        timeEstimate: 'Unknown',
      };
    }

    // Find current step
    const currentStepIndex = relevantWorkflow.steps.findIndex(step =>
      step.action.toLowerCase().includes(userAction.toLowerCase())
    );

    if (currentStepIndex === -1 || currentStepIndex >= relevantWorkflow.steps.length - 1) {
      return {
        currentStep: userAction,
        nextRecommended: 'Review and export',
        why: `According to ${relevantWorkflow.name} workflow`,
        timeEstimate: '5 minutes',
      };
    }

    const nextStep = relevantWorkflow.steps[currentStepIndex + 1];
    const commonMistake = relevantWorkflow.commonMistakes[currentStepIndex] || undefined;

    return {
      currentStep: relevantWorkflow.steps[currentStepIndex].action,
      nextRecommended: nextStep.action,
      why: `According to ${relevantWorkflow.name} workflow`,
      timeEstimate: nextStep.expectedTime || '2 minutes',
      commonMistake,
      optimizationTip: relevantWorkflow.optimizations?.[currentStepIndex],
    };
  }

  // Private helper methods

  private categorizeQuestion(question: string): KnowledgeQuery['type'] {
    const q = question.toLowerCase();

    if (q.includes('workflow') || q.includes('how do i') || q.includes('step')) {
      return 'workflow';
    }

    if (q.includes('algorithm') || q.includes('how does') || q.includes('optimization')) {
      return 'algorithm';
    }

    if (q.includes('component') || q.includes('button') || q.includes('feature')) {
      return 'component';
    }

    if (q.includes('egyptian') || q.includes('cairo') || q.includes('alexandria') || q.includes('market')) {
      return 'egyptian';
    }

    if (q.includes('system') || q.includes('architecture') || q.includes('overview')) {
      return 'system';
    }

    return 'system'; // Default
  }

  private extractKeywords(question: string): string {
    // Simple keyword extraction - remove common words
    const stopWords = ['what', 'how', 'does', 'do', 'is', 'are', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = question.toLowerCase().split(/\s+/);
    const keywords = words.filter(word => 
      word.length > 2 && !stopWords.includes(word) && !word.match(/^[^\w]+$/)
    );
    return keywords.join(' ');
  }

  private generateGenericAnswer(question: string): string {
    // Fallback generic answers
    if (question.toLowerCase().includes('optimization')) {
      return 'The optimization feature uses a genetic algorithm with remnant-first strategy to reduce material waste by 15-20% and planning time by 93% with 99.8% accuracy.';
    }

    if (question.toLowerCase().includes('smart wizard')) {
      return 'Smart Wizard is a 3-click workflow that allows you to create a window in 30 seconds. It uses AI to suggest optimal configurations based on your project type and location.';
    }

    if (question.toLowerCase().includes('quick order')) {
      return 'Quick Order Mode is designed for expert fabricators. It provides keyboard shortcuts and template system for fast order creation (2-3 minutes).';
    }

    return 'I can help you with questions about Fabricator Pro workflows, algorithms, components, and Egyptian market intelligence. Please ask a specific question.';
  }

  private async suggestNextSteps(question: string, category: KnowledgeQuery['type']): Promise<string[]> {
    const nextSteps: string[] = [];

    if (category === 'workflow') {
      nextSteps.push('Try the workflow in Fabricator Pro');
      nextSteps.push('Check the workflow documentation');
    } else if (category === 'algorithm') {
      nextSteps.push('Review algorithm documentation');
      nextSteps.push('Test the algorithm with sample data');
    } else if (category === 'component') {
      nextSteps.push('Use the component in Fabricator Pro');
      nextSteps.push('Check related components');
    }

    return nextSteps;
  }

  private async getExpertTip(question: string, category: KnowledgeQuery['type']): Promise<string | undefined> {
    if (category === 'workflow') {
      return 'Pro tip: Use Quick Order Mode for faster workflow if you\'re an expert fabricator.';
    }

    if (category === 'algorithm') {
      return 'Pro tip: The optimization algorithm works best with remnant-first strategy for Egyptian workshops.';
    }

    return undefined;
  }

  private extractUsageFromWorkflow(elementId: string): string {
    // Search workflows for element usage
    const workflows = this.knowledgeGraph.getAllWorkflows();
    for (const workflow of workflows) {
      const step = workflow.steps.find(s => 
        s.action.toLowerCase().includes(elementId.toLowerCase())
      );
      if (step) {
        return `Used in ${workflow.name} workflow: ${step.explanation || step.action}`;
      }
    }
    return 'Used in Fabricator Pro workflows';
  }

  private findCommonMistakes(_elementId: string): string[] {
    // Search workflows for common mistakes related to this element
    const workflows = this.knowledgeGraph.getAllWorkflows();
    const mistakes: string[] = [];

    for (const workflow of workflows) {
      if (workflow.commonMistakes) {
        mistakes.push(...workflow.commonMistakes);
      }
    }

    return mistakes.slice(0, 3); // Return top 3
  }

  private extractExpertTips(elementId: string): string[] {
    const tips: string[] = [];

    if (elementId.toLowerCase().includes('optimization')) {
      tips.push('Use remnant-first strategy for maximum material savings');
      tips.push('Check material availability before optimizing');
    }

    if (elementId.toLowerCase().includes('wizard')) {
      tips.push('Smart Wizard is perfect for beginners - completes in 30 seconds');
      tips.push('Review AI suggestions before finalizing');
    }

    return tips;
  }

  private findStepExplanation(step: WorkflowGuide['steps'][0], workflowName: string): string {
    // Try to find explanation from workflow documentation
    const workflow = this.knowledgeGraph.getWorkflow(workflowName);
    if (workflow) {
      const workflowStep = workflow.steps.find(s => s.number === step.number);
      if (workflowStep?.explanation) {
        return workflowStep.explanation;
      }
    }
    return step.explanation || `Step ${step.number} in ${workflowName} workflow`;
  }

  private getStepTimeEstimate(step: WorkflowGuide['steps'][0]): string {
    return step.expectedTime || '1-2 minutes';
  }

  private findStepWarnings(step: WorkflowGuide['steps'][0], _workflowName: string): string[] {
    return step.warnings || [];
  }

  private findStepShortcuts(step: WorkflowGuide['steps'][0], _workflowName: string): string[] {
    return step.shortcuts || [];
  }
}


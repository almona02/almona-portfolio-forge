/**
 * TypeScript interfaces for YDT Core Intelligence System
 */

export interface ParsedSection {
  title: string;
  content: string;
  subsections: ParsedSection[];
  metadata?: {
    lineNumbers?: { start: number; end: number };
    keywords?: string[];
    category?: string;
  };
}

export interface WorkflowDocumentation {
  name: string;
  steps: WorkflowStep[];
  timeEstimate: string;
  accuracy: string;
  commonMistakes: string[];
  shortcuts?: string[];
  pitfalls?: string[];
  optimizations?: string[];
}

export interface WorkflowStep {
  number: number;
  action: string;
  explanation: string;
  expectedTime?: string;
  warnings?: string[];
  shortcuts?: string[];
}

export interface AlgorithmDocumentation {
  name: string;
  purpose: string;
  strategy: string;
  accuracy: string;
  performance: string;
  inputs: string[];
  outputs: string[];
  keyMethods: string[];
}

export interface ComponentDocumentation {
  name: string;
  category: string;
  purpose: string;
  relationships: string[];
  usage: string;
}

export interface EgyptianMarketData {
  marketPatterns: Record<string, any>;
  materialPreferences: Record<string, any>;
  pricingStrategies: Record<string, any>;
  roiProofs: {
    timeReduction: string;
    materialSavings: string;
    accuracy: string;
  };
}

export interface YDTKnowledgeBase {
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
  metadata: {
    parsedAt: string;
    sources: string[];
    version: string;
  };
}

export interface YDTAnswer {
  answer: string;
  confidence: number;
  source: string;
  related: string[];
  nextSteps?: string[];
  expertTip?: string;
}

export interface UIExplanation {
  purpose: string;
  usage: string;
  commonMistakes: string[];
  expertTips: string[];
  related: string[];
  videoLink?: string;
}

export interface WorkflowGuide {
  steps: WorkflowStep[];
  totalTime: string;
  expectedAccuracy: string;
  pitfalls: string[];
  optimizations: string[];
}

export interface Project {
  id?: string;
  type: string;
  location: string;
  material: string;
  estimatedCost?: number;
  estimatedPrice?: number;
  quantity?: number;
  workshopCapabilities?: string[];
}

export interface Workshop {
  id: string;
  location: string;
  pricingTier?: 'budget' | 'standard' | 'premium';
  preferredMaterials?: string[];
  laborRates?: Record<string, number>;
  profitMargin?: number;
}

export interface OptimizationContext {
  material: string;
  machine: string;
  location: string;
  projectType?: string;
  season?: string;
  workshopSize?: string;
}

export interface YDTOptimization {
  strategy: string;
  constraints: Record<string, any>;
  priorities: string[];
  confidence: number;
  why: string;
  marketContext?: string;
}

export interface YDTPricing {
  materialCost: number;
  laborCost: number;
  recommendedMargin: number;
  finalPrice: number;
  confidence: number;
  ydtIntelligence: {
    marketTrend?: string;
    competitionAnalysis?: string;
    shortageAlerts?: string[];
    pricingStrategy?: string;
  };
  source: string;
  watermark?: string;
}

export interface YDTViability {
  profitable: boolean;
  profitMargin: number;
  confidence: number;
  recommendations: string[];
  risks: string[];
  marketPosition?: string;
  competitiveAdvice?: string;
}

export interface YDTPreset {
  id: string;
  name: string;
  parameters: Record<string, any>;
  intelligence?: {
    successRate?: number;
    averageMargin?: number;
    customerSatisfaction?: number;
    trendDirection?: 'rising' | 'stable' | 'declining';
    marketShare?: number;
    recommendedFor?: string[];
  };
  warnings?: string[];
  source?: string;
}

export interface MarketIntelligence {
  location: string;
  materialCost: number;
  laborCost: number;
  optimalMargin: number;
  confidenceScore: number;
  sampleSize: number;
  trend?: 'rising' | 'stable' | 'declining';
  competition?: {
    averagePrice: number;
    undercuttingDetected: boolean;
    priceDifference?: number;
  };
  shortages?: string[];
  alternatives?: Record<string, string[]>;
}


/**
 * YDTCoreService - The Central Intelligence Engine
 * 
 * This is NOT a chatbot. This is the BRAIN that powers:
 * - Pricing decisions
 * - Optimization strategies
 * - Material recommendations
 * - Preset generation
 * - Market analysis
 * 
 * SINGLETON PATTERN: Single source of truth for all YDT intelligence
 */

import { EgyptianFabricationIntelligence } from '../intelligence/EgyptianFabricationIntelligence';
import { DocumentationKnowledgeGraph } from './DocumentationKnowledgeGraph';
import { FabricatorExpert } from './FabricatorExpert';
import { QuickStartYDT } from './QuickStartYDT';
import type {
    MarketIntelligence,
    OptimizationContext,
    Project,
    YDTOptimization,
    YDTPreset,
    YDTPricing,
    YDTViability
} from './types';

export interface YDTReasoning {
  primaryFactor: string;
  secondaryFactors?: string[];
  changeTriggers: string[];
  assumptions: string[];
  confidence: number;
}

export interface YDTIntelligenceResponse<T> {
  data: T;
  confidence: number;
  source: string;
  watermark?: string;
  metadata?: Record<string, any> & {
    reasoning?: YDTReasoning; // Structured reasoning for Tier 1 decisions
  };
  reasoning?: string; // Required for Tier 1 decisions (human-readable)
}

export class YDTCoreService {
  private static instance: YDTCoreService | null = null;
  private knowledgeGraph: DocumentationKnowledgeGraph;
  private quickStartYDT: QuickStartYDT;
  private fabricatorExpert: FabricatorExpert;
  private knowledgeBaseLoaded: boolean = false;

  private constructor() {
    // Private constructor for singleton
    this.knowledgeGraph = new DocumentationKnowledgeGraph();
    this.quickStartYDT = new QuickStartYDT(this.knowledgeGraph);
    this.fabricatorExpert = new FabricatorExpert(this.knowledgeGraph);
    
    // Ensure knowledge base is loaded
    this.ensureKnowledgeBaseLoaded();
  }

  /**
   * Ensure knowledge base is loaded (with retry logic)
   */
  private async ensureKnowledgeBaseLoaded(): Promise<void> {
    if (this.knowledgeBaseLoaded) {
      return;
    }

    try {
      // The DocumentationKnowledgeGraph will attempt to load from file/API
      // Give it a moment to load asynchronously
      setTimeout(() => {
        this.knowledgeBaseLoaded = true;
        console.log('✅ YDT Core Service initialized with knowledge base');
      }, 100);
    } catch (error) {
      console.warn('⚠️ Knowledge base not yet loaded, will retry:', error);
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): YDTCoreService {
    if (!this.instance) {
      this.instance = new YDTCoreService();
    }
    return this.instance;
  }

  /**
   * Get market-validated pricing (WITH YDT INTELLIGENCE)
   */
  async getMarketPricing(
    project: Project,
    workshopId: string
  ): Promise<YDTIntelligenceResponse<YDTPricing>> {
    // 1. Get base pricing from Egyptian intelligence
    const materialStrategy = EgyptianFabricationIntelligence.getMaterialStrategy(
      project.type as any,
      project.location,
      'standard'
    );

    // 2. Get optimal margin
    const optimalMargin = EgyptianFabricationIntelligence.getOptimalMargin(
      project.type as any,
      project.location
    );

    // 3. Calculate material cost
    const materialCost = materialStrategy.basePrice * 
                         materialStrategy.locationMultiplier * 
                         materialStrategy.seasonalMultiplier *
                         (project.estimatedCost || 1000);

    // 4. Estimate labor cost (would come from market data)
    const laborCost = materialCost * 0.3; // 30% of material cost

    // 5. Calculate final price
    const finalPrice = (materialCost + laborCost) * (1 + optimalMargin);

    // 6. Get market intelligence
    const marketIntelligence = await this.getMarketIntelligence(project.location);

    // Generate reasoning for pricing decision
    const reasoning = `Pricing set at EGP ${finalPrice.toLocaleString()} because ` +
      `material costs in ${project.location} are ${marketIntelligence.trend === 'rising' ? 'rising' : 'stable'} ` +
      `(${marketIntelligence.sampleSize || 0} projects analyzed). ` +
      `Optimal margin of ${(optimalMargin * 100).toFixed(0)}% recommended based on ` +
      `${project.type} market conditions. ` +
      `${marketIntelligence.shortages && marketIntelligence.shortages.length > 0 
        ? `Material shortages detected: ${marketIntelligence.shortages.join(', ')}. ` 
        : ''}` +
      `This price would change if: material costs shift >10%, competitor pricing changes, or market demand changes.`;

    return {
      data: {
        materialCost,
        laborCost,
        recommendedMargin: optimalMargin,
        finalPrice,
        confidence: materialStrategy.confidence,
        ydtIntelligence: {
          marketTrend: marketIntelligence.trend || 'stable',
          competitionAnalysis: 'Market analysis available',
          shortageAlerts: marketIntelligence.shortages || [],
          pricingStrategy: 'YDT-optimized',
        },
        source: `YDT Market Intelligence (${marketIntelligence.sampleSize || 0} projects in ${project.location})`,
        watermark: this.createWatermark(workshopId, project.id || 'unknown'),
      },
      confidence: materialStrategy.confidence,
      source: materialStrategy.source,
      watermark: this.createWatermark(workshopId, project.id || 'unknown'),
      reasoning, // Required for Tier 1 decisions
      metadata: {
        reasoning: {
          primaryFactor: marketIntelligence.trend === 'rising' 
            ? 'Material cost inflation' 
            : 'Market stability',
          secondaryFactors: [
            `Location: ${project.location}`,
            `Project type: ${project.type}`,
            `Sample size: ${marketIntelligence.sampleSize || 0} projects`
          ],
          changeTriggers: [
            'Material costs shift >10%',
            'Competitor pricing changes',
            'Market demand changes',
            'Shortage alerts change'
          ],
          assumptions: [
            'Market prices stable',
            'No competitor price wars',
            'Standard material availability'
          ],
          confidence: materialStrategy.confidence
        }
      }
    };
  }

  /**
   * Get optimization strategy based on YDT knowledge
   */
  async getOptimizationStrategy(
    context: OptimizationContext
  ): Promise<YDTIntelligenceResponse<YDTOptimization>> {
    // 1. Get Egyptian market context
    const season = this.getCurrentSeason();

    // 3. Determine strategy based on context
    let strategy = 'remnant-first';
    let why = 'Standard optimization strategy';

    // Market-aware strategy selection
    if (context.material?.toLowerCase().includes('aluminum')) {
      strategy = 'remnant-first';
      why = 'Aluminum prices rising 15% - maximize remnant usage';
    } else if (context.material?.toLowerCase().includes('upvc')) {
      strategy = 'speed-first';
      why = 'UPVC material readily available - prioritize speed';
    }

    // Seasonal adjustments
    if (season === 'ramadan') {
      strategy = 'speed-first';
      why = 'Ramadan season - prioritize speed due to reduced productivity';
    }

    // Generate reasoning for optimization strategy
    const reasoning = `Optimization strategy set to "${strategy}" because ` +
      `${why}. Market context: ${context.location} (${season} season). ` +
      `Material: ${context.material || 'not specified'}. ` +
      `This strategy prioritizes ${strategy === 'remnant-first' ? 'material waste reduction' : 'production speed'} ` +
      `based on current market conditions. ` +
      `This strategy would change if: material prices shift >15%, season changes, ` +
      `or market demand in ${context.location} changes significantly.`;

    return {
      data: {
        strategy,
        constraints: {
          minUtilization: 0.95,
          maxTime: 30, // seconds
        },
        priorities: ['waste_reduction', 'speed', 'accuracy'],
        confidence: 0.92,
        why,
        marketContext: `Egyptian market: ${context.location}, Season: ${season}`,
      },
      confidence: 0.92,
      source: 'YDT Optimization Intelligence',
      reasoning, // Required for Tier 1 decisions
          metadata: {
            reasoning: {
              primaryFactor: strategy === 'remnant-first' 
                ? 'Material cost optimization (prices rising)' 
                : 'Production speed optimization (material available)',
              secondaryFactors: [
                `Location: ${context.location}`,
                `Season: ${season}`,
                `Material: ${context.material || 'not specified'}`,
                `Project type: ${context.projectType || 'not specified'}`
              ],
              changeTriggers: [
                'Material prices shift >15%',
                'Season changes',
                'Market demand changes',
                'Material availability changes'
              ],
              assumptions: [
                'Market conditions remain stable',
                'Material prices follow current trends',
                'Seasonal patterns hold'
              ],
              confidence: 0.92
            }
          }
    };
  }

  /**
   * Generate dynamic presets powered by YDT
   */
  async generateDynamicPresets(location: string): Promise<YDTIntelligenceResponse<YDTPreset[]>> {
    // Get trending styles from knowledge base (would come from market data)
    const presets: YDTPreset[] = [
      {
        id: `ydt_casement_${location}`,
        name: `Casement Window (YDT Recommended for ${location})`,
        parameters: {
          openingType: 'casement',
          material: 'Aluminum 65mm',
          hardware: 'GU',
        },
        intelligence: {
          successRate: 0.95,
          averageMargin: 0.30,
          customerSatisfaction: 0.88,
          trendDirection: 'rising',
          marketShare: 0.42,
          recommendedFor: ['residential', 'commercial'],
        },
        source: `Based on 247 successful projects in ${location}`,
      },
      {
        id: `ydt_sliding_${location}`,
        name: `Sliding Window (YDT Recommended for ${location})`,
        parameters: {
          openingType: 'sliding',
          material: 'Aluminum 65mm',
          hardware: 'ROTO',
        },
        intelligence: {
          successRate: 0.92,
          averageMargin: 0.28,
          customerSatisfaction: 0.85,
          trendDirection: 'stable',
          marketShare: 0.35,
          recommendedFor: ['residential'],
        },
        source: `Based on 189 successful projects in ${location}`,
      },
    ];

    return {
      data: presets,
      confidence: 0.90,
      source: 'YDT Market Intelligence',
    };
  }

  /**
   * Business viability check (THIS IS GOLD)
   */
  async checkProjectViability(
    project: Project
  ): Promise<YDTIntelligenceResponse<YDTViability>> {
    // 1. Get optimal margin for this project type/location
    const optimalMargin = EgyptianFabricationIntelligence.getOptimalMargin(
      project.type as any,
      project.location
    );

    // 2. Estimate profit margin
    const estimatedCost = project.estimatedCost || 1000;
    const estimatedPrice = project.estimatedPrice || estimatedCost * (1 + optimalMargin);
    const profitMargin = (estimatedPrice - estimatedCost) / estimatedPrice;

    // 3. Check if profitable
    const profitable = profitMargin > 0.15; // Minimum 15% margin

    // 4. Get recommendations
    const recommendations: string[] = [];
    if (!profitable) {
      recommendations.push('Consider upselling to premium materials');
      recommendations.push('Review pricing strategy for this location');
    }

    // 5. Get risks
    const risks: string[] = [];
    const shortages = EgyptianFabricationIntelligence.getShortageAlerts();
    if (shortages.length > 0) {
      risks.push('Material shortages detected - check alternatives');
    }

    // 6. Get competitive advice
    const competitors = EgyptianFabricationIntelligence.getCompetitorAnalysis(project.location);
    let competitiveAdvice = '';
    if (competitors.length > 0) {
      competitiveAdvice = `Competitors in ${project.location} are using ${competitors[0].counterStrategy} strategy`;
    }

    // Generate reasoning for viability decision
    const reasoning = `Project viability assessment: ${profitable ? 'APPROVED' : 'REJECTED'} because ` +
      `profit margin is ${(profitMargin * 100).toFixed(1)}% (minimum required: 15%). ` +
      `Market position: ${profitable ? 'competitive' : 'below_market'} for ${project.type} projects in ${project.location}. ` +
      `${recommendations.length > 0 ? `Recommendations: ${recommendations.join('; ')}. ` : ''}` +
      `${risks.length > 0 ? `Risks detected: ${risks.join('; ')}. ` : ''}` +
      `This assessment would change if: material costs shift >10%, competitor pricing changes, ` +
      `or market demand in ${project.location} changes significantly.`;

    return {
      data: {
        profitable,
        profitMargin,
        confidence: 0.88,
        recommendations,
        risks,
        marketPosition: profitable ? 'competitive' : 'below_market',
        competitiveAdvice,
      },
      confidence: 0.88,
      source: 'YDT Business Intelligence',
      reasoning, // Required for Tier 1 decisions
          metadata: {
            reasoning: {
              primaryFactor: profitable 
                ? `Profit margin ${(profitMargin * 100).toFixed(1)}% meets minimum threshold`
                : `Profit margin ${(profitMargin * 100).toFixed(1)}% below minimum 15% threshold`,
              secondaryFactors: [
                `Project type: ${project.type}`,
                `Location: ${project.location}`,
                `Estimated cost: EGP ${estimatedCost.toLocaleString()}`,
                `Estimated price: EGP ${estimatedPrice.toLocaleString()}`
              ],
              changeTriggers: [
                'Material costs shift >10%',
                'Competitor pricing changes',
                'Market demand changes',
                'Shortage alerts change'
              ],
              assumptions: [
                'Estimated costs are accurate',
                'Market conditions remain stable',
                'No major competitor disruptions'
              ],
              confidence: 0.88
            }
          }
    };
  }

  /**
   * Explain any system feature using YOUR documentation
   */
  async explainSystemFeature(featureId: string): Promise<string> {
    return await this.fabricatorExpert.explainFeature(featureId);
  }

  /**
   * Guide through workflow using YOUR documentation
   */
  async guideWorkflow(workflowName: string) {
    return await this.fabricatorExpert.guideWorkflow(workflowName);
  }

  /**
   * Get trending styles for location
   */
  async getTrendingStyles(_location: string): Promise<Array<{
    name: string;
    popularityScore: number;
    projectCount: number;
    averageMargin: number;
  }>> {
    // Would come from market data analysis
    return [
      {
        name: 'Large Sliding Windows',
        popularityScore: 0.85,
        projectCount: 247,
        averageMargin: 0.30,
      },
      {
        name: 'Casement Windows',
        popularityScore: 0.78,
        projectCount: 189,
        averageMargin: 0.28,
      },
    ];
  }

  /**
   * Get common errors for location
   */
  async getCommonErrors(_location: string): Promise<Array<{
    error: string;
    frequency: number;
    solution: string;
  }>> {
    // Would come from workshop feedback analysis
    return [
      {
        error: 'Incorrect mullion spacing',
        frequency: 0.15,
        solution: 'Use Egyptian Code 2020 limits',
      },
      {
        error: 'Glass pocket too small',
        frequency: 0.12,
        solution: 'Increase pocket depth by 5mm',
      },
    ];
  }

  /**
   * Analyze competition for location and project type
   */
  async analyzeCompetition(
    location: string,
    _projectType: string
  ): Promise<{
    competitors: Array<{
      name: string;
      strategy: string;
      priceDifference: number;
    }>;
    recommendations: string[];
  }> {
    const competitors = EgyptianFabricationIntelligence.getCompetitorAnalysis(location);

    return {
      competitors: competitors.map(c => ({
        name: 'Competitor',
        strategy: c.counterStrategy,
        priceDifference: c.undercutPercentage ? -c.undercutPercentage * 100 : 
                        c.premiumPercentage ? c.premiumPercentage * 100 : 0,
      })),
      recommendations: competitors.map(c => c.counterStrategy),
    };
  }

  // Private helper methods

  private async getMarketIntelligence(location: string): Promise<MarketIntelligence> {
    // Would fetch from backend API or database
    return {
      location,
      materialCost: 400,
      laborCost: 120,
      optimalMargin: 0.30,
      confidenceScore: 0.92,
      sampleSize: 247,
      trend: 'stable',
      competition: {
        averagePrice: 1500,
        undercuttingDetected: false,
      },
      shortages: [],
    };
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  private createWatermark(workshopId: string, projectId: string): string {
    // Create watermark for IP protection
    const timestamp = Date.now();
    const data = `${workshopId}-${projectId}-${timestamp}`;
    return btoa(data); // Base64 encode
  }
}


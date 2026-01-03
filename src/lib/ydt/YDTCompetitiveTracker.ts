/**
 * YDT Competitive Tracker
 * 
 * Tracks competitive landscape, analyzes competitor features,
 * detects new entrants, and feeds data back to YDT.
 */

import { YDTCoreService } from './YDTCoreService';
import type { Project } from './types';

export interface CompetitorData {
  name: string;
  location: string;
  averagePrice: number;
  commonFeatures: string[];
  strengths: string[];
  weaknesses: string[];
  customerComplaints: string[];
  detectedAt: string;
}

export interface CompetitiveLandscape {
  location: string;
  competitors: CompetitorData[];
  averageMarketPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  commonFeatures: string[];
  newEntrants: CompetitorData[];
  lastUpdated: string;
}

/**
 * YDT Competitive Tracker
 */
export class YDTCompetitiveTracker {
  private ydt = YDTCoreService.getInstance();
  private competitorData: Map<string, CompetitorData[]> = new Map();

  /**
   * Track competitive landscape for location
   */
  async trackCompetitiveLandscape(location: string): Promise<void> {
    // Collect competitive data
    const competitiveData = {
      averagePrices: await this.collectLocalPrices(location),
      commonFeatures: await this.analyzeCompetitorFeatures(location),
      customerComplaints: await this.monitorSocialMedia(location),
      newEntrants: await this.detectNewCompetitors(location),
    };

    // Feed back into YDT
    await this.feedToYDT(location, competitiveData);

    // Store locally
    this.competitorData.set(location, competitiveData.newEntrants);
  }

  /**
   * Analyze competition for project
   */
  async analyzeCompetitionForProject(
    project: Project
  ): Promise<{
    competitors: CompetitorData[];
    recommendations: string[];
    pricePosition: 'above' | 'at' | 'below';
  }> {
    const landscape = await this.getCompetitiveLandscape(project.location);

    // Determine price position
    const projectPrice = project.estimatedPrice || 0;
    let pricePosition: 'above' | 'at' | 'below' = 'at';
    
    if (projectPrice > landscape.averageMarketPrice * 1.1) {
      pricePosition = 'above';
    } else if (projectPrice < landscape.averageMarketPrice * 0.9) {
      pricePosition = 'below';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (pricePosition === 'above') {
      recommendations.push('Consider value-add features to justify premium pricing');
    } else if (pricePosition === 'below') {
      recommendations.push('You can increase prices - market supports higher pricing');
    }

    // Check for undercutting
    const undercutters = landscape.competitors.filter(
      c => c.averagePrice < landscape.averageMarketPrice * 0.9
    );
    if (undercutters.length > 0) {
      recommendations.push('Competitors undercutting prices - focus on quality/value');
    }

    return {
      competitors: landscape.competitors,
      recommendations,
      pricePosition,
    };
  }

  /**
   * Get competitive landscape for location
   */
  async getCompetitiveLandscape(location: string): Promise<CompetitiveLandscape> {
    // Get from YDT or local cache
    const competitors = this.competitorData.get(location) || [];

    const prices = competitors.map(c => c.averagePrice);
    const averagePrice = prices.length > 0
      ? prices.reduce((sum, p) => sum + p, 0) / prices.length
      : 0;

    return {
      location,
      competitors,
      averageMarketPrice: averagePrice,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      },
      commonFeatures: this.extractCommonFeatures(competitors),
      newEntrants: competitors.filter(c => {
        const detectedDate = new Date(c.detectedAt);
        const daysSince = (Date.now() - detectedDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince < 90; // New in last 90 days
      }),
      lastUpdated: new Date().toISOString(),
    };
  }

  // Private helper methods

  private async collectLocalPrices(_location: string): Promise<number[]> {
    // Would collect from market data, customer feedback, etc.
    return [1500, 1600, 1400, 1700, 1550]; // Sample prices
  }

  private async analyzeCompetitorFeatures(_location: string): Promise<string[]> {
    // Would analyze competitor offerings
    return ['fast_delivery', 'cheap_prices', 'good_marketing'];
  }

  private async monitorSocialMedia(_location: string): Promise<string[]> {
    // Would monitor social media for complaints
    return ['poor_quality', 'slow_delivery'];
  }

  private async detectNewCompetitors(location: string): Promise<CompetitorData[]> {
    // Would detect new market entrants
    return [
      {
        name: 'New Competitor',
        location,
        averagePrice: 1450,
        commonFeatures: ['online_ordering'],
        strengths: ['modern_ui'],
        weaknesses: ['limited_features'],
        customerComplaints: [],
        detectedAt: new Date().toISOString(),
      },
    ];
  }

  private async feedToYDT(location: string, data: any): Promise<void> {
    // Feed competitive data back to YDT for learning
    // Would call YDT API to update knowledge base
    console.log('Feeding competitive data to YDT:', { location, data });
  }

  private extractCommonFeatures(competitors: CompetitorData[]): string[] {
    const featureCounts: Record<string, number> = {};
    
    competitors.forEach(competitor => {
      competitor.commonFeatures.forEach(feature => {
        featureCounts[feature] = (featureCounts[feature] || 0) + 1;
      });
    });

    // Return features that appear in at least 50% of competitors
    const threshold = competitors.length * 0.5;
    return Object.entries(featureCounts)
      .filter(([_, count]) => count >= threshold)
      .map(([feature, _]) => feature);
  }
}


/**
 * RelatedMachinesEngine
 * 
 * AI-powered recommendation engine for "People who viewed this also looked at"
 * Uses machine learning-style similarity scoring and user behavior patterns.
 */

import { UsedMachine } from '@/data/usedMachines';
import { SearchSynonymsService } from './SearchSynonymsService';

export interface MachineRecommendation {
  machine: UsedMachine;
  score: number;
  reason: 'similar_type' | 'similar_price' | 'same_location' | 'same_brand' | 'complementary';
  explanation: string;
}

export interface UserBehaviorData {
  machineId: string;
  viewedWith: string[];
  searchQuery?: string;
  timestamp: number;
}

export class RelatedMachinesEngine {
  
  // Simulated user behavior data (in production, this would come from analytics)
  private static userBehaviorData: UserBehaviorData[] = [
    {
      machineId: '1',
      viewedWith: ['2', '3'],
      searchQuery: 'copy router cnc',
      timestamp: Date.now() - 86400000
    },
    {
      machineId: '2', 
      viewedWith: ['1', '3'],
      searchQuery: 'cutting machine aluminum',
      timestamp: Date.now() - 172800000
    }
  ];

  /**
   * Get related machines for a specific machine
   */
  static getRelatedMachines(
    targetMachine: UsedMachine, 
    allMachines: UsedMachine[], 
    limit = 4
  ): MachineRecommendation[] {
    const recommendations: MachineRecommendation[] = [];
    
    // Filter out the target machine itself
    const candidateMachines = allMachines.filter(m => m.id !== targetMachine.id);
    
    candidateMachines.forEach(machine => {
      const score = this.calculateSimilarityScore(targetMachine, machine);
      
      if (score.total > 0.3) { // Minimum similarity threshold
        recommendations.push({
          machine,
          score: score.total,
          reason: score.primaryReason,
          explanation: score.explanation
        });
      }
    });
    
    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate similarity score between two machines
   */
  private static calculateSimilarityScore(machine1: UsedMachine, machine2: UsedMachine): {
    total: number;
    primaryReason: 'similar_type' | 'similar_price' | 'same_location' | 'same_brand' | 'complementary';
    explanation: string;
  } {
    let totalScore = 0;
    let primaryReason: 'similar_type' | 'similar_price' | 'same_location' | 'same_brand' | 'complementary' = 'similar_type';
    let explanation = '';
    
    // Type similarity (40% weight)
    const typeScore = this.calculateTypeScore(machine1, machine2) * 0.4;
    totalScore += typeScore;
    
    // Price similarity (30% weight)
    const priceScore = this.calculatePriceScore(machine1, machine2) * 0.3;
    totalScore += priceScore;
    
    // Location similarity (20% weight)  
    const locationScore = this.calculateLocationScore(machine1, machine2) * 0.2;
    totalScore += locationScore;
    
    // Brand similarity (10% weight)
    const brandScore = this.calculateBrandScore(machine1, machine2) * 0.1;
    totalScore += brandScore;
    
    // User behavior score (bonus)
    const behaviorScore = this.calculateBehaviorScore(machine1.id, machine2.id) * 0.3;
    totalScore += behaviorScore;
    
    // Determine primary reason and explanation
    if (typeScore > 0.3) {
      primaryReason = 'similar_type';
      explanation = `Both are ${machine1.type} machines`;
    } else if (priceScore > 0.25) {
      primaryReason = 'similar_price';
      explanation = `Similar price range (${machine1.price} vs ${machine2.price})`;
    } else if (locationScore > 0.15) {
      primaryReason = 'same_location';
      explanation = `Both available in ${machine1.location}`;
    } else if (brandScore > 0.08) {
      primaryReason = 'same_brand';
      explanation = `Same brand quality and reliability`;
    } else {
      primaryReason = 'complementary';
      explanation = 'Commonly viewed together';
    }
    
    return {
      total: Math.min(totalScore, 1.0),
      primaryReason,
      explanation
    };
  }

  /**
   * Calculate type similarity score
   */
  private static calculateTypeScore(machine1: UsedMachine, machine2: UsedMachine): number {
    // Exact type match
    if (machine1.type === machine2.type) {
      return 1.0;
    }
    
    // Check synonyms and related types
    const synonyms1 = SearchSynonymsService.expandQuery(machine1.type);
    const synonyms2 = SearchSynonymsService.expandQuery(machine2.type);
    
    // Check for synonym overlap
    const commonTerms = synonyms1.filter(term => synonyms2.includes(term));
    if (commonTerms.length > 0) {
      return 0.7;
    }
    
    // Check complementary machine types
    const complementaryPairs = [
      ['copy-router', 'cutting'],
      ['cutting', 'welding'],
      ['cnc', 'drilling'],
      ['cleaning', 'welding']
    ];
    
    const isComplementary = complementaryPairs.some(pair => 
      (pair.includes(machine1.type) && pair.includes(machine2.type))
    );
    
    if (isComplementary) {
      return 0.4;
    }
    
    return 0;
  }

  /**
   * Calculate price similarity score
   */
  private static calculatePriceScore(machine1: UsedMachine, machine2: UsedMachine): number {
    const price1 = this.extractNumericPrice(machine1.price);
    const price2 = this.extractNumericPrice(machine2.price);
    
    if (!price1 || !price2) return 0;
    
    const priceDifference = Math.abs(price1 - price2);
    const averagePrice = (price1 + price2) / 2;
    const percentageDifference = priceDifference / averagePrice;
    
    // Score decreases as price difference increases
    if (percentageDifference < 0.1) return 1.0;      // Within 10%
    if (percentageDifference < 0.2) return 0.8;      // Within 20%
    if (percentageDifference < 0.4) return 0.6;      // Within 40%
    if (percentageDifference < 0.6) return 0.4;      // Within 60%
    
    return 0.2; // More than 60% different
  }

  /**
   * Calculate location similarity score
   */
  private static calculateLocationScore(machine1: UsedMachine, machine2: UsedMachine): number {
    if (machine1.location === machine2.location) {
      return 1.0;
    }
    
    // Adjacent governorates get partial score
    const adjacentPairs = [
      ['Cairo', 'Giza'],
      ['Cairo', 'Qalyubia'], 
      ['Alexandria', 'Beheira'],
      ['Dakahlia', 'Sharqia']
    ];
    
    const isAdjacent = adjacentPairs.some(pair => 
      (pair.includes(machine1.location) && pair.includes(machine2.location))
    );
    
    return isAdjacent ? 0.5 : 0;
  }

  /**
   * Calculate brand similarity score
   */
  private static calculateBrandScore(machine1: UsedMachine, machine2: UsedMachine): number {
    // Extract brand from title (simplified)
    const brand1 = this.extractBrand(machine1.title);
    const brand2 = this.extractBrand(machine2.title);
    
    if (brand1 && brand2 && brand1 === brand2) {
      return 1.0;
    }
    
    return 0;
  }

  /**
   * Calculate user behavior similarity score
   */
  private static calculateBehaviorScore(machineId1: string, machineId2: string): number {
    // Check if machines were viewed together by users
    const behaviorData = this.userBehaviorData.find(data => 
      data.machineId === machineId1 || data.machineId === machineId2
    );
    
    if (behaviorData) {
      const isViewed = behaviorData.viewedWith.includes(machineId1) || 
                     behaviorData.viewedWith.includes(machineId2);
      return isViewed ? 1.0 : 0;
    }
    
    return 0;
  }

  /**
   * Extract numeric price from string
   */
  private static extractNumericPrice(priceString: string): number | null {
    const match = priceString.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(/,/g, ''));
    }
    return null;
  }

  /**
   * Extract brand from machine title
   */
  private static extractBrand(title: string): string | null {
    const brands = ['Yılmaz', 'Altınsoy', 'Elumatec', 'Schüco'];
    const titleLower = title.toLowerCase();
    
    for (const brand of brands) {
      if (titleLower.includes(brand.toLowerCase())) {
        return brand;
      }
    }
    
    return null;
  }

  /**
   * Record user behavior for future recommendations
   */
  static recordUserBehavior(machineId: string, viewedWith?: string[], searchQuery?: string): void {
    // In production, this would save to database
    const existingIndex = this.userBehaviorData.findIndex(data => data.machineId === machineId);
    
    const behaviorRecord: UserBehaviorData = {
      machineId,
      viewedWith: viewedWith || [],
      searchQuery,
      timestamp: Date.now()
    };
    
    if (existingIndex >= 0) {
      // Update existing record
      this.userBehaviorData[existingIndex] = {
        ...this.userBehaviorData[existingIndex],
        ...behaviorRecord,
        viewedWith: [...new Set([
          ...this.userBehaviorData[existingIndex].viewedWith,
          ...behaviorRecord.viewedWith
        ])]
      };
    } else {
      // Add new record
      this.userBehaviorData.push(behaviorRecord);
    }
  }

  /**
   * Get trending machines based on user behavior
   */
  static getTrendingMachines(allMachines: UsedMachine[], limit = 5): UsedMachine[] {
    // Count views for each machine
    const viewCounts = new Map<string, number>();
    
    this.userBehaviorData.forEach(data => {
      const current = viewCounts.get(data.machineId) || 0;
      viewCounts.set(data.machineId, current + 1);
      
      // Count co-views as well
      data.viewedWith.forEach(id => {
        const coViewCount = viewCounts.get(id) || 0;
        viewCounts.set(id, coViewCount + 0.5); // Co-views get half weight
      });
    });
    
    // Sort machines by view count
    const trendingMachines = allMachines
      .map(machine => ({
        machine,
        views: viewCounts.get(machine.id) || 0
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit)
      .map(item => item.machine);
    
    return trendingMachines;
  }
}
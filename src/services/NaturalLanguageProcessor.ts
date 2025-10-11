/**
 * NaturalLanguageProcessor
 * 
 * Processes natural language queries for machinery search.
 * Extracts entities like price ranges, locations, conditions, and machine types.
 */

import { SearchSynonymsService } from './SearchSynonymsService';

export interface ParsedQuery {
  originalQuery: string;
  machineTypes: string[];
  priceRange: {min?: number, max?: number};
  location?: string;
  condition?: string;
  brand?: string;
  year?: {min?: number, max?: number};
  intent: 'buy' | 'sell' | 'research' | 'compare';
  urgency: 'low' | 'medium' | 'high';
  expandedTerms: string[];
}

export class NaturalLanguageProcessor {
  
  // Egyptian governorates for location extraction
  private static egyptianLocations = [
    'cairo', 'giza', 'alexandria', 'dakahlia', 'sharqia', 'qalyubia',
    'beheira', 'minya', 'gharbia', 'sohag', 'asyut', 'monufia',
    'qena', 'faiyum', 'kafr el sheikh', 'beni suef', 'port said',
    'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية'
  ];

  // Price indicators in Arabic and English
  private static priceIndicators = {
    under: ['under', 'below', 'less than', 'maximum', 'max', 'اقل من', 'تحت', 'اكتر من'],
    over: ['over', 'above', 'more than', 'minimum', 'min', 'اكتر من', 'فوق', 'اعلى من'],
    around: ['around', 'approximately', 'about', 'near', 'حوالي', 'تقريبا']
  };

  // Urgency indicators
  private static urgencyIndicators = {
    high: ['urgent', 'immediately', 'asap', 'quick', 'fast', 'now', 'عاجل', 'سريع', 'فوري'],
    medium: ['soon', 'this week', 'this month', 'قريب', 'قريبا'],
    low: ['future', 'planning', 'considering', 'مستقبل', 'تخطيط']
  };

  /**
   * Parse natural language query into structured search parameters
   */
  static parseQuery(query: string): ParsedQuery {
    const normalizedQuery = query.toLowerCase().trim();
    
    const result: ParsedQuery = {
      originalQuery: query,
      machineTypes: [],
      priceRange: {},
      intent: 'buy',
      urgency: 'medium',
      expandedTerms: SearchSynonymsService.expandQuery(query)
    };

    // Extract machine types using synonyms service
    result.machineTypes = this.extractMachineTypes(normalizedQuery);
    
    // Extract price range
    result.priceRange = this.extractPriceRange(normalizedQuery);
    
    // Extract location
    result.location = this.extractLocation(normalizedQuery);
    
    // Extract condition
    result.condition = this.extractCondition(normalizedQuery);
    
    // Extract brand
    result.brand = this.extractBrand(normalizedQuery);
    
    // Extract year range
    result.year = this.extractYearRange(normalizedQuery);
    
    // Analyze intent
    result.intent = this.extractIntent(normalizedQuery);
    
    // Analyze urgency
    result.urgency = this.extractUrgency(normalizedQuery);

    return result;
  }

  /**
   * Extract machine types from query using synonym service
   */
  private static extractMachineTypes(query: string): string[] {
    const machineTypes: string[] = [];
    
    // Common machine type patterns
    const patterns = [
      /(?:cnc|copy router|cutting machine|welding machine|drilling machine|cleaning machine)/gi,
      /(?:router|welder|drill|saw|cutter)/gi
    ];

    patterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        machineTypes.push(...matches.map(m => m.toLowerCase()));
      }
    });

    // Use synonym service to expand
    const expandedTypes = new Set(machineTypes);
    machineTypes.forEach(type => {
      const synonyms = SearchSynonymsService.expandQuery(type);
      synonyms.forEach(synonym => expandedTypes.add(synonym));
    });

    return Array.from(expandedTypes);
  }

  /**
   * Extract price range from natural language
   * Examples: "under 100000", "between 50k and 200k", "around 150000"
   */
  private static extractPriceRange(query: string): {min?: number, max?: number} {
    const priceRange: {min?: number, max?: number} = {};
    
    // Pattern for price with k/K (thousands) multiplier
    const pricePatterns = [
      /(?:under|below|less than|max|maximum)\s*(\d+(?:k|000)?)/gi,
      /(?:over|above|more than|min|minimum)\s*(\d+(?:k|000)?)/gi,
      /(?:between)\s*(\d+(?:k|000)?)\s*(?:and|to|-)\s*(\d+(?:k|000)?)/gi,
      /(?:around|about|approximately)\s*(\d+(?:k|000)?)/gi,
      /(\d+(?:k|000)?)\s*(?:egp|egypt|pound|جنيه)/gi
    ];

    // Extract "under/below" prices
    const underMatches = query.match(/(?:under|below|less than|max|maximum)\s*(\d+(?:k|000)?)/gi);
    if (underMatches) {
      const price = this.parsePrice(underMatches[0]);
      if (price) priceRange.max = price;
    }

    // Extract "over/above" prices
    const overMatches = query.match(/(?:over|above|more than|min|minimum)\s*(\d+(?:k|000)?)/gi);
    if (overMatches) {
      const price = this.parsePrice(overMatches[0]);
      if (price) priceRange.min = price;
    }

    // Extract "between X and Y" prices
    const betweenMatches = query.match(/(?:between)\s*(\d+(?:k|000)?)\s*(?:and|to|-)\s*(\d+(?:k|000)?)/gi);
    if (betweenMatches) {
      const numbers = betweenMatches[0].match(/(\d+(?:k|000)?)/gi);
      if (numbers && numbers.length >= 2) {
        priceRange.min = this.parsePrice(numbers[0]);
        priceRange.max = this.parsePrice(numbers[1]);
      }
    }

    return priceRange;
  }

  /**
   * Parse price string to number (handle k/K multipliers)
   */
  private static parsePrice(priceStr: string): number | undefined {
    const match = priceStr.match(/(\d+)(k|000)?/i);
    if (!match) return undefined;

    const basePrice = parseInt(match[1]);
    const multiplier = match[2]?.toLowerCase();
    
    if (multiplier === 'k') {
      return basePrice * 1000;
    } else if (multiplier === '000') {
      return basePrice * 1000;
    }
    
    return basePrice;
  }

  /**
   * Extract location from query
   */
  private static extractLocation(query: string): string | undefined {
    const location = this.egyptianLocations.find(loc => 
      query.includes(loc.toLowerCase())
    );
    
    return location;
  }

  /**
   * Extract condition from query
   */
  private static extractCondition(query: string): string | undefined {
    const conditionMap: {[key: string]: string} = {
      'excellent': 'Excellent',
      'good': 'Good', 
      'fair': 'Fair',
      'used': 'Good',
      'new': 'Excellent',
      'like new': 'Excellent',
      'needs repair': 'Needs Repair'
    };

    for (const [keyword, condition] of Object.entries(conditionMap)) {
      if (query.includes(keyword)) {
        return condition;
      }
    }

    return undefined;
  }

  /**
   * Extract brand from query
   */
  private static extractBrand(query: string): string | undefined {
    const brands = ['yılmaz', 'yilmaz', 'altınsoy', 'altinsoy'];
    
    return brands.find(brand => 
      query.includes(brand.toLowerCase())
    );
  }

  /**
   * Extract year range from query
   */
  private static extractYearRange(query: string): {min?: number, max?: number} | undefined {
    const yearPattern = /(?:year|from|after|before)\s*(\d{4})/gi;
    const matches = query.match(yearPattern);
    
    if (matches) {
      const years = matches.map(m => {
        const yearMatch = m.match(/(\d{4})/);
        return yearMatch ? parseInt(yearMatch[1]) : null;
      }).filter(Boolean) as number[];
      
      if (years.length > 0) {
        return {
          min: Math.min(...years),
          max: years.length > 1 ? Math.max(...years) : undefined
        };
      }
    }
    
    return undefined;
  }

  /**
   * Extract search intent
   */
  private static extractIntent(query: string): 'buy' | 'sell' | 'research' | 'compare' {
    if (query.includes('sell') || query.includes('selling')) return 'sell';
    if (query.includes('compare') || query.includes('vs') || query.includes('versus')) return 'compare';
    if (query.includes('price') || query.includes('cost') || query.includes('how much') || query.includes('review')) return 'research';
    
    return 'buy'; // Default assumption
  }

  /**
   * Extract urgency level
   */
  private static extractUrgency(query: string): 'low' | 'medium' | 'high' {
    if (this.urgencyIndicators.high.some(indicator => query.includes(indicator))) {
      return 'high';
    }
    
    if (this.urgencyIndicators.medium.some(indicator => query.includes(indicator))) {
      return 'medium';
    }
    
    if (this.urgencyIndicators.low.some(indicator => query.includes(indicator))) {
      return 'low';
    }
    
    return 'medium'; // Default
  }

  /**
   * Generate search suggestions based on incomplete queries
   */
  static generateSearchSuggestions(partialQuery: string): string[] {
    if (partialQuery.length < 2) return [];
    
    const suggestions: string[] = [];
    
    // Add synonym-based suggestions
    const synonymSuggestions = SearchSynonymsService.getSearchSuggestions(partialQuery);
    suggestions.push(...synonymSuggestions);
    
    // Add common query completions
    const commonQueries = [
      'cheap used cnc machine in cairo',
      'copy router good condition',
      'welding machine under 100k',
      'cutting machine alexandria',
      'used yılmaz router excellent condition'
    ];
    
    const matchingQueries = commonQueries.filter(query => 
      query.toLowerCase().includes(partialQuery.toLowerCase())
    );
    
    suggestions.push(...matchingQueries);
    
    return [...new Set(suggestions)].slice(0, 8); // Deduplicate and limit
  }
}
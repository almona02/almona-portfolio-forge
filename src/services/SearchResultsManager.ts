/**
 * SearchResultsManager
 * 
 * Manages intelligent search results with AI-powered matching,
 * synonym expansion, and relevance scoring.
 */

import { UsedMachine } from '@/data/usedMachines';
import { SearchSynonymsService } from './SearchSynonymsService';
import { NaturalLanguageProcessor, ParsedQuery } from './NaturalLanguageProcessor';
import { SearchAnalyticsTracker } from './SearchAnalyticsTracker';
import { isPriceInRange } from '@/utils/priceUtils';

export interface SearchResult {
  machine: UsedMachine;
  relevanceScore: number;
  matchedTerms: string[];
  matchReasons: string[];
}

export interface SearchFilters {
  query: string;
  priceRange: [number, number];
  location: string;
  machineType: string;
  condition?: string;
  year?: {min: number, max: number};
}

export class SearchResultsManager {
  
  /**
   * Perform intelligent search with AI-powered matching
   */
  static searchMachines(
    machines: UsedMachine[],
    filters: SearchFilters
  ): {results: SearchResult[], analytics: ParsedQuery | null, eventId: string | null} {
    
    let parsedQuery: ParsedQuery | null = null;
    let eventId: string | null = null;
    
    // Parse query with NLP if provided
    if (filters.query.trim()) {
      parsedQuery = NaturalLanguageProcessor.parseQuery(filters.query);
      
      // Extract additional filters from natural language
      if (parsedQuery.priceRange.min && !filters.priceRange[0]) {
        filters.priceRange[0] = parsedQuery.priceRange.min;
      }
      if (parsedQuery.priceRange.max && !filters.priceRange[1]) {
        filters.priceRange[1] = parsedQuery.priceRange.max;
      }
      if (parsedQuery.location && filters.location === 'all') {
        filters.location = parsedQuery.location;
      }
      if (parsedQuery.condition && !filters.condition) {
        filters.condition = parsedQuery.condition;
      }
    }
    
    // Apply filters and calculate relevance scores
    const results = machines
      .map(machine => this.calculateRelevance(machine, filters, parsedQuery))
      .filter(result => result.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Track search analytics
    if (filters.query.trim()) {
      eventId = SearchAnalyticsTracker.trackSearch(
        filters.query,
        results.length,
        parsedQuery || undefined
      );
    }
    
    return {
      results,
      analytics: parsedQuery,
      eventId
    };
  }

  /**
   * Calculate relevance score for a machine against search filters
   */
  private static calculateRelevance(
    machine: UsedMachine,
    filters: SearchFilters,
    parsedQuery: ParsedQuery | null
  ): SearchResult {
    let relevanceScore = 0;
    const matchedTerms: string[] = [];
    const matchReasons: string[] = [];

    // Base score for all machines (ensures non-zero results when no query)
    if (!filters.query.trim()) {
      relevanceScore = 0.5;
    }

    // Text matching with synonym expansion
    if (filters.query.trim()) {
      const textScore = this.calculateTextMatchScore(machine, filters.query, matchedTerms);
      relevanceScore += textScore * 0.4; // 40% weight for text matching
      
      if (textScore > 0) {
        matchReasons.push('Text match');
      }
    }

    // Price range matching
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < Infinity) {
      if (isPriceInRange(machine.price, filters.priceRange)) {
        relevanceScore += 0.2; // 20% weight for price match
        matchReasons.push('Price range');
      } else {
        // If price is specifically filtered and doesn't match, reduce score significantly
        relevanceScore = relevanceScore * 0.1;
      }
    }

    // Location matching
    if (filters.location !== 'all') {
      if (machine.location.toLowerCase() === filters.location.toLowerCase()) {
        relevanceScore += 0.15; // 15% weight for exact location match
        matchReasons.push('Location match');
      } else {
        // Check for adjacent locations
        if (this.isAdjacentLocation(machine.location, filters.location)) {
          relevanceScore += 0.05; // 5% for adjacent location
          matchReasons.push('Nearby location');
        }
      }
    }

    // Machine type matching
    if (filters.machineType !== 'all') {
      const typeScore = this.calculateTypeMatchScore(machine, filters.machineType);
      relevanceScore += typeScore * 0.15; // 15% weight for type match
      
      if (typeScore > 0) {
        matchReasons.push('Machine type');
      }
    }

    // Condition matching
    if (filters.condition) {
      if (machine.condition.toLowerCase().includes(filters.condition.toLowerCase())) {
        relevanceScore += 0.1; // 10% weight for condition match
        matchReasons.push('Condition match');
      }
    }

    // Year range matching
    if (filters.year) {
      const yearInRange = (!filters.year.min || machine.year >= filters.year.min) &&
                         (!filters.year.max || machine.year <= filters.year.max);
      if (yearInRange) {
        relevanceScore += 0.05; // 5% weight for year match
        matchReasons.push('Year range');
      }
    }

    // Boost for verified sellers
    if (machine.seller.verified) {
      relevanceScore += 0.05;
      matchReasons.push('Verified seller');
    }

    // Boost for popular machine types
    const popularTypes = ['cnc', 'copy-router', 'cutting', 'welding'];
    if (popularTypes.includes(machine.type)) {
      relevanceScore += 0.02;
    }

    // Natural Language Processing boosts
    if (parsedQuery) {
      // Intent matching
      if (parsedQuery.intent === 'commercial' && machine.seller.verified) {
        relevanceScore += 0.1;
        matchReasons.push('Commercial intent match');
      }
      
      // Urgency matching (boost newer or better condition machines for urgent queries)
      if (parsedQuery.urgency === 'high') {
        if (machine.condition === 'Excellent' || machine.year >= new Date().getFullYear() - 3) {
          relevanceScore += 0.05;
          matchReasons.push('High urgency match');
        }
      }

      // Brand matching
      if (parsedQuery.brand) {
        if (machine.title.toLowerCase().includes(parsedQuery.brand.toLowerCase())) {
          relevanceScore += 0.1;
          matchReasons.push('Brand match');
        }
      }
    }

    return {
      machine,
      relevanceScore: Math.min(relevanceScore, 1.0), // Cap at 1.0
      matchedTerms,
      matchReasons
    };
  }

  /**
   * Calculate text matching score with synonym expansion
   */
  private static calculateTextMatchScore(
    machine: UsedMachine,
    query: string,
    matchedTerms: string[]
  ): number {
    const searchableText = [
      machine.title,
      machine.description,
      machine.type,
      machine.location,
      machine.seller.name
    ].join(' ').toLowerCase();

    // Expand query with synonyms
    const expandedTerms = SearchSynonymsService.expandQuery(query);
    
    let score = 0;
    const maxScore = expandedTerms.length;

    expandedTerms.forEach(term => {
      if (searchableText.includes(term.toLowerCase())) {
        score++;
        matchedTerms.push(term);
        
        // Boost for exact matches in title
        if (machine.title.toLowerCase().includes(term.toLowerCase())) {
          score += 0.5; // Extra boost for title matches
        }
      }
    });

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Calculate machine type matching score
   */
  private static calculateTypeMatchScore(machine: UsedMachine, filterType: string): number {
    // Exact match
    if (machine.type === filterType) {
      return 1.0;
    }

    // Synonym match
    const synonyms = SearchSynonymsService.expandQuery(filterType);
    const machineTypeSynonyms = SearchSynonymsService.expandQuery(machine.type);
    
    // Check for overlap in synonyms
    const hasOverlap = synonyms.some(syn => 
      machineTypeSynonyms.includes(syn) || 
      machine.title.toLowerCase().includes(syn.toLowerCase())
    );

    return hasOverlap ? 0.7 : 0;
  }

  /**
   * Check if two locations are adjacent
   */
  private static isAdjacentLocation(location1: string, location2: string): boolean {
    const adjacentPairs = [
      ['Cairo', 'Giza'],
      ['Cairo', 'Qalyubia'], 
      ['Alexandria', 'Beheira'],
      ['Dakahlia', 'Sharqia']
    ];

    return adjacentPairs.some(pair => 
      (pair.includes(location1) && pair.includes(location2)) &&
      location1 !== location2
    );
  }

  /**
   * Get search suggestions based on current filters and results
   */
  static getSearchSuggestions(
    currentFilters: SearchFilters,
    allMachines: UsedMachine[]
  ): string[] {
    const suggestions: string[] = [];

    // If no results, suggest broader searches
    const currentResults = this.searchMachines(allMachines, currentFilters);
    
    if (currentResults.results.length === 0) {
      // Suggest removing location filter
      if (currentFilters.location !== 'all') {
        suggestions.push(`${currentFilters.query} in any location`);
      }
      
      // Suggest broader price range
      suggestions.push(`${currentFilters.query} any price`);
      
      // Suggest related machine types
      const relatedTypes = SearchSynonymsService.expandQuery(currentFilters.machineType);
      relatedTypes.slice(0, 2).forEach(type => {
        suggestions.push(`${type} ${currentFilters.location !== 'all' ? currentFilters.location : ''}`);
      });
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Track result interaction for analytics
   */
  static trackResultClick(eventId: string | null, machineId: string): void {
    if (eventId) {
      SearchAnalyticsTracker.trackResultClick(eventId, machineId);
    }
  }
}
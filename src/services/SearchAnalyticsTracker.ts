/**
 * SearchAnalyticsTracker
 * 
 * Tracks search behavior and provides insights for search improvement.
 * Monitors query performance, user engagement, and conversion metrics.
 */

import { ParsedQuery } from './NaturalLanguageProcessor';

export interface SearchEvent {
  id: string;
  query: string;
  parsedQuery?: ParsedQuery;
  timestamp: number;
  userId?: string;
  sessionId: string;
  resultsCount: number;
  clickedResults: string[];
  filterActions: FilterAction[];
  searchDuration: number;
  abandoned: boolean;
}

export interface FilterAction {
  type: 'price' | 'location' | 'machine_type' | 'condition';
  value: string | [number, number];
  timestamp: number;
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueQueries: number;
  averageResultsPerSearch: number;
  clickThroughRate: number;
  abandonmentRate: number;
  topQueries: Array<{query: string, count: number}>;
  topFailedQueries: Array<{query: string, count: number}>;
  searchTrends: Array<{date: string, searches: number}>;
  conversionFunnel: {
    searches: number;
    results: number;
    clicks: number;
    inquiries: number;
  };
}

export class SearchAnalyticsTracker {
  private static events: SearchEvent[] = [];
  private static sessionId: string = this.generateSessionId();

  /**
   * Track a search event
   */
  static trackSearch(
    query: string,
    resultsCount: number,
    parsedQuery?: ParsedQuery,
    userId?: string
  ): string {
    const eventId = this.generateEventId();
    
    const event: SearchEvent = {
      id: eventId,
      query: query.trim(),
      parsedQuery,
      timestamp: Date.now(),
      userId,
      sessionId: this.sessionId,
      resultsCount,
      clickedResults: [],
      filterActions: [],
      searchDuration: 0,
      abandoned: false
    };

    this.events.push(event);
    
    // Cleanup old events (keep last 1000)
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    return eventId;
  }

  /**
   * Track when user clicks on a search result
   */
  static trackResultClick(searchEventId: string, machineId: string): void {
    const event = this.events.find(e => e.id === searchEventId);
    if (event) {
      event.clickedResults.push(machineId);
      event.searchDuration = Date.now() - event.timestamp;
    }
  }

  /**
   * Track filter usage
   */
  static trackFilterAction(
    searchEventId: string,
    filterType: 'price' | 'location' | 'machine_type' | 'condition',
    value: string | [number, number]
  ): void {
    const event = this.events.find(e => e.id === searchEventId);
    if (event) {
      event.filterActions.push({
        type: filterType,
        value,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Mark search as abandoned (no clicks within time limit)
   */
  static markSearchAbandoned(searchEventId: string): void {
    const event = this.events.find(e => e.id === searchEventId);
    if (event) {
      event.abandoned = true;
      event.searchDuration = Date.now() - event.timestamp;
    }
  }

  /**
   * Get comprehensive search analytics
   */
  static getAnalytics(timeRangeHours = 24): SearchAnalytics {
    const cutoffTime = Date.now() - (timeRangeHours * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp > cutoffTime);

    // Calculate basic metrics
    const totalSearches = recentEvents.length;
    const uniqueQueries = new Set(recentEvents.map(e => e.query.toLowerCase())).size;
    const averageResultsPerSearch = totalSearches > 0 
      ? recentEvents.reduce((sum, e) => sum + e.resultsCount, 0) / totalSearches
      : 0;

    // Calculate click-through rate
    const searchesWithClicks = recentEvents.filter(e => e.clickedResults.length > 0).length;
    const clickThroughRate = totalSearches > 0 ? searchesWithClicks / totalSearches : 0;

    // Calculate abandonment rate
    const abandonedSearches = recentEvents.filter(e => e.abandoned || 
      (e.clickedResults.length === 0 && e.resultsCount > 0)).length;
    const abandonmentRate = totalSearches > 0 ? abandonedSearches / totalSearches : 0;

    // Get top queries
    const queryMap = new Map<string, number>();
    recentEvents.forEach(e => {
      const query = e.query.toLowerCase();
      queryMap.set(query, (queryMap.get(query) || 0) + 1);
    });
    
    const topQueries = Array.from(queryMap.entries())
      .map(([query, count]) => ({query, count}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get top failed queries (no results or no clicks)
    const failedQueries = recentEvents
      .filter(e => e.resultsCount === 0 || (e.resultsCount > 0 && e.clickedResults.length === 0))
      .reduce((map, e) => {
        const query = e.query.toLowerCase();
        map.set(query, (map.get(query) || 0) + 1);
        return map;
      }, new Map<string, number>());

    const topFailedQueries = Array.from(failedQueries.entries())
      .map(([query, count]) => ({query, count}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate search trends (hourly breakdown)
    const searchTrends = this.generateSearchTrends(recentEvents, timeRangeHours);

    // Calculate conversion funnel
    const totalClicks = recentEvents.reduce((sum, e) => sum + e.clickedResults.length, 0);
    const conversionFunnel = {
      searches: totalSearches,
      results: recentEvents.filter(e => e.resultsCount > 0).length,
      clicks: totalClicks,
      inquiries: Math.floor(totalClicks * 0.15) // Estimated 15% inquiry rate
    };

    return {
      totalSearches,
      uniqueQueries,
      averageResultsPerSearch,
      clickThroughRate,
      abandonmentRate,
      topQueries,
      topFailedQueries,
      searchTrends,
      conversionFunnel
    };
  }

  /**
   * Get search suggestions based on popular queries
   */
  static getPopularSearchSuggestions(limit = 8): string[] {
    const queryMap = new Map<string, number>();
    
    // Count query frequency
    this.events.forEach(e => {
      if (e.clickedResults.length > 0) { // Only successful searches
        const query = e.query.toLowerCase().trim();
        queryMap.set(query, (queryMap.get(query) || 0) + 1);
      }
    });

    return Array.from(queryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query]) => query);
  }

  /**
   * Get filter usage statistics
   */
  static getFilterUsageStats(): Array<{filterType: string, usage: number}> {
    const filterCounts = new Map<string, number>();
    
    this.events.forEach(e => {
      e.filterActions.forEach(action => {
        filterCounts.set(action.type, (filterCounts.get(action.type) || 0) + 1);
      });
    });

    return Array.from(filterCounts.entries())
      .map(([filterType, usage]) => ({filterType, usage}))
      .sort((a, b) => b.usage - a.usage);
  }

  /**
   * Get search performance insights
   */
  static getSearchInsights(): Array<{insight: string, impact: 'high' | 'medium' | 'low', suggestion: string}> {
    const analytics = this.getAnalytics();
    const insights: Array<{insight: string, impact: 'high' | 'medium' | 'low', suggestion: string}> = [];

    // High abandonment rate
    if (analytics.abandonmentRate > 0.3) {
      insights.push({
        insight: `High search abandonment rate: ${Math.round(analytics.abandonmentRate * 100)}%`,
        impact: 'high',
        suggestion: 'Improve search result relevance and add "no results" suggestions'
      });
    }

    // Low click-through rate
    if (analytics.clickThroughRate < 0.4) {
      insights.push({
        insight: `Low click-through rate: ${Math.round(analytics.clickThroughRate * 100)}%`,
        impact: 'medium', 
        suggestion: 'Enhance machine card previews and add more appealing thumbnails'
      });
    }

    // Many failed queries
    if (analytics.topFailedQueries.length > 5) {
      insights.push({
        insight: `${analytics.topFailedQueries.length} frequently failing queries detected`,
        impact: 'high',
        suggestion: 'Add synonym mapping for failed queries or expand machine database'
      });
    }

    // Low average results
    if (analytics.averageResultsPerSearch < 3) {
      insights.push({
        insight: `Low average results per search: ${analytics.averageResultsPerSearch.toFixed(1)}`,
        impact: 'medium',
        suggestion: 'Broaden search matching or add related machine suggestions'
      });
    }

    return insights;
  }

  /**
   * Generate search trends data
   */
  private static generateSearchTrends(events: SearchEvent[], hoursRange: number): Array<{date: string, searches: number}> {
    const hourlyBuckets = new Map<string, number>();
    const now = new Date();
    
    // Initialize buckets for each hour in range
    for (let i = hoursRange; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = date.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      hourlyBuckets.set(key, 0);
    }
    
    // Count searches per hour
    events.forEach(e => {
      const date = new Date(e.timestamp);
      const key = date.toISOString().substring(0, 13);
      hourlyBuckets.set(key, (hourlyBuckets.get(key) || 0) + 1);
    });
    
    return Array.from(hourlyBuckets.entries())
      .map(([date, searches]) => ({date, searches}))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Generate unique event ID
   */
  private static generateEventId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export analytics data for external analysis
   */
  static exportAnalyticsData(): {
    summary: SearchAnalytics;
    detailedEvents: SearchEvent[];
    insights: Array<{insight: string, impact: string, suggestion: string}>;
  } {
    return {
      summary: this.getAnalytics(),
      detailedEvents: this.events.slice(-100), // Last 100 events
      insights: this.getSearchInsights()
    };
  }
}
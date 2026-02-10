/**
 * Future Knowledge Graph - Stores and queries future intelligence
 * 
 * When a user asks "What's new in the market?", YDT pulls from here.
 * This is the vector store for industry intelligence gathered by the Industry Watchdog.
 */

import type { FutureIntelligence, IndustryArticle, MarketAlert, TrendData, TrendQuery } from './types';

export class FutureKnowledgeGraph {
  private apiBaseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(apiBaseUrl: string = '/api/v2') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Get latest trends for a topic
   */
  async getLatestTrends(query: TrendQuery = {}): Promise<TrendData[]> {
    try {
      const cacheKey = `trends_${JSON.stringify(query)}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const params = new URLSearchParams();
      if (query.topic) params.append('topic', query.topic);
      if (query.timeframe) params.append('timeframe', query.timeframe);
      if (query.relevanceThreshold) params.append('relevance_threshold', query.relevanceThreshold.toString());
      if (query.categories) params.append('categories', query.categories.join(','));
      if (query.limit) params.append('limit', query.limit.toString());

      const response = await fetch(`${this.apiBaseUrl}/ydt/future-intelligence/trends?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch trends: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCached(cacheKey, data.trends || []);
      return data.trends || [];
    } catch (error) {
      console.error('Error fetching latest trends:', error);
      return [];
    }
  }

  /**
   * Get active market alerts
   */
  async getActiveAlerts(severity?: string): Promise<MarketAlert[]> {
    try {
      const cacheKey = `alerts_${severity || 'all'}`;
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const params = severity ? `?severity=${severity}` : '';
      const response = await fetch(`${this.apiBaseUrl}/ydt/future-intelligence/alerts${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCached(cacheKey, data.alerts || []);
      return data.alerts || [];
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }

  /**
   * Get morning brief
   */
  async getMorningBrief(): Promise<FutureIntelligence> {
    try {
      const cacheKey = 'morning_brief';
      const cached = this.getCached(cacheKey);
      if (cached) return cached;

      const response = await fetch(`${this.apiBaseUrl}/ydt/future-intelligence/morning-brief`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch morning brief: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching morning brief:', error);
      return {
        articles: [],
        alerts: [],
        trends: [],
        priceUpdates: [],
        summary: "Unable to load brief",
        totalArticles: 0,
        criticalAlerts: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Search articles by keyword
   */
  async searchArticles(keyword: string, limit: number = 10): Promise<IndustryArticle[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/ydt/future-intelligence/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to search articles: ${response.statusText}`);
      }

      const data = await response.json();
      return data.articles || [];
    } catch (error) {
      console.error('Error searching articles:', error);
      return [];
    }
  }

  /**
   * Get trend for specific topic (e.g., "aluminum prices", "UPVC technology")
   */
  async getTopicTrend(topic: string, days: number = 30): Promise<TrendData | null> {
    try {
      const trends = await this.getLatestTrends({
        topic,
        timeframe: days <= 7 ? 'last_7_days' : days <= 30 ? 'last_30_days' : 'last_90_days',
        limit: 20,
      });

      if (trends.length === 0) {
        return null;
      }

      // Aggregate trend data
      const topicTrend = trends.find(t => t.topic.toLowerCase().includes(topic.toLowerCase()));
      
      if (topicTrend) {
        return topicTrend;
      }

      // Create aggregated trend from articles
      const allArticles = trends.flatMap(t => t.articles);
      const topicArticles = allArticles.filter(a => 
        a.title.toLowerCase().includes(topic.toLowerCase()) ||
        a.keywords.some(kw => kw.toLowerCase().includes(topic.toLowerCase()))
      );

      if (topicArticles.length === 0) {
        return null;
      }

      return {
        topic,
        articles: topicArticles,
        summary: this.generateTrendSummary(topicArticles),
        trendDirection: this.determineTrendDirection(topicArticles),
        confidence: this.calculateConfidence(topicArticles),
      };
    } catch (error) {
      console.error(`Error getting trend for topic "${topic}":`, error);
      return null;
    }
  }

  /**
   * Generate trend summary from articles
   */
  private generateTrendSummary(articles: IndustryArticle[]): string {
    if (articles.length === 0) return 'No data available';
    
    const highRelevance = articles.filter(a => a.relevance === 'high');
    if (highRelevance.length > 0) {
      return highRelevance[0].maalemSummary;
    }
    
    return articles[0].maalemSummary;
  }

  /**
   * Determine trend direction from articles
   */
  private determineTrendDirection(articles: IndustryArticle[]): 'up' | 'down' | 'stable' | 'emerging' {
    const content = articles.map(a => a.content.toLowerCase()).join(' ');
    
    if (content.includes('increase') || content.includes('rise') || content.includes('up')) {
      return 'up';
    }
    if (content.includes('decrease') || content.includes('drop') || content.includes('down')) {
      return 'down';
    }
    if (content.includes('new') || content.includes('emerging') || content.includes('launch')) {
      return 'emerging';
    }
    
    return 'stable';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(articles: IndustryArticle[]): number {
    if (articles.length === 0) return 0;
    
    const relevanceScores = {
      high: 1.0,
      medium: 0.6,
      low: 0.3,
    };
    
    const avgRelevance = articles.reduce((sum, a) => sum + (relevanceScores[a.relevance] || 0), 0) / articles.length;
    const recencyBonus = Math.min(articles.length / 10, 0.3); // Bonus for more articles
    
    return Math.min(avgRelevance + recencyBonus, 1.0);
  }

  /**
   * Cache management
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  private setCached<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const futureKnowledgeGraph = new FutureKnowledgeGraph();


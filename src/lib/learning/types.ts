/**
 * Type definitions for Future Intelligence system
 */

export interface IndustryArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  content: string;
  relevance: 'high' | 'medium' | 'low';
  maalemSummary: string;
  actionableAdvice: string;
  keywords: string[];
  categories: string[];
}

export interface MarketAlert {
  id: string;
  alertType: 'price_change' | 'new_technology' | 'trend_shift';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  messageArabic: string;
  messageEnglish: string;
  actionable: string;
  createdAt: string;
  expiresAt?: string;
}

export interface TrendData {
  topic: string;
  articles: IndustryArticle[];
  summary: string;
  trendDirection: 'up' | 'down' | 'stable' | 'emerging';
  confidence: number;
}

export interface TrendQuery {
  topic?: string;
  timeframe?: 'last_7_days' | 'last_30_days' | 'last_90_days';
  relevanceThreshold?: number;
  categories?: string[];
  limit?: number;
}

export interface FutureIntelligence {
  articles: IndustryArticle[];
  alerts: MarketAlert[];
  trends: TrendData[];
  priceUpdates: {
    title: string;
    publishedAt: string;
    maalemSummary: string;
  }[];
  summary: string;
  totalArticles: number;
  criticalAlerts: number;
  lastUpdated: string;
}


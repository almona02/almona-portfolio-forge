// Analytics API endpoints for QuickView tracking
// This would typically connect to your backend analytics service

export interface AnalyticsEvent {
  event: string;
  productId: string;
  productName: string;
  category: string;
  timestamp: number;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsDashboardData {
  quickViewOpens: number;
  hoverPreviews: number;
  conversions: {
    quoteRequests: number;
    comparisons: number;
    threeDViews: number;
    brochureDownloads: number;
  };
  deviceBreakdown: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  averageSessionTime: number;
  topProducts: Array<{
    name: string;
    views: number;
    conversions: number;
  }>;
}

// Mock analytics service for development
class AnalyticsService {
  private events: AnalyticsEvent[] = [];

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    // In production, this would send to your analytics backend
    this.events.push(event);
    
    // Also send to Google Analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', event.event, {
        event_category: 'ProductQuickView',
        event_label: event.productName,
        custom_parameters: event.metadata
      });
    }

    // Log for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event);
    }
  }

  async getDashboardData(timeRange: '24h' | '7d' | '30d' = '7d'): Promise<AnalyticsDashboardData> {
    // In production, this would fetch from your analytics database
    // For now, return mock data based on stored events
    
    const now = Date.now();
    const rangeMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }[timeRange];

    const recentEvents = this.events.filter(event => 
      now - event.timestamp < rangeMs
    );

    // Calculate metrics from events
    const quickViewOpens = recentEvents.filter(e => e.event === 'quickview_open').length;
    const hoverPreviews = recentEvents.filter(e => e.event === 'hover_preview').length;
    
    const conversions = {
      quoteRequests: recentEvents.filter(e => e.event === 'quickview_conversion' && e.metadata?.action === 'quote_request').length,
      comparisons: recentEvents.filter(e => e.event === 'quickview_conversion' && e.metadata?.action === 'compare_add').length,
      threeDViews: recentEvents.filter(e => e.event === 'quickview_conversion' && e.metadata?.action === '3d_view').length,
      brochureDownloads: recentEvents.filter(e => e.event === 'quickview_conversion' && e.metadata?.action === 'brochure_download').length,
    };

    // Device breakdown
    const deviceBreakdown = this.calculateDeviceBreakdown(recentEvents);
    
    // Average session time
    const sessionTimes = this.calculateSessionTimes(recentEvents);
    const averageSessionTime = sessionTimes.length > 0 
      ? sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length / 60000 // Convert to minutes
      : 0;

    // Top products
    const topProducts = this.calculateTopProducts(recentEvents);

    return {
      quickViewOpens,
      hoverPreviews,
      conversions,
      deviceBreakdown,
      averageSessionTime: Math.round(averageSessionTime * 10) / 10,
      topProducts
    };
  }

  private calculateDeviceBreakdown(events: AnalyticsEvent[]) {
    const deviceCounts = { mobile: 0, tablet: 0, desktop: 0 };
    
    events.forEach(event => {
      const width = event.viewport.width;
      if (width < 768) deviceCounts.mobile++;
      else if (width < 1024) deviceCounts.tablet++;
      else deviceCounts.desktop++;
    });

    const total = deviceCounts.mobile + deviceCounts.tablet + deviceCounts.desktop;
    if (total === 0) return { mobile: 0, tablet: 0, desktop: 0 };

    return {
      mobile: Math.round((deviceCounts.mobile / total) * 100),
      tablet: Math.round((deviceCounts.tablet / total) * 100),
      desktop: Math.round((deviceCounts.desktop / total) * 100)
    };
  }

  private calculateSessionTimes(events: AnalyticsEvent[]) {
    const sessions = new Map<string, { start: number; end: number }>();
    
    events.forEach(event => {
      if (event.event === 'quickview_open') {
        sessions.set(event.sessionId, { start: event.timestamp, end: event.timestamp });
      } else if (event.event === 'quickview_close') {
        const session = sessions.get(event.sessionId);
        if (session) {
          session.end = event.timestamp;
        }
      }
    });

    return Array.from(sessions.values())
      .filter(session => session.end > session.start)
      .map(session => session.end - session.start);
  }

  private calculateTopProducts(events: AnalyticsEvent[]) {
    const productStats = new Map<string, { name: string; views: number; conversions: number }>();
    
    events.forEach(event => {
      if (event.event === 'quickview_open') {
        const existing = productStats.get(event.productId) || { name: event.productName, views: 0, conversions: 0 };
        existing.views++;
        productStats.set(event.productId, existing);
      } else if (event.event === 'quickview_conversion') {
        const existing = productStats.get(event.productId) || { name: event.productName, views: 0, conversions: 0 };
        existing.conversions++;
        productStats.set(event.productId, existing);
      }
    });

    return Array.from(productStats.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }

  // Development helper methods
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// API functions for use in components
export const trackAnalyticsEvent = (event: AnalyticsEvent) => {
  return analyticsService.trackEvent(event);
};

export const getAnalyticsDashboard = (timeRange: '24h' | '7d' | '30d' = '7d') => {
  return analyticsService.getDashboardData(timeRange);
};

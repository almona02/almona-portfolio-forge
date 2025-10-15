// Analytics tracking for Enhanced ProductQuickView system
// Focused on industrial B2B machinery sales metrics

interface QuickViewEvent {
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

interface HoverPreviewEvent extends QuickViewEvent {
  hoverDuration: number;
  position: 'right' | 'left' | 'top' | 'bottom';
  triggered: boolean;
}

interface QuickViewConversionEvent extends QuickViewEvent {
  action: 'quote_request' | 'compare_add' | '3d_view' | 'brochure_download' | 'share';
  conversionTime: number; // Time from quick view open to action
  source: 'hover_preview' | 'quick_view_panel' | 'product_card';
}

class QuickViewAnalytics {
  private sessionId: string;
  private userId?: string;
  private isEnabled: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = process.env.NODE_ENV === 'production' || 
                     localStorage.getItem('analytics_enabled') === 'true';
    
    // Get user ID if available
    this.userId = this.getUserId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserId(): string | undefined {
    // Try to get user ID from your auth context
    try {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id;
      }
    } catch (error) {
      console.warn('Could not parse user data for analytics');
    }
    return undefined;
  }

  private getViewport() {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private async sendEvent(event: QuickViewEvent): Promise<void> {
    if (!this.isEnabled) {
      console.log('Analytics event (disabled):', event);
      return;
    }

    try {
      // Send to your analytics service (Google Analytics, Mixpanel, etc.)
      if (typeof gtag !== 'undefined') {
        gtag('event', event.event, {
          event_category: 'ProductQuickView',
          event_label: event.productName,
          custom_parameters: {
            product_id: event.productId,
            category: event.category,
            session_id: event.sessionId,
            user_id: event.userId,
            device_type: this.getDeviceType(),
            ...event.metadata
          }
        });
      }

      // Also send to your backend for detailed analysis
      await this.sendToBackend(event);
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  private async sendToBackend(event: QuickViewEvent): Promise<void> {
    try {
      // Use the analytics service
      const { trackAnalyticsEvent } = await import('@/lib/api/analytics');
      await trackAnalyticsEvent(event);
    } catch (error) {
      console.error('Backend analytics error:', error);
    }
  }

  // Core tracking methods
  trackQuickViewOpen(product: any, source: 'hover_preview' | 'product_card' = 'product_card'): void {
    const event: QuickViewEvent = {
      event: 'quickview_open',
      productId: product.id,
      productName: product.name,
      category: product.category,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: this.getViewport(),
      sessionId: this.sessionId,
      userId: this.userId,
      metadata: {
        source,
        has3DModel: product.has3DModel,
        featured: product.featured,
        price: product.pricing?.basePrice
      }
    };

    this.sendEvent(event);
  }

  trackQuickViewClose(product: any, duration: number, actions: string[]): void {
    const event: QuickViewEvent = {
      event: 'quickview_close',
      productId: product.id,
      productName: product.name,
      category: product.category,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: this.getViewport(),
      sessionId: this.sessionId,
      userId: this.userId,
      metadata: {
        duration,
        actions_taken: actions,
        device_type: this.getDeviceType()
      }
    };

    this.sendEvent(event);
  }

  trackHoverPreview(product: any, duration: number, position: string, triggered: boolean): void {
    const event: HoverPreviewEvent = {
      event: 'hover_preview',
      productId: product.id,
      productName: product.name,
      category: product.category,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: this.getViewport(),
      sessionId: this.sessionId,
      userId: this.userId,
      hoverDuration: duration,
      position: position as any,
      triggered,
      metadata: {
        device_type: this.getDeviceType(),
        is_mobile: this.getDeviceType() === 'mobile'
      }
    };

    this.sendEvent(event);
  }

  trackQuickViewConversion(
    product: any, 
    action: 'quote_request' | 'compare_add' | '3d_view' | 'brochure_download' | 'share',
    conversionTime: number,
    source: 'hover_preview' | 'quick_view_panel' | 'product_card'
  ): void {
    const event: QuickViewConversionEvent = {
      event: 'quickview_conversion',
      productId: product.id,
      productName: product.name,
      category: product.category,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: this.getViewport(),
      sessionId: this.sessionId,
      userId: this.userId,
      action,
      conversionTime,
      source,
      metadata: {
        device_type: this.getDeviceType(),
        price_range: this.getPriceRange(product.pricing?.basePrice)
      }
    };

    this.sendEvent(event);
  }

  trackTabSwitch(product: any, fromTab: string, toTab: string): void {
    const event: QuickViewEvent = {
      event: 'quickview_tab_switch',
      productId: product.id,
      productName: product.name,
      category: product.category,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: this.getViewport(),
      sessionId: this.sessionId,
      userId: this.userId,
      metadata: {
        from_tab: fromTab,
        to_tab: toTab,
        device_type: this.getDeviceType()
      }
    };

    this.sendEvent(event);
  }

  trackMobileInteraction(product: any, interaction: 'swipe' | 'tap' | 'long_press'): void {
    const event: QuickViewEvent = {
      event: 'mobile_interaction',
      productId: product.id,
      productName: product.name,
      category: product.category,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: this.getViewport(),
      sessionId: this.sessionId,
      userId: this.userId,
      metadata: {
        interaction_type: interaction,
        device_type: this.getDeviceType(),
        touch_support: 'ontouchstart' in window
      }
    };

    this.sendEvent(event);
  }

  private getPriceRange(price?: number): string {
    if (!price) return 'price_on_request';
    if (price < 10000) return 'under_10k';
    if (price < 50000) return '10k_50k';
    if (price < 100000) return '50k_100k';
    return 'over_100k';
  }

  // Utility methods for dashboard
  getSessionId(): string {
    return this.sessionId;
  }

  enableAnalytics(): void {
    this.isEnabled = true;
    localStorage.setItem('analytics_enabled', 'true');
  }

  disableAnalytics(): void {
    this.isEnabled = false;
    localStorage.setItem('analytics_enabled', 'false');
  }
}

// Export singleton instance
export const quickViewAnalytics = new QuickViewAnalytics();

// Export types for use in components
export type { QuickViewEvent, HoverPreviewEvent, QuickViewConversionEvent };

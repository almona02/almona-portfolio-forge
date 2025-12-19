/**
 * FeedbackCollector - User Feedback Collection System
 * 
 * Tracks user overrides, collects accuracy improvement suggestions,
 * monitors feature usage patterns, and enables data-driven optimization.
 * 
 * Week 4 Task 4.3: Feedback Collection System
 */

import { supabase } from '@/lib/supabase';
import { SecurityGateway } from '@/lib/security/SecurityGateway';

export interface UserOverride {
  id: string;
  timestamp: number;
  workflowId: string;
  stage: string;
  originalValue: any;
  overriddenValue: any;
  reason?: string;
  context?: Record<string, any>;
}

export interface AccuracySuggestion {
  id: string;
  timestamp: number;
  workflowId: string;
  stage: string;
  suggestion: string;
  suggestionAr?: string;
  category: 'precision' | 'calculation' | 'optimization' | 'ui' | 'other';
  priority: 'low' | 'medium' | 'high';
  context?: Record<string, any>;
}

export interface FeatureUsage {
  featureId: string;
  featureName: string;
  usageCount: number;
  lastUsed: number;
  averageSessionDuration?: number;
  userSatisfaction?: number; // 1-5 rating
  issues?: string[];
}

export interface FeedbackAnalytics {
  totalOverrides: number;
  overrideFrequency: Map<string, number>; // stage -> count
  commonOverrideReasons: Map<string, number>; // reason -> count
  accuracySuggestions: AccuracySuggestion[];
  featureUsage: FeatureUsage[];
  systemicIssues: string[];
}

export interface FeedbackSubmission {
  type: 'override' | 'suggestion' | 'feature_usage' | 'general';
  data: UserOverride | AccuracySuggestion | FeatureUsage | Record<string, any>;
  locale?: 'en' | 'ar';
}

/**
 * FeedbackCollector - Main feedback collection class
 */
export class FeedbackCollector {
  private static instance: FeedbackCollector;
  private securityGateway: SecurityGateway;
  private overrides: Map<string, UserOverride> = new Map();
  private suggestions: Map<string, AccuracySuggestion> = new Map();
  private featureUsage: Map<string, FeatureUsage> = new Map();
  private readonly localStoragePrefix = 'feedback_';
  private readonly cloudTable = 'user_feedback';
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    this.securityGateway = SecurityGateway.getInstance();
    this.loadFromLocalStorage();
  }

  static getInstance(): FeedbackCollector {
    if (!FeedbackCollector.instance) {
      FeedbackCollector.instance = new FeedbackCollector();
    }
    return FeedbackCollector.instance;
  }

  /**
   * Record a user override
   */
  recordOverride(
    workflowId: string,
    stage: string,
    originalValue: any,
    overriddenValue: any,
    reason?: string,
    context?: Record<string, any>
  ): void {
    const override: UserOverride = {
      id: `${workflowId}_${stage}_${Date.now()}`,
      timestamp: Date.now(),
      workflowId,
      stage,
      originalValue,
      overriddenValue,
      reason,
      context,
    };

    this.overrides.set(override.id, override);
    this.saveToLocalStorage('override', override.id, override);
    this.syncToCloudDebounced();

    // Log security event for tracking
    this.securityGateway.logSecurityEventPublic(
      'user_override',
      'info',
      { workflowId, stage, reason }
    );
  }

  /**
   * Submit an accuracy improvement suggestion
   */
  submitSuggestion(
    workflowId: string,
    stage: string,
    suggestion: string,
    suggestionAr?: string,
    category: AccuracySuggestion['category'] = 'other',
    priority: AccuracySuggestion['priority'] = 'medium',
    context?: Record<string, any>
  ): void {
    const accuracySuggestion: AccuracySuggestion = {
      id: `${workflowId}_${stage}_${Date.now()}`,
      timestamp: Date.now(),
      workflowId,
      stage,
      suggestion,
      suggestionAr,
      category,
      priority,
      context,
    };

    this.suggestions.set(accuracySuggestion.id, accuracySuggestion);
    this.saveToLocalStorage('suggestion', accuracySuggestion.id, accuracySuggestion);
    this.syncToCloudDebounced();
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(
    featureId: string,
    featureName: string,
    sessionDuration?: number,
    userSatisfaction?: number,
    issues?: string[]
  ): void {
    const existing = this.featureUsage.get(featureId);
    
    const featureUsage: FeatureUsage = {
      featureId,
      featureName,
      usageCount: (existing?.usageCount || 0) + 1,
      lastUsed: Date.now(),
      averageSessionDuration: existing
        ? (existing.averageSessionDuration || 0 + (sessionDuration || 0)) / 2
        : sessionDuration,
      userSatisfaction: userSatisfaction || existing?.userSatisfaction,
      issues: issues || existing?.issues || [],
    };

    this.featureUsage.set(featureId, featureUsage);
    this.saveToLocalStorage('feature_usage', featureId, featureUsage);
    this.syncToCloudDebounced();
  }

  /**
   * Submit general feedback
   */
  submitFeedback(
    type: FeedbackSubmission['type'],
    data: Record<string, any>,
    locale: 'en' | 'ar' = 'en'
  ): void {
    const feedback: FeedbackSubmission = {
      type,
      data,
      locale,
    };

    this.saveToLocalStorage('general', `${type}_${Date.now()}`, feedback);
    this.syncToCloudDebounced();
  }

  /**
   * Get feedback analytics
   */
  getAnalytics(): FeedbackAnalytics {
    const overrideFrequency = new Map<string, number>();
    const commonOverrideReasons = new Map<string, number>();

    // Calculate override frequency by stage
    this.overrides.forEach((override) => {
      const count = overrideFrequency.get(override.stage) || 0;
      overrideFrequency.set(override.stage, count + 1);

      if (override.reason) {
        const reasonCount = commonOverrideReasons.get(override.reason) || 0;
        commonOverrideReasons.set(override.reason, reasonCount + 1);
      }
    });

    // Identify systemic issues (stages with high override frequency)
    const systemicIssues: string[] = [];
    overrideFrequency.forEach((count, stage) => {
      if (count >= 5) { // Threshold: 5+ overrides
        systemicIssues.push(
          `High override frequency in stage "${stage}" (${count} overrides)`
        );
      }
    });

    return {
      totalOverrides: this.overrides.size,
      overrideFrequency,
      commonOverrideReasons,
      accuracySuggestions: Array.from(this.suggestions.values()),
      featureUsage: Array.from(this.featureUsage.values()),
      systemicIssues,
    };
  }

  /**
   * Get overrides for a specific workflow
   */
  getWorkflowOverrides(workflowId: string): UserOverride[] {
    return Array.from(this.overrides.values()).filter(
      (override) => override.workflowId === workflowId
    );
  }

  /**
   * Get suggestions for a specific workflow
   */
  getWorkflowSuggestions(workflowId: string): AccuracySuggestion[] {
    return Array.from(this.suggestions.values()).filter(
      (suggestion) => suggestion.workflowId === workflowId
    );
  }

  /**
   * Get feature usage statistics
   */
  getFeatureUsage(featureId?: string): FeatureUsage | FeatureUsage[] {
    if (featureId) {
      return this.featureUsage.get(featureId) || {
        featureId,
        featureName: 'Unknown',
        usageCount: 0,
        lastUsed: 0,
      };
    }
    return Array.from(this.featureUsage.values());
  }

  /**
   * Identify systemic issues from overrides
   */
  identifySystemicIssues(): string[] {
    const analytics = this.getAnalytics();
    const issues: string[] = [];

    // High override frequency
    analytics.overrideFrequency.forEach((count, stage) => {
      if (count >= 10) {
        issues.push(
          `Critical: Very high override frequency in "${stage}" (${count} overrides). This may indicate a systemic calculation error.`
        );
      } else if (count >= 5) {
        issues.push(
          `Warning: High override frequency in "${stage}" (${count} overrides). Consider reviewing calculation logic.`
        );
      }
    });

    // Common override reasons
    analytics.commonOverrideReasons.forEach((count, reason) => {
      if (count >= 5) {
        issues.push(
          `Common override reason: "${reason}" (${count} occurrences). This may indicate a UX or calculation issue.`
        );
      }
    });

    // High-priority suggestions
    const highPrioritySuggestions = analytics.accuracySuggestions.filter(
      (s) => s.priority === 'high'
    );
    if (highPrioritySuggestions.length > 0) {
      issues.push(
        `${highPrioritySuggestions.length} high-priority accuracy suggestions pending review.`
      );
    }

    return issues;
  }

  /**
   * Save to LocalStorage
   */
  private saveToLocalStorage(type: string, id: string, data: any): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const key = `${this.localStoragePrefix}${type}_${id}`;
      window.localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save feedback to LocalStorage:', error);
    }
  }

  /**
   * Load from LocalStorage
   */
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(this.localStoragePrefix)) {
          const stored = window.localStorage.getItem(key);
          if (stored) {
            const data = JSON.parse(stored);
            const parts = key.replace(this.localStoragePrefix, '').split('_');
            const type = parts[0];
            const id = parts.slice(1).join('_');

            if (type === 'override') {
              this.overrides.set(id, data as UserOverride);
            } else if (type === 'suggestion') {
              this.suggestions.set(id, data as AccuracySuggestion);
            } else if (type === 'feature_usage') {
              this.featureUsage.set(id, data as FeatureUsage);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load feedback from LocalStorage:', error);
    }
  }

  /**
   * Sync to cloud (debounced)
   */
  private syncToCloudDebounced(): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      this.syncToCloud().catch((error) => {
        console.warn('Failed to sync feedback to cloud:', error);
      });
    }, 5000); // 5 second debounce
  }

  /**
   * Sync feedback to cloud (Supabase)
   */
  private async syncToCloud(): Promise<void> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return; // No authenticated user - skip cloud sync
      }

      // Sync overrides
      const overridesToSync = Array.from(this.overrides.values()).filter(
        (override) => !override.context?.synced
      );
      if (overridesToSync.length > 0) {
        await (supabase
          .from(this.cloudTable) as any)
          .upsert(
            overridesToSync.map((override) => ({
              id: override.id,
              user_id: user.id,
              type: 'override',
              workflow_id: override.workflowId,
              stage: override.stage,
              data: {
                originalValue: override.originalValue,
                overriddenValue: override.overriddenValue,
                reason: override.reason,
                context: override.context,
              },
              timestamp: new Date(override.timestamp).toISOString(),
            }))
          );

        // Mark as synced
        overridesToSync.forEach((override) => {
          if (override.context) {
            override.context.synced = true;
          } else {
            override.context = { synced: true };
          }
        });
      }

      // Sync suggestions
      const suggestionsToSync = Array.from(this.suggestions.values()).filter(
        (suggestion) => !suggestion.context?.synced
      );
      if (suggestionsToSync.length > 0) {
        await (supabase
          .from(this.cloudTable) as any)
          .upsert(
            suggestionsToSync.map((suggestion) => ({
              id: suggestion.id,
              user_id: user.id,
              type: 'suggestion',
              workflow_id: suggestion.workflowId,
              stage: suggestion.stage,
              data: {
                suggestion: suggestion.suggestion,
                suggestionAr: suggestion.suggestionAr,
                category: suggestion.category,
                priority: suggestion.priority,
                context: suggestion.context,
              },
              timestamp: new Date(suggestion.timestamp).toISOString(),
            }))
          );

        // Mark as synced
        suggestionsToSync.forEach((suggestion) => {
          if (suggestion.context) {
            suggestion.context.synced = true;
          } else {
            suggestion.context = { synced: true };
          }
        });
      }

      // Sync feature usage
      const featureUsageToSync = Array.from(this.featureUsage.values());
      if (featureUsageToSync.length > 0) {
        await (supabase
          .from(this.cloudTable) as any)
          .upsert(
            featureUsageToSync.map((usage) => ({
              id: usage.featureId,
              user_id: user.id,
              type: 'feature_usage',
              data: {
                featureName: usage.featureName,
                usageCount: usage.usageCount,
                lastUsed: new Date(usage.lastUsed).toISOString(),
                averageSessionDuration: usage.averageSessionDuration,
                userSatisfaction: usage.userSatisfaction,
                issues: usage.issues,
              },
              timestamp: new Date(usage.lastUsed).toISOString(),
            }))
          );
      }
    } catch (error) {
      console.warn('Failed to sync feedback to cloud:', error);
    }
  }

  /**
   * Clear all feedback (for testing/reset)
   */
  clearFeedback(): void {
    this.overrides.clear();
    this.suggestions.clear();
    this.featureUsage.clear();

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(this.localStoragePrefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => window.localStorage.removeItem(key));
      } catch (error) {
        console.warn('Failed to clear feedback from LocalStorage:', error);
      }
    }
  }
}

// Export singleton instance
export const feedbackCollector = FeedbackCollector.getInstance();


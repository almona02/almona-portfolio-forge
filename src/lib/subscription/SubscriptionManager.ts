/**
 * Subscription Manager
 * Manages freemium tier and subscription plans
 */

import { supabase } from '../supabase';

export type PlanType = 'free' | 'basic' | 'pro' | 'enterprise';

export interface Subscription {
  id: string;
  userId: string;
  planType: PlanType;
  projectsUsed: number;
  projectsLimit: number | null; // null = unlimited
  status: 'active' | 'cancelled' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
}

export interface PlanLimits {
  projectsLimit: number | null;
  features: string[];
}

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    projectsLimit: 3,
    features: ['basic_optimization', 'standard_support'],
  },
  basic: {
    projectsLimit: 50,
    features: ['advanced_optimization', 'priority_support', 'remnant_marketplace'],
  },
  pro: {
    projectsLimit: null, // unlimited
    features: [
      'advanced_optimization',
      'priority_support',
      'remnant_marketplace',
      'ai_advisor',
      'mass_production',
      'api_access',
    ],
  },
  enterprise: {
    projectsLimit: null, // unlimited
    features: [
      'advanced_optimization',
      'priority_support',
      'remnant_marketplace',
      'ai_advisor',
      'mass_production',
      'api_access',
      'custom_integrations',
      'dedicated_support',
    ],
  },
};

export class SubscriptionManager {
  /**
   * Get or create subscription for user
   */
  async getSubscription(userId: string): Promise<Subscription> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      // Handle "not found" error gracefully (PGRST116 = no rows returned)
      if (error && error.code !== 'PGRST116') {
        // Handle permission errors (403, 406) gracefully
        if (error.code === 'PGRST301' || error.code === '42501' || error.message?.includes('403') || error.message?.includes('406')) {
          // User doesn't have access to subscriptions table - return free tier
          if (import.meta.env.DEV) {
            console.warn('Subscription access denied, using free tier:', error.message);
          }
          return this.getFreeSubscriptionFallback(userId);
        }
        throw error;
      }

      if (data) {
        return this.mapSubscriptionFromDb(data);
      }

      // Create free subscription if none exists
      return await this.createFreeSubscription(userId);
    } catch (error: any) {
      // Handle all errors gracefully - return free subscription
      if (import.meta.env.DEV) {
        console.warn('Failed to get subscription, using free tier:', error?.message || error);
      }
      return this.getFreeSubscriptionFallback(userId);
    }
  }

  /**
   * Get free subscription fallback (used when DB access fails)
   */
  private getFreeSubscriptionFallback(userId: string): Subscription {
    return {
      id: `free-${userId}`,
      userId,
      planType: 'free',
      projectsUsed: 0,
      projectsLimit: PLAN_LIMITS.free.projectsLimit,
      status: 'active',
      createdAt: new Date(),
    };
  }

  /**
   * Create free subscription for new user
   */
  async createFreeSubscription(userId: string): Promise<Subscription> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: 'free',
          projects_used: 0,
          projects_limit: PLAN_LIMITS.free.projectsLimit,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        // Handle permission/access errors gracefully
        if (error.code === 'PGRST301' || error.code === '42501' || error.message?.includes('403') || error.message?.includes('406') || error.message?.includes('400')) {
          if (import.meta.env.DEV) {
            console.warn('Cannot create subscription (access denied), using free tier fallback:', error.message);
          }
          return this.getFreeSubscriptionFallback(userId);
        }
        throw error;
      }

      return this.mapSubscriptionFromDb(data);
    } catch (error: any) {
      // Return free subscription fallback instead of throwing
      if (import.meta.env.DEV) {
        console.warn('Failed to create free subscription, using fallback:', error?.message || error);
      }
      return this.getFreeSubscriptionFallback(userId);
    }
  }

  /**
   * Check if user can create a project
   */
  async canCreateProject(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const subscription = await this.getSubscription(userId);

    if (subscription.projectsLimit === null) {
      return { allowed: true }; // Unlimited
    }

    if (subscription.projectsUsed >= subscription.projectsLimit) {
      return {
        allowed: false,
        reason: `You've reached your limit of ${subscription.projectsLimit} projects per month. Upgrade to continue.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Increment project count
   */
  async incrementProjectCount(userId: string): Promise<void> {
    try {
      const subscription = await this.getSubscription(userId);

      // Skip update if using fallback subscription (no DB access)
      if (subscription.id.startsWith('free-') && !subscription.id.includes('-')) {
        return; // Using fallback, skip DB update
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({
          projects_used: subscription.projectsUsed + 1,
        })
        .eq('id', subscription.id);

      if (error) {
        // Handle permission errors gracefully
        if (error.code === 'PGRST301' || error.code === '42501' || error.message?.includes('403') || error.message?.includes('406')) {
          if (import.meta.env.DEV) {
            console.warn('Cannot update subscription (access denied), skipping:', error.message);
          }
          return;
        }
        throw error;
      }
    } catch (error: any) {
      // Silently fail - project count increment is non-critical
      if (import.meta.env.DEV) {
        console.warn('Failed to increment project count (non-critical):', error?.message || error);
      }
    }
  }

  /**
   * Check if user has access to feature
   */
  async hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    const limits = PLAN_LIMITS[subscription.planType];
    return limits.features.includes(feature);
  }

  /**
   * Get plan limits
   */
  getPlanLimits(planType: PlanType): PlanLimits {
    return PLAN_LIMITS[planType];
  }

  /**
   * Map database row to Subscription
   */
  private mapSubscriptionFromDb(data: any): Subscription {
    return {
      id: data.id,
      userId: data.user_id,
      planType: data.plan_type,
      projectsUsed: data.projects_used || 0,
      projectsLimit: data.projects_limit,
      status: data.status,
      createdAt: new Date(data.created_at),
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
    };
  }
}

export const subscriptionManager = new SubscriptionManager();


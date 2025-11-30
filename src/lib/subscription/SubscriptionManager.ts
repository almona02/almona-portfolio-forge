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

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        return this.mapSubscriptionFromDb(data);
      }

      // Create free subscription if none exists
      return await this.createFreeSubscription(userId);
    } catch (error) {
      console.error('Failed to get subscription:', error);
      // Return free subscription as fallback
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

      if (error) throw error;

      return this.mapSubscriptionFromDb(data);
    } catch (error) {
      console.error('Failed to create free subscription:', error);
      throw error;
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

      const { error } = await supabase
        .from('subscriptions')
        .update({
          projects_used: subscription.projectsUsed + 1,
        })
        .eq('id', subscription.id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to increment project count:', error);
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


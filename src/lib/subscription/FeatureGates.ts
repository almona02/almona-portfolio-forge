/**
 * Feature Gates
 * Check feature access based on subscription
 */

import { subscriptionManager } from './SubscriptionManager';

export class FeatureGates {
  /**
   * Check if user can create a project
   */
  async canCreateProject(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    return subscriptionManager.canCreateProject(userId);
  }

  /**
   * Check if user can access a feature
   */
  async canAccessFeature(userId: string, feature: string): Promise<boolean> {
    return subscriptionManager.hasFeatureAccess(userId, feature);
  }

  /**
   * Get user's subscription info
   */
  async getSubscriptionInfo(userId: string) {
    return subscriptionManager.getSubscription(userId);
  }
}

export const featureGates = new FeatureGates();


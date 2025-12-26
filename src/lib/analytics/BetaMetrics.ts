/**
 * BetaMetrics - Advanced Usage Analytics
 * 
 * Tracks comprehensive metrics for beta testing program:
 * - Feature adoption by tier
 * - Time to first project completion
 * - Accuracy validation across all features
 * - User satisfaction by user type
 * - Performance metrics
 * 
 * @since Beta Testing Program (Weeks 18-20)
 */

import type { BetaFeedbackData } from '@/components/feedback/BetaFeedbackPortal';
import { EarlyAccessMetrics, type WorkshopMetrics } from './EarlyAccessMetrics';

export interface BetaWorkshopMetrics extends WorkshopMetrics {
  tier: 'wizard' | 'pattern_library' | 'expert_canvas';
  onboardingTime: number; // minutes
  firstProjectTime: number; // minutes
  pricingAccuracy: number; // 0-100
  visualAccuracy: number; // 0-100
}

export interface BetaMetrics {
  totalWorkshops: number;
  totalProjects: number;
  workshops: BetaWorkshopMetrics[];
  tierAdoption: {
    wizard: number; // percentage
    pattern_library: number;
    expert_canvas: number;
  };
  averageOnboardingTime: number; // minutes
  averageFirstProjectTime: number; // minutes
  averagePricingAccuracy: number; // 0-100
  averageVisualAccuracy: number; // 0-100
  overallAccuracy: {
    bom: number;
    hardware: number;
    overall: number;
  };
  averageTimeSavings: number;
  averageSatisfaction: number;
  recommendationRate: number;
}

/**
 * BetaMetrics - Tracks and analyzes beta testing metrics
 */
export class BetaMetrics {
  private feedbackData: BetaFeedbackData[] = [];
  private earlyAccessMetrics: EarlyAccessMetrics;

  constructor() {
    this.earlyAccessMetrics = new EarlyAccessMetrics();
  }

  /**
   * Add feedback data
   */
  addFeedback(feedback: BetaFeedbackData): void {
    this.feedbackData.push(feedback);
    // Also add to early access metrics for compatibility
    this.earlyAccessMetrics.addFeedback(feedback);
  }

  /**
   * Calculate workshop metrics
   */
  calculateWorkshopMetrics(workshopId: string): BetaWorkshopMetrics | null {
    const workshopFeedback = this.feedbackData.filter(f => f.workshopId === workshopId);
    
    if (workshopFeedback.length === 0) {
      return null;
    }

    const baseMetrics = this.earlyAccessMetrics.calculateWorkshopMetrics(workshopId);
    if (!baseMetrics) {
      return null;
    }

    // Determine primary tier (most used)
    const tierCounts = {
      wizard: workshopFeedback.filter(f => f.tier === 'wizard').length,
      pattern_library: workshopFeedback.filter(f => f.tier === 'pattern_library').length,
      expert_canvas: workshopFeedback.filter(f => f.tier === 'expert_canvas').length
    };

    const primaryTier = Object.entries(tierCounts).reduce((a, b) => 
      tierCounts[a[0] as keyof typeof tierCounts] > tierCounts[b[0] as keyof typeof tierCounts] ? a : b
    )[0] as 'wizard' | 'pattern_library' | 'expert_canvas';

    const averageOnboardingTime = workshopFeedback.reduce((sum, f) => sum + f.onboardingTime, 0) / workshopFeedback.length;
    const averageFirstProjectTime = workshopFeedback.reduce((sum, f) => sum + f.firstProjectTime, 0) / workshopFeedback.length;
    const averagePricingAccuracy = workshopFeedback.reduce((sum, f) => sum + f.pricingAccuracy, 0) / workshopFeedback.length;
    const averageVisualAccuracy = workshopFeedback.reduce((sum, f) => sum + f.visualAccuracy, 0) / workshopFeedback.length;

    return {
      ...baseMetrics,
      tier: primaryTier,
      onboardingTime: averageOnboardingTime,
      firstProjectTime: averageFirstProjectTime,
      pricingAccuracy: averagePricingAccuracy,
      visualAccuracy: averageVisualAccuracy
    };
  }

  /**
   * Calculate overall metrics
   */
  calculateOverallMetrics(): BetaMetrics {
    const workshopIds = new Set(this.feedbackData.map(f => f.workshopId));
    const workshops: BetaWorkshopMetrics[] = [];

    for (const workshopId of workshopIds) {
      const metrics = this.calculateWorkshopMetrics(workshopId);
      if (metrics) {
        workshops.push(metrics);
      }
    }

    const totalProjects = new Set(this.feedbackData.map(f => f.projectId)).size;

    const tierAdoption = {
      wizard: (this.feedbackData.filter(f => f.tier === 'wizard').length / this.feedbackData.length) * 100,
      pattern_library: (this.feedbackData.filter(f => f.tier === 'pattern_library').length / this.feedbackData.length) * 100,
      expert_canvas: (this.feedbackData.filter(f => f.tier === 'expert_canvas').length / this.feedbackData.length) * 100
    };

    const averageOnboardingTime = this.feedbackData.reduce((sum, f) => sum + f.onboardingTime, 0) / this.feedbackData.length;
    const averageFirstProjectTime = this.feedbackData.reduce((sum, f) => sum + f.firstProjectTime, 0) / this.feedbackData.length;
    const averagePricingAccuracy = this.feedbackData.reduce((sum, f) => sum + f.pricingAccuracy, 0) / this.feedbackData.length;
    const averageVisualAccuracy = this.feedbackData.reduce((sum, f) => sum + f.visualAccuracy, 0) / this.feedbackData.length;

    const overallMetrics = this.earlyAccessMetrics.calculateOverallMetrics();

    return {
      totalWorkshops: workshops.length,
      totalProjects,
      workshops,
      tierAdoption,
      averageOnboardingTime,
      averageFirstProjectTime,
      averagePricingAccuracy,
      averageVisualAccuracy,
      overallAccuracy: overallMetrics.overallAccuracy,
      averageTimeSavings: overallMetrics.averageTimeSavings,
      averageSatisfaction: overallMetrics.averageSatisfaction,
      recommendationRate: overallMetrics.recommendationRate
    };
  }

  /**
   * Generate comprehensive report
   */
  generateReport(): string {
    const metrics = this.calculateOverallMetrics();
    
    let report = `# Beta Testing Program Metrics Report\n\n`;
    report += `## Overview\n\n`;
    report += `- **Total Workshops:** ${metrics.totalWorkshops}\n`;
    report += `- **Total Projects:** ${metrics.totalProjects}\n`;
    report += `- **Overall Accuracy:** ${metrics.overallAccuracy.overall.toFixed(2)}%\n`;
    report += `- **Average Time Savings:** ${metrics.averageTimeSavings.toFixed(1)} minutes\n`;
    report += `- **Average Satisfaction:** ${metrics.averageSatisfaction.toFixed(1)}/5\n`;
    report += `- **Recommendation Rate:** ${metrics.recommendationRate.toFixed(1)}%\n\n`;

    report += `## Tier Adoption\n\n`;
    report += `- **Smart Wizard (Tier 1):** ${metrics.tierAdoption.wizard.toFixed(1)}%\n`;
    report += `- **Pattern Library (Tier 2):** ${metrics.tierAdoption.pattern_library.toFixed(1)}%\n`;
    report += `- **Expert Canvas (Tier 3):** ${metrics.tierAdoption.expert_canvas.toFixed(1)}%\n\n`;

    report += `## Onboarding & First Project\n\n`;
    report += `- **Average Onboarding Time:** ${metrics.averageOnboardingTime.toFixed(1)} minutes\n`;
    report += `- **Average First Project Time:** ${metrics.averageFirstProjectTime.toFixed(1)} minutes\n\n`;

    report += `## Accuracy Metrics\n\n`;
    report += `- **BOM Accuracy:** ${metrics.overallAccuracy.bom.toFixed(2)}%\n`;
    report += `- **Hardware Accuracy:** ${metrics.overallAccuracy.hardware.toFixed(2)}%\n`;
    report += `- **Pricing Accuracy:** ${metrics.averagePricingAccuracy.toFixed(2)}%\n`;
    report += `- **Visual Accuracy:** ${metrics.averageVisualAccuracy.toFixed(2)}%\n\n`;

    report += `## Workshop Details\n\n`;
    for (const workshop of metrics.workshops) {
      report += `### ${workshop.workshopName} (${workshop.tier})\n\n`;
      report += `- **Projects Completed:** ${workshop.projectsCompleted}\n`;
      report += `- **Onboarding Time:** ${workshop.onboardingTime.toFixed(1)} minutes\n`;
      report += `- **First Project Time:** ${workshop.firstProjectTime.toFixed(1)} minutes\n`;
      report += `- **Overall Accuracy:** ${workshop.averageAccuracy.overall.toFixed(2)}%\n`;
      report += `- **Satisfaction:** ${workshop.averageSatisfaction.toFixed(1)}/5\n`;
      report += `- **Would Recommend:** ${workshop.wouldRecommend.toFixed(1)}%\n\n`;
    }

    return report;
  }
}


/**
 * EarlyAccessMetrics - Usage Tracking and Metrics
 * 
 * Tracks usage metrics for early access workshops:
 * - Feature adoption rates
 * - Accuracy validation
 * - Time savings
 * - Project completion rates
 * 
 * @since Early Access Program (Weeks 8-10)
 */

import type { EarlyAccessFeedbackData } from '@/components/feedback/EarlyAccessFeedback';

export interface WorkshopMetrics {
  workshopId: string;
  workshopName: string;
  location: 'Cairo' | 'Alexandria' | 'Upper_Egypt';
  projectsCompleted: number;
  featuresUsed: {
    fly_screen: number;
    quick_order: number;
    egyptian_specials: number;
    custom_mullion: number;
  };
  averageAccuracy: {
    bom: number;
    hardware: number;
    overall: number;
  };
  averageTimeSavings: number; // minutes
  averageSatisfaction: number; // 1-5
  issuesReported: number;
  wouldRecommend: number; // percentage
}

export interface EarlyAccessMetricsData {
  totalWorkshops: number;
  totalProjects: number;
  workshops: WorkshopMetrics[];
  overallAccuracy: {
    bom: number;
    hardware: number;
    overall: number;
  };
  averageTimeSavings: number;
  averageSatisfaction: number;
  featureAdoption: {
    fly_screen: number; // percentage
    quick_order: number;
    egyptian_specials: number;
    custom_mullion: number;
  };
  recommendationRate: number; // percentage
}

/**
 * EarlyAccessMetrics - Tracks and analyzes early access metrics
 */
export class EarlyAccessMetrics {
  private feedbackData: EarlyAccessFeedbackData[] = [];

  /**
   * Add feedback data
   */
  addFeedback(feedback: EarlyAccessFeedbackData): void {
    this.feedbackData.push(feedback);
  }

  /**
   * Calculate workshop metrics
   */
  calculateWorkshopMetrics(workshopId: string): WorkshopMetrics | null {
    const workshopFeedback = this.feedbackData.filter(f => f.workshopId === workshopId);
    
    if (workshopFeedback.length === 0) {
      return null;
    }

    const projectsCompleted = new Set(workshopFeedback.map(f => f.projectId)).size;
    
    const featuresUsed = {
      fly_screen: workshopFeedback.filter(f => f.feature === 'fly_screen').length,
      quick_order: workshopFeedback.filter(f => f.feature === 'quick_order').length,
      egyptian_specials: workshopFeedback.filter(f => f.feature === 'egyptian_specials').length,
      custom_mullion: workshopFeedback.filter(f => f.feature === 'custom_mullion').length
    };

    const averageAccuracy = {
      bom: workshopFeedback.reduce((sum, f) => sum + f.accuracy.bomAccuracy, 0) / workshopFeedback.length,
      hardware: workshopFeedback.reduce((sum, f) => sum + f.accuracy.hardwareAccuracy, 0) / workshopFeedback.length,
      overall: workshopFeedback.reduce((sum, f) => sum + f.accuracy.overallAccuracy, 0) / workshopFeedback.length
    };

    const averageTimeSavings = workshopFeedback.reduce((sum, f) => sum + f.usability.timeSavings, 0) / workshopFeedback.length;
    const averageSatisfaction = workshopFeedback.reduce((sum, f) => sum + f.usability.satisfaction, 0) / workshopFeedback.length;
    const issuesReported = workshopFeedback.reduce((sum, f) => sum + f.issues.length, 0);
    const wouldRecommend = (workshopFeedback.filter(f => f.wouldRecommend).length / workshopFeedback.length) * 100;

    return {
      workshopId,
      workshopName: `Workshop ${workshopId}`,
      location: 'Cairo', // Default, should be from workshop data
      projectsCompleted,
      featuresUsed,
      averageAccuracy,
      averageTimeSavings,
      averageSatisfaction,
      issuesReported,
      wouldRecommend
    };
  }

  /**
   * Calculate overall metrics
   */
  calculateOverallMetrics(): EarlyAccessMetricsData {
    const n = this.feedbackData.length;
    const workshopIds = new Set(this.feedbackData.map(f => f.workshopId));
    const workshops: WorkshopMetrics[] = [];

    for (const workshopId of workshopIds) {
      const metrics = this.calculateWorkshopMetrics(workshopId);
      if (metrics) {
        workshops.push(metrics);
      }
    }

    const totalProjects = new Set(this.feedbackData.map(f => f.projectId)).size;
    const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

    const overallAccuracy = {
      bom: safeDiv(this.feedbackData.reduce((sum, f) => sum + f.accuracy.bomAccuracy, 0), n),
      hardware: safeDiv(this.feedbackData.reduce((sum, f) => sum + f.accuracy.hardwareAccuracy, 0), n),
      overall: safeDiv(this.feedbackData.reduce((sum, f) => sum + f.accuracy.overallAccuracy, 0), n)
    };

    const averageTimeSavings = safeDiv(this.feedbackData.reduce((sum, f) => sum + f.usability.timeSavings, 0), n);
    const averageSatisfaction = safeDiv(this.feedbackData.reduce((sum, f) => sum + f.usability.satisfaction, 0), n);

    const featureAdoption = {
      fly_screen: safeDiv(this.feedbackData.filter(f => f.feature === 'fly_screen').length, n) * 100,
      quick_order: safeDiv(this.feedbackData.filter(f => f.feature === 'quick_order').length, n) * 100,
      egyptian_specials: safeDiv(this.feedbackData.filter(f => f.feature === 'egyptian_specials').length, n) * 100,
      custom_mullion: safeDiv(this.feedbackData.filter(f => f.feature === 'custom_mullion').length, n) * 100
    };

    const recommendationRate = safeDiv(this.feedbackData.filter(f => f.wouldRecommend).length, n) * 100;

    return {
      totalWorkshops: workshops.length,
      totalProjects,
      workshops,
      overallAccuracy,
      averageTimeSavings,
      averageSatisfaction,
      featureAdoption,
      recommendationRate
    };
  }

  /**
   * Generate metrics report
   */
  generateReport(): string {
    const metrics = this.calculateOverallMetrics();
    
    let report = `# Early Access Program Metrics Report\n\n`;
    report += `## Overview\n\n`;
    report += `- **Total Workshops:** ${metrics.totalWorkshops}\n`;
    report += `- **Total Projects:** ${metrics.totalProjects}\n`;
    report += `- **Overall Accuracy:** ${metrics.overallAccuracy.overall.toFixed(2)}%\n`;
    report += `- **Average Time Savings:** ${metrics.averageTimeSavings.toFixed(1)} minutes\n`;
    report += `- **Average Satisfaction:** ${metrics.averageSatisfaction.toFixed(1)}/5\n`;
    report += `- **Recommendation Rate:** ${metrics.recommendationRate.toFixed(1)}%\n\n`;

    report += `## Feature Adoption\n\n`;
    report += `- **Fly Screen Presets:** ${metrics.featureAdoption.fly_screen.toFixed(1)}%\n`;
    report += `- **Quick Order Mode:** ${metrics.featureAdoption.quick_order.toFixed(1)}%\n`;
    report += `- **Egyptian Special Presets:** ${metrics.featureAdoption.egyptian_specials.toFixed(1)}%\n`;
    report += `- **Custom Mullion Validation:** ${metrics.featureAdoption.custom_mullion.toFixed(1)}%\n\n`;

    report += `## Workshop Details\n\n`;
    for (const workshop of metrics.workshops) {
      report += `### ${workshop.workshopName}\n\n`;
      report += `- **Projects Completed:** ${workshop.projectsCompleted}\n`;
      report += `- **BOM Accuracy:** ${workshop.averageAccuracy.bom.toFixed(2)}%\n`;
      report += `- **Hardware Accuracy:** ${workshop.averageAccuracy.hardware.toFixed(2)}%\n`;
      report += `- **Time Savings:** ${workshop.averageTimeSavings.toFixed(1)} minutes\n`;
      report += `- **Satisfaction:** ${workshop.averageSatisfaction.toFixed(1)}/5\n`;
      report += `- **Would Recommend:** ${workshop.wouldRecommend.toFixed(1)}%\n\n`;
    }

    return report;
  }
}


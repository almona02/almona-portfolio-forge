/**
 * PilotMetrics - Comprehensive Pilot Metrics Tracking
 * 
 * Tracks comprehensive metrics for pilot program:
 * - Usage statistics per workshop
 * - Feature adoption rates
 * - Error frequency
 * - Time-to-completion trends
 * - Accuracy tracking
 * 
 * @since Phase 5: Pre-Pilot Hardening (Week 28)
 */

import type { PilotSurveyData } from '@/components/feedback/PilotSurvey';

export interface WorkshopMetrics {
  workshopId: string;
  projectsCompleted: number;
  featuresUsed: string[];
  averageAccuracy: number;
  timeSavings: number; // hours/week
  materialSavings: number; // percentage
  errorsReported: number;
  supportTickets: number;
  satisfactionScore: number; // 1-10
}

export interface PilotMetrics {
  totalWorkshops: number;
  totalProjects: number;
  workshops: WorkshopMetrics[];
  featureAdoption: Record<string, number>; // percentage
  averageAccuracy: number;
  averageTimeSavings: number;
  averageMaterialSavings: number;
  averageSatisfaction: number;
  errorRate: number; // errors per project
  supportTicketRate: number; // tickets per workshop
}

/**
 * PilotMetrics - Tracks and analyzes pilot program metrics
 */
export class PilotMetrics {
  private surveyData: PilotSurveyData[] = [];
  private workshopData: Map<string, WorkshopMetrics> = new Map();

  /**
   * Add survey data
   */
  addSurveyData(survey: PilotSurveyData): void {
    this.surveyData.push(survey);
  }

  /**
   * Update workshop metrics
   */
  updateWorkshopMetrics(workshopId: string, metrics: Partial<WorkshopMetrics>): void {
    const existing = this.workshopData.get(workshopId) || {
      workshopId,
      projectsCompleted: 0,
      featuresUsed: [],
      averageAccuracy: 0,
      timeSavings: 0,
      materialSavings: 0,
      errorsReported: 0,
      supportTickets: 0,
      satisfactionScore: 0
    };

    this.workshopData.set(workshopId, { ...existing, ...metrics });
  }

  /**
   * Calculate overall metrics
   */
  calculateOverallMetrics(): PilotMetrics {
    const workshops = Array.from(this.workshopData.values());
    
    // Extract feature usage from surveys
    const featureUsage: Record<string, number> = {};
    this.surveyData.forEach(survey => {
      if (survey.responses.most_used) {
        const features = String(survey.responses.most_used).split(',').map(f => f.trim());
        features.forEach(feature => {
          featureUsage[feature] = (featureUsage[feature] || 0) + 1;
        });
      }
    });

    const totalWorkshops = workshops.length;
    const totalProjects = workshops.reduce((sum, w) => sum + w.projectsCompleted, 0);
    
    const featureAdoption: Record<string, number> = {};
    Object.keys(featureUsage).forEach(feature => {
      featureAdoption[feature] = (featureUsage[feature] / totalWorkshops) * 100;
    });

    const averageAccuracy = workshops.length > 0
      ? workshops.reduce((sum, w) => sum + w.averageAccuracy, 0) / workshops.length
      : 0;

    const averageTimeSavings = workshops.length > 0
      ? workshops.reduce((sum, w) => sum + w.timeSavings, 0) / workshops.length
      : 0;

    const averageMaterialSavings = workshops.length > 0
      ? workshops.reduce((sum, w) => sum + w.materialSavings, 0) / workshops.length
      : 0;

    const averageSatisfaction = workshops.length > 0
      ? workshops.reduce((sum, w) => sum + w.satisfactionScore, 0) / workshops.length
      : 0;

    const totalErrors = workshops.reduce((sum, w) => sum + w.errorsReported, 0);
    const errorRate = totalProjects > 0 ? totalErrors / totalProjects : 0;

    const totalTickets = workshops.reduce((sum, w) => sum + w.supportTickets, 0);
    const supportTicketRate = totalWorkshops > 0 ? totalTickets / totalWorkshops : 0;

    return {
      totalWorkshops,
      totalProjects,
      workshops,
      featureAdoption,
      averageAccuracy,
      averageTimeSavings,
      averageMaterialSavings,
      averageSatisfaction,
      errorRate,
      supportTicketRate
    };
  }

  /**
   * Generate comprehensive report
   */
  generateReport(): string {
    const metrics = this.calculateOverallMetrics();
    
    let report = `# Pilot Program Metrics Report\n\n`;
    report += `## Overview\n\n`;
    report += `- **Total Workshops:** ${metrics.totalWorkshops}\n`;
    report += `- **Total Projects:** ${metrics.totalProjects}\n`;
    report += `- **Average Accuracy:** ${metrics.averageAccuracy.toFixed(2)}%\n`;
    report += `- **Average Time Savings:** ${metrics.averageTimeSavings.toFixed(1)} hours/week\n`;
    report += `- **Average Material Savings:** ${metrics.averageMaterialSavings.toFixed(1)}%\n`;
    report += `- **Average Satisfaction:** ${metrics.averageSatisfaction.toFixed(1)}/10\n`;
    report += `- **Error Rate:** ${metrics.errorRate.toFixed(2)} errors/project\n`;
    report += `- **Support Ticket Rate:** ${metrics.supportTicketRate.toFixed(2)} tickets/workshop\n\n`;

    report += `## Feature Adoption\n\n`;
    Object.entries(metrics.featureAdoption).forEach(([feature, rate]) => {
      report += `- **${feature}:** ${rate.toFixed(1)}%\n`;
    });
    report += `\n`;

    report += `## Workshop Details\n\n`;
    metrics.workshops.forEach(workshop => {
      report += `### ${workshop.workshopId}\n\n`;
      report += `- **Projects Completed:** ${workshop.projectsCompleted}\n`;
      report += `- **Accuracy:** ${workshop.averageAccuracy.toFixed(2)}%\n`;
      report += `- **Time Savings:** ${workshop.timeSavings.toFixed(1)} hours/week\n`;
      report += `- **Material Savings:** ${workshop.materialSavings.toFixed(1)}%\n`;
      report += `- **Satisfaction:** ${workshop.satisfactionScore.toFixed(1)}/10\n`;
      report += `- **Errors:** ${workshop.errorsReported}\n`;
      report += `- **Support Tickets:** ${workshop.supportTickets}\n\n`;
    });

    return report;
  }
}


/**
 * ROICalculator - Calculate Business Value Proof
 * 
 * Calculates ROI metrics for validation:
 * - Material savings (15-20% target)
 * - Time savings (93% target)
 * - Capacity increase
 * - Annual value per workshop
 * 
 * @since Validation Phase (Week 2)
 */

export interface ROIMetrics {
  materialSavings: {
    percentage: number;
    annualValue: number; // EGP per workshop
    perProject: number; // EGP per project
  };
  timeSavings: {
    percentage: number;
    hoursSavedPerProject: number;
    capacityIncrease: number; // x times more projects
    annualValue: number; // EGP per workshop
  };
  totalROI: {
    annualValue: number; // Total EGP per workshop
    paybackPeriod: number; // months
    threeYearValue: number; // EGP over 3 years
  };
}

export interface ValidationData {
  materialWaste: {
    withSystem: number; // percentage
    withoutSystem: number; // percentage
  };
  timeSpent: {
    withSystem: number; // minutes
    withoutSystem: number; // minutes
  };
  projectsPerMonth: number;
  averageProjectValue: number; // EGP
  materialCostPerProject: number; // EGP
}

/**
 * ROICalculator - Calculates business value
 */
export class ROICalculator {
  /**
   * Calculate ROI from validation data
   */
  calculateROI(data: ValidationData): ROIMetrics {
    // Material savings
    const materialSavingsPercentage = 
      ((data.materialWaste.withoutSystem - data.materialWaste.withSystem) / 
       data.materialWaste.withoutSystem) * 100;
    
    const materialSavingsPerProject = 
      (materialSavingsPercentage / 100) * data.materialCostPerProject;
    
    const materialSavingsAnnual = 
      materialSavingsPerProject * data.projectsPerMonth * 12;

    // Time savings
    const timeSavingsPercentage = 
      ((data.timeSpent.withoutSystem - data.timeSpent.withSystem) / 
       data.timeSpent.withoutSystem) * 100;
    
    const hoursSavedPerProject = 
      (data.timeSpent.withoutSystem - data.timeSpent.withSystem) / 60;
    
    // Capacity increase (if time saved = more projects possible)
    const capacityIncrease = data.timeSpent.withoutSystem / data.timeSpent.withSystem;
    
    // Time savings annual value (assuming saved time = more projects)
    const additionalProjectsPerMonth = 
      (data.projectsPerMonth * (capacityIncrease - 1));
    const timeSavingsAnnual = 
      additionalProjectsPerMonth * data.averageProjectValue * 12;

    // Total ROI
    const totalAnnualValue = materialSavingsAnnual + timeSavingsAnnual;
    
    // Payback period (assuming system cost of 50,000 EGP)
    const systemCost = 50000; // EGP
    const paybackPeriod = systemCost / (totalAnnualValue / 12);
    
    // Three-year value
    const threeYearValue = totalAnnualValue * 3 - systemCost;

    return {
      materialSavings: {
        percentage: materialSavingsPercentage,
        annualValue: materialSavingsAnnual,
        perProject: materialSavingsPerProject
      },
      timeSavings: {
        percentage: timeSavingsPercentage,
        hoursSavedPerProject,
        capacityIncrease,
        annualValue: timeSavingsAnnual
      },
      totalROI: {
        annualValue: totalAnnualValue,
        paybackPeriod,
        threeYearValue
      }
    };
  }

  /**
   * Generate ROI report
   */
  generateReport(metrics: ROIMetrics): string {
    let report = `# ROI Validation Report\n\n`;
    
    report += `## Material Savings\n\n`;
    report += `- **Percentage:** ${metrics.materialSavings.percentage.toFixed(1)}%\n`;
    report += `- **Per Project:** ${metrics.materialSavings.perProject.toFixed(2)} EGP\n`;
    report += `- **Annual Value:** ${metrics.materialSavings.annualValue.toFixed(2)} EGP\n\n`;
    
    report += `## Time Savings\n\n`;
    report += `- **Percentage:** ${metrics.timeSavings.percentage.toFixed(1)}%\n`;
    report += `- **Hours Saved Per Project:** ${metrics.timeSavings.hoursSavedPerProject.toFixed(1)} hours\n`;
    report += `- **Capacity Increase:** ${metrics.timeSavings.capacityIncrease.toFixed(1)}x more projects\n`;
    report += `- **Annual Value:** ${metrics.timeSavings.annualValue.toFixed(2)} EGP\n\n`;
    
    report += `## Total ROI\n\n`;
    report += `- **Annual Value:** ${metrics.totalROI.annualValue.toFixed(2)} EGP\n`;
    report += `- **Payback Period:** ${metrics.totalROI.paybackPeriod.toFixed(1)} months\n`;
    report += `- **3-Year Value:** ${metrics.totalROI.threeYearValue.toFixed(2)} EGP\n\n`;
    
    return report;
  }

  /**
   * Compare to competitors
   */
  compareToCompetitors(yourMetrics: ROIMetrics): {
    materialSavings: { your: number; competitor: number; advantage: number };
    timeSavings: { your: number; competitor: number; advantage: number };
  } {
    // Typical competitor metrics
    const competitorMaterialSavings = 7.5; // Average of 5-10%
    const competitorTimeSavings = 67.5; // Average of 60-75%

    return {
      materialSavings: {
        your: yourMetrics.materialSavings.percentage,
        competitor: competitorMaterialSavings,
        advantage: yourMetrics.materialSavings.percentage - competitorMaterialSavings
      },
      timeSavings: {
        your: yourMetrics.timeSavings.percentage,
        competitor: competitorTimeSavings,
        advantage: yourMetrics.timeSavings.percentage - competitorTimeSavings
      }
    };
  }
}


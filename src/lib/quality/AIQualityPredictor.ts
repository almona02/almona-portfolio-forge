/**
 * AI-Powered Quality Prediction System
 * Features:
 * - Defect prediction based on historical cut quality data
 * - Optimal parameter suggestions (saw speeds/feeds)
 * - Preventive maintenance alerts (blade wear, machine issues)
 */

import { Profile, Cut } from '@/types/fabricator';

export interface OptimalCuttingParameters {
  sawSpeed: number; // RPM or m/min
  feedRate: number; // mm/min
  bladeType: string;
  coolantFlow: 'low' | 'medium' | 'high';
  recommendedBlade: string;
  confidence: number;
}

export interface QualityPrediction {
  defectProbability: number; // 0-100%
  qualityScore: number; // 0-100
  riskFactors: string[];
  recommendations: string[];
  confidence: number;
  riskScore?: number; // 0-100, overall risk score for job complexity
  warnings?: string[]; // Specific warnings for display
  optimalParameters?: {
    bladeSpeed?: number;
    clampingPressure?: number;
    feedRate?: number;
  };
}

export interface DefectHistory {
  cutId: string;
  profileId: string;
  defectType: 'burr' | 'roughness' | 'dimension_error' | 'surface_damage' | 'other';
  severity: 'low' | 'medium' | 'high';
  parameters: {
    sawSpeed: number;
    feedRate: number;
    bladeType: string;
  };
  timestamp: Date;
}

export interface MaintenanceAlert {
  type: 'blade_wear' | 'machine_vibration' | 'coolant_issue' | 'alignment_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendedAction: string;
  estimatedTimeToFailure?: number; // hours
}

export class AIQualityPredictor {
  private defectHistory: DefectHistory[] = [];
  private parameterHistory: Map<string, OptimalCuttingParameters[]> = new Map();

  /**
   * Predict cut quality for a given cut and profile
   */
  async predictQuality(
    cut: Cut,
    profile: Profile,
    currentParameters?: OptimalCuttingParameters
  ): Promise<QualityPrediction> {
    // Analyze historical defects for similar cuts
    const similarDefects = this.findSimilarDefects(cut, profile);

    // Calculate defect probability
    const defectProbability = this.calculateDefectProbability(
      cut,
      profile,
      similarDefects,
      currentParameters
    );

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(cut, profile, similarDefects);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      cut,
      profile,
      defectProbability,
      riskFactors
    );

    // Calculate quality score (inverse of defect probability)
    const qualityScore = Math.max(0, 100 - defectProbability * 10);

    // Calculate confidence based on data availability
    const confidence = this.calculateConfidence(similarDefects.length);

    // Calculate overall risk score (0-100)
    const riskScore = this.calculateRiskScore(cut, profile, defectProbability, riskFactors);

    // Generate specific warnings
    const warnings = this.generateWarnings(cut, profile, defectProbability, riskFactors);

    // Get optimal parameters
    const optimalParams = await this.suggestOptimalParameters(cut, profile);

    return {
      defectProbability,
      qualityScore,
      riskFactors,
      recommendations,
      confidence,
      riskScore,
      warnings,
      optimalParameters: {
        bladeSpeed: optimalParams.sawSpeed,
        feedRate: optimalParams.feedRate,
        clampingPressure: 0, // Would be calculated based on profile
      },
    };
  }

  /**
   * Suggest optimal cutting parameters
   */
  async suggestOptimalParameters(
    cut: Cut,
    profile: Profile
  ): Promise<OptimalCuttingParameters> {
    // Get historical parameters for this profile type
    const profileKey = `${profile.material}_${profile.type}`;
    const historicalParams = this.parameterHistory.get(profileKey) || [];

    // If we have historical data, use ML-based suggestion
    if (historicalParams.length > 5) {
      return this.mlSuggestParameters(cut, profile, historicalParams);
    }

    // Otherwise, use rule-based defaults
    return this.ruleBasedSuggestParameters(cut, profile);
  }

  /**
   * ML-based parameter suggestion
   */
  private mlSuggestParameters(
    cut: Cut,
    profile: Profile,
    historicalParams: OptimalCuttingParameters[]
  ): OptimalCuttingParameters {
    // Find best performing parameters from history
    const bestParams = historicalParams
      .filter((p) => p.confidence > 0.7)
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (bestParams) {
      // Adjust based on cut length
      const lengthFactor = cut.length / 1000; // Normalize to meters
      return {
        ...bestParams,
        sawSpeed: bestParams.sawSpeed * (1 + lengthFactor * 0.1),
        feedRate: bestParams.feedRate * (1 - lengthFactor * 0.05),
        confidence: 0.8,
      };
    }

    return this.ruleBasedSuggestParameters(cut, profile);
  }

  /**
   * Rule-based parameter suggestion
   */
  private ruleBasedSuggestParameters(
    cut: Cut,
    profile: Profile
  ): OptimalCuttingParameters {
    const baseSpeed = profile.material === 'aluminum' ? 3000 : 2500; // RPM
    const baseFeed = profile.material === 'aluminum' ? 2000 : 1500; // mm/min

    // Adjust based on profile dimensions
    const sizeFactor = (profile.width || 50) / 100;

    return {
      sawSpeed: baseSpeed * sizeFactor,
      feedRate: baseFeed * sizeFactor,
      bladeType: profile.material === 'aluminum' ? 'carbide_tipped' : 'hss',
      coolantFlow: 'medium',
      recommendedBlade: `${profile.material}_standard`,
      confidence: 0.6,
    };
  }

  /**
   * Predict maintenance needs
   */
  async predictMaintenance(
    machineId: string,
    usageHours: number,
    recentDefects: DefectHistory[]
  ): Promise<MaintenanceAlert[]> {
    const alerts: MaintenanceAlert[] = [];

    // Check blade wear
    const bladeWearAlert = this.checkBladeWear(usageHours, recentDefects);
    if (bladeWearAlert) {
      alerts.push(bladeWearAlert);
    }

    // Check machine vibration (based on defect patterns)
    const vibrationAlert = this.checkMachineVibration(recentDefects);
    if (vibrationAlert) {
      alerts.push(vibrationAlert);
    }

    // Check coolant issues
    const coolantAlert = this.checkCoolantIssues(recentDefects);
    if (coolantAlert) {
      alerts.push(coolantAlert);
    }

    return alerts;
  }

  /**
   * Find similar defects from history
   */
  private findSimilarDefects(cut: Cut, profile: Profile): DefectHistory[] {
    return this.defectHistory.filter((defect) => {
      // Match by profile type and similar cut length
      const lengthDiff = Math.abs(cut.length - 1000) / cut.length; // Simplified
      return (
        defect.profileId === profile.id &&
        lengthDiff < 0.2 // Within 20% length difference
      );
    });
  }

  /**
   * Calculate defect probability
   */
  private calculateDefectProbability(
    cut: Cut,
    profile: Profile,
    similarDefects: DefectHistory[],
    currentParameters?: OptimalCuttingParameters
  ): number {
    if (similarDefects.length === 0) {
      return 5; // Default low probability
    }

    // Base probability from historical defects
    const baseProbability = (similarDefects.length / 100) * 50; // Max 50% from history

    // Adjust based on parameters
    let parameterRisk = 0;
    if (currentParameters) {
      // Check if parameters are outside optimal range
      const optimalParams = this.ruleBasedSuggestParameters(cut, profile);
      const speedDiff = Math.abs(currentParameters.sawSpeed - optimalParams.sawSpeed) / optimalParams.sawSpeed;
      const feedDiff = Math.abs(currentParameters.feedRate - optimalParams.feedRate) / optimalParams.feedRate;

      parameterRisk = (speedDiff + feedDiff) * 20; // Up to 20% risk from parameters
    }

    // Material-specific risk
    const materialRisk = profile.material === 'aluminum' ? 3 : 5;

    return Math.min(100, baseProbability + parameterRisk + materialRisk);
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(
    cut: Cut,
    profile: Profile,
    similarDefects: DefectHistory[]
  ): string[] {
    const factors: string[] = [];

    if (cut.angle === 45) {
      factors.push('45° miter cuts have higher defect risk');
    }

    if (cut.length > 3000) {
      factors.push('Long cuts may cause dimensional errors');
    }

    if (similarDefects.length > 5) {
      factors.push(`High defect history: ${similarDefects.length} similar defects`);
    }

    if (profile.material === 'upvc') {
      factors.push('UPVC requires precise temperature control');
    }

    return factors;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    cut: Cut,
    profile: Profile,
    defectProbability: number,
    riskFactors: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (defectProbability > 20) {
      recommendations.push('Consider reducing feed rate by 10-15%');
      recommendations.push('Verify blade sharpness and condition');
    }

    if (cut.angle === 45) {
      recommendations.push('Use specialized miter blade for 45° cuts');
      recommendations.push('Increase cutting allowance for miter joints');
    }

    if (riskFactors.some((f) => f.includes('temperature'))) {
      recommendations.push('Monitor material temperature during cutting');
      recommendations.push('Use appropriate coolant flow rate');
    }

    if (defectProbability > 30) {
      recommendations.push('Perform test cut before production run');
      recommendations.push('Check machine calibration and alignment');
    }

    return recommendations;
  }

  /**
   * Calculate confidence
   */
  private calculateConfidence(dataPoints: number): number {
    // Confidence increases with more data
    return Math.min(0.95, 0.5 + dataPoints / 20);
  }

  /**
   * Check blade wear
   */
  private checkBladeWear(
    usageHours: number,
    recentDefects: DefectHistory[]
  ): MaintenanceAlert | null {
    // Typical blade life: 40-60 hours
    const bladeLifeHours = 50;
    const wearPercentage = (usageHours / bladeLifeHours) * 100;

    if (wearPercentage > 80) {
      return {
        type: 'blade_wear',
        severity: wearPercentage > 95 ? 'critical' : 'high',
        message: `Blade wear at ${wearPercentage.toFixed(0)}% - replacement recommended`,
        recommendedAction: 'Replace blade and verify cut quality',
        estimatedTimeToFailure: bladeLifeHours - usageHours,
      };
    }

    // Check defect pattern for early wear signs
    const roughnessDefects = recentDefects.filter(
      (d) => d.defectType === 'roughness' && d.severity !== 'low'
    );

    if (roughnessDefects.length > 3) {
      return {
        type: 'blade_wear',
        severity: 'medium',
        message: 'Increased surface roughness detected - blade may need sharpening',
        recommendedAction: 'Inspect blade and consider sharpening or replacement',
      };
    }

    return null;
  }

  /**
   * Check machine vibration
   */
  private checkMachineVibration(recentDefects: DefectHistory[]): MaintenanceAlert | null {
    const dimensionErrors = recentDefects.filter(
      (d) => d.defectType === 'dimension_error'
    );

    if (dimensionErrors.length > 5) {
      return {
        type: 'machine_vibration',
        severity: 'high',
        message: 'Multiple dimension errors detected - possible machine vibration or alignment issue',
        recommendedAction: 'Check machine alignment, tighten mounting bolts, verify machine stability',
      };
    }

    return null;
  }

  /**
   * Check coolant issues
   */
  private checkCoolantIssues(recentDefects: DefectHistory[]): MaintenanceAlert | null {
    const surfaceDamage = recentDefects.filter(
      (d) => d.defectType === 'surface_damage'
    );

    if (surfaceDamage.length > 3) {
      return {
        type: 'coolant_issue',
        severity: 'medium',
        message: 'Surface damage pattern suggests coolant flow issues',
        recommendedAction: 'Check coolant pump, filters, and flow rate settings',
      };
    }

    return null;
  }

  /**
   * Record defect for learning
   */
  recordDefect(defect: DefectHistory): void {
    this.defectHistory.push(defect);

    // Keep only recent defects (last 1000)
    if (this.defectHistory.length > 1000) {
      this.defectHistory = this.defectHistory.slice(-1000);
    }
  }

  /**
   * Record successful parameters for learning
   */
  recordSuccessfulParameters(
    profile: Profile,
    parameters: OptimalCuttingParameters
  ): void {
    const profileKey = `${profile.material}_${profile.type}`;
    const params = this.parameterHistory.get(profileKey) || [];
    params.push(parameters);
    this.parameterHistory.set(profileKey, params.slice(-100)); // Keep last 100
  }
}

// Export singleton instance
export const aiQualityPredictor = new AIQualityPredictor();

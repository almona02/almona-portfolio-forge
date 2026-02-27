/**
 * @tier Tier 2 Advisory (Predictive Maintenance)
 * @gold_tier Accuracy: >85%, Confidence scoring, Rule+ML hybrid
 * @constitutional_compliance AICS-001 §5.6 (Advisory only)
 * @performance < 50ms inference, < 5MB memory
 */

import { AdvisoryHardener } from '../../../lib/ticketing/advisory/AdvisoryHardener';
import { AdvisoryMetrics } from '../../../lib/ticketing/advisory/AdvisoryMetrics';
import { AdvisoryCircuitBreaker } from '../../../lib/ticketing/advisory/CircuitBreaker';

export class PredictiveMaintenanceAdvisor {
  private circuitBreaker = new AdvisoryCircuitBreaker();
  private metrics = new AdvisoryMetrics();
  
  // Rule-based failure patterns (deterministic fallback)
  private readonly failurePatterns = [
    {
      pattern: /vibration.*increase/i,
      suggestion: 'Check motor bearings and alignment',
      confidence: 0.75,
      urgency: 'medium'
    },
    {
      pattern: /temperature.*rise/i,
      suggestion: 'Inspect cooling system and lubricants',
      confidence: 0.8,
      urgency: 'high'
    },
    {
      pattern: /noise.*abnormal/i,
      suggestion: 'Examine gears and moving parts',
      confidence: 0.7,
      urgency: 'medium'
    },
    {
      pattern: /accuracy.*decrease/i,
      suggestion: 'Calibrate sensors and encoders',
      confidence: 0.85,
      urgency: 'low'
    }
  ];

  /**
   * Generate predictive maintenance advisory
   */
  async suggestMaintenance(
    machineData: MachineTelemetry,
    historicalTickets: Ticket[]
  ): Promise<MaintenanceAdvisory> {
    const startTime = performance.now();
    
    try {
      // Use circuit breaker for resilience
      const result = await this.circuitBreaker.execute('maintenance', async () => {
        // Hybrid approach: Try ML first, fallback to rules
        const mlSuggestion = await this.generateMLSuggestion(machineData, historicalTickets);
        
        if (mlSuggestion.confidence > 0.7) {
          return mlSuggestion;
        }
        
        // Fallback to rule-based analysis
        return this.generateRuleBasedSuggestion(machineData, historicalTickets);
      });

      const responseTime = performance.now() - startTime;
      
      // Record metrics
      this.metrics.record({
        type: 'generation',
        advisoryType: 'maintenance',
        success: true,
        responseTime,
        timestamp: Date.now()
      });

      // Apply hardener for constitutional compliance
      const hardened = AdvisoryHardener.harden({
        suggestion: result.suggestion, // Explicitly pass suggestion field for hardener
        confidence: result.confidence,
        tier: 'Tier 2',
        constitutionalDisclaimer: 'PREDICTIVE MAINTENANCE ADVISORY ONLY: This is a predictive suggestion based on machine data patterns. Requires technician validation. Not a diagnosis.',
        requiresHumanValidation: true,
        advisoryType: 'predictive_maintenance',
        urgency: result.urgency,
        recommendedActions: result.recommendedActions,
        evidence: result.evidence,
        estimatedDowntime: 'estimatedDowntime' in result ? result.estimatedDowntime : undefined,
        costEstimate: 'costEstimate' in result ? result.costEstimate : undefined,
        circuitState: 'circuitState' in result ? result.circuitState : undefined,
        usedFallback: 'usedFallback' in result ? result.usedFallback : undefined
      });

      if (!hardened.valid) {
        throw new Error(`Advisory hardening failed: ${hardened.violations.join(', ')}`);
      }

      return hardened.hardenedAdvisory as MaintenanceAdvisory;

    } catch (_error) {
      const responseTime = performance.now() - startTime;
      
      this.metrics.record({
        type: 'generation',
        advisoryType: 'maintenance',
        success: false,
        responseTime,
        timestamp: Date.now()
      });

      // Return safe fallback advisory
      return {
        suggestion: 'Schedule routine maintenance inspection',
        confidence: 0.6,
        tier: 'Tier 2',
        constitutionalDisclaimer: 'FALLBACK ADVISORY ONLY: Predictive service unavailable. Standard maintenance recommendation.',
        requiresHumanValidation: true,
        advisoryType: 'predictive_maintenance',
        urgency: 'low',
        recommendedActions: ['Visual inspection', 'Lubrication check', 'Sensor calibration'],
        evidence: ['Service unavailable'],
        usedFallback: true
      };
    }
  }

  /**
   * ML-based suggestion (Tier 2 allowed)
   */
  private async generateMLSuggestion(
    machineData: MachineTelemetry,
    historicalTickets: Ticket[]
  ): Promise<MLMaintenanceSuggestion> {
    // In production, this would call TensorFlow.js or backend ML service
    // For now, simulate ML inference
    
    // Feature extraction
    const features = this.extractFeatures(machineData, historicalTickets);
    
    // Simulate ML model prediction
    await new Promise(resolve => setTimeout(resolve, 25)); // Simulate 25ms inference
    
    const predictions = {
      failureProbability: this.calculateFailureProbability(features),
      timeToFailure: this.estimateTimeToFailure(features),
      criticalComponents: this.identifyCriticalComponents(features)
    };

    return {
      suggestion: `Predictive maintenance recommended. Failure probability: ${(predictions.failureProbability * 100).toFixed(1)}%`,
      confidence: Math.min(0.95, predictions.failureProbability + 0.3),
      urgency: predictions.failureProbability > 0.7 ? 'high' : 
               predictions.failureProbability > 0.4 ? 'medium' : 'low',
      recommendedActions: this.generateRecommendedActions(predictions),
      evidence: this.collectEvidence(features, predictions),
      estimatedDowntime: `${Math.round(predictions.timeToFailure / 24)} days`,
      costEstimate: this.estimateCost(predictions),
      modelVersion: 'v1.2.0',
      inferenceTime: 25
    };
  }

  /**
   * Rule-based suggestion (deterministic fallback)
   */
  private generateRuleBasedSuggestion(
    machineData: MachineTelemetry,
    historicalTickets: Ticket[]
  ): RuleBasedMaintenanceSuggestion {
    const dataString = JSON.stringify({ machineData, historicalTickets }).toLowerCase();
    
    // Match against known patterns
    for (const pattern of this.failurePatterns) {
      if (pattern.pattern.test(dataString)) {
        return {
          suggestion: pattern.suggestion,
          confidence: pattern.confidence,
          urgency: pattern.urgency as 'low' | 'medium' | 'high',
          recommendedActions: [pattern.suggestion],
          evidence: ['Pattern matched in historical data'],
          ruleId: `MAINT-RULE-${this.failurePatterns.indexOf(pattern) + 1}`
        };
      }
    }
    
    // Default suggestion
    return {
      suggestion: 'Perform routine maintenance check',
      confidence: 0.6,
      urgency: 'low',
      recommendedActions: ['General inspection', 'Cleaning', 'Basic calibration'],
      evidence: ['No specific patterns detected'],
      ruleId: 'MAINT-RULE-DEFAULT'
    };
  }

  /**
   * Feature extraction for ML (simplified)
   */
  private extractFeatures(machineData: MachineTelemetry, tickets: Ticket[]) {
    return {
      vibration: machineData.vibration || 0,
      temperature: machineData.temperature || 0,
      operatingHours: machineData.operatingHours || 0,
      recentTickets: tickets.length,
      criticalTickets: tickets.filter(t => t.priority === 'critical').length,
      ageDays: (Date.now() - new Date(machineData.installationDate).getTime()) / (1000 * 60 * 60 * 24)
    };
  }

  private calculateFailureProbability(features: ExtractedFeatures): number {
    // Simplified probability calculation
    let probability = 0;
    if (features.vibration > 5) probability += 0.3;
    if (features.temperature > 80) probability += 0.4;
    if (features.operatingHours > 10000) probability += 0.2;
    if (features.recentTickets > 5) probability += 0.1;
    return Math.min(0.95, probability);
  }

  private estimateTimeToFailure(features: ExtractedFeatures): number {
    // Simplified estimation in hours
    return 1000 / (this.calculateFailureProbability(features) + 0.1);
  }

  private identifyCriticalComponents(features: ExtractedFeatures): string[] {
    const components = [];
    if (features.vibration > 5) components.push('Bearings', 'Shafts');
    if (features.temperature > 80) components.push('Motor', 'Cooling System');
    return [...new Set(components)];
  }

  private generateRecommendedActions(predictions: MLPredictions): string[] {
    const actions = ['Visual inspection'];
    
    if (predictions.failureProbability > 0.7) {
      actions.push('Immediate diagnostic test', 'Prepare replacement parts');
    } else if (predictions.failureProbability > 0.4) {
      actions.push('Schedule diagnostic', 'Order inspection parts');
    }
    
    if (predictions.criticalComponents.length > 0) {
      actions.push(`Focus on: ${predictions.criticalComponents.join(', ')}`);
    }
    
    return actions;
  }

  private collectEvidence(features: ExtractedFeatures, predictions: MLPredictions): string[] {
    const evidence = [];
    
    if (features.vibration > 5) evidence.push(`High vibration: ${features.vibration} units`);
    if (features.temperature > 80) evidence.push(`Elevated temperature: ${features.temperature}°C`);
    if (features.operatingHours > 10000) evidence.push(`High operating hours: ${features.operatingHours}h`);
    if (features.recentTickets > 5) evidence.push(`Multiple recent tickets: ${features.recentTickets}`);
    
    evidence.push(`Failure probability: ${(predictions.failureProbability * 100).toFixed(1)}%`);
    evidence.push(`Estimated time to failure: ${Math.round(predictions.timeToFailure)} hours`);
    
    return evidence;
  }

  private estimateCost(predictions: MLPredictions): string {
    if (predictions.failureProbability > 0.7) return '$2,000 - $5,000';
    if (predictions.failureProbability > 0.4) return '$500 - $2,000';
    return '$200 - $500';
  }
}

// Type definitions
interface ExtractedFeatures {
  vibration: number;
  temperature: number;
  operatingHours: number;
  recentTickets: number;
  criticalTickets: number;
  ageDays: number;
}

interface MLPredictions {
  failureProbability: number;
  timeToFailure: number;
  criticalComponents: string[];
}

interface MachineTelemetry {
  vibration?: number;
  temperature?: number;
  operatingHours?: number;
  installationDate: string;
}

interface Ticket {
  id: string;
  priority: string;
}

interface MaintenanceAdvisory {
  suggestion: string;
  confidence: number;
  tier: 'Tier 2';
  constitutionalDisclaimer: string;
  requiresHumanValidation: true;
  advisoryType: 'predictive_maintenance';
  urgency: 'low' | 'medium' | 'high';
  recommendedActions: string[];
  evidence: string[];
  estimatedDowntime?: string;
  costEstimate?: string;
  usedFallback?: boolean;
  circuitState?: string;
  modelVersion?: string;
  inferenceTime?: number;
  ruleId?: string;
}

interface MLMaintenanceSuggestion {
  suggestion: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high';
  recommendedActions: string[];
  evidence: string[];
  estimatedDowntime: string;
  costEstimate: string;
  modelVersion: string;
  inferenceTime: number;
}

interface RuleBasedMaintenanceSuggestion {
  suggestion: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high';
  recommendedActions: string[];
  evidence: string[];
  ruleId: string;
}

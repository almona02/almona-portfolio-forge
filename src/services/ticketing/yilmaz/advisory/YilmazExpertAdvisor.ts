/**
 * @tier Tier 2 Advisory (Expert System)
 * @constitutional_compliance AICS-001 §5.6 (Advisory only, requires human validation)
 * @authority Advisory - No execution, recommendation only
 * @region Egypt-specific YILMAZ expert system
 * 
 * GOVERNANCE:
 * - This is a Tier 2 component: it provides ADVISORY suggestions only
 * - All outputs must include AICS-001 disclaimer
 * - Technician input is correlated with deterministic rules from YilmazEgyptRules (Tier 3)
 * - No direct machine control or ticket creation (requires human approval)
 * - Confidence scoring is mandatory
 */

import {
  yilmazEgyptRulesEngine,
  YilmazTechnicianInput,
  YilmazRuleResult,
  YilmazMachineModel,
  YILMAZ_EGYPT_PARTS,
  YilmazPartNumber
} from '../rules/YilmazEgyptRules';

import { AdvisoryHardener } from '../../../../lib/ticketing/advisory/AdvisoryHardener';
import { AdvisoryMetrics } from '../../../../lib/ticketing/advisory/AdvisoryMetrics';
import { AdvisoryCircuitBreaker } from '../../../../lib/ticketing/advisory/CircuitBreaker';

/**
 * YILMAZ Expert Advisory Output
 */
export interface YilmazExpertAdvisory {
  // AICS-001 Compliance
  tier: 'Tier 2';
  constitutionalDisclaimer: string;
  requiresHumanValidation: true;
  
  // Advisory Content (Bilingual)
  suggestionEn: string;
  suggestionAr: string;
  confidence: number; // 0.0-1.0
  urgency: 'low' | 'medium' | 'high' | 'critical';
  
  // Rule Correlation
  ruleMatched: boolean;
  ruleId?: string;
  category?: string;
  
  // Maintenance Plan
  recommendedParts: Array<{
    partNumber: string;
    nameEn: string;
    nameAr: string;
    priceEGP: number;
    stockLevel: string;
    leadTimeDays: number;
    critical?: boolean;
  }>;
  preventiveActionsEn: string[];
  preventiveActionsAr: string[];
  estimatedDowntimeHours: number;
  totalCostEGP: number;
  
  // Seasonal/Environmental
  seasonalWarningEn?: string;
  seasonalWarningAr?: string;
  
  // Technical Context
  machineModel: YilmazMachineModel;
  machineSerial: string;
  technicianInputSummary: string;
  
  // Ticket Drafts (for human approval)
  suggestedTicketTitle: string;
  suggestedTicketTitleAr: string;
  suggestedTicketDescription: string;
  suggestedTicketDescriptionAr: string;
  suggestedTicketPriority: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
  
  // Advisory Metadata
  advisoryTimestamp: string;
  advisoryId: string;
  usedFallback?: boolean;
}

/**
 * YILMAZ Expert Advisor (Tier 2)
 * 
 * This component takes manual technician input and correlates it with
 * deterministic Egypt-specific rules. It provides bilingual (EN/AR) advisory
 * suggestions with confidence scoring.
 */
export class YilmazExpertAdvisor {
  private circuitBreaker = new AdvisoryCircuitBreaker();
  private metrics = new AdvisoryMetrics();

  /**
   * Generate expert advisory based on technician input
   */
  async generateAdvisory(input: YilmazTechnicianInput): Promise<YilmazExpertAdvisory> {
    const startTime = performance.now();
    const advisoryId = this.generateAdvisoryId();

    try {
      // Validate input first
      const validation = yilmazEgyptRulesEngine.validateInput(input);
      if (!validation.valid) {
        throw new Error(`Invalid technician input: ${validation.errors.join(', ')}`);
      }

      // Execute deterministic rules (Tier 3)
      const ruleResult = await this.circuitBreaker.execute('yilmaz-rules', async () => {
        return yilmazEgyptRulesEngine.executeRules(input);
      });

      // Build advisory from rule result
      const advisory = this.buildAdvisory(input, ruleResult, advisoryId);

      // Apply constitutional hardening (AICS-001 compliance)
      const hardenedAdvisory = this.applyConstitutionalHardening(advisory);

      const responseTime = performance.now() - startTime;

      // Record metrics
      this.metrics.record({
        type: 'generation',
        advisoryType: 'yilmaz_expert',
        success: true,
        responseTime,
        timestamp: Date.now()
      });

      return hardenedAdvisory;

    } catch (error) {
      const responseTime = performance.now() - startTime;

      this.metrics.record({
        type: 'generation',
        advisoryType: 'yilmaz_expert',
        success: false,
        responseTime,
        timestamp: Date.now()
      });

      // Return safe fallback advisory
      return this.createFallbackAdvisory(input, advisoryId);
    }
  }

  /**
   * Build advisory from rule result
   */
  private buildAdvisory(
    input: YilmazTechnicianInput,
    ruleResult: YilmazRuleResult,
    advisoryId: string
  ): YilmazExpertAdvisory {
    
    // Calculate confidence based on rule match and input completeness
    const confidence = this.calculateConfidence(input, ruleResult);

    // Build suggestions
    const suggestionEn = ruleResult.ruleMatched
      ? this.buildSuggestionEn(input, ruleResult)
      : 'No specific issue detected. Recommend routine maintenance inspection.';

    const suggestionAr = ruleResult.ruleMatched
      ? this.buildSuggestionAr(input, ruleResult)
      : 'لم يتم اكتشاف مشكلة محددة. يوصى بفحص الصيانة الروتيني.';

    // Build ticket drafts
    const ticketDrafts = this.buildTicketDrafts(input, ruleResult);

    // Build technician input summary
    const technicianInputSummary = this.buildInputSummary(input);

    return {
      tier: 'Tier 2',
      constitutionalDisclaimer: this.getConstitutionalDisclaimer(),
      requiresHumanValidation: true,
      
      suggestionEn,
      suggestionAr,
      confidence,
      urgency: ruleResult.urgency,
      
      ruleMatched: ruleResult.ruleMatched,
      ruleId: ruleResult.ruleId,
      category: ruleResult.category,
      
      recommendedParts: ruleResult.recommendedParts.map(part => ({
        partNumber: part.partNumber,
        nameEn: part.name,
        nameAr: part.nameAr,
        priceEGP: part.priceEGP,
        stockLevel: part.stockLevel,
        leadTimeDays: part.leadTimeDays,
        critical: part.critical
      })),
      preventiveActionsEn: ruleResult.preventiveActions,
      preventiveActionsAr: ruleResult.preventiveActionsAr,
      estimatedDowntimeHours: ruleResult.estimatedDowntimeHours,
      totalCostEGP: ruleResult.totalCostEGP,
      
      seasonalWarningEn: ruleResult.seasonalWarning,
      seasonalWarningAr: ruleResult.seasonalWarningAr,
      
      machineModel: input.machineModel,
      machineSerial: input.machineSerial,
      technicianInputSummary,
      
      suggestedTicketTitle: ticketDrafts.titleEn,
      suggestedTicketTitleAr: ticketDrafts.titleAr,
      suggestedTicketDescription: ticketDrafts.descriptionEn,
      suggestedTicketDescriptionAr: ticketDrafts.descriptionAr,
      suggestedTicketPriority: this.mapUrgencyToPriority(ruleResult.urgency),
      
      advisoryTimestamp: new Date().toISOString(),
      advisoryId,
      usedFallback: false
    };
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(input: YilmazTechnicianInput, ruleResult: YilmazRuleResult): number {
    let confidence = 0.5; // Base confidence

    // Rule matched increases confidence
    if (ruleResult.ruleMatched) {
      confidence += 0.3;
    }

    // More sensor readings = higher confidence
    const sensorReadings = [
      input.hydraulicPressureBar,
      input.spindleTempCelsius,
      input.inputVoltage,
      input.dustLevel,
      input.ambientTempCelsius
    ].filter(x => x !== undefined).length;

    confidence += (sensorReadings / 5) * 0.15;

    // Symptom descriptions increase confidence
    if (input.symptoms.length > 0) {
      confidence += 0.05;
    }

    // Maintenance history increases confidence
    if (input.lastMaintenanceDate) {
      confidence += 0.05;
    }

    // Cap at 0.95 (never 1.0 for advisory systems)
    return Math.min(0.95, confidence);
  }

  /**
   * Build English suggestion
   */
  private buildSuggestionEn(input: YilmazTechnicianInput, ruleResult: YilmazRuleResult): string {
    const rule = ruleResult.ruleId ? yilmazEgyptRulesEngine.getRuleById(ruleResult.ruleId) : null;
    const ruleName = rule?.nameEn || 'Generic Maintenance Issue';

    let suggestion = `YILMAZ ${input.machineModel} (S/N: ${input.machineSerial}) — ${ruleName}\n\n`;
    suggestion += `Based on technician readings and 24 years of YILMAZ Egypt experience, the following maintenance is recommended:\n\n`;
    suggestion += `**Urgency:** ${ruleResult.urgency.toUpperCase()}\n`;
    suggestion += `**Estimated Downtime:** ${ruleResult.estimatedDowntimeHours} hours\n`;
    suggestion += `**Total Parts Cost:** ${ruleResult.totalCostEGP.toLocaleString('en-EG')} EGP\n\n`;

    if (ruleResult.recommendedParts.length > 0) {
      suggestion += `**Required Parts:**\n`;
      ruleResult.recommendedParts.forEach(part => {
        const critical = part.critical ? ' [CRITICAL]' : '';
        suggestion += `- ${part.name}${critical} (${part.partNumber}) — ${part.priceEGP.toLocaleString('en-EG')} EGP\n`;
        suggestion += `  Stock: ${part.stockLevel}, Lead Time: ${part.leadTimeDays} days\n`;
      });
      suggestion += `\n`;
    }

    if (ruleResult.seasonalWarning) {
      suggestion += `${ruleResult.seasonalWarning}\n\n`;
    }

    return suggestion.trim();
  }

  /**
   * Build Arabic suggestion
   */
  private buildSuggestionAr(input: YilmazTechnicianInput, ruleResult: YilmazRuleResult): string {
    const rule = ruleResult.ruleId ? yilmazEgyptRulesEngine.getRuleById(ruleResult.ruleId) : null;
    const ruleName = rule?.nameAr || 'مشكلة صيانة عامة';

    let suggestion = `YILMAZ ${input.machineModel} (رقم تسلسلي: ${input.machineSerial}) — ${ruleName}\n\n`;
    suggestion += `بناءً على قراءات الفني و24 عامًا من خبرة YILMAZ مصر، يوصى بالصيانة التالية:\n\n`;
    suggestion += `**الإلحاح:** ${this.mapUrgencyToArabic(ruleResult.urgency)}\n`;
    suggestion += `**وقت التوقف المقدر:** ${ruleResult.estimatedDowntimeHours} ساعة\n`;
    suggestion += `**إجمالي تكلفة القطع:** ${ruleResult.totalCostEGP.toLocaleString('ar-EG')} جنيه\n\n`;

    if (ruleResult.recommendedParts.length > 0) {
      suggestion += `**القطع المطلوبة:**\n`;
      ruleResult.recommendedParts.forEach(part => {
        const critical = part.critical ? ' [حرج]' : '';
        suggestion += `- ${part.nameAr}${critical} (${part.partNumber}) — ${part.priceEGP.toLocaleString('ar-EG')} جنيه\n`;
        suggestion += `  المخزون: ${this.mapStockLevelToArabic(part.stockLevel)}، وقت التسليم: ${part.leadTimeDays} أيام\n`;
      });
      suggestion += `\n`;
    }

    if (ruleResult.seasonalWarningAr) {
      suggestion += `${ruleResult.seasonalWarningAr}\n\n`;
    }

    return suggestion.trim();
  }

  /**
   * Build ticket drafts
   */
  private buildTicketDrafts(input: YilmazTechnicianInput, ruleResult: YilmazRuleResult) {
    const rule = ruleResult.ruleId ? yilmazEgyptRulesEngine.getRuleById(ruleResult.ruleId) : null;

    const titleEn = ruleResult.ruleMatched
      ? `${input.machineModel} - ${rule?.nameEn || 'Maintenance Required'}`
      : `${input.machineModel} - Routine Maintenance`;

    const titleAr = ruleResult.ruleMatched
      ? `${input.machineModel} - ${rule?.nameAr || 'صيانة مطلوبة'}`
      : `${input.machineModel} - صيانة روتينية`;

    let descriptionEn = `Machine: YILMAZ ${input.machineModel}\n`;
    descriptionEn += `Serial: ${input.machineSerial}\n`;
    descriptionEn += `Location: ${input.location}\n\n`;
    descriptionEn += `**Technician Readings:**\n`;
    if (input.hydraulicPressureBar !== undefined) descriptionEn += `- Hydraulic Pressure: ${input.hydraulicPressureBar} bar\n`;
    if (input.spindleTempCelsius !== undefined) descriptionEn += `- Spindle Temperature: ${input.spindleTempCelsius}°C\n`;
    if (input.inputVoltage !== undefined) descriptionEn += `- Input Voltage: ${input.inputVoltage}V\n`;
    if (input.dustLevel !== undefined) descriptionEn += `- Dust Level: ${input.dustLevel}/5\n`;
    if (input.ambientTempCelsius !== undefined) descriptionEn += `- Ambient Temperature: ${input.ambientTempCelsius}°C\n`;
    descriptionEn += `\n**Reported Symptoms:** ${input.symptoms.join(', ')}\n\n`;
    descriptionEn += `**Recommended Actions:**\n${ruleResult.preventiveActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\n`;
    descriptionEn += `**Estimated Cost:** ${ruleResult.totalCostEGP.toLocaleString('en-EG')} EGP\n`;
    descriptionEn += `**Estimated Downtime:** ${ruleResult.estimatedDowntimeHours} hours\n`;

    let descriptionAr = `الآلة: YILMAZ ${input.machineModel}\n`;
    descriptionAr += `الرقم التسلسلي: ${input.machineSerial}\n`;
    descriptionAr += `الموقع: ${this.mapLocationToArabic(input.location)}\n\n`;
    descriptionAr += `**قراءات الفني:**\n`;
    if (input.hydraulicPressureBar !== undefined) descriptionAr += `- الضغط الهيدروليكي: ${input.hydraulicPressureBar} بار\n`;
    if (input.spindleTempCelsius !== undefined) descriptionAr += `- درجة حرارة المحور: ${input.spindleTempCelsius}°م\n`;
    if (input.inputVoltage !== undefined) descriptionAr += `- جهد الدخل: ${input.inputVoltage} فولت\n`;
    if (input.dustLevel !== undefined) descriptionAr += `- مستوى الغبار: ${input.dustLevel}/5\n`;
    if (input.ambientTempCelsius !== undefined) descriptionAr += `- درجة الحرارة المحيطة: ${input.ambientTempCelsius}°م\n`;
    descriptionAr += `\n**الأعراض المبلغ عنها:** ${input.symptoms.join('، ')}\n\n`;
    descriptionAr += `**الإجراءات الموصى بها:**\n${ruleResult.preventiveActionsAr.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\n`;
    descriptionAr += `**التكلفة المقدرة:** ${ruleResult.totalCostEGP.toLocaleString('ar-EG')} جنيه\n`;
    descriptionAr += `**وقت التوقف المقدر:** ${ruleResult.estimatedDowntimeHours} ساعة\n`;

    return {
      titleEn,
      titleAr,
      descriptionEn,
      descriptionAr
    };
  }

  /**
   * Build technician input summary
   */
  private buildInputSummary(input: YilmazTechnicianInput): string {
    const readings = [];
    if (input.hydraulicPressureBar !== undefined) readings.push(`Hydraulic: ${input.hydraulicPressureBar}bar`);
    if (input.spindleTempCelsius !== undefined) readings.push(`Spindle: ${input.spindleTempCelsius}°C`);
    if (input.inputVoltage !== undefined) readings.push(`Voltage: ${input.inputVoltage}V`);
    if (input.dustLevel !== undefined) readings.push(`Dust: ${input.dustLevel}/5`);
    if (input.ambientTempCelsius !== undefined) readings.push(`Ambient: ${input.ambientTempCelsius}°C`);

    return `${input.machineModel} (${input.machineSerial}) | ${readings.join(', ')} | Symptoms: ${input.symptoms.join(', ')}`;
  }

  /**
   * Create fallback advisory (when rules engine fails)
   */
  private createFallbackAdvisory(input: YilmazTechnicianInput, advisoryId: string): YilmazExpertAdvisory {
    return {
      tier: 'Tier 2',
      constitutionalDisclaimer: this.getConstitutionalDisclaimer(),
      requiresHumanValidation: true,
      
      suggestionEn: 'Advisory service temporarily unavailable. Please schedule routine maintenance inspection.',
      suggestionAr: 'خدمة الاستشارات غير متاحة مؤقتًا. يرجى جدولة فحص الصيانة الروتيني.',
      confidence: 0.5,
      urgency: 'low',
      
      ruleMatched: false,
      
      recommendedParts: [],
      preventiveActionsEn: ['Schedule routine inspection', 'Verify all readings with senior technician'],
      preventiveActionsAr: ['جدولة الفحص الروتيني', 'التحقق من جميع القراءات مع فني أول'],
      estimatedDowntimeHours: 2,
      totalCostEGP: 0,
      
      machineModel: input.machineModel,
      machineSerial: input.machineSerial,
      technicianInputSummary: this.buildInputSummary(input),
      
      suggestedTicketTitle: `${input.machineModel} - Routine Maintenance`,
      suggestedTicketTitleAr: `${input.machineModel} - صيانة روتينية`,
      suggestedTicketDescription: 'Routine maintenance inspection required.',
      suggestedTicketDescriptionAr: 'فحص الصيانة الروتيني مطلوب.',
      suggestedTicketPriority: 'low',
      
      advisoryTimestamp: new Date().toISOString(),
      advisoryId,
      usedFallback: true
    };
  }

  /**
   * Apply constitutional hardening (AICS-001 compliance)
   */
  private applyConstitutionalHardening(advisory: YilmazExpertAdvisory): YilmazExpertAdvisory {
    // Ensure disclaimer is always present
    advisory.constitutionalDisclaimer = this.getConstitutionalDisclaimer();
    
    // Ensure requiresHumanValidation is always true
    advisory.requiresHumanValidation = true;
    
    // Ensure tier is always Tier 2
    advisory.tier = 'Tier 2';
    
    // Cap confidence at 0.95
    advisory.confidence = Math.min(0.95, advisory.confidence);
    
    return advisory;
  }

  /**
   * Get AICS-001 constitutional disclaimer
   */
  private getConstitutionalDisclaimer(): string {
    return `⚖️ AICS-001 TIER 2 ADVISORY: This is an expert advisory based on deterministic rules and technician input. It is NOT an autonomous diagnosis or repair instruction. A qualified YILMAZ technician MUST validate all recommendations before execution. This advisory does not constitute a warranty claim or service guarantee. All physical maintenance actions require explicit human authorization.`;
  }

  /**
   * Generate unique advisory ID
   */
  private generateAdvisoryId(): string {
    return `YIL-ADV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Map urgency to ticket priority
   */
  private mapUrgencyToPriority(urgency: 'low' | 'medium' | 'high' | 'critical'): 'low' | 'medium' | 'high' | 'urgent' | 'critical' {
    const map: Record<string, 'low' | 'medium' | 'high' | 'urgent' | 'critical'> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'critical'
    };
    return map[urgency] || 'medium';
  }

  /**
   * Map urgency to Arabic
   */
  private mapUrgencyToArabic(urgency: string): string {
    const map: Record<string, string> = {
      'low': 'منخفض',
      'medium': 'متوسط',
      'high': 'عالي',
      'critical': 'حرج'
    };
    return map[urgency] || 'متوسط';
  }

  /**
   * Map stock level to Arabic
   */
  private mapStockLevelToArabic(stockLevel: string): string {
    const map: Record<string, string> = {
      'high': 'عالي',
      'medium': 'متوسط',
      'low': 'منخفض'
    };
    return map[stockLevel] || 'متوسط';
  }

  /**
   * Map location to Arabic
   */
  private mapLocationToArabic(location: string): string {
    const map: Record<string, string> = {
      'cairo': 'القاهرة',
      'giza': 'الجيزة',
      'alexandria': 'الإسكندرية',
      'suez': 'السويس',
      'port_said': 'بورسعيد',
      'other': 'آخر'
    };
    return map[location] || location;
  }
}

/**
 * Singleton instance (Tier 2 advisory)
 */
export const yilmazExpertAdvisor = new YilmazExpertAdvisor();

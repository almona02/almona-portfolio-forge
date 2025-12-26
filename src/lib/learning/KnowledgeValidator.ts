/**
 * Knowledge Validator - The Judge
 * 
 * Validates user claims against three layers:
 * 1. Physics (immutable truth)
 * 2. System Logic (documentation)
 * 3. Subjective Claims (deep reasoning)
 */

import { DocumentationKnowledgeGraph } from '@/lib/ydt/DocumentationKnowledgeGraph';

export interface ValidationResult {
  valid: boolean;
  confidence: number; // 0.0 to 1.0
  reason?: string;
  reasonArabic?: string;
  classification?: 'fact' | 'trick' | 'price_intel' | 'supplier_review' | 'safety_warning' | 'material_advice';
  physicsCheck?: PhysicsCheck;
  systemCheck?: SystemCheck;
  subjectiveCheck?: SubjectiveCheck;
}

export interface PhysicsCheck {
  pass: boolean;
  reason: string;
  reasonArabic: string;
}

export interface SystemCheck {
  pass: boolean;
  contradicts: boolean;
  reason: string;
  reasonArabic: string;
}

export interface SubjectiveCheck {
  plausible: boolean;
  confidence: number;
  type: ValidationResult['classification'];
  reasoning: string;
  reasoningArabic: string;
}

export interface ClaimContext {
  claim: string;
  userId: string;
  userType?: 'technical_office' | 'workshop_owner' | 'operator' | 'beginner' | 'maalem';
  location?: string;
  category?: string;
}

/**
 * Knowledge Validator - The Judge
 */
export class KnowledgeValidator {
  private knowledgeGraph: DocumentationKnowledgeGraph;

  constructor() {
    this.knowledgeGraph = new DocumentationKnowledgeGraph();
  }

  /**
   * Evaluate a user claim
   */
  async evaluateClaim(context: ClaimContext): Promise<ValidationResult> {
    const { claim } = context;

    // 1. Physics Check (Immutable Truth)
    const physicsCheck = await this.checkPhysics(claim);
    if (!physicsCheck.pass) {
      return {
        valid: false,
        confidence: 0.0,
        reason: physicsCheck.reason,
        reasonArabic: physicsCheck.reasonArabic,
        physicsCheck,
      };
    }

    // 2. System Logic Check (Documentation)
    const systemCheck = await this.checkDocumentation(claim);
    if (systemCheck.contradicts) {
      return {
        valid: false,
        confidence: 0.1,
        reason: systemCheck.reason,
        reasonArabic: systemCheck.reasonArabic,
        physicsCheck,
        systemCheck,
      };
    }

    // 3. Subjective Claim Check (Deep Reasoning)
    const subjectiveCheck = await this.reasonAboutSubjectiveClaim(claim, context);

    return {
      valid: subjectiveCheck.plausible,
      confidence: subjectiveCheck.confidence,
      reason: subjectiveCheck.reasoning,
      reasonArabic: subjectiveCheck.reasoningArabic,
      classification: subjectiveCheck.type,
      physicsCheck,
      systemCheck,
      subjectiveCheck,
    };
  }

  /**
   * Check against physics (immutable truth)
   */
  private async checkPhysics(claim: string): Promise<PhysicsCheck> {
    const lowerClaim = claim.toLowerCase();

    // Physics violations
    const violations = [
      {
        pattern: /قطع\s*(\d+)\s*متر\s*من\s*(\d+)\s*متر/i,
        check: (match: RegExpMatchArray) => {
          const cutLength = parseFloat(match[1]);
          const stockLength = parseFloat(match[2]);
          return cutLength <= stockLength;
        },
        reason: 'Cannot cut longer piece from shorter stock',
        reasonArabic: 'مش ممكن تقطع قطعة أطول من الخام الأصلي',
      },
      {
        pattern: /وزن\s*(\d+)\s*كيلو\s*أقل\s*من\s*(\d+)\s*كيلو/i,
        check: (match: RegExpMatchArray) => {
          const weight1 = parseFloat(match[1]);
          const weight2 = parseFloat(match[2]);
          return weight1 < weight2;
        },
        reason: 'Weight comparison logic error',
        reasonArabic: 'المنطق في المقارنة غلط',
      },
    ];

    for (const violation of violations) {
      const match = claim.match(violation.pattern);
      if (match && !violation.check(match)) {
        return {
          pass: false,
          reason: violation.reason,
          reasonArabic: violation.reasonArabic,
        };
      }
    }

    // Safety violations
    if (/استخدام\s*([^،]+)\s*بدون\s*حماية/i.test(claim) && 
        /نار|كهرباء|سائل\s*قابل\s*للاشتعال/i.test(claim)) {
      return {
        pass: false,
        reason: 'Safety violation detected',
        reasonArabic: 'تحذير أمان: العملية دي خطيرة',
      };
    }

    return {
      pass: true,
      reason: 'No physics violations detected',
      reasonArabic: 'لا توجد مخالفات فيزيائية',
    };
  }

  /**
   * Check against system documentation
   */
  private async checkDocumentation(claim: string): Promise<SystemCheck> {
    // Query knowledge graph for contradictions
    const query = this.knowledgeGraph.query({
      type: 'system',
      keyword: claim.substring(0, 50), // First 50 chars
    });

    // Check for direct contradictions
    const contradictions = [
      {
        pattern: /الماكينة\s*تقبل\s*DXF\s*نسخة\s*(\d+)/i,
        documented: 'R12',
        reason: 'DXF version mismatch',
        reasonArabic: 'نسخة DXF المذكورة في الوثائق مختلفة',
      },
      {
        pattern: /البروفايل\s*(\d+)\s*مم\s*يدعم\s*([^،]+)/i,
        documented: 'Standard profiles',
        reason: 'Profile capability mismatch',
        reasonArabic: 'قدرات البروفايل مختلفة عن المذكور',
      },
    ];

    for (const contradiction of contradictions) {
      const match = claim.match(contradiction.pattern);
      if (match) {
        // Would check against actual documentation
        // For now, return neutral
        return {
          pass: true,
          contradicts: false,
          reason: 'No documented contradiction found',
          reasonArabic: 'لا يوجد تناقض مع الوثائق',
        };
      }
    }

    return {
      pass: true,
      contradicts: false,
      reason: 'No system contradictions',
      reasonArabic: 'لا يوجد تناقض مع النظام',
    };
  }

  /**
   * Deep reasoning about subjective claims
   */
  private async reasonAboutSubjectiveClaim(
    claim: string,
    context: ClaimContext
  ): Promise<SubjectiveCheck> {
    const lowerClaim = claim.toLowerCase();

    // Classify claim type
    let classification: ValidationResult['classification'] = 'fact';
    let plausible = true;
    let confidence = 0.7;
    let reasoning = 'Claim is plausible but needs verification';
    let reasoningArabic = 'الكلام منطقي بس محتاج تأكيد';

    // Price intelligence
    if (/سعر|تكلفة|بكام|جنيه/i.test(claim) && /\d+/.test(claim)) {
      classification = 'price_intel';
      const priceMatch = claim.match(/(\d+(?:,\d+)*)\s*جنيه/i);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        // Check if price is within reasonable range (would check market data)
        if (price > 0 && price < 100000) {
          plausible = true;
          confidence = 0.6; // Price claims need verification
          reasoning = 'Price claim is within reasonable range but needs market verification';
          reasoningArabic = 'السعر في نطاق معقول بس محتاج تأكيد من السوق';
        } else {
          plausible = false;
          confidence = 0.2;
          reasoning = 'Price claim is outside reasonable range';
          reasoningArabic = 'السعر خارج النطاق المعقول';
        }
      }
    }

    // Supplier review
    else if (/مورد|تاجر|محل|([^،]+)\s*في\s*([^،]+)\s*(جيد|سيء|نضيف|خداع)/i.test(claim)) {
      classification = 'supplier_review';
      plausible = true;
      confidence = 0.5; // Subjective, needs multiple confirmations
      reasoning = 'Supplier review is subjective and needs multiple confirmations';
      reasoningArabic = 'رأي المورد ذاتي ومحتاج تأكيدات متعددة';
    }

    // Material trick/advice
    else if (/استخدام|طريقة|خدعة|نصيحة/i.test(claim) && 
             /(سولار|ديزل|زيت|مادة)/i.test(claim)) {
      classification = 'trick';
      plausible = true;
      confidence = 0.7;
      reasoning = 'Workshop trick is plausible but needs safety verification';
      reasoningArabic = 'الخدعة منطقية بس محتاجة فحص أمان';
    }

    // Safety warning
    else if (/تحذير|خطر|احذر|ممنوع/i.test(claim)) {
      classification = 'safety_warning';
      plausible = true;
      confidence = 0.9; // Safety warnings are high priority
      reasoning = 'Safety warning should be taken seriously';
      reasoningArabic = 'تحذير الأمان مهم جداً';
    }

    // Material advice
    else if (/استخدم|استعمل|خشب|ألومنيوم|UPVC/i.test(claim)) {
      classification = 'material_advice';
      plausible = true;
      confidence = 0.6;
      reasoning = 'Material advice is context-dependent and needs verification';
      reasoningArabic = 'نصيحة المواد تعتمد على السياق ومحتاجة تأكيد';
    }

    // General fact
    else {
      classification = 'fact';
      plausible = true;
      confidence = 0.5;
      reasoning = 'General claim needs verification';
      reasoningArabic = 'المعلومة العامة محتاجة تأكيد';
    }

    return {
      plausible,
      confidence,
      type: classification,
      reasoning,
      reasoningArabic,
    };
  }
}


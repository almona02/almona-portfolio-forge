/**
 * Cash Flow Optimizer - Payment Term Intelligence
 * 
 * Optimizes payment terms based on Egyptian workshop reality:
 * - Customer type (contractor vs homeowner)
 * - Project size
 * - Workshop cash flow situation
 * - Maalem payment wisdom
 */

export interface PaymentTerms {
  terms: string;
  breakdown: {
    advance: number; // percentage
    milestone1?: number;
    milestone2?: number;
    final: number;
  };
  reason: string;
  reasonArabic: string;
  maalemTip: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CashFlowContext {
  customerType: 'contractor' | 'homeowner' | 'villa_owner' | 'government';
  projectValue: number;
  workshopCashFlow: 'tight' | 'normal' | 'comfortable';
  customerHistory?: {
    paymentDelay: number; // average days late
    defaultRate: number; // percentage
  };
}

/**
 * Cash Flow Optimizer
 */
export class CashFlowOptimizer {
  /**
   * Recommend payment terms based on context
   */
  async recommendPaymentTerms(context: CashFlowContext): Promise<PaymentTerms> {
    if (context.customerType === 'contractor') {
      return this.getContractorTerms(context);
    } else if (context.customerType === 'homeowner') {
      return this.getHomeownerTerms(context);
    } else if (context.customerType === 'villa_owner') {
      return this.getVillaOwnerTerms(context);
    } else {
      return this.getGovernmentTerms(context);
    }
  }

  /**
   * Payment terms for contractors
   */
  private getContractorTerms(context: CashFlowContext): PaymentTerms {
    return {
      terms: '50% Advance, 40% Delivery, 10% Install',
      breakdown: {
        advance: 50,
        milestone1: 40,
        final: 10,
      },
      reason: 'Contractors delay the final check. Secure your material cost upfront.',
      reasonArabic: 'المقاولين بيدوخوا في الدفعة الأخيرة. خد حق الخامات والمصنعية في الأول.',
      maalemTip: 'المقاول ده هيدوخك في الـ 10% الأخيرة. خد حق الخامات والمصنعية في الأول. لو مش عايز يدفع 50%، خليه يدفع 40% على الأقل عشان تشتري الخامات.',
      riskLevel: context.customerHistory?.defaultRate && context.customerHistory.defaultRate > 0.1 ? 'high' : 'medium',
    };
  }

  /**
   * Payment terms for homeowners
   */
  private getHomeownerTerms(_context: CashFlowContext): PaymentTerms {
    return {
      terms: '40% Advance, 40% Profile Arrival, 20% Finish',
      breakdown: {
        advance: 40,
        milestone1: 40,
        final: 20,
      },
      reason: 'Homeowners feel safer seeing materials on site.',
      reasonArabic: 'الزبون يطمن لما يشوف الخامات نزلت الموقع.',
      maalemTip: 'عشان الزبون يطمن، خليه يدفع دفعة تانية لما يشوف الخشب نزل الموقع. كده هو مطمن وانت كسبت مصاريف الخامات.',
      riskLevel: 'low',
    };
  }

  /**
   * Payment terms for villa owners
   */
  private getVillaOwnerTerms(context: CashFlowContext): PaymentTerms {
    return {
      terms: '30% Advance, 40% During, 30% On Delivery',
      breakdown: {
        advance: 30,
        milestone1: 40,
        final: 30,
      },
      reason: 'Villa owners expect luxury service but may delay final payment.',
      reasonArabic: 'أصحاب الفيلات عايزين خدمة فاخرة بس ممكن يتأخروا في الدفعة الأخيرة.',
      maalemTip: 'صورله كل خطوة، هو عايز يشوف الفلوس بتاعته بتتتصرف فين. خليه يدفع 30% مقدمة، 40% لما تشتغل، و 30% لما يسلم.',
      riskLevel: context.projectValue > 100000 ? 'medium' : 'low',
    };
  }

  /**
   * Payment terms for government projects
   */
  private getGovernmentTerms(_context: CashFlowContext): PaymentTerms {
    return {
      terms: '30% Advance, 70% On Completion (90-day credit)',
      breakdown: {
        advance: 30,
        final: 70,
      },
      reason: 'Government projects have long payment cycles but are reliable.',
      reasonArabic: 'المشاريع الحكومية بيدفعوا متأخر لكن مضمونين.',
      maalemTip: 'المشاريع الحكومية آمنة لكن بيدفعوا بعد 90 يوم. خد 30% مقدمة عشان تشتري الخامات، والباقي هيدفعوه بعد التسليم.',
      riskLevel: 'low', // Government is reliable
    };
  }

  /**
   * Calculate cash flow risk
   */
  calculateCashFlowRisk(
    paymentTerms: PaymentTerms,
    projectValue: number,
    workshopCashFlow: 'tight' | 'normal' | 'comfortable'
  ): {
    risk: 'low' | 'medium' | 'high';
    advice: string;
    adviceArabic: string;
  } {
    const advanceAmount = (projectValue * paymentTerms.breakdown.advance) / 100;
    const materialCost = projectValue * 0.4; // Rough estimate: 40% materials

    // If advance doesn't cover materials and cash flow is tight
    if (advanceAmount < materialCost && workshopCashFlow === 'tight') {
      return {
        risk: 'high',
        advice: 'Advance payment does not cover material costs. Request higher advance or delay project start.',
        adviceArabic: 'الدفعة المقدمة مش بتغطي مصاريف الخامات. اطلب دفعة أعلى أو ابدأ المشروع بعد ما تجيب الخامات.',
      };
    }

    if (advanceAmount < materialCost && workshopCashFlow === 'normal') {
      return {
        risk: 'medium',
        advice: 'Advance covers most materials. Consider requesting 5-10% more advance.',
        adviceArabic: 'الدفعة المقدمة بتغطي معظم الخامات. فكر تطلب 5-10% زيادة.',
      };
    }

    return {
      risk: 'low',
      advice: 'Payment terms are safe for your cash flow.',
      adviceArabic: 'شروط الدفع آمنة لتدفقك النقدي.',
    };
  }
}


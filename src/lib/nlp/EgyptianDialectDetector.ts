/**
 * Egyptian Dialect Detector
 * 
 * Detects user type from question style and dialect
 */

export type UserType = 'technical_office' | 'workshop_owner' | 'operator' | 'beginner' | 'maalem' | 'general';

export interface DialectAnalysis {
  userType: UserType;
  dialect: 'cairo' | 'alexandria' | 'upper_egypt' | 'standard';
  confidence: number;
  indicators: string[];
}

/**
 * Egyptian Dialect Detector
 */
export class EgyptianDialectDetector {
  private patterns = {
    technical_office: [
      /الكود المصري/i,
      /المواصفات القياسية/i,
      /حسب المواصفات/i,
      /الهندسية/i,
      /المواصفات/i,
      /الكود/i,
      /المواصفة/i,
    ],
    workshop_owner: [
      /كام السعر/i,
      /هو ده السعر النهائي/i,
      /في خصم/i,
      /ربنا يبارك/i,
      /السعر/i,
      /الربح/i,
      /الهامش/i,
      /العميل/i,
    ],
    operator: [
      /ليه بيعمل كده/i,
      /هو ده الصح/i,
      /المكنة مش شغالة/i,
      /عايز أعمل إيه/i,
      /المكنة/i,
      /المنشار/i,
      /اللحام/i,
      /الشغل/i,
    ],
    beginner: [
      /ازاي/i,
      /ممكن تساعدني/i,
      /مش فاهم/i,
      /خطوة خطوة/i,
      /كيف/i,
      /شرح/i,
      /تعليم/i,
    ],
    maalem: [
      /يا معلم/i,
      /المعلم/i,
      /الخبرة/i,
      /السنين/i,
      /الورشة/i,
      /الصنايعية/i,
      /الخدعة/i,
      /السر/i,
    ],
  };

  private dialectIndicators = {
    cairo: [
      /إيه/i,
      /عامل إيه/i,
      /ازيك/i,
      /كده/i,
      /يعني/i,
    ],
    alexandria: [
      /إزيك/i,
      /عاملين إيه/i,
      /كده/i,
      /يعني/i,
    ],
    upper_egypt: [
      /إزيك/i,
      /عامل إيه/i,
      /كده/i,
      /يعني/i,
    ],
  };

  /**
   * Detect user type from question
   */
  async detectUserType(question: string): Promise<UserType> {
    const lowerQuestion = question.toLowerCase();

    // Check each pattern
    for (const [type, regexes] of Object.entries(this.patterns)) {
      if (regexes.some(regex => regex.test(lowerQuestion))) {
        return type as UserType;
      }
    }

    return 'general';
  }

  /**
   * Analyze dialect and user type
   */
  async analyzeDialect(question: string): Promise<DialectAnalysis> {
    const userType = await this.detectUserType(question);
    const dialect = this.detectDialect(question);
    const indicators = this.extractIndicators(question);

    return {
      userType,
      dialect,
      confidence: this.calculateConfidence(question, userType),
      indicators,
    };
  }

  /**
   * Detect dialect from question
   */
  private detectDialect(question: string): 'cairo' | 'alexandria' | 'upper_egypt' | 'standard' {
    const lowerQuestion = question.toLowerCase();

    for (const [dialect, indicators] of Object.entries(this.dialectIndicators)) {
      if (indicators.some(indicator => indicator.test(lowerQuestion))) {
        return dialect as 'cairo' | 'alexandria' | 'upper_egypt';
      }
    }

    return 'standard';
  }

  /**
   * Extract indicators from question
   */
  private extractIndicators(question: string): string[] {
    const indicators: string[] = [];
    const lowerQuestion = question.toLowerCase();

    // Check all patterns
    for (const [_type, regexes] of Object.entries(this.patterns)) {
      for (const regex of regexes) {
        const match = lowerQuestion.match(regex);
        if (match) {
          indicators.push(match[0]);
        }
      }
    }

    return indicators;
  }

  /**
   * Calculate confidence in detection
   */
  private calculateConfidence(question: string, userType: UserType): number {
    const lowerQuestion = question.toLowerCase();
    const matchingPatterns = this.patterns[userType].filter(regex => regex.test(lowerQuestion)).length;
    const _totalPatterns = this.patterns[userType].length;

    if (matchingPatterns === 0) return 0.3; // Low confidence
    if (matchingPatterns === 1) return 0.6; // Medium confidence
    if (matchingPatterns >= 2) return 0.9; // High confidence

    return 0.5; // Default
  }
}




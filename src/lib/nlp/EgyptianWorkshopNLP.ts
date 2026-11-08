/**
 * Egyptian Workshop NLP - Understands ALL Egyptian Workshop Dialects
 * 
 * Understands:
 * - Cairo, Alexandria, Upper Egypt accents
 * - Technical office vs small workshop language
 * - Normalizes slang to technical terms
 * - Detects emotion and urgency
 * - Responds in appropriate workshop language
 */

export type EgyptianDialect = 'cairo_shobra' | 'alexandria' | 'upper_egypt' | 'technical_office' | 'small_workshop';
export type UserType = 'technical_office' | 'workshop_owner' | 'operator' | 'beginner' | 'general';
export type EmotionLevel = 'calm' | 'frustrated' | 'urgent' | 'excited' | 'confused';

export interface ParsedQuery {
  original: string;
  normalized: string;
  dialect: EgyptianDialect;
  intent: 'technical' | 'business' | 'problem' | 'learning' | 'pricing';
  entities: {
    materials?: string[];
    dimensions?: { width?: number; height?: number };
    prices?: number[];
    locations?: string[];
  };
  frustration: EmotionLevel;
  urgency: 'low' | 'medium' | 'high';
  userType: UserType;
}

export interface WorkshopResponse {
  technical: string;
  workshop: string;
  simple: string;
  withMannerisms: string;
  nextSteps: string[];
}

/**
 * Egyptian Workshop NLP
 */
export class EgyptianWorkshopNLP {
  // Egyptian Workshop Slang Dictionary
  private slangDictionary: Record<string, string[]> = {
    // Materials
    'الخشب': ['الخشب', 'البروفايل الخشبي', 'الطوبار'],
    'الألومنيوم': ['الألومنيوم', 'الألمونيوم', 'المعدن', 'الشبابيك'],
    'الزجاج': ['الزجاج', 'اللوح', 'الكاس', 'المرايات'],
    
    // Tools
    'ماكينة': ['ماكينة', 'المكنة', 'السي ان سي'],
    'منشار': ['منشار', 'المنشار', 'السوكة'],
    'لحام': ['لحام', 'اللحام', 'اللحمة', 'السولدرة'],
    
    // Quality Levels
    'عالي الجودة': ['عالي الجودة', 'تحفة', 'خشب إيطالي', 'نضيف'],
    'متوسط': ['متوسط', 'كده كده', 'ماشي', 'عادي'],
    'رخيص': ['رخيص', 'هبل', 'خرده', 'شغل عيال'],
    
    // Common Workshop Phrases
    greetings: ['صباح الخير يا معلم', 'عامل ايه', 'السلام عليكم'],
    pricing: ['كام؟', 'السعر عامل ايه؟', 'هات رقم محترم'],
    approval: ['تمام', 'كده تمام', 'ربنا يبارك', 'خلصانة على خير'],
    rejection: ['مش قادر', 'غالي اوي', 'مش هينفع', 'في حاجة تانية'],
  };

  /**
   * Understand ANY Egyptian workshop query
   */
  async understandWorkshopQuery(
    query: string,
    userType?: UserType
  ): Promise<ParsedQuery> {
    // 1. Detect accent/dialect
    const dialect = await this.detectDialect(query);

    // 2. Detect user type if not provided
    const detectedUserType = userType || await this.detectUserType(query);

    // 3. Normalize workshop slang
    const normalized = await this.normalizeWorkshopSlang(query, dialect);

    // 4. Detect intent
    const intent = await this.detectWorkshopIntent(normalized, detectedUserType);

    // 5. Extract entities
    const entities = await this.extractWorkshopEntities(normalized, detectedUserType);

    // 6. Detect frustration
    const frustration = await this.detectFrustration(query);

    // 7. Detect urgency
    const urgency = await this.detectUrgency(query, detectedUserType);

    return {
      original: query,
      normalized,
      dialect,
      intent,
      entities,
      frustration,
      urgency,
      userType: detectedUserType,
    };
  }

  /**
   * Respond in appropriate workshop language
   */
  async respondInWorkshopTongue(
    answer: string,
    dialect: EgyptianDialect,
    userType: UserType
  ): Promise<WorkshopResponse> {
    return {
      // TECHNICAL answer (accurate)
      technical: answer,

      // WORKSHOP version (how you'd say it in workshop)
      workshop: await this.translateToWorkshop(answer, dialect),

      // SIMPLIFIED version (for beginners)
      simple: await this.simplifyForUser(answer, userType),

      // WITH EGYPTIAN MANNERISMS
      withMannerisms: await this.addEgyptianMannerisms(answer, dialect, userType),

      // NEXT STEPS in workshop language
      nextSteps: await this.suggestNextStepsInWorkshop(answer, dialect),
    };
  }

  // Private helper methods

  private detectDialect(query: string): Promise<EgyptianDialect> {
    const lowerQuery = query.toLowerCase();

    // Technical office patterns
    if (/الكود المصري|المواصفات القياسية|حسب المواصفات|الهندسية/.test(lowerQuery)) {
      return Promise.resolve('technical_office');
    }

    // Small workshop patterns
    if (/البتاعة|الشغلانة|المكنة/.test(lowerQuery)) {
      return Promise.resolve('small_workshop');
    }

    // Alexandria patterns
    if (/باشا|طيب/.test(lowerQuery)) {
      return Promise.resolve('alexandria');
    }

    // Upper Egypt patterns
    if (/يا ريس|ربنا يوفقك|الله يكرمك/.test(lowerQuery)) {
      return Promise.resolve('upper_egypt');
    }

    // Default to Cairo Shobra
    return Promise.resolve('cairo_shobra');
  }

  private detectUserType(query: string): Promise<UserType> {
    const lowerQuery = query.toLowerCase();

    // Technical office engineer
    if (/الكود المصري|المواصفات القياسية|حسب المواصفات|الهندسية/.test(lowerQuery)) {
      return Promise.resolve('technical_office');
    }

    // Workshop owner
    if (/كام السعر|هو ده السعر النهائي|في خصم|ربنا يبارك/.test(lowerQuery)) {
      return Promise.resolve('workshop_owner');
    }

    // Operator
    if (/ليه بيعمل كده|هو ده الصح|المكنة مش شغالة|عايز أعمل إيه/.test(lowerQuery)) {
      return Promise.resolve('operator');
    }

    // Beginner
    if (/ازاي|ممكن تساعدني|مش فاهم|خطوة خطوة/.test(lowerQuery)) {
      return Promise.resolve('beginner');
    }

    return Promise.resolve('general');
  }

  private normalizeWorkshopSlang(
    query: string,
    _dialect: EgyptianDialect
  ): Promise<string> {
    let normalized = query;

    // Replace slang with technical terms
    for (const [technical, slangVariants] of Object.entries(this.slangDictionary)) {
      for (const slang of slangVariants) {
        const regex = new RegExp(slang, 'gi');
        normalized = normalized.replace(regex, technical);
      }
    }

    return Promise.resolve(normalized);
  }

  private detectWorkshopIntent(
    normalized: string,
    _userType: UserType
  ): Promise<ParsedQuery['intent']> {
    const lower = normalized.toLowerCase();

    if (/كام|سعر|تكلفة|ثمن/.test(lower)) {
      return Promise.resolve('pricing');
    }

    if (/مشكلة|غلط|خطأ|مش شغال/.test(lower)) {
      return Promise.resolve('problem');
    }

    if (/ازاي|كيف|طريقة|خطوة/.test(lower)) {
      return Promise.resolve('learning');
    }

    if (/مشروع|عمل|شغل|طلب/.test(lower)) {
      return Promise.resolve('business');
    }

    return Promise.resolve('technical');
  }

  private extractWorkshopEntities(
    normalized: string,
    _userType: UserType
  ): Promise<ParsedQuery['entities']> {
    const entities: ParsedQuery['entities'] = {};

    // Extract dimensions (e.g., "2×1.5متر" or "2 متر في 1.5")
    const dimensionMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:×|في|x|X)\s*(\d+(?:\.\d+)?)\s*(?:متر|م|meter)/i);
    if (dimensionMatch) {
      entities.dimensions = {
        width: parseFloat(dimensionMatch[1]) * 1000, // Convert to mm
        height: parseFloat(dimensionMatch[2]) * 1000,
      };
    }

    // Extract prices
    const priceMatches = normalized.match(/(\d+(?:,\d+)*)\s*(?:جنيه|ج\.م|EGP)/gi);
    if (priceMatches) {
      entities.prices = priceMatches.map(match => {
        const num = match.replace(/[^\d,]/g, '').replace(/,/g, '');
        return parseInt(num, 10);
      });
    }

    // Extract materials
    const materialKeywords = ['ألومنيوم', 'UPVC', 'خشب', 'زجاج'];
    entities.materials = materialKeywords.filter(keyword =>
      normalized.toLowerCase().includes(keyword.toLowerCase())
    );

    // Extract locations
    const locationKeywords = ['القاهرة', 'الإسكندرية', 'الجيزة', 'المعادي', 'شبرا'];
    entities.locations = locationKeywords.filter(keyword =>
      normalized.toLowerCase().includes(keyword.toLowerCase())
    );

    return Promise.resolve(entities);
  }

  private detectFrustration(query: string): Promise<EmotionLevel> {
    const lower = query.toLowerCase();

    if (/مش فاهم|مش عارف|مش شغال|غلط/.test(lower)) {
      return Promise.resolve('frustrated');
    }

    if (/عاجل|ضروري|فوراً|الآن/.test(lower)) {
      return Promise.resolve('urgent');
    }

    if (/ممتاز|شكراً|تمام/.test(lower)) {
      return Promise.resolve('excited');
    }

    if (/ازاي|كيف|ممكن/.test(lower)) {
      return Promise.resolve('confused');
    }

    return Promise.resolve('calm');
  }

  private detectUrgency(
    query: string,
    _userType: UserType
  ): Promise<'low' | 'medium' | 'high'> {
    const lower = query.toLowerCase();

    if (/عاجل|ضروري|فوراً|الآن|مستعجل/.test(lower)) {
      return Promise.resolve('high');
    }

    if (/بسرعة|عايز|محتاج/.test(lower)) {
      return Promise.resolve('medium');
    }

    return Promise.resolve('low');
  }

  private translateToWorkshop(
    answer: string,
    dialect: EgyptianDialect
  ): Promise<string> {
    // Add dialect-specific phrases
    if (dialect === 'cairo_shobra') {
      return Promise.resolve(`يعني ${answer}. تمام يا معلم؟`);
    } else if (dialect === 'alexandria') {
      return Promise.resolve(`${answer}. كده تمام باشا.`);
    } else if (dialect === 'upper_egypt') {
      return Promise.resolve(`${answer}. ربنا يوفقك يا ريس.`);
    }

    return Promise.resolve(answer);
  }

  private simplifyForUser(
    answer: string,
    _userType: UserType
  ): Promise<string> {
    if (_userType === 'beginner') {
      return Promise.resolve(`ببساطة: ${answer}`);
    }

    return Promise.resolve(answer);
  }

  private addEgyptianMannerisms(
    answer: string,
    dialect: EgyptianDialect,
    _userType: UserType
  ): Promise<string> {
    const mannerisms: Record<EgyptianDialect, string[]> = {
      cairo_shobra: ['حبيبي', 'يا باشا', 'تعال هنا شوف'],
      alexandria: ['باشا', 'كده تمام'],
      upper_egypt: ['يا ريس', 'ربنا يوفقك'],
      technical_office: ['من الناحية الهندسية', 'حسب المواصفات'],
      small_workshop: ['يا معلم', 'شوف'],
    };

    const dialectMannerisms = mannerisms[dialect];
    const randomMannerism = dialectMannerisms[Math.floor(Math.random() * dialectMannerisms.length)];

    return Promise.resolve(`${randomMannerism}، ${answer}`);
  }

  private suggestNextStepsInWorkshop(
    answer: string,
    _dialect: EgyptianDialect
  ): Promise<string[]> {
    const steps: string[] = [];

    if (answer.includes('سعر') || answer.includes('تكلفة')) {
      steps.push('راجع السعر مع العميل');
      steps.push('تأكد من شروط الدفع');
    }

    if (answer.includes('مشكلة') || answer.includes('خطأ')) {
      steps.push('فحص المشكلة');
      steps.push('اتصل بالدعم الفني');
    }

    return Promise.resolve(steps);
  }
}


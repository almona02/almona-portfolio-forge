/**
 * Maalem Reasoning Engine
 * 
 * Reasons like an Egyptian maalem with practical wisdom:
 * - Egyptian reality checks
 * - Maalem explanations with stories
 * - Reveals hidden costs only maalem knows
 * - Practical workshop wisdom
 */

import { EgyptianWorkshopNLP, type UserType } from '@/lib/nlp/EgyptianWorkshopNLP';
import { DocumentationKnowledgeGraph } from '@/lib/ydt/DocumentationKnowledgeGraph';

export interface MaalemReasoning {
  technical: string;
  maalem: string;
  confidence: number;
  story?: string;
  warning?: string;
  hiddenCosts?: string[];
  practicalAdvice?: string;
  egyptianReality?: string;
}

export interface ReasoningContext {
  question: string;
  userType: UserType;
  location: string;
  workshopContext?: {
    size?: 'small' | 'medium' | 'large';
    experience?: number; // years
    specialization?: string;
  };
}

/**
 * Maalem Reasoning Engine
 */
export class MaalemReasoningEngine {
  private knowledgeGraph: DocumentationKnowledgeGraph;
  private workshopNLP: EgyptianWorkshopNLP;

  constructor() {
    this.knowledgeGraph = new DocumentationKnowledgeGraph();
    this.workshopNLP = new EgyptianWorkshopNLP();
  }

  /**
   * Reason about a question with maalem wisdom
   */
  async reasonWithMaalemWisdom(context: ReasoningContext): Promise<MaalemReasoning> {
    const { question, userType, location, workshopContext } = context;

    // 1. Get technical answer from knowledge base
    const technicalAnswer = await this.getTechnicalAnswer(question);

    // 2. Apply maalem reasoning
    const maalemReasoning = await this.applyMaalemReasoning(
      technicalAnswer,
      question,
      userType,
      location,
      workshopContext
    );

    // 3. Add Egyptian reality check
    const egyptianReality = await this.checkEgyptianReality(
      technicalAnswer,
      location,
      workshopContext
    );

    // 4. Reveal hidden costs
    const hiddenCosts = await this.revealHiddenCosts(question, location, workshopContext);

    // 5. Generate practical advice
    const practicalAdvice = await this.generatePracticalAdvice(
      question,
      userType,
      location,
      workshopContext
    );

    // 6. Find relevant story
    const story = await this.findRelevantStory(question, location);

    return {
      technical: technicalAnswer,
      maalem: maalemReasoning,
      confidence: 0.9,
      story,
      warning: egyptianReality.warning,
      hiddenCosts,
      practicalAdvice,
      egyptianReality: egyptianReality.advice,
    };
  }

  /**
   * Get technical answer from knowledge base
   */
  private async getTechnicalAnswer(question: string): Promise<string> {
    // Query knowledge graph
    const result = this.knowledgeGraph.query({
      type: 'egyptian',
      keyword: this.extractKeywords(question),
      context: question,
    });

    if (result.matches.length > 0) {
      return result.matches[0].content;
    }

    return 'Technical answer not found in knowledge base.';
  }

  /**
   * Apply maalem reasoning to technical answer
   */
  private async applyMaalemReasoning(
    technicalAnswer: string,
    question: string,
    userType: UserType,
    location: string,
    _workshopContext?: ReasoningContext['workshopContext']
  ): Promise<string> {
    // Transform technical to maalem language
    let maalemAnswer = technicalAnswer;

    // Replace technical terms with workshop terms
    maalemAnswer = maalemAnswer.replace(/optimization/gi, 'التوفير');
    maalemAnswer = maalemAnswer.replace(/algorithm/gi, 'الطريقة');
    maalemAnswer = maalemAnswer.replace(/accuracy/gi, 'الدقة');
    maalemAnswer = maalemAnswer.replace(/precision/gi, 'المقاس');

    // Add maalem perspective
    if (question.toLowerCase().includes('price') || question.toLowerCase().includes('سعر')) {
      maalemAnswer = `يا ريس، ${maalemAnswer}. بس خلي بالك من ${this.getLocationSpecificAdvice(location)}`;
    } else if (question.toLowerCase().includes('material') || question.toLowerCase().includes('خامة')) {
      maalemAnswer = `يا معلم، ${maalemAnswer}. ده سر المهنة: ${this.getMaterialWisdom(location)}`;
    } else if (question.toLowerCase().includes('time') || question.toLowerCase().includes('وقت')) {
      maalemAnswer = `${maalemAnswer}. بس في رمضان الشغل بيمشي نص السرعة، خلي بالك`;
    }

    // Add user-type specific mannerisms
    if (userType === 'workshop_owner') {
      maalemAnswer = `يا ريس، ${maalemAnswer}`;
    } else if (userType === 'operator') {
      maalemAnswer = `يا اسطى، ${maalemAnswer}`;
    } else if (userType === 'technical_office') {
      maalemAnswer = `يا معلم، ${maalemAnswer}. ده من الخبرة`;
    }

    return maalemAnswer;
  }

  /**
   * Check Egyptian reality
   */
  private async checkEgyptianReality(
    technicalAnswer: string,
    location: string,
    workshopContext?: ReasoningContext['workshopContext']
  ): Promise<{ warning?: string; advice: string }> {
    const warnings: string[] = [];
    const advice: string[] = [];

    // Location-specific reality checks
    if (location.toLowerCase().includes('cairo')) {
      advice.push('في القاهرة، الشغل بيمشي أسرع بس المنافسة أعلى');
      if (technicalAnswer.toLowerCase().includes('price')) {
        warnings.push('السعر في القاهرة بيتحرك بسرعة، خلي بالك من التغيرات');
      }
    } else if (location.toLowerCase().includes('alexandria')) {
      advice.push('في الإسكندرية، الشغل محتاج مواد مقاومة للملوحة');
      warnings.push('الملوحة في الإسكندرية بتأثر على الألومنيوم، استخدم مواد مقاومة');
    }

    // Workshop size reality
    if (workshopContext?.size === 'small') {
      advice.push('الورشة الصغيرة محتاجة تتفاوض مع الموردين عشان تحصل خصم');
      warnings.push('الورشة الصغيرة مش هتقدر تتفاوض في الأسعار زي الكبيرة');
    }

    // Experience reality
    if (workshopContext && workshopContext.experience && workshopContext.experience < 2) {
      warnings.push('الخبرة القليلة محتاجة وقت أكتر في الشغل');
      advice.push('استخدم البرنامج عشان يوفرلك الوقت والغلطات');
    }

    return {
      warning: warnings.length > 0 ? warnings.join('. ') : undefined,
      advice: advice.length > 0 ? advice.join('. ') : 'استخدم البرنامج عشان توفر وقت وفلوس',
    };
  }

  /**
   * Reveal hidden costs only maalem knows
   */
  private async revealHiddenCosts(
    question: string,
    location: string,
    _workshopContext?: ReasoningContext['workshopContext']
  ): Promise<string[]> {
    const hiddenCosts: string[] = [];

    if (question.toLowerCase().includes('price') || question.toLowerCase().includes('سعر')) {
      hiddenCosts.push('مصاريف النقل: 50-100 جنيه حسب المسافة');
      hiddenCosts.push('مصاريف التركيب: 200-500 جنيه حسب الصعوبة');
      hiddenCosts.push('مصاريف الصيانة: 10% من السعر سنوياً');
      hiddenCosts.push('مصاريف الضمان: 5% من السعر');
    }

    if (question.toLowerCase().includes('material') || question.toLowerCase().includes('خامة')) {
      hiddenCosts.push('الهالك: 5-10% من الكمية');
      hiddenCosts.push('مصاريف التخزين: 2% من القيمة');
      hiddenCosts.push('مصاريف القطع: 1% من القيمة');
    }

    // Location-specific hidden costs
    if (location.toLowerCase().includes('upper_egypt') || location.toLowerCase().includes('صعيد')) {
      hiddenCosts.push('مصاريف النقل للصعيد: 200-500 جنيه إضافية');
    }

    return hiddenCosts;
  }

  /**
   * Generate practical advice
   */
  private async generatePracticalAdvice(
    question: string,
    userType: UserType,
    _location: string,
    _workshopContext?: ReasoningContext['workshopContext']
  ): Promise<string> {
    const advice: string[] = [];

    if (question.toLowerCase().includes('optimization') || question.toLowerCase().includes('تحسين')) {
      advice.push('استخدم البرنامج عشان توفر 15-20% من الخشب');
      advice.push('شوف الـ remnants اللي عندك قبل ما تشتري جديد');
    }

    if (question.toLowerCase().includes('quality') || question.toLowerCase().includes('جودة')) {
      advice.push('الجودة أهم من السرعة، العميل هيشوف الجودة مش السرعة');
      advice.push('لو الشغل تعبان، العميل مش هيرجع تاني');
    }

    if (userType === 'beginner') {
      advice.push('ابدأ بمشاريع بسيطة عشان تتعلم');
      advice.push('استخدم Smart Wizard عشان يسهل عليك');
    }

    return advice.join('. ');
  }

  /**
   * Find relevant story
   */
  private async findRelevantStory(question: string, location: string): Promise<string | undefined> {
    // Would query story database
    const stories: Record<string, string> = {
      optimization: `في معلم في ${location}، كان بيخسر خشب كتير. جرب البرنامج، وقعد يلاقي نفسه وفر 18% من الخشب. في 6 أسابيع، اللي كان بيخسره بقى ربح صافي`,
      pricing: `في ورشة في ${location}، كانت بتخسر في الأسعار. جربت البرنامج، وقعدت تلاقي نفسها بتكسب 5% زيادة في الهامش`,
      quality: `في معلم في ${location}، كان بيشتغل بسرعة بس الشغل كان تعبان. جرب البرنامج، وقعد يلاقي نفسه الشغل بقى نضيف والزبائن راضيين`,
    };

    for (const [key, story] of Object.entries(stories)) {
      if (question.toLowerCase().includes(key)) {
        return story;
      }
    }

    return undefined;
  }

  /**
   * Get location-specific advice
   */
  private getLocationSpecificAdvice(location: string): string {
    if (location.toLowerCase().includes('cairo')) {
      return 'المنافسة في القاهرة عالية، خلي السعر تنافسي';
    } else if (location.toLowerCase().includes('alexandria')) {
      return 'في الإسكندرية، الملوحة بتأثر على المواد';
    } else if (location.toLowerCase().includes('upper_egypt')) {
      return 'في الصعيد، مصاريف النقل أعلى';
    }

    return 'خلي السعر تنافسي';
  }

  /**
   * Get material wisdom
   */
  private getMaterialWisdom(location: string): string {
    if (location.toLowerCase().includes('cairo')) {
      return 'خشب إيطالي للفيلات، خشب محلي للشقق';
    } else if (location.toLowerCase().includes('alexandria')) {
      return 'في الإسكندرية، استخدم مواد مقاومة للملوحة';
    }

    return 'خشب إيطالي للفيلات، خشب محلي للشقق';
  }

  /**
   * Extract keywords from question
   */
  private extractKeywords(question: string): string {
    const stopWords = ['what', 'how', 'does', 'do', 'is', 'are', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = question.toLowerCase().split(/\s+/);
    const keywords = words.filter(word => 
      word.length > 2 && !stopWords.includes(word) && !word.match(/^[^\w]+$/)
    );
    return keywords.join(' ');
  }
}


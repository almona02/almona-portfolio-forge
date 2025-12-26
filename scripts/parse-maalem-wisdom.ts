/**
 * Egyptian Maalem Wisdom Parser
 * 
 * Extracts maalem-grade wisdom from technical documentation
 * Transforms technical facts into Egyptian workshop wisdom
 */

export interface ParsedDocumentation {
  technicalFacts: TechnicalFact[];
  caseStudies: CaseStudy[];
  algorithms: AlgorithmDoc[];
  workflows: WorkflowDoc[];
}

export interface TechnicalFact {
  id: string;
  technical: string;
  category: string;
}

export interface CaseStudy {
  id: string;
  metrics: Record<string, number>;
  location?: string;
  workshop?: string;
}

export interface AlgorithmDoc {
  name: string;
  description: string;
  accuracy?: number;
  performance?: string;
}

export interface WorkflowDoc {
  name: string;
  steps: number;
  timeEstimate?: string;
}

export interface MaalemWisdom {
  wisdomMapping: Record<string, WisdomTranslation>;
  decisionPatterns: Record<string, DecisionPattern>;
  stories: WorkshopStory[];
  analogies: MaalemAnalogy[];
}

export interface WisdomTranslation {
  technical: string;
  maalem: string;
  confidence?: string;
  story?: string;
  warning?: string;
}

export interface DecisionPattern {
  rule: string;
  maalem: string;
  example?: string;
}

export interface WorkshopStory {
  id: string;
  numbers: Record<string, number>;
  story: string;
  location?: string;
  workshop?: string;
}

export interface MaalemAnalogy {
  technical: string;
  analogy: string;
  context: string;
}

/**
 * Egyptian Maalem Parser
 */
export class EgyptianMaalemParser {
  /**
   * Extract maalem-grade wisdom from documentation
   */
  async extractMaalemWisdom(docs: ParsedDocumentation): Promise<MaalemWisdom> {
    const wisdomMapping = this.createWisdomMapping(docs.technicalFacts);
    const decisionPatterns = this.extractDecisionPatterns(docs);
    const stories = this.createStoriesFromCaseStudies(docs.caseStudies);
    const analogies = this.createAnalogies(docs.algorithms, docs.workflows);

    return {
      wisdomMapping,
      decisionPatterns,
      stories,
      analogies,
    };
  }

  /**
   * Create wisdom mapping from technical facts
   */
  private createWisdomMapping(facts: TechnicalFact[]): Record<string, WisdomTranslation> {
    const mapping: Record<string, WisdomTranslation> = {};

    for (const fact of facts) {
      mapping[fact.id] = this.translateToMaalem(fact);
    }

    // Add common mappings
    mapping['99.8% accuracy'] = {
      technical: '99.8% end-to-end accuracy with dual calculation',
      maalem: 'مفيش خسارة، كل قطعة بتتقطع على المقاس',
      confidence: 'واثق زيك في العشري',
    };

    mapping['15-20% material savings'] = {
      technical: 'Optimization algorithm reduces waste',
      maalem: 'كل متر خشب بيخش في حتة، مش بيطلع حاجة تلف',
      story: 'محمد في المعادي وفر ٥٠٠٠ جنيه الشهر اللي فات',
    };

    mapping['3-click workflow'] = {
      technical: 'Streamlined user interface with minimal steps',
      maalem: 'ضغطة تلاتة وتكون خلصت، مش محتاج شاي وكلام',
      warning: 'اللي بياخد وقت هو التفكير، مش الشغل نفسه',
    };

    mapping['93% time reduction'] = {
      technical: 'Workflow optimization reduces planning time by 93%',
      maalem: 'اللي كان بياخد ٣ ساعات بقى ١٠ دقايق، ده مش شغل ده سحر',
      story: 'أحمد في شبرا كان بيقعد يوم كامل في التخطيط، دلوقتي بيخلص في نص ساعة',
    };

    return mapping;
  }

  /**
   * Translate technical fact to maalem wisdom
   */
  private translateToMaalem(fact: TechnicalFact): WisdomTranslation {
    const translations: Record<string, WisdomTranslation> = {
      accuracy: {
        technical: fact.technical,
        maalem: 'مفيش غلطة، كل حاجة على المقاس',
        confidence: 'واثق ١٠٠٪؜',
      },
      optimization: {
        technical: fact.technical,
        maalem: 'كل متر بيخش في حتة، مش في هالك',
        story: 'الورش اللي جربت البرنامج وفرت فلوس كتير',
      },
      speed: {
        technical: fact.technical,
        maalem: 'الشغل بيمشي بسرعة، مش محتاج وقت',
        warning: 'بس خلي بالك من الدقة، السرعة مش أهم من الجودة',
      },
    };

    return translations[fact.category] || {
      technical: fact.technical,
      maalem: fact.technical, // Fallback
    };
  }

  /**
   * Extract decision patterns from documentation
   */
  private extractDecisionPatterns(docs: ParsedDocumentation): Record<string, DecisionPattern> {
    return {
      pricing: {
        rule: 'technical docs say "calculate based on market"',
        maalem: 'شوف المنافس عامل بكام، حطه أرخص بجنيهات قليلة عشان يكسبك',
        example: 'لو السوق عامل ٢٥٠٠، حطه ٢٤٥٠ جنيه',
      },
      material_choice: {
        rule: 'docs specify "material properties"',
        maalem: 'خشب إيطالي للفيلات، خشب محلي للشقق، ده سر المهنة',
        example: 'الفيلا في التجمع الخامس لازم خشب إيطالي، الشقة في شبرا خشب محلي',
      },
      timing: {
        rule: 'docs mention "production schedule"',
        maalem: 'رمضان الشغل بيمشي نص السرعة، خلي المواعيد بعد العيد',
        example: 'متعدهاش في رمضان، الصنايعية مش هيعملوا شغل كويس',
      },
      quality: {
        rule: 'docs emphasize "accuracy"',
        maalem: 'الجودة أهم من السرعة، العميل هيشوف الجودة مش السرعة',
        example: 'لو الشغل تعبان، العميل مش هيرجع تاني',
      },
    };
  }

  /**
   * Create stories from case studies
   */
  private createStoriesFromCaseStudies(studies: CaseStudy[]): WorkshopStory[] {
    return studies.map(study => {
      const story = this.createEgyptianStory(study);
      return {
        id: study.id,
        numbers: study.metrics,
        story,
        location: study.location,
        workshop: study.workshop,
      };
    });
  }

  /**
   * Create Egyptian story from case study
   */
  private createEgyptianStory(study: CaseStudy): string {
    const savings = study.metrics.materialSavings || study.metrics.timeSavings || 0;
    const location = study.location || 'القاهرة';
    const workshop = study.workshop || 'ورشة';

    if (study.metrics.materialSavings) {
      return `${workshop} في ${location}، كان بيخسر خشب كتير. جرب البرنامج، وقعد يلاقي نفسه وفر ${savings}% من الخشب. في ٦ أسابيع، اللي كان بيخسره بقى ربح صافي`;
    }

    if (study.metrics.timeSavings) {
      return `${workshop} في ${location}، كان بيقعد ${study.metrics.oldTime || 'ساعات كتير'} في التخطيط. جرب البرنامج، دلوقتي بيخلص في ${study.metrics.newTime || 'دقايق قليلة'}. وفر ${savings}% من الوقت`;
    }

    return `${workshop} في ${location} جرب البرنامج ونجح معاه`;
  }

  /**
   * Create analogies from algorithms and workflows
   */
  private createAnalogies(
    algorithms: AlgorithmDoc[],
    workflows: WorkflowDoc[]
  ): MaalemAnalogy[] {
    const analogies: MaalemAnalogy[] = [];

    // Algorithm analogies
    for (const algo of algorithms) {
      if (algo.name.includes('Optimization')) {
        analogies.push({
          technical: algo.description,
          analogy: 'زي ما المعلم بيشوف الخشب ويفضل الأفضل، البرنامج بيعمل نفس الحاجة',
          context: 'عند اختيار قطع الخشب',
        });
      }

      if (algo.name.includes('Validation')) {
        analogies.push({
          technical: algo.description,
          analogy: 'زي ما المعلم بيشوف الشغل قبل ما يسلمه، البرنامج بيعمل نفس الحاجة',
          context: 'عند مراجعة التصميم',
        });
      }
    }

    // Workflow analogies
    for (const workflow of workflows) {
      if (workflow.steps <= 3) {
        analogies.push({
          technical: `${workflow.name} workflow`,
          analogy: 'ضغطة تلاتة وتكون خلصت، زي ما المعلم بيقول "دوس وخلاص"',
          context: 'عند إنشاء مشروع جديد',
        });
      }
    }

    return analogies;
  }
}




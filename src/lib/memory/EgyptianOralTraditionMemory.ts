/**
 * Egyptian Oral Tradition Memory
 * 
 * Encodes knowledge in Egyptian cultural formats:
 * - Stories (حكايات)
 * - Proverbs (أمثال)
 * - Warnings (تحذيرات)
 * - Advice (نصائح)
 */

import type { CandidateFact } from '@/lib/learning/CandidateMemory';

export interface ValidatedFact {
  claim: string;
  firstContributor: string;
  region?: string;
  confirmationCount: number;
  verifiedInPractice: boolean;
  applicableScenarios?: string[];
  contraIndications?: string[];
}

export interface EgyptianMemory {
  fact: string;
  encodedAs: {
    story: string;
    proverb: string;
    warning: string;
    advice: string;
  };
  metadata: {
    أول_من_قاله: string;
    تاريخ_السماع: string;
    منطقة_السماع: string;
    كم_قالوه: number;
    هل_جربناه: boolean;
  };
  recallTriggers: {
    whenUser: string[];
    في_حالة: string[];
    متى_متقولش: string[];
  };
}

export interface WorkshopStory {
  id: string;
  title: string;
  story: string;
  moral: string;
  region: string;
}

export interface WorkshopTrick {
  id: string;
  trick: string;
  whenToUse: string;
  whenNotToUse: string;
}

export interface WorkshopWarning {
  id: string;
  warning: string;
  severity: 'high' | 'medium' | 'low';
  context: string;
}

/**
 * Egyptian Oral Tradition Memory
 */
export class EgyptianOralTraditionMemory {
  private stories: Map<string, WorkshopStory> = new Map();
  private tricks: Map<string, WorkshopTrick> = new Map();
  private warnings: Map<string, WorkshopWarning> = new Map();
  private names: Map<string, PersonRecord> = new Map();

  /**
   * Encode fact as Egyptian memory
   */
  async encodeAsEgyptianMemory(fact: ValidatedFact): Promise<EgyptianMemory> {
    return {
      fact: fact.claim,
      encodedAs: {
        story: await this.createStory(fact),
        proverb: await this.createProverb(fact),
        warning: await this.createWarning(fact),
        advice: await this.createAdvice(fact),
      },
      metadata: {
        أول_من_قاله: fact.firstContributor,
        تاريخ_السماع: new Date().toLocaleDateString('ar-EG'),
        منطقة_السماع: fact.region || 'القاهرة',
        كم_قالوه: fact.confirmationCount,
        هل_جربناه: fact.verifiedInPractice,
      },
      recallTriggers: {
        whenUser: this.createRecallTriggers(fact),
        في_حالة: fact.applicableScenarios || [],
        متى_متقولش: fact.contraIndications || [],
      },
    };
  }

  /**
   * Create story from fact
   */
  private async createStory(fact: ValidatedFact): Promise<string> {
    const templates = {
      trick: `في معلم في ${fact.region || 'القاهرة'}، كان بيواجه مشكلة. جرب ${fact.claim}، وقعد يلاقي نفسه الشغل بقي أسهل. دلوقتي كل الورش في المنطقة بتستخدم الطريقة دي.`,
      warning: `في ورشة في ${fact.region || 'القاهرة'}، جربت ${fact.claim}، وحصلت مشكلة كبيرة. المعلمين دلوقتي بيحذروا من الحاجة دي.`,
      advice: `المعلمين الكبار في ${fact.region || 'القاهرة'} بيقولوا: ${fact.claim}. ده من الخبرة اللي جمعوها على السنين.`,
    };

    // Determine fact type (simplified)
    if (fact.claim.includes('خطر') || fact.claim.includes('احذر')) {
      return templates.warning;
    }
    if (fact.claim.includes('استخدم') || fact.claim.includes('جرب')) {
      return templates.trick;
    }
    return templates.advice;
  }

  /**
   * Create proverb from fact
   */
  private async createProverb(fact: ValidatedFact): Promise<string> {
    const proverbTemplates: Record<string, string> = {
      material_trick: '${action} على ${tool}، و${result}',
      supplier_advice: 'خذ من ${supplier} ${material}، ومتاخدش ${warning}',
      timing_advice: '${action} في ${time}، ${result}',
    };

    // Extract key words from claim
    const lowerClaim = fact.claim.toLowerCase();

    if (lowerClaim.includes('سولار') || lowerClaim.includes('ديزل')) {
      return 'قطرة سولار على المنشار، والشغل بيتغير';
    }

    if (lowerClaim.includes('مورد') || lowerClaim.includes('تاجر')) {
      return 'خذ من المورد الموثوق، ومتاخدش من الغريب';
    }

    if (lowerClaim.includes('رمضان') || lowerClaim.includes('عيد')) {
      return 'الشغل في رمضان نص السرعة، خلي الموعد بعد العيد';
    }

    // Default proverb
    return `من الخبرة: ${fact.claim}`;
  }

  /**
   * Create warning from fact
   */
  private async createWarning(fact: ValidatedFact): Promise<string> {
    if (fact.claim.includes('خطر') || fact.claim.includes('احذر')) {
      return `⚠️ تحذير: ${fact.claim}. المعلمين في ${fact.region || 'القاهرة'} بيحذروا من الحاجة دي.`;
    }

    return '';
  }

  /**
   * Create advice from fact
   */
  private async createAdvice(fact: ValidatedFact): Promise<string> {
    return `نصيحة من المعلمين: ${fact.claim}. ده من الخبرة اللي جمعوها على السنين.`;
  }

  /**
   * Create recall triggers
   */
  private createRecallTriggers(fact: ValidatedFact): string[] {
    const triggers: string[] = [];

    // Extract keywords
    const keywords = fact.claim.split(/\s+/).slice(0, 3);
    triggers.push(...keywords);

    // Add category-based triggers
    if (fact.claim.includes('سعر') || fact.claim.includes('تكلفة')) {
      triggers.push('pricing', 'سعر', 'تكلفة');
    }

    if (fact.claim.includes('مورد') || fact.claim.includes('تاجر')) {
      triggers.push('supplier', 'مورد', 'تاجر');
    }

    if (fact.claim.includes('مادة') || fact.claim.includes('خشب')) {
      triggers.push('material', 'مادة', 'خشب');
    }

    return triggers;
  }

  /**
   * Store story
   */
  storeStory(story: WorkshopStory): void {
    this.stories.set(story.id, story);
  }

  /**
   * Store trick
   */
  storeTrick(trick: WorkshopTrick): void {
    this.tricks.set(trick.id, trick);
  }

  /**
   * Store warning
   */
  storeWarning(warning: WorkshopWarning): void {
    this.warnings.set(warning.id, warning);
  }

  /**
   * Get story by trigger
   */
  getStoryByTrigger(trigger: string): WorkshopStory | null {
    for (const story of this.stories.values()) {
      if (story.story.includes(trigger)) {
        return story;
      }
    }
    return null;
  }
}

interface PersonRecord {
  name: string;
  type: 'supplier' | 'maalem' | 'workshop';
  reputation: 'high' | 'medium' | 'low';
  location: string;
}




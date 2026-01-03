/**
 * Egyptian Verification Dialog - How YDT asks for verification
 * 
 * Creates culturally appropriate verification questions based on:
 * - User type (Maalem, Engineer, Owner, Operator)
 * - Trust level
 * - Claim type
 */

import type { CandidateFact } from '@/lib/learning/CandidateMemory';
import type { UserProfile } from '@/lib/trust/EgyptianTrustScoring';

export interface VerificationQuestion {
  question: string;
  questionArabic: string;
  flow: ConversationFlow[];
  expectedResponses: {
    confirmation: string[];
    denial: string[];
    unsure: string[];
  };
  followUps: FollowUpQuestion[];
}

export interface ConversationFlow {
  step: string;
  ydt: string | ((response: string) => Promise<string>);
  listenFor?: string[];
}

export interface FollowUpQuestion {
  trigger: string[];
  question: string;
  questionArabic: string;
}

/**
 * Egyptian Verification Dialog
 */
export class EgyptianVerificationDialog {
  private questionTemplates = {
    maalem_senior: {
      pattern: 'يا معلم، عندي معلومة مش متأكد منها. انت شايف إيه في كده؟',
      details: (claim: string) => `سمعت إن ${claim}. ده صح في خبرتك؟`,
    },
    technical_engineer: {
      pattern: 'من الناحية الهندسية، هل ${claim} منطقي؟',
      details: (_claim: string) => 'حسب الكود المصري والفيزيا، هل الكلام ده ممكن؟',
    },
    workshop_owner: {
      pattern: 'يا ريس، لو حصل معاك كده، هتتعامل معاه ازاي؟',
      details: (claim: string) => `في السوق بيقولوا إن ${claim}. انت شايف ده هيأثر على الشغل ازاي؟`,
    },
    operator: {
      pattern: 'على فكرة، انت شوفت حاجة زي كده في الشغل؟',
      details: (claim: string) => `في ناس بتقول إن ${claim}. انت شايف ده حصل معاك؟`,
    },
  };

  /**
   * Create verification question
   */
  async createVerificationQuestion(
    fact: CandidateFact,
    verifier: UserProfile
  ): Promise<VerificationQuestion> {
    // Determine user type
    const userType = this.determineUserType(verifier);

    // Get template
    const template = this.questionTemplates[userType] || this.questionTemplates.operator;

    // Create question
    const question = template.pattern.replace('${claim}', fact.claim);
    const questionArabic = template.details(fact.claim);

    // Create conversation flow
    const flow = this.createEgyptianConversationFlow(fact, verifier);

    // Expected responses
    const expectedResponses = {
      confirmation: ['أه صح', 'حصل معايا', 'شوفته', 'صح', 'نعم', 'أيوه'],
      denial: ['مش صح', 'مش ممكن', 'ده غلط', 'لا', 'لأ'],
      unsure: ['مش عارف', 'ممكن', 'متحكمش', 'مش متأكد'],
    };

    // Follow-up questions
    const followUps = this.prepareFollowUpQuestions(fact, verifier);

    return {
      question,
      questionArabic,
      flow,
      expectedResponses,
      followUps,
    };
  }

  /**
   * Create Egyptian conversation flow
   */
  private createEgyptianConversationFlow(
    fact: CandidateFact,
    verifier: UserProfile
  ): ConversationFlow[] {
    return [
      {
        step: 'الاستفتاح',
        ydt: 'السلام عليكم، عامل إيه؟',
      },
      {
        step: 'التهيئة',
        ydt: 'عندي حاجة عايز أستشيرك فيها يا ريس',
      },
      {
        step: 'السؤال',
        ydt: this.createQuestion(fact, verifier),
      },
      {
        step: 'الاستماع',
        ydt: 'اسمعك',
        listenFor: ['confirmation', 'denial', 'story'],
      },
      {
        step: 'التعمق',
        ydt: async (response: string) => {
          if (response.includes('بس') || response.includes('لكن')) {
            return 'قولي البس ده إيه؟';
          }
          if (response.includes('مش دايماً') || response.includes('أحياناً')) {
            return 'متى بيحصل ومتى مش بيحصل؟';
          }
          if (response.includes('يعتمد') || response.includes('على حسب')) {
            return 'يعتمد على إيه بالظبط؟';
          }
          return 'فهمتك، ربنا يباركلك';
        },
      },
    ];
  }

  /**
   * Create question based on user type
   */
  private createQuestion(fact: CandidateFact, verifier: UserProfile): string {
    const userType = this.determineUserType(verifier);
    const template = this.questionTemplates[userType] || this.questionTemplates.operator;

    return template.details(fact.claim);
  }

  /**
   * Prepare follow-up questions
   */
  private prepareFollowUpQuestions(
    _fact: CandidateFact,
    _verifier: UserProfile
  ): FollowUpQuestion[] {
    return [
      {
        trigger: ['بس', 'لكن', 'مش دايماً'],
        question: 'What is the exception?',
        questionArabic: 'قولي البس ده إيه؟',
      },
      {
        trigger: ['يعتمد', 'على حسب', 'في حالات'],
        question: 'What does it depend on?',
        questionArabic: 'يعتمد على إيه بالظبط؟',
      },
      {
        trigger: ['مش متأكد', 'مش عارف', 'ممكن'],
        question: 'Have you seen something similar?',
        questionArabic: 'شوفت حاجة مشابهة؟',
      },
    ];
  }

  /**
   * Determine user type from profile
   */
  private determineUserType(profile: UserProfile): keyof typeof this.questionTemplates {
    if (profile.experience >= 20 || profile.title === 'معلم كبير') {
      return 'maalem_senior';
    }
    if (profile.reputation.type === 'technical_office' || profile.reputation.type === 'government_engineer') {
      return 'technical_engineer';
    }
    if (profile.reputation.type === 'known_workshop_cairo' && profile.workshop) {
      return 'workshop_owner';
    }
    return 'operator';
  }

  /**
   * Process verification response
   */
  async processResponse(
    response: string,
    factId: string,
    expectedResponses: VerificationQuestion['expectedResponses']
  ): Promise<'confirmation' | 'denial' | 'unsure'> {
    const lowerResponse = response.toLowerCase();

    // Check for confirmation
    if (expectedResponses.confirmation.some(pattern => lowerResponse.includes(pattern))) {
      return 'confirmation';
    }

    // Check for denial
    if (expectedResponses.denial.some(pattern => lowerResponse.includes(pattern))) {
      return 'denial';
    }

    // Default to unsure
    return 'unsure';
  }
}


/**
 * Learning Conversation - How YDT handles user statements
 * 
 * Integrates learning system into conversation flow
 */

import { CandidateMemory } from './CandidateMemory';
import { EgyptianTrustScoring, type UserProfile } from '@/lib/trust/EgyptianTrustScoring';
import { EgyptianVerificationDialog } from '@/lib/verification/EgyptianVerificationDialog';

export interface ConversationContext {
  userId: string;
  userProfile?: UserProfile;
  location?: string;
  category?: string;
}

/**
 * Learning Conversation Handler
 */
export class LearningConversation {
  private memory: CandidateMemory;
  private trustScoring: EgyptianTrustScoring;
  private verificationDialog: EgyptianVerificationDialog;

  constructor() {
    this.memory = new CandidateMemory();
    this.trustScoring = new EgyptianTrustScoring();
    this.verificationDialog = new EgyptianVerificationDialog();
  }

  /**
   * Handle user statement (claim/information)
   */
  async handleUserStatement(
    statement: string,
    context: ConversationContext
  ): Promise<{
    response: string;
    responseArabic: string;
    factId?: string;
    status: 'accepted' | 'probation' | 'rejected';
    needsVerification?: boolean;
  }> {
    // 1. Get user trust score
    const userProfile = context.userProfile || await this.getUserProfile(context.userId);
    const trustScore = await this.trustScoring.calculateEgyptianTrust(userProfile);

    // 2. Ingest knowledge
    const result = await this.memory.ingestKnowledge(
      statement,
      context.userId,
      trustScore.numerical,
      {
        location: context.location,
        category: context.category,
        userType: userProfile.reputation.type,
      }
    );

    // 3. Generate response
    if (result.status === 'accepted') {
      return {
        response: result.message,
        responseArabic: result.messageArabic,
        factId: result.factId,
        status: 'accepted',
        needsVerification: false,
      };
    } else if (result.status === 'probation') {
      return {
        response: result.message,
        responseArabic: result.messageArabic,
        factId: result.factId,
        status: 'probation',
        needsVerification: true,
      };
    } else {
      return {
        response: result.message,
        responseArabic: result.messageArabic,
        status: 'rejected',
        needsVerification: false,
      };
    }
  }

  /**
   * Verify a fact
   */
  async verifyFact(
    factId: string,
    verified: boolean,
    verifierId: string
  ): Promise<void> {
    await this.memory.verifyFact(factId, verified, verifierId);
  }

  /**
   * Get verification question for a fact
   */
  async getVerificationQuestion(
    factId: string,
    verifierProfile: UserProfile
  ): Promise<{
    question: string;
    questionArabic: string;
    flow: any[];
  } | null> {
    const facts = this.memory.getFactsNeedingVerification(1);
    const fact = facts.find(f => f.id === factId);

    if (!fact) return null;

    const verification = await this.verificationDialog.createVerificationQuestion(fact, verifierProfile);

    return {
      question: verification.question,
      questionArabic: verification.questionArabic,
      flow: verification.flow,
    };
  }

  /**
   * Process verification response
   */
  async processVerificationResponse(
    factId: string,
    response: string,
    verifierId: string
  ): Promise<{
    verified: boolean;
    message: string;
    messageArabic: string;
  }> {
    const facts = this.memory.getFactsNeedingVerification();
    const fact = facts.find(f => f.id === factId);

    if (!fact) {
      return {
        verified: false,
        message: 'Fact not found',
        messageArabic: 'المعلومة مش موجودة',
      };
    }

    const verifierProfile = await this.getUserProfile(verifierId);
    const verification = await this.verificationDialog.createVerificationQuestion(fact, verifierProfile);

    const result = await this.verificationDialog.processResponse(
      response,
      factId,
      verification.expectedResponses
    );

    const verified = result === 'confirmation';

    await this.memory.verifyFact(factId, verified, verifierId);

    if (verified) {
      return {
        verified: true,
        message: 'Thank you for confirming',
        messageArabic: 'شكراً لتأكيدك، المعلومة دي هتفيد كل الورش',
      };
    } else if (result === 'denial') {
      return {
        verified: false,
        message: 'Thank you for the correction',
        messageArabic: 'شكراً للتصحيح، هشيل المعلومة دي',
      };
    } else {
      return {
        verified: false,
        message: 'Thank you for your input',
        messageArabic: 'شكراً لرأيك',
      };
    }
  }

  /**
   * Get user profile (placeholder - would fetch from database)
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    // Placeholder - would fetch from database
    return {
      id: userId,
      name: 'User',
      experience: 5,
      lineage: {
        type: 'self_taught',
      },
      reputation: {
        type: 'independent',
      },
      contributions: {
        total: 0,
        correct: 0,
        incorrect: 0,
        valuable: 0,
        consistency: 0.5,
      },
    };
  }
}


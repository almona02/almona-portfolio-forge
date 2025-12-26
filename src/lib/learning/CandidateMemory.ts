/**
 * Candidate Memory - The Staging Area
 * 
 * Stores plausible but unverified knowledge until consensus is reached
 */

import { KnowledgeValidator, type ValidationResult } from './KnowledgeValidator';
import type { UserProfile } from '@/lib/trust/EgyptianTrustScoring';

export interface CandidateFact {
  id: string;
  claim: string;
  claimArabic?: string;
  contributorId: string;
  contributorTrustScore: number;
  verifications: number;
  denials: number;
  status: 'pending' | 'probation' | 'accepted' | 'rejected';
  validation: ValidationResult;
  createdAt: string;
  lastVerified?: string;
  region?: string;
  category?: string;
  applicableScenarios?: string[];
  contraIndications?: string[];
}

export interface StagingArea {
  pending: CandidateFact[];
  probation: CandidateFact[];
  accepted: CandidateFact[];
  rejected: CandidateFact[];
}

/**
 * Candidate Memory - Staging Area for New Knowledge
 */
export class CandidateMemory {
  private memory: Map<string, CandidateFact> = new Map();
  private validator: KnowledgeValidator;

  constructor() {
    this.validator = new KnowledgeValidator();
  }

  /**
   * Ingest new knowledge from user
   */
  async ingestKnowledge(
    claim: string,
    userId: string,
    userTrust: number,
    context?: {
      location?: string;
      category?: string;
      userType?: string;
    }
  ): Promise<{
    status: 'accepted' | 'probation' | 'rejected';
    factId?: string;
    message: string;
    messageArabic: string;
  }> {
    // 1. Validate claim
    const validation = await this.validator.evaluateClaim({
      claim,
      userId,
      userType: context?.userType as any,
      location: context?.location,
      category: context?.category,
    });

    // 2. Check if already exists
    const existing = this.findSimilarClaim(claim);
    if (existing) {
      return {
        status: existing.status === 'accepted' ? 'accepted' : 'probation',
        factId: existing.id,
        message: 'Similar claim already exists',
        messageArabic: 'معلومة مشابهة موجودة بالفعل',
      };
    }

    // 3. Create candidate fact
    const factId = this.generateFactId();
    const candidateFact: CandidateFact = {
      id: factId,
      claim,
      contributorId: userId,
      contributorTrustScore: userTrust,
      verifications: 0,
      denials: 0,
      status: this.determineInitialStatus(validation, userTrust),
      validation,
      createdAt: new Date().toISOString(),
      region: context?.location,
      category: context?.category,
    };

    // 4. Store in memory
    this.memory.set(factId, candidateFact);

    // 5. Determine response
    if (candidateFact.status === 'accepted') {
      return {
        status: 'accepted',
        factId,
        message: 'Claim accepted and added to knowledge base',
        messageArabic: 'الله يفتح عليك! معلومة دهب. سجلتها عندي وهقولها للصنايعية.',
      };
    } else if (candidateFact.status === 'probation') {
      return {
        status: 'probation',
        factId,
        message: 'Claim is plausible but needs verification',
        messageArabic: 'كلام يحترم، بس جديد عليا. هسأل كبار السوق وأتأكد، ولو صح هعتمدها.',
      };
    } else {
      return {
        status: 'rejected',
        message: validation.reason || 'Claim rejected',
        messageArabic: validation.reasonArabic || 'يا ريس، أنا حسبتها هندسياً لقيتها مش راكبة عشان الكود المصري بيقول...',
      };
    }
  }

  /**
   * Verify a candidate fact
   */
  async verifyFact(factId: string, verified: boolean, verifierId: string): Promise<void> {
    const fact = this.memory.get(factId);
    if (!fact) return;

    if (verified) {
      fact.verifications += 1;
      fact.lastVerified = new Date().toISOString();

      // Promote to accepted if enough verifications
      if (fact.verifications >= this.getRequiredVerifications(fact.contributorTrustScore)) {
        fact.status = 'accepted';
      } else if (fact.status === 'pending' && fact.verifications >= 1) {
        fact.status = 'probation';
      }
    } else {
      fact.denials += 1;

      // Reject if too many denials
      if (fact.denials >= 2) {
        fact.status = 'rejected';
      }
    }

    this.memory.set(factId, fact);
  }

  /**
   * Get facts needing verification
   */
  getFactsNeedingVerification(limit: number = 10): CandidateFact[] {
    return Array.from(this.memory.values())
      .filter(fact => fact.status === 'pending' || fact.status === 'probation')
      .sort((a, b) => {
        // Prioritize by trust score and validation confidence
        const scoreA = a.contributorTrustScore * a.validation.confidence;
        const scoreB = b.contributorTrustScore * b.validation.confidence;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Get accepted facts
   */
  getAcceptedFacts(category?: string): CandidateFact[] {
    return Array.from(this.memory.values())
      .filter(fact => fact.status === 'accepted' && (!category || fact.category === category));
  }

  /**
   * Get staging area summary
   */
  getStagingArea(): StagingArea {
    const facts = Array.from(this.memory.values());
    return {
      pending: facts.filter(f => f.status === 'pending'),
      probation: facts.filter(f => f.status === 'probation'),
      accepted: facts.filter(f => f.status === 'accepted'),
      rejected: facts.filter(f => f.status === 'rejected'),
    };
  }

  // Private helper methods

  private findSimilarClaim(claim: string): CandidateFact | null {
    const lowerClaim = claim.toLowerCase();
    for (const fact of this.memory.values()) {
      const similarity = this.calculateSimilarity(lowerClaim, fact.claim.toLowerCase());
      if (similarity > 0.8) {
        return fact;
      }
    }
    return null;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple word overlap similarity
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }

  private determineInitialStatus(
    validation: ValidationResult,
    userTrust: number
  ): CandidateFact['status'] {
    if (!validation.valid) {
      return 'rejected';
    }

    // High trust user + High confidence = Fast track
    if (validation.confidence > 0.9 && userTrust > 0.8) {
      return 'accepted';
    }

    // Plausible but needs verification
    if (validation.confidence > 0.5) {
      return 'probation';
    }

    return 'pending';
  }

  private getRequiredVerifications(trustScore: number): number {
    if (trustScore > 0.9) return 1; // Maalem - 1 confirmation
    if (trustScore > 0.7) return 2; // Experienced - 2 confirmations
    if (trustScore > 0.5) return 3; // Regular - 3 confirmations
    return 5; // New user - 5 confirmations
  }

  private generateFactId(): string {
    return `fact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}


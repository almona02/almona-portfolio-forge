/**
 * Egyptian Trust Scoring - النسب، السمعة، التجربة
 * 
 * Calculates trust based on Egyptian workshop culture:
 * - Lineage (Who trained you?)
 * - Reputation (Where do you work?)
 * - Experience (How many years?)
 * - Contribution History (What have you shared?)
 */

export interface UserProfile {
  id: string;
  name: string;
  workshop?: string;
  location?: string;
  area?: string;
  experience: number; // years
  lineage?: {
    type: 'maalem_apprentice' | 'self_taught' | 'technical_college' | 'university';
    mentorId?: string;
    mentorName?: string;
  };
  reputation: {
    type: 'known_workshop_cairo' | 'new_workshop' | 'technical_office' | 'government_engineer' | 'independent';
    workshopMemberships?: number;
    locationReputation?: Record<string, number>; // area -> reputation score
  };
  contributions: {
    total: number;
    correct: number;
    incorrect: number;
    valuable: number; // Valuable tricks/secrets shared
    consistency: number; // 0-1, consistency of good contributions
  };
  supplierConnections?: number;
  mentorId?: string;
  title?: string; // e.g., 'معلم', 'صنايعي محترم'
}

export interface TrustScore {
  numerical: number; // 0.0 to 1.0
  label: string; // 'معلم كبير', 'معلم', 'صنايعي محترم', etc.
  treatment: {
    skepticism: number; // 0.0 to 1.0
    verificationNeeded: number; // How many confirmations needed
    maalemConfirmations: number; // How many maalems need to confirm
  };
  egyptianFactors: {
    knowsSupplierNetwork: boolean;
    partOfWorkshopCommunity: boolean;
    hasMentor: boolean;
    respectedInArea: number; // 0-1
  };
}

/**
 * Egyptian Trust Scoring
 */
export class EgyptianTrustScoring {
  private trustFactors = {
    lineage: {
      maalem_apprentice: 0.7,
      self_taught: 0.3,
      technical_college: 0.5,
      university: 0.6,
    },
    reputation: {
      known_workshop_cairo: 0.8,
      new_workshop: 0.4,
      technical_office: 0.7,
      government_engineer: 0.9,
      independent: 0.5,
    },
    experience: {
      '<2_years': 0.3,
      '2-5_years': 0.5,
      '5-10_years': 0.7,
      '10-20_years': 0.9,
      '20+_years': 1.0,
    },
    contribution_history: {
      previously_correct: 0.2, // Per correct contribution
      previously_incorrect: -0.3, // Per incorrect
      consistently_good: 0.5, // Bonus for consistency
      shared_secrets: 0.4, // Bonus for sharing real secrets
    },
  };

  /**
   * Calculate Egyptian-style trust score
   */
  async calculateEgyptianTrust(userProfile: UserProfile): Promise<TrustScore> {
    // 1. Lineage score (النسب)
    const lineageScore = this.calculateLineageScore(userProfile);

    // 2. Reputation score (السمعة)
    const reputationScore = this.calculateReputationScore(userProfile);

    // 3. Experience score (التجربة)
    const experienceScore = this.calculateExperienceScore(userProfile);

    // 4. Contribution history (تاريخ المشاركة)
    const contributionScore = this.calculateContributionScore(userProfile);

    // Weighted average
    const numerical = (
      lineageScore * 0.2 +
      reputationScore * 0.3 +
      experienceScore * 0.3 +
      contributionScore * 0.2
    );

    // Get Egyptian label
    const label = this.getEgyptianTrustLabel(userProfile);

    // Calculate treatment
    const treatment = this.calculateTreatment(userProfile, numerical);

    // Egyptian factors
    const egyptianFactors = this.calculateEgyptianFactors(userProfile);

    return {
      numerical: Math.min(1.0, Math.max(0.0, numerical)),
      label,
      treatment,
      egyptianFactors,
    };
  }

  /**
   * Calculate lineage score
   */
  private calculateLineageScore(profile: UserProfile): number {
    if (!profile.lineage) return 0.3; // Default for unknown

    const baseScore = this.trustFactors.lineage[profile.lineage.type] || 0.3;

    // Bonus if has mentor
    if (profile.lineage.mentorId) {
      return baseScore * 1.2; // 20% bonus
    }

    return baseScore;
  }

  /**
   * Calculate reputation score
   */
  private calculateReputationScore(profile: UserProfile): number {
    const baseScore = this.trustFactors.reputation[profile.reputation.type] || 0.5;

    // Bonus for workshop memberships
    const membershipBonus = Math.min(0.2, (profile.reputation.workshopMemberships || 0) * 0.05);

    // Location reputation
    const locationRep = profile.reputation.locationReputation?.[profile.area || ''] || 0;
    const locationBonus = locationRep * 0.1;

    return Math.min(1.0, baseScore + membershipBonus + locationBonus);
  }

  /**
   * Calculate experience score
   */
  private calculateExperienceScore(profile: UserProfile): number {
    const years = profile.experience;

    if (years < 2) return this.trustFactors.experience['<2_years'];
    if (years < 5) return this.trustFactors.experience['2-5_years'];
    if (years < 10) return this.trustFactors.experience['5-10_years'];
    if (years < 20) return this.trustFactors.experience['10-20_years'];
    return this.trustFactors.experience['20+_years'];
  }

  /**
   * Calculate contribution score
   */
  private calculateContributionScore(profile: UserProfile): number {
    const { contributions } = profile;

    if (contributions.total === 0) return 0.5; // Neutral for new users

    // Correctness ratio
    const correctnessRatio = contributions.correct / contributions.total;
    const correctnessScore = correctnessRatio * 0.6;

    // Consistency bonus
    const consistencyBonus = contributions.consistency * 0.3;

    // Valuable contributions bonus
    const valuableBonus = Math.min(0.1, contributions.valuable * 0.02);

    return Math.min(1.0, correctnessScore + consistencyBonus + valuableBonus);
  }

  /**
   * Get Egyptian trust label
   */
  private getEgyptianTrustLabel(profile: UserProfile): string {
    const years = profile.experience;
    const score = this.calculateNumericalScore(profile);

    if (score >= 0.9 || years >= 20) return 'معلم كبير';
    if (score >= 0.8 || years >= 10) return 'معلم';
    if (score >= 0.6 || years >= 5) return 'صنايعي محترم';
    if (score >= 0.4 || years >= 2) return 'صنايعي جديد';
    return 'مبتدئ';
  }

  /**
   * Calculate treatment based on trust
   */
  private calculateTreatment(profile: UserProfile, score: number): TrustScore['treatment'] {
    return {
      skepticism: Math.max(0.0, 1.0 - score),
      verificationNeeded: this.getVerificationCount(score),
      maalemConfirmations: profile.experience < 5 ? 3 : profile.experience < 10 ? 2 : 1,
    };
  }

  /**
   * Calculate Egyptian factors
   */
  private calculateEgyptianFactors(profile: UserProfile): TrustScore['egyptianFactors'] {
    return {
      knowsSupplierNetwork: (profile.supplierConnections || 0) > 10,
      partOfWorkshopCommunity: (profile.reputation.workshopMemberships || 0) > 0,
      hasMentor: !!profile.mentorId,
      respectedInArea: profile.reputation.locationReputation?.[profile.area || ''] || 0,
    };
  }

  /**
   * Calculate numerical score (helper)
   */
  private calculateNumericalScore(profile: UserProfile): number {
    const lineageScore = this.calculateLineageScore(profile);
    const reputationScore = this.calculateReputationScore(profile);
    const experienceScore = this.calculateExperienceScore(profile);
    const contributionScore = this.calculateContributionScore(profile);

    return (
      lineageScore * 0.2 +
      reputationScore * 0.3 +
      experienceScore * 0.3 +
      contributionScore * 0.2
    );
  }

  /**
   * Get verification count needed
   */
  private getVerificationCount(score: number): number {
    if (score >= 0.9) return 1;
    if (score >= 0.7) return 2;
    if (score >= 0.5) return 3;
    return 5;
  }

  /**
   * Get skepticism level
   */
  private getSkepticismLevel(profile: UserProfile): number {
    const score = this.calculateNumericalScore(profile);
    return Math.max(0.0, 1.0 - score);
  }
}


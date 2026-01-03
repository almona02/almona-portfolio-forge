/**
 * The Guild System
 * 
 * Implements the social hierarchy for the Grand Synthesis architecture.
 * Controls who can override Firmans and access advanced features.
 * 
 * Inspired by traditional craft guilds (Maalem = Master Craftsman)
 */

import type { GuildRank } from '@/types/firman';

/**
 * User guild profile
 */
export interface GuildProfile {
  userId: string;
  rank: GuildRank;
  title: string; // e.g., "Master Fabricator", "Grand Vizier of Engineering"
  joinedAt: Date;
  experiencePoints: number;
  certifications: string[];
  workshopId?: string;
  workshopName?: string;
}

/**
 * Guild rank definitions
 */
export const GUILD_RANKS: Record<GuildRank, {
  title: string;
  titleArabic: string;
  description: string;
  permissions: {
    canOverrideAdvice: boolean;
    canOverrideWarning: boolean;
    canOverrideBlock: boolean;
    canOverrideImperialDecree: boolean;
    canAccessFoundry: boolean;
    canModifySystemPacks: boolean;
    canViewAnalytics: boolean;
  };
}> = {
  APPRENTICE: {
    title: 'Apprentice',
    titleArabic: 'مبتدئ',
    description: 'Learning the craft. Cannot override any Firmans.',
    permissions: {
      canOverrideAdvice: false,
      canOverrideWarning: false,
      canOverrideBlock: false,
      canOverrideImperialDecree: false,
      canAccessFoundry: false,
      canModifySystemPacks: false,
      canViewAnalytics: true
    }
  },
  MASTER: {
    title: 'Master (Maalem)',
    titleArabic: 'معلم',
    description: 'Master craftsman. Can override WARNING and ADVICE Firmans.',
    permissions: {
      canOverrideAdvice: true,
      canOverrideWarning: true,
      canOverrideBlock: false,
      canOverrideImperialDecree: false,
      canAccessFoundry: true,
      canModifySystemPacks: true,
      canViewAnalytics: true
    }
  },
  GRAND_VIZIER: {
    title: 'Grand Vizier',
    titleArabic: 'الوزير الأعظم',
    description: 'Highest authority. Can override BLOCK Firmans (but not IMPERIAL_DECREE).',
    permissions: {
      canOverrideAdvice: true,
      canOverrideWarning: true,
      canOverrideBlock: true,
      canOverrideImperialDecree: false,
      canAccessFoundry: true,
      canModifySystemPacks: true,
      canViewAnalytics: true
    }
  }
};

/**
 * Guild System Manager
 */
export class GuildSystem {
  /**
   * Get user's guild profile
   */
  static async getUserGuildProfile(userId: string): Promise<GuildProfile | null> {
    // TODO: Fetch from database
    // For now, return default APPRENTICE
    return {
      userId,
      rank: 'APPRENTICE',
      title: GUILD_RANKS.APPRENTICE.title,
      joinedAt: new Date(),
      experiencePoints: 0,
      certifications: []
    };
  }

  /**
   * Check if user can override a specific Firman
   */
  static async canUserOverrideFirman(
    userId: string,
    firmanCode: string,
    firmanSeverity: string
  ): Promise<boolean> {
    const profile = await this.getUserGuildProfile(userId);
    if (!profile) return false;
    
    // This will be used with actual Firman objects
    // For now, use the permission checks
    const rank = GUILD_RANKS[profile.rank];
    
    switch (firmanSeverity) {
      case 'ADVICE':
        return rank.permissions.canOverrideAdvice;
      case 'WARNING':
        return rank.permissions.canOverrideWarning;
      case 'BLOCK':
        return rank.permissions.canOverrideBlock;
      case 'IMPERIAL_DECREE':
        return rank.permissions.canOverrideImperialDecree;
      default:
        return false;
    }
  }

  /**
   * Check if user can access TheFoundry
   */
  static async canAccessFoundry(userId: string): Promise<boolean> {
    const profile = await this.getUserGuildProfile(userId);
    if (!profile) return false;
    return GUILD_RANKS[profile.rank].permissions.canAccessFoundry;
  }

  /**
   * Check if user can modify system packs
   */
  static async canModifySystemPacks(userId: string): Promise<boolean> {
    const profile = await this.getUserGuildProfile(userId);
    if (!profile) return false;
    return GUILD_RANKS[profile.rank].permissions.canModifySystemPacks;
  }

  /**
   * Promote user to next rank (if eligible)
   */
  static async promoteUser(userId: string): Promise<GuildProfile | null> {
    const profile = await this.getUserGuildProfile(userId);
    if (!profile) return null;
    
    // Promotion logic based on experience points and certifications
    // TODO: Implement actual promotion criteria
    return profile;
  }
}


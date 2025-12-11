/**
 * The Legal System: "Firmans" (Not Errors)
 * 
 * In the Grand Synthesis architecture, validation errors are not mere technical failures.
 * They are "Firmans" - legal decrees backed by academic authority and engineering standards.
 * 
 * This transforms the platform from a tool into a "Code of Law" for industrial fabrication.
 */

/**
 * Severity levels for Firmans
 * - ADVICE: Informational guidance (can be ignored)
 * - WARNING: Strong recommendation (should be addressed)
 * - BLOCK: Prevents proceeding (must be resolved)
 * - IMPERIAL_DECREE: Absolute law (cannot be overridden, even by Grand Vizier)
 */
export type FirmanSeverity = 'ADVICE' | 'WARNING' | 'BLOCK' | 'IMPERIAL_DECREE';

/**
 * Guild rank determines who can override Firmans
 * - APPRENTICE: Cannot override any Firmans
 * - MASTER: Can override WARNING and ADVICE (not BLOCK or IMPERIAL_DECREE)
 * - GRAND_VIZIER: Can override BLOCK (not IMPERIAL_DECREE)
 */
export type GuildRank = 'APPRENTICE' | 'MASTER' | 'GRAND_VIZIER';

/**
 * Academic citation source
 */
export interface CitationSource {
  /** Source name (e.g., "Egyptian Building Code", "EN 12210", "HBRC Technical Guide") */
  source: string;
  /** Publication year */
  year: number;
  /** Page number or section reference */
  page?: number | string;
  /** PDF deep link or URL */
  link?: string;
  /** Standard code (e.g., "ECP-203", "EN 12210:2016") */
  standardCode?: string;
}

/**
 * Firman - A legal decree backed by engineering authority
 * 
 * Each Firman represents a validation rule that has been codified into law
 * through academic research, building codes, and engineering standards.
 */
export interface Firman {
  /** Unique code (e.g., "ECP-203-V" for Ventilation, "EN-12210-WL" for Wind Load) */
  code: string;
  
  /** Human-readable title */
  title: string;
  
  /** Detailed message explaining the violation */
  message: string;
  
  /** Severity level */
  severity: FirmanSeverity;
  
  /** Academic citation backing this Firman */
  citation: CitationSource;
  
  /** Pedagogical note - "Professor Mode" explanation for learning */
  pedagogicalNote: string;
  
  /** Minimum guild rank required to override this Firman */
  overrideLevel: GuildRank;
  
  /** Optional technical details for engineers */
  technicalDetails?: {
    /** Calculated values that triggered this Firman */
    calculatedValues?: Record<string, number | string>;
    /** Recommended fix or correction */
    recommendedFix?: string;
    /** Related Firmans that may also apply */
    relatedFirmans?: string[];
  };
  
  /** Timestamp when this Firman was issued */
  issuedAt: Date;
  
  /** Optional override information (if this Firman was overridden) */
  override?: {
    overriddenBy: string; // User ID
    overriddenAt: Date;
    overrideReason: string;
    guildRank: GuildRank;
  };
}

/**
 * Validation result containing Firmans
 */
export interface FirmanValidationResult {
  /** Whether the validation passed (no BLOCK or IMPERIAL_DECREE Firmans) */
  isValid: boolean;
  
  /** All Firmans issued (grouped by severity) */
  firmans: {
    advice: Firman[];
    warnings: Firman[];
    blocks: Firman[];
    imperialDecrees: Firman[];
  };
  
  /** Summary counts */
  summary: {
    total: number;
    advice: number;
    warnings: number;
    blocks: number;
    imperialDecrees: number;
  };
}

/**
 * Check if a guild rank can override a Firman
 */
export function canOverrideFirman(
  firman: Firman,
  userGuildRank: GuildRank
): boolean {
  // IMPERIAL_DECREE cannot be overridden by anyone
  if (firman.severity === 'IMPERIAL_DECREE') {
    return false;
  }
  
  // BLOCK can only be overridden by GRAND_VIZIER
  if (firman.severity === 'BLOCK') {
    return userGuildRank === 'GRAND_VIZIER';
  }
  
  // WARNING and ADVICE can be overridden by MASTER or GRAND_VIZIER
  if (firman.severity === 'WARNING' || firman.severity === 'ADVICE') {
    return userGuildRank === 'MASTER' || userGuildRank === 'GRAND_VIZIER';
  }
  
  return false;
}

/**
 * Check if user's guild rank meets the override level requirement
 */
export function meetsOverrideLevel(
  userGuildRank: GuildRank,
  requiredLevel: GuildRank
): boolean {
  const rankHierarchy: Record<GuildRank, number> = {
    'APPRENTICE': 0,
    'MASTER': 1,
    'GRAND_VIZIER': 2
  };
  
  return rankHierarchy[userGuildRank] >= rankHierarchy[requiredLevel];
}


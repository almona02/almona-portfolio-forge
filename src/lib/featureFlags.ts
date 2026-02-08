/**
 * Feature Flag System - Controlled Rollout & A/B Testing
 * 
 * Enables gradual feature rollout, workshop-specific access, and safe experimentation.
 * Critical for beta testing and production safety.
 * 
 * @since Phase 2B: Dual-Output Engine (Week 2 - Day 7)
 */

// Helper to safely access environment variables (Vite uses import.meta.env)
const getEnvVar = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  // Fallback for Node.js environments (testing, SSR)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

export const FeatureFlags = {
  // Dual-Output System
  DUAL_OUTPUT_BETA_ENABLED: getEnvVar('VITE_ENABLE_DUAL_OUTPUT') === 'true' || getEnvVar('NEXT_PUBLIC_ENABLE_DUAL_OUTPUT') === 'true',
  DUAL_OUTPUT_VISUALIZATION: true,
  DUAL_OUTPUT_PRODUCTION_DATA: true,
  
  // Pattern Suggestions
  PATTERN_SUGGESTIONS_ENABLED: getEnvVar('VITE_ENABLE_PATTERN_SUGGESTIONS') === 'true' || getEnvVar('NEXT_PUBLIC_ENABLE_PATTERN_SUGGESTIONS') === 'true',
  
  // Performance Features
  PERFORMANCE_CACHING: true,
  PERFORMANCE_DEBOUNCING: true,
  PERFORMANCE_WEB_WORKERS: getEnvVar('VITE_ENABLE_WEB_WORKERS') === 'true' || getEnvVar('NEXT_PUBLIC_ENABLE_WEB_WORKERS') === 'true',
  
  // Workshop Access (Beta workshops)
  WORKSHOP_BETA_ACCESS: ['workshop_alpha', 'workshop_beta'] as string[], // Workshop IDs
  
  // Gold Tier System
  GOLD_TIER_ENABLED: getEnvVar('VITE_GOLD_TIER_ENABLED') === 'true' || getEnvVar('NEXT_PUBLIC_GOLD_TIER_ENABLED') === 'true',
  
  /** Fabricator consolidation: read from v2 tables (true) or v1 (rollback within 30-day window). */
  FABRICATOR_READ_V2: (() => {
    const v = getEnvVar('VITE_FABRICATOR_READ_V2') || getEnvVar('NEXT_PUBLIC_FABRICATOR_READ_V2');
    return v !== 'false'; // default true (v2)
  })(),

  // Week 1: Opening Mechanisms & Proportional Grid
  ENABLE_OPENING_MECHANISMS: (() => {
    const viteValue = getEnvVar('VITE_ENABLE_OPENING_MECHANISMS');
    const nextValue = getEnvVar('NEXT_PUBLIC_ENABLE_OPENING_MECHANISMS');
    const explicitValue = viteValue || nextValue;
    // Default to true (enabled) unless explicitly set to 'false'
    return explicitValue === undefined || explicitValue !== 'false';
  })(),
  ENABLE_PROPORTIONAL_GRID: true, // Always enabled for accuracy
} as const;

export type FeatureFlagKey = keyof typeof FeatureFlags;

export class FeatureFlagManager {
  private static workshopOverrides: Map<string, Set<FeatureFlagKey>> = new Map();
  
  /**
   * Check if a feature is enabled
   */
  static isEnabled(feature: FeatureFlagKey): boolean {
    // Check environment variable override (support both Vite and Next.js conventions)
    const viteEnvVar = `VITE_${feature.toUpperCase()}`;
    const nextEnvVar = `NEXT_PUBLIC_${feature.toUpperCase()}`;
    const envValue = getEnvVar(viteEnvVar) || getEnvVar(nextEnvVar);
    
    if (envValue !== undefined) {
      return envValue === 'true';
    }
    
    // Check workshop-specific access
    if (feature === 'WORKSHOP_BETA_ACCESS') {
      const workshopId = this.getCurrentWorkshopId();
      return (FeatureFlags.WORKSHOP_BETA_ACCESS as string[]).includes(workshopId);
    }
    
    // Check workshop-specific overrides
    const workshopId = this.getCurrentWorkshopId();
    if (workshopId) {
      const overrides = this.workshopOverrides.get(workshopId);
      if (overrides?.has(feature)) {
        return true;
      }
    }
    
    return FeatureFlags[feature] as boolean;
  }
  
  /**
   * Enable a feature for a specific workshop
   */
  static enableForWorkshop(workshopId: string, feature: FeatureFlagKey): void {
    if (!this.workshopOverrides.has(workshopId)) {
      this.workshopOverrides.set(workshopId, new Set());
    }
    
    this.workshopOverrides.get(workshopId)!.add(feature);
    
    // In production, this would call an API to persist the setting
    console.log(`✅ Enabled ${feature} for workshop ${workshopId}`);
  }
  
  /**
   * Disable a feature for a specific workshop
   */
  static disableForWorkshop(workshopId: string, feature: FeatureFlagKey): void {
    const overrides = this.workshopOverrides.get(workshopId);
    if (overrides) {
      overrides.delete(feature);
      console.log(`❌ Disabled ${feature} for workshop ${workshopId}`);
    }
  }
  
  /**
   * Get all enabled features for current workshop
   */
  static getEnabledFeatures(): FeatureFlagKey[] {
    const enabled: FeatureFlagKey[] = [];
    
    Object.keys(FeatureFlags).forEach((key) => {
      if (this.isEnabled(key as FeatureFlagKey)) {
        enabled.push(key as FeatureFlagKey);
      }
    });
    
    return enabled;
  }
  
  /**
   * Check if workshop has beta access
   */
  static hasBetaAccess(workshopId?: string): boolean {
    const id = workshopId || this.getCurrentWorkshopId();
    return (FeatureFlags.WORKSHOP_BETA_ACCESS as string[]).includes(id) || 
           this.workshopOverrides.has(id);
  }
  
  /**
   * Get current workshop ID from context/storage
   */
  private static getCurrentWorkshopId(): string {
    // In a real app, this would come from:
    // - React context
    // - Local storage
    // - Session storage
    // - API call
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('workshopId');
      if (stored) return stored;
    }
    
    return 'default';
  }
  
  /**
   * Reset all workshop overrides (for testing)
   */
  static reset(): void {
    this.workshopOverrides.clear();
  }
}


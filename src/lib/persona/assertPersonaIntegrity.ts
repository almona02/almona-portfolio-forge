/**
 * @file assertPersonaIntegrity.ts
 * @description Startup validation for persona configs.
 * Validates all personas have required permissions and visible tabs.
 * Fails fast on misconfiguration.
 */

import { PERSONA_CONFIGS } from './roleMapper';
import { ACCURACY_CONTRACT } from '@/lib/authority/ACCURACY_CONTRACT';
import type { StrategicPersona } from './types';

export class PersonaIntegrityError extends Error {
  constructor(message: string) {
    super(`Persona integrity check failed: ${message}`);
    this.name = 'PersonaIntegrityError';
  }
}

/**
 * Validates persona configurations at app startup.
 * Throws PersonaIntegrityError if misconfiguration detected.
 */
export function assertPersonaIntegrity(): void {
  const requiredPersonas: StrategicPersona[] = ['operator', 'supervisor', 'manager', 'inspector'];

  // 1. Check all required personas exist
  for (const persona of requiredPersonas) {
    if (!PERSONA_CONFIGS[persona]) {
      throw new PersonaIntegrityError(`Missing persona config: ${persona}`);
    }
  }

  // 2. Validate each persona has visible tabs
  for (const persona of requiredPersonas) {
    const config = PERSONA_CONFIGS[persona];
    if (!config.visibleTabs || config.visibleTabs.length === 0) {
      throw new PersonaIntegrityError(`Persona ${persona} has no visible tabs`);
    }
  }

  // 3. Validate permissions structure
  for (const persona of requiredPersonas) {
    const config = PERSONA_CONFIGS[persona];
    const requiredPermissions = [
      'canEditDesign',
      'canViewFinancials',
      'canOverride',
      'canApprove',
      'canViewAnalytics',
      'canManageWorkshops',
      'canAudit',
    ];

    for (const perm of requiredPermissions) {
      if (!(perm in config.permissions)) {
        throw new PersonaIntegrityError(`Persona ${persona} missing permission: ${perm}`);
      }
    }
  }

  // 4. Validate inspector is read-only
  const inspectorConfig = PERSONA_CONFIGS.inspector;
  if (inspectorConfig.permissions.canEditDesign !== false) {
    throw new PersonaIntegrityError('Inspector must have canEditDesign = false');
  }
  if (inspectorConfig.permissions.canOverride !== false) {
    throw new PersonaIntegrityError('Inspector must have canOverride = false');
  }

  // 5. Validate ACCURACY_CONTRACT integrity
  if (ACCURACY_CONTRACT.visual_preview >= ACCURACY_CONTRACT.production_output) {
    throw new PersonaIntegrityError('ACCURACY_CONTRACT: visual >= production');
  }

  // All checks passed
  console.log('[PersonaIntegrity] All persona configurations valid');
}














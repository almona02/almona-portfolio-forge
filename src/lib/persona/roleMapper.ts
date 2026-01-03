/**
 * @file roleMapper.ts
 * @description Core mapping logic for personas (frozen, immutable configs).
 * Maps database roles to strategic personas.
 */

import type { PersonaConfig, StrategicPersona } from './types';

// Frozen persona configurations - DO NOT MODIFY without approval
export const PERSONA_CONFIGS = Object.freeze({
  operator: Object.freeze({
    persona: 'operator',
    visibleTabs: Object.freeze(['measuring', 'production', 'quality']),
    permissions: Object.freeze({
      canEditDesign: false,
      canViewFinancials: false,
      canOverride: false,
      canApprove: false,
      canViewAnalytics: false,
      canManageWorkshops: false,
      canAudit: false,
    }),
    description: Object.freeze({
      en: 'Production operator - handles measuring, production, and quality control',
      ar: 'مشغل الإنتاج - يتعامل مع القياس والإنتاج ومراقبة الجودة',
    }),
  }),
  supervisor: Object.freeze({
    persona: 'supervisor',
    visibleTabs: Object.freeze(['measuring', 'design', 'optimization', 'production', 'quality']),
    permissions: Object.freeze({
      canEditDesign: true,
      canViewFinancials: false,
      canOverride: true, // In production/certified mode
      canApprove: true,
      canViewAnalytics: false,
      canManageWorkshops: false,
      canAudit: false,
    }),
    description: Object.freeze({
      en: 'Supervisor - can approve designs, override in production mode, manage workflow',
      ar: 'المشرف - يمكنه الموافقة على التصاميم، التجاوز في وضع الإنتاج، إدارة سير العمل',
    }),
  }),
  manager: Object.freeze({
    persona: 'manager',
    visibleTabs: Object.freeze(['measuring', 'design', 'preview3d', 'optimization', 'inventory', 'production', 'quality']),
    permissions: Object.freeze({
      canEditDesign: true,
      canViewFinancials: true,
      canOverride: true,
      canApprove: true,
      canViewAnalytics: true,
      canManageWorkshops: true,
      canAudit: false,
    }),
    description: Object.freeze({
      en: 'Manager - full access including financials, analytics, and multi-workshop management',
      ar: 'المدير - وصول كامل بما في ذلك المالية والتحليلات وإدارة الورش المتعددة',
    }),
  }),
  inspector: Object.freeze({
    persona: 'inspector',
    visibleTabs: Object.freeze(['measuring', 'design', 'quality']),
    permissions: Object.freeze({
      canEditDesign: false, // Read-only
      canViewFinancials: false,
      canOverride: false,
      canApprove: false,
      canViewAnalytics: false,
      canManageWorkshops: false,
      canAudit: true,
    }),
    description: Object.freeze({
      en: 'Inspector - read-only access for quality audits and compliance verification',
      ar: 'المفتش - وصول للقراءة فقط لتدقيق الجودة والتحقق من الامتثال',
    }),
  }),
});

/**
 * Maps database role to strategic persona.
 * @param dbRole - Database role from profiles table
 * @param hasWorkshopOwnership - Whether user owns a workshop
 * @returns Strategic persona
 */
export function detectPersona(
  dbRole: string | null | undefined,
  hasWorkshopOwnership: boolean = false
): StrategicPersona {
  if (!dbRole) {
    return 'operator'; // Safe default
  }

  const role = dbRole.toLowerCase();

  // Inspector role (explicit)
  if (role === 'inspector') {
    return 'inspector';
  }

  // Technical officer with workshop ownership → manager
  if (role === 'technical_officer' && hasWorkshopOwnership) {
    return 'manager';
  }

  // Technical officer without ownership → supervisor
  if (role === 'technical_officer' && !hasWorkshopOwnership) {
    return 'supervisor';
  }

  // Owner → manager
  if (role === 'owner') {
    return 'manager';
  }

  // User admin → supervisor
  if (role === 'user_admin') {
    return 'supervisor';
  }

  // Operator (default)
  if (role === 'operator') {
    return 'operator';
  }

  // Fallback to operator for unknown roles
  return 'operator';
}

/**
 * Gets persona configuration by persona type.
 */
export function getPersonaConfig(persona: StrategicPersona): PersonaConfig {
  const config = PERSONA_CONFIGS[persona];
  return {
    ...config,
    visibleTabs: [...config.visibleTabs],
    permissions: { ...config.permissions },
    description: { ...config.description },
  };
}













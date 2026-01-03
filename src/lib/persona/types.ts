/**
 * @file types.ts
 * @description TypeScript interfaces for strategic personas.
 * Maps database roles to strategic personas without UI changes.
 */

export type StrategicPersona = 'operator' | 'supervisor' | 'manager' | 'inspector';

export interface PersonaPermissions {
  canEditDesign: boolean;
  canViewFinancials: boolean;
  canOverride: boolean;
  canApprove: boolean;
  canViewAnalytics: boolean;
  canManageWorkshops: boolean;
  canAudit: boolean;
}

export interface PersonaConfig {
  persona: StrategicPersona;
  visibleTabs: string[];
  permissions: PersonaPermissions;
  description: {
    en: string;
    ar: string;
  };
}

export interface PersonaResolution {
  persona: StrategicPersona;
  visibleTabs: string[];
  permissions: PersonaPermissions;
  confidence: 'high' | 'medium' | 'low';
  source: 'database' | 'fallback' | 'cache';
}














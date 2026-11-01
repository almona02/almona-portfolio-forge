import type { FabricationData, Profile, WindowComponent } from '@/types/fabricator';

export type LedgerRole = FabricationData['profiles'][number]['role'];

/**
 * Canonical ledger role shared by generated and saved paths (BOM rows, evidence
 * ledger and the assembly manifest all use this one mapping).
 */
export function resolveLedgerRole(profile: Profile | undefined, fallback: string): LedgerRole {
  const bomRole = profile?.specifications?.bomRole;
  if (typeof bomRole === 'string' && bomRole) {
    return bomRole as LedgerRole;
  }
  const raw = String(profile?.profileRole || fallback || 'unknown');
  if (raw === 'sash_sliding' || raw.startsWith('sash_')) return 'sash';
  if (raw === 'screen_track') return 'track';
  if (raw === 'glazing_bead_inner' || raw === 'glazing_bead_outer' || raw === 'bead') {
    return 'glazing_bead';
  }
  return raw as LedgerRole;
}

export function componentHasLedgerRole(component: WindowComponent, role: string): boolean {
  const resolved = resolveLedgerRole(component.profile, component.type);
  if (resolved === role) return true;
  if (role === 'track') return resolved === 'screen_track' || component.type === 'track';
  if (role === 'glazing_bead') {
    return resolved === 'glazing_bead' || component.type === 'glazing_bead' || component.type === 'bead';
  }
  return component.type === role;
}

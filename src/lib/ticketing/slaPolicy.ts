/**
 * Canonical SLA policy — loads from sla_policy.json (single source for TS + Python).
 */

import slaPolicyJson from './sla_policy.json';

export interface SlaPolicyRow {
  responseHours: number;
  resolutionHours: number;
  escalationHours: number;
}

type PolicyFile = Record<string, SlaPolicyRow | Record<string, SlaPolicyRow>>;

const POLICY = slaPolicyJson as PolicyFile;
const DEFAULT_SLA = POLICY.default as SlaPolicyRow;

export function resolveSlaPolicy(priority: string, ticketType: string): SlaPolicyRow {
  const byPriority = POLICY[priority];
  if (!byPriority || typeof byPriority !== 'object' || 'responseHours' in byPriority) {
    const fallback = POLICY.medium as Record<string, SlaPolicyRow>;
    return fallback?.general ?? DEFAULT_SLA;
  }
  const typeMap = byPriority as Record<string, SlaPolicyRow>;
  return typeMap[ticketType] ?? typeMap.general ?? DEFAULT_SLA;
}

/** Exported for cross-language parity tests */
export const SLA_POLICY_SOURCE = 'src/lib/ticketing/sla_policy.json';

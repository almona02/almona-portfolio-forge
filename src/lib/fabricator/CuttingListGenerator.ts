/**
 * Cutting List Generator - Phase 1: Foundational Precision
 * 
 * Generates cutting lists from window dimensions and system packs.
 * Uses MicronEngine for precision calculations.
 */

import type { SystemPack } from '@/data/systemPacks';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { micronEngine } from './MicronEngine';
import type { Cut } from './OptimizationEngine';

/**
 * Generate cutting list from dimensions and system pack
 */
export function generateCuttingListFromSystemPack(
  systemPackId: string,
  width: number,
  height: number,
  options?: {
    includeTransom?: boolean;
    transomHeight?: number;
    includeBeads?: boolean;
  }
): Cut[] {
  const systemPack = SYSTEM_PACKS.find(p => p.meta.id === systemPackId);
  if (!systemPack) {
    throw new Error(`System pack ${systemPackId} not found`);
  }

  const cuts: Cut[] = [];
  const spec = systemPack.windowSystemSpec as any;

  // Get cutting rules from system pack
  const cuttingRules = spec.cutting_rules || {};
  
  // Default rules if not specified (fallback to common values)
  let frameRule = cuttingRules.frame_length || 'L + 50';
  let sashRule = cuttingRules.sash_length || 'L - 40';
  let beadRule = cuttingRules.bead_length || 'L - 167';
  
  // System-specific defaults (from ROCK60_WINDOW_SYSTEM_TEMPLATE and Panda specs)
  if (systemPackId === 'rock60') {
    // ROCK 60: Frame L+60, Sash L-44, Bead L-167 (from ROCK60_WINDOW_SYSTEM_TEMPLATE)
    frameRule = 'L + 60';
    sashRule = 'L - 44';
    beadRule = 'L - 167';
  } else if (systemPackId === 'panda-50' || systemPackId === 'panda-100') {
    // Panda: Frame L+50, Sash L-40, Bead L-167 (from Panda cutting_rules)
    frameRule = 'L + 50';
    sashRule = 'L - 40';
    beadRule = 'L - 167';
  }
  
  const frameAllowance = parseCuttingRule(frameRule, width, height);
  const sashDeduction = parseCuttingRule(sashRule, width, height);
  const beadDeduction = parseCuttingRule(beadRule, width, height);

  // Frame pieces (4 pieces)
  const frameLength = width + frameAllowance;
  const frameHeight = height + frameAllowance;
  
  cuts.push(
    { 
      id: 'frame-left', 
      label: 'Frame Left', 
      plannedLength: frameLength, 
      role: 'frame', 
      profileId: `${systemPackId}-frame`, 
      quantity: 1 
    },
    { 
      id: 'frame-right', 
      label: 'Frame Right', 
      plannedLength: frameLength, 
      role: 'frame', 
      profileId: `${systemPackId}-frame`, 
      quantity: 1 
    },
    { 
      id: 'frame-top', 
      label: 'Frame Top', 
      plannedLength: frameHeight, 
      role: 'frame', 
      profileId: `${systemPackId}-frame`, 
      quantity: 1 
    },
    { 
      id: 'frame-bottom', 
      label: 'Frame Bottom', 
      plannedLength: frameHeight, 
      role: 'frame', 
      profileId: `${systemPackId}-frame`, 
      quantity: 1 
    }
  );

  // Sash pieces (4 pieces)
  const sashLength = width - sashDeduction;
  const sashHeight = height - sashDeduction;
  
  cuts.push(
    { 
      id: 'sash-left', 
      label: 'Sash Left', 
      plannedLength: sashLength, 
      role: 'sash', 
      profileId: `${systemPackId}-sash`, 
      quantity: 1 
    },
    { 
      id: 'sash-right', 
      label: 'Sash Right', 
      plannedLength: sashLength, 
      role: 'sash', 
      profileId: `${systemPackId}-sash`, 
      quantity: 1 
    },
    { 
      id: 'sash-top', 
      label: 'Sash Top', 
      plannedLength: sashHeight, 
      role: 'sash', 
      profileId: `${systemPackId}-sash`, 
      quantity: 1 
    },
    { 
      id: 'sash-bottom', 
      label: 'Sash Bottom', 
      plannedLength: sashHeight, 
      role: 'sash', 
      profileId: `${systemPackId}-sash`, 
      quantity: 1 
    }
  );

  // Beads (if included)
  if (options?.includeBeads !== false) {
    const beadLength = width - beadDeduction;
    const beadHeight = height - beadDeduction;
    
    cuts.push(
      { 
        id: 'bead-h1', 
        label: 'Bead Horizontal 1', 
        plannedLength: beadLength, 
        role: 'bead', 
        profileId: `${systemPackId}-bead`, 
        quantity: 1 
      },
      { 
        id: 'bead-h2', 
        label: 'Bead Horizontal 2', 
        plannedLength: beadLength, 
        role: 'bead', 
        profileId: `${systemPackId}-bead`, 
        quantity: 1 
      },
      { 
        id: 'bead-v1', 
        label: 'Bead Vertical 1', 
        plannedLength: beadHeight, 
        role: 'bead', 
        profileId: `${systemPackId}-bead`, 
        quantity: 1 
      },
      { 
        id: 'bead-v2', 
        label: 'Bead Vertical 2', 
        plannedLength: beadHeight, 
        role: 'bead', 
        profileId: `${systemPackId}-bead`, 
        quantity: 1 
      }
    );
  }

  // Transom (if included)
  if (options?.includeTransom && options.transomHeight) {
    const transomWidth = width - sashDeduction;
    // Apply transom milling using MicronEngine
    const transomLength = micronEngine.calculateTransomMillingLength(
      transomWidth,
      systemPackId
    );
    
    cuts.push(
      { 
        id: 'transom', 
        label: 'Transom', 
        plannedLength: transomLength, 
        role: 'transom', 
        profileId: `${systemPackId}-transom`, 
        quantity: 1 
      }
    );
  }

  return cuts;
}

/**
 * Parse cutting rule (e.g., "L + 50" or "H - 44")
 */
function parseCuttingRule(rule: string, width: number, height: number): number {
  // Simple parser for rules like "L + 50", "H - 44", "L - 167"
  const match = rule.match(/([LH])\s*([+-])\s*(\d+)/);
  if (!match) return 0;

  const dimension = match[1] === 'L' ? width : height;
  const operator = match[2];
  const value = parseFloat(match[3]);

  return operator === '+' ? value : -value;
}

/**
 * Get available system packs for workshop
 */
export function getAvailableSystemPacks(): SystemPack[] {
  // For Phase 1, only return Panda 50, Panda 100, and ROCK 60
  const availableIds = ['panda-50', 'panda-100', 'rock60'];
  return SYSTEM_PACKS.filter(p => availableIds.includes(p.meta.id));
}

/**
 * Get system pack by ID
 */
export function getSystemPackById(id: string): SystemPack | undefined {
  return SYSTEM_PACKS.find(p => p.meta.id === id);
}


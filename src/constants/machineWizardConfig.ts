// Machine Wizard configuration — single source of truth for the recommendation engine.
// The CEO/Admin can adjust the groups here (or a future admin UI can edit this).
import type { Machine } from './yilmazMachines';

export interface WizardOperation {
  id: string;
  label: string;
  description: string;
  /** Machine categories that belong to this operation. */
  categories: string[];
}

export interface WizardAutomationLevel {
  id: string;
  label: string;
  description: string;
}

export interface WizardProductionScale {
  id: string;
  label: string;
  description: string;
}

/**
 * Industry-standard aluminium/UPVC window & door fabrication operations.
 * Ordering reflects the production sequence.
 */
export const WIZARD_OPERATIONS: WizardOperation[] = [
  {
    id: 'profile-cutting',
    label: 'Profile Cutting',
    description: 'Double-head mitre, up-cut and serial saws for length and angle cutting.',
    categories: ['cutting-machines', 'cutting'],
  },
  {
    id: 'machining',
    label: 'Machining & End Milling',
    description: 'CNC machining centres, end milling, and slot / water-drainage drilling.',
    categories: ['processing-centers', 'end-milling', 'milling', 'routers'],
  },
  {
    id: 'corner-crimping',
    label: 'Corner Crimping & Punching',
    description: 'Aluminium corner joining, pressing and profile punching.',
    categories: ['corner-crimping', 'pressing'],
  },
  {
    id: 'welding',
    label: 'Welding (UPVC)',
    description: 'Corner fusion welding for UPVC frames and sashes.',
    categories: ['welding-machines'],
  },
  {
    id: 'corner-cleaning',
    label: 'Corner Cleaning',
    description: 'Weld-bead removal and corner finishing.',
    categories: ['cleaning', 'cleaning-machines'],
  },
  {
    id: 'copy-routing',
    label: 'Copy Routing',
    description: 'Lock, hinge, handle and drainage routing.',
    categories: ['copy-routers'],
  },
  {
    id: 'screwdriving',
    label: 'Reinforcement Screwing',
    description: 'Steel reinforcement screw driving.',
    categories: ['screwdriving'],
  },
  {
    id: 'assembly',
    label: 'Assembly & Glazing',
    description: 'Assembly tables and glazing stations.',
    categories: ['assembling'],
  },
  {
    id: 'material-handling',
    label: 'Conveying & Transport',
    description: 'Roller conveyors, profile carts and supports.',
    categories: ['conveying', 'transport'],
  },
  {
    id: 'extraction',
    label: 'Chip & Swarf Extraction',
    description: 'Vacuum and chip extraction systems.',
    categories: ['swarf-extraction'],
  },
];

export const WIZARD_AUTOMATION: WizardAutomationLevel[] = [
  { id: 'manual', label: 'Manual Operation', description: 'Operator-controlled machines for custom work and low-volume production.' },
  { id: 'semi-automatic', label: 'Semi-Automatic', description: 'Assisted machines with operator supervision.' },
  { id: 'cnc', label: 'CNC & Fully Automatic', description: 'CNC control for high-volume output and repeatable precision.' },
  { id: 'optimized', label: 'Optimized (Recommended)', description: 'Prioritize CNC and automatic machines for throughput and quality.' },
];

export const WIZARD_PRODUCTION: WizardProductionScale[] = [
  { id: 'small', label: 'Small Scale (1–50 units/day)', description: 'Custom work and prototyping.' },
  { id: 'medium', label: 'Medium Scale (50–200 units/day)', description: 'Balanced throughput for regional demand.' },
  { id: 'high', label: 'High Volume (200+ units/day)', description: 'Integrated production lines for sustained volume.' },
];

/**
 * Production-line bundles keyed by material and scale.
 * Each entry is an ordered machine-id list following the fabrication sequence.
 */
export const WIZARD_BUNDLES: Record<string, Record<string, string[]>> = {
  aluminium: {
    small: ['ym-010', 'ym-015', 'ym-071', 'ym-016', 'ym-062'], // cut, end-mill, crimp, copy-route, assemble
    medium: ['ym-002', 'ym-009', 'ym-015', 'ym-049', 'ym-016', 'ym-062'],
    high: ['ym-009', 'aim-3410', 'ym-001', 'ym-049', 'ym-016', 'ym-062', 'ym-022'],
  },
  pvc: {
    small: ['ym-010', 'ym-004', 'ym-003', 'ym-057', 'ym-076', 'ym-062'], // cut, mill, weld, clean, screw, assemble
    medium: ['ym-002', 'ym-007', 'ym-023', 'ym-052', 'ym-077', 'ym-062'],
    high: ['ym-002', 'ym-007', 'ym-023', 'ym-052', 'ym-077', 'ym-008', 'ym-062'],
  },
  both: {
    small: ['ym-010', 'ym-015', 'ym-004', 'ym-071', 'ym-003', 'ym-057', 'ym-076', 'ym-062'],
    medium: ['ym-002', 'ym-009', 'ym-007', 'ym-049', 'ym-023', 'ym-052', 'ym-077', 'ym-016', 'ym-062'],
    high: ['ym-009', 'aim-3410', 'ym-007', 'ym-049', 'ym-023', 'ym-052', 'ym-077', 'ym-008', 'ym-016', 'ym-062'],
  },
};

/** Resolve a bundle into Machine objects. */
export function resolveBundle(material: string, scale: string, machines: Machine[]): Machine[] {
  const ids = WIZARD_BUNDLES[material]?.[scale] ?? [];
  const byId = new Map(machines.map((m) => [m.id, m]));
  return ids.map((id) => byId.get(id)).filter((m): m is Machine => Boolean(m));
}

/** Count machines per operation for the wizard's application step. */
export function operationMachineCount(machines: Machine[], op: WizardOperation): number {
  return machines.filter((m) => op.categories.includes(m.category)).length;
}

/**
 * FP-028 / Phase 5 / P5.3 — Design completion payload.
 *
 * Save must bind template, grid, and system identity to the position —
 * never components alone.
 */

import type { WindowComponent, WindowGrid } from '@/types/fabricator';

export interface DesignCompletionPayload {
  readonly components: WindowComponent[];
  readonly grid: WindowGrid;
  readonly systemPackId: string | null;
  readonly presetId: string | null;
}

export type DesignCompleteHandler = (payload: DesignCompletionPayload) => void;

/** Apply completion identity fields onto a WindowUnit-shaped object. */
export function applyDesignCompletion<T extends {
  components?: WindowComponent[];
  grid?: WindowGrid;
  systemPackId?: string;
  presetId?: string;
}>(unit: T, payload: DesignCompletionPayload): T & {
  components: WindowComponent[];
  grid: WindowGrid;
  systemPackId: string | undefined;
  presetId: string | undefined;
} {
  return {
    ...unit,
    components: payload.components,
    grid: payload.grid,
    systemPackId: payload.systemPackId ?? undefined,
    presetId: payload.presetId ?? undefined,
  };
}

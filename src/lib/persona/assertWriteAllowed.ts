/**
 * @file assertWriteAllowed.ts
 * @description Logic-level write enforcement.
 * Throws error if persona is not allowed to perform write operations.
 */

import type { StrategicPersona } from './types';
import { logPersonaAction } from './personaAudit';

export class WritePermissionError extends Error {
  constructor(persona: StrategicPersona, action: string) {
    super(`Write operation not allowed for persona: ${persona}. Action: ${action}`);
    this.name = 'WritePermissionError';
  }
}

/**
 * Asserts that the persona is allowed to perform write operations.
 * Throws WritePermissionError if not allowed.
 */
export function assertWriteAllowed(
  persona: StrategicPersona,
  action: string,
  userId?: string,
  operationMode?: 'sandbox' | 'production' | 'certified'
): void {
  // Inspector is always read-only
  if (persona === 'inspector') {
    const mode = operationMode || 'production';
    if (userId) {
      logPersonaAction(userId, persona, mode, action, false, { reason: 'inspector_read_only' });
    }
    throw new WritePermissionError(persona, action);
  }

  // All other personas can write (subject to UI gating)
  if (userId && operationMode) {
    logPersonaAction(userId, persona, operationMode, action, true);
  }
}













/**
 * @file guardedMutation.ts
 * @description Non-bypassable write enforcement wrapper.
 * All mutations must use this wrapper - no direct writes possible.
 */

import { assertWriteAllowed } from './assertWriteAllowed';
import type { StrategicPersona } from './types';
import type { OperationMode } from '@/lib/authority/AuthorityContext';

/**
 * Guards a mutation function with write permission checks.
 * Non-bypassable - all mutations must use this wrapper.
 */
export function guardedMutation<T>(
  persona: StrategicPersona,
  action: () => T,
  actionName: string,
  userId?: string,
  operationMode?: OperationMode
): T {
  // Check write permission
  assertWriteAllowed(persona, actionName, userId, operationMode);

  // Execute action
  return action();
}

/**
 * Guards an async mutation function with write permission checks.
 */
export async function guardedMutationAsync<T>(
  persona: StrategicPersona,
  action: () => Promise<T>,
  actionName: string,
  userId?: string,
  operationMode?: OperationMode
): Promise<T> {
  // Check write permission
  assertWriteAllowed(persona, actionName, userId, operationMode);

  // Execute action
  return await action();
}





























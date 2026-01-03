/**
 * @file personaAudit.ts
 * @description Audit logging for compliance.
 * Logs all persona-related actions for compliance audits.
 */

import type { OperationMode } from '@/lib/authority/AuthorityContext';
import type { StrategicPersona } from './types';

export interface PersonaAuditLog {
  userId: string;
  persona: StrategicPersona;
  operationMode: OperationMode;
  action: string;
  allowed: boolean;
  metadata?: Record<string, any>;
  timestamp: number;
}

const AUDIT_LOGS_KEY = 'almona_persona_audit_logs';
const MAX_LOGS = 1000; // Keep last 1000 logs

/**
 * Logs a persona-related action.
 */
export function logPersonaAction(
  userId: string,
  persona: StrategicPersona,
  operationMode: OperationMode,
  action: string,
  allowed: boolean,
  metadata?: Record<string, any>
): void {
  const log: PersonaAuditLog = {
    userId,
    persona,
    operationMode,
    action,
    allowed,
    metadata,
    timestamp: Date.now(),
  };

  // Get existing logs
  const existingRaw = localStorage.getItem(AUDIT_LOGS_KEY);
  let logs: PersonaAuditLog[] = [];
  
  if (existingRaw) {
    try {
      logs = JSON.parse(existingRaw);
    } catch {
      // Invalid logs, start fresh
    }
  }

  // Add new log
  logs.push(log);

  // Keep only last MAX_LOGS
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(-MAX_LOGS);
  }

  // Save back
  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));

  // In production/certified mode, also send to backend (future enhancement)
  if (operationMode === 'certified' || operationMode === 'production') {
    // TODO: Send to backend audit endpoint
    console.log('[PersonaAudit]', log);
  }
}

/**
 * Gets audit logs for a user (for admin/debugging).
 */
export function getPersonaAuditLogs(userId?: string): PersonaAuditLog[] {
  const existingRaw = localStorage.getItem(AUDIT_LOGS_KEY);
  if (!existingRaw) return [];

  try {
    const logs: PersonaAuditLog[] = JSON.parse(existingRaw);
    if (userId) {
      return logs.filter(log => log.userId === userId);
    }
    return logs;
  } catch {
    return [];
  }
}

/**
 * Clears audit logs (for testing/debugging only).
 */
export function clearPersonaAuditLogs(): void {
  localStorage.removeItem(AUDIT_LOGS_KEY);
}













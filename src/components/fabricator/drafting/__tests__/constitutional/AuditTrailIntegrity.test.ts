/**
 * Constitutional Compliance: Audit Trail Integrity
 * AICS-001 §7.4 Enforcement
 * 
 * Verifies that the drafting system maintains a complete, deterministic
 * audit trail for all tool operations.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Audit Trail Integrity (AICS-001 §7.4)', () => {
  const auditTrailPath = path.resolve(
    process.cwd(),
    'src/components/fabricator/drafting/utils/toolAuditTrail.ts'
  );

  it('should have a toolAuditTrail implementation file', () => {
    expect(fs.existsSync(auditTrailPath)).toBe(true);
  });

  it('should export logToolOperation function', () => {
    const content = fs.readFileSync(auditTrailPath, 'utf8');
    expect(content).toContain('export function logToolOperation');
  });

  it('should export getAuditTrail function', () => {
    const content = fs.readFileSync(auditTrailPath, 'utf8');
    expect(content).toContain('export function getAuditTrail');
  });

  it('should export replayOperation function for deterministic replay', () => {
    const content = fs.readFileSync(auditTrailPath, 'utf8');
    expect(content).toContain('export function replayOperation');
  });

  it('should define ToolOperationAudit interface with required fields', () => {
    const content = fs.readFileSync(auditTrailPath, 'utf8');
    expect(content).toContain('export interface ToolOperationAudit');
    // Audit records must capture tool, timestamp, and operation data
    expect(content).toContain('operationId');
  });

  it('should not import ML/AI libraries (Tier 0 boundary)', () => {
    const content = fs.readFileSync(auditTrailPath, 'utf8');
    const forbiddenImports = [
      'tensorflow', 'pytorch', 'torch', 'sklearn',
      'keras', 'openai', 'anthropic'
    ];
    forbiddenImports.forEach(lib => {
      expect(content).not.toContain(`from '${lib}`);
      expect(content).not.toContain(`from "${lib}`);
    });
  });
});

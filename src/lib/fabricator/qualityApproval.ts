import { supabase } from '@/lib/supabase';
import type { QualityApprovalAcknowledgement } from '@/store/workflowStore';

export const QUALITY_CHECK_IDS = ['measurements', 'design', 'model', 'optimization', 'materials', 'commands', 'documents'] as const;
export type QualityCheckId = typeof QUALITY_CHECK_IDS[number];

export interface DimensionalEvidence {
  actualMm: number;
}

export interface QualityEvidence {
  checks: Record<QualityCheckId, boolean>;
  measurements: { width: DimensionalEvidence; height: DimensionalEvidence };
  notes: string;
}

interface ApprovalRow {
  approval_id: string;
  project_id: string;
  position_id: string;
  revision: number;
  inspector_id: string;
  approved_at: string;
}

export interface QualityControlContext {
  projectId: string;
  positionId: string;
  source: 'v1' | 'v2';
  revision: number;
  targetWidthMm: number;
  targetHeightMm: number;
  toleranceMm: number;
}

export async function getAuthoritativeQcRevision(positionId: string): Promise<QualityControlContext> {
  const { data, error } = await supabase.rpc('get_fabricator_qc_context', { p_position_id: positionId });
  if (error) throw new Error(`Unable to verify QC context: ${error.message}`);
  const row = data?.[0];
  if (!row || (row.position_source !== 'v1' && row.position_source !== 'v2')) throw new Error('Authoritative QC context is unavailable.');
  return { projectId: row.project_id, positionId: row.position_id, source: row.position_source, revision: row.revision, targetWidthMm: row.target_width_mm, targetHeightMm: row.target_height_mm, toleranceMm: row.tolerance_mm };
}

export async function approveQualityControl(positionId: string, revision: number, evidence: QualityEvidence, idempotencyKey: string): Promise<QualityApprovalAcknowledgement> {
  const { data, error } = await supabase.rpc('approve_fabricator_quality_control', {
    p_position_id: positionId,
    p_expected_revision: revision,
    p_evidence: evidence,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw new Error(error.message);
  const row = (data as ApprovalRow[] | null)?.[0];
  if (!row) throw new Error('Quality approval was not acknowledged.');
  return { approvalId: row.approval_id, projectId: row.project_id, positionId: row.position_id, revision: row.revision, inspectorId: row.inspector_id, approvedAt: row.approved_at };
}

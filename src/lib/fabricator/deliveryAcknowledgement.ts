/**
 * UP-20 — Delivery acknowledgement bound to release + QC.
 * AICS-001: evidence hashes only; no ML; server verifies QR against release.
 */

import { supabase } from '@/lib/supabase';
import { buildExpectedProductQr } from '@/lib/fabricator/positionRelease';

export interface DeliveryAcknowledgement {
  acknowledgementId: string;
  projectId: string;
  positionId: string;
  revision: number;
  ownerUserId: string;
  acknowledgedAt: string;
}

export interface AcknowledgeDeliveryInput {
  positionId: string;
  revision: number;
  releaseId: string;
  qualityApprovalId: string;
  gpsLatitude: number;
  gpsLongitude: number;
  gpsAccuracyM?: number | null;
  photoHash: string;
  productQr: string;
  signatureHash: string;
  deliveryNotes?: string;
  customerFeedback?: string;
  idempotencyKey: string;
}

export async function acknowledgeFabricatorDelivery(
  input: AcknowledgeDeliveryInput,
): Promise<DeliveryAcknowledgement> {
  const expectedQr = buildExpectedProductQr(input.positionId, input.revision);
  if (input.productQr !== expectedQr) {
    throw new Error(`Product QR must be ${expectedQr}`);
  }

  const { data, error } = await supabase.rpc('acknowledge_fabricator_delivery', {
    p_position_id: input.positionId,
    p_expected_revision: input.revision,
    p_release_id: input.releaseId,
    p_quality_approval_id: input.qualityApprovalId,
    p_gps_latitude: input.gpsLatitude,
    p_gps_longitude: input.gpsLongitude,
    p_gps_accuracy_m: input.gpsAccuracyM ?? null,
    p_photo_hash: input.photoHash,
    p_product_qr: input.productQr,
    p_signature_hash: input.signatureHash,
    p_delivery_notes: input.deliveryNotes ?? '',
    p_customer_feedback: input.customerFeedback ?? '',
    p_idempotency_key: input.idempotencyKey,
  });

  if (error) throw new Error(error.message);
  const row = (data as Array<Record<string, unknown>> | null)?.[0];
  if (!row?.acknowledgement_id) {
    throw new Error('Delivery acknowledgement was not returned.');
  }

  return {
    acknowledgementId: String(row.acknowledgement_id),
    projectId: String(row.project_id),
    positionId: String(row.position_id),
    revision: Number(row.revision),
    ownerUserId: String(row.owner_user_id),
    acknowledgedAt: String(row.acknowledged_at),
  };
}

export async function getLatestDeliveryAcknowledgement(
  positionId: string,
  revision: number,
): Promise<DeliveryAcknowledgement | null> {
  if (!positionId || !Number.isInteger(revision) || revision < 1) return null;
  const db = supabase as any;
  const { data, error } = await db
    .from('fabricator_delivery_acknowledgements')
    .select('id, project_id, position_id, revision, owner_user_id, acknowledged_at')
    .eq('position_id', positionId)
    .eq('revision', revision)
    .order('acknowledged_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to reload delivery acknowledgement: ${error.message}`);
  }
  if (!data?.id) return null;

  return {
    acknowledgementId: String(data.id),
    projectId: String(data.project_id),
    positionId: String(data.position_id),
    revision: Number(data.revision),
    ownerUserId: String(data.owner_user_id),
    acknowledgedAt: String(data.acknowledged_at),
  };
}

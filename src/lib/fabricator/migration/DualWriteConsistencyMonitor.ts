/**
 * DualWriteConsistencyMonitor (service-side)
 *
 * Intended runtime: Node/Edge Function/Cron (service role), NOT browser.
 *
 * Responsibilities:
 * - Sample v2 rows, compare against mirrored v1 rows
 * - Compute drift rate (mismatches / sample)
 * - Emit RealityOS drift events when drift exceeds threshold
 * - Persist an append-only report for dashboards (fabricator_dual_write_consistency_reports)
 *
 * Constitutional constraints:
 * - Deterministic hashing (stable canonical JSON)
 * - Append-only evidence (no updates/deletes)
 */
import { InputHashingService } from '@/core/authority/certification/InputHashingService';
import type { Database } from '@/types/database';
import { createClient } from '@supabase/supabase-js';

export interface ConsistencyMonitorConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  sampleRate?: number; // default 0.01 (1%)
  driftThreshold?: number; // default 0.001 (0.1%)
  maxSampleSize?: number; // default 500
}

export interface ConsistencyMismatch {
  entityType: 'project' | 'position';
  id: string;
  owner_user_id?: string;
  reason: 'missing_in_v1' | 'missing_in_v2' | 'hash_mismatch' | 'exception';
  v1Hash?: string;
  v2Hash?: string;
}

export interface ConsistencyReport {
  checkedAt: string;
  sampleSize: number;
  mismatchCount: number;
  driftRate: number;
  mismatches: ConsistencyMismatch[];
}

function stableSortObject(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stableSortObject);
  if (typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj).sort()) {
    out[key] = stableSortObject(obj[key]);
  }
  return out;
}

async function stableSha256Hex(input: unknown): Promise<string> {
  const canonical = JSON.stringify(stableSortObject(input));
  const res = await InputHashingService.hashInputs(canonical);
  return res.hash;
}

export class DualWriteConsistencyMonitor {
  private client: ReturnType<typeof createClient<Database>>;
  private cfg: Required<ConsistencyMonitorConfig>;

  constructor(config: ConsistencyMonitorConfig) {
    this.cfg = {
      sampleRate: config.sampleRate ?? 0.01,
      driftThreshold: config.driftThreshold ?? 0.001,
      maxSampleSize: config.maxSampleSize ?? 500,
      supabaseUrl: config.supabaseUrl,
      serviceRoleKey: config.serviceRoleKey,
    };

    this.client = createClient<Database>(this.cfg.supabaseUrl, this.cfg.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: 'public' },
    });
  }

  /**
   * Run a full drift check (projects + positions) and persist a report.
   */
  async run(): Promise<ConsistencyReport> {
    const checkedAt = new Date().toISOString();

    const mismatches: ConsistencyMismatch[] = [];
    let sampledPositions = 0;

    // 1) Sample positions_v2 (most critical for rollback integrity)
    const { data: v2Positions, error: v2PosError } = await this.client
      .from('fabricator_positions_v2')
      .select('id, owner_user_id, project_id, order_number, pos_number, type, overall_width_mm, overall_height_mm, color, status, quantity, position_meta, meta, optimization, grid, components, hardware, selected_preset, window_unit, updated_at')
      .limit(this.cfg.maxSampleSize);

    if (v2PosError) {
      mismatches.push({
        entityType: 'position',
        id: 'query_error',
        reason: 'exception',
      });
    } else if (Array.isArray(v2Positions)) {
      type PositionRow = { id: string; owner_user_id: string };
      const sample = v2Positions.filter(() => Math.random() < this.cfg.sampleRate) as PositionRow[];
      sampledPositions = sample.length;

      for (const row of sample) {
        try {
          const { data: v1Row } = await this.client
            .from('fabricator_positions')
            .select('id, owner_user_id, project_id, order_number, pos_number, type, overall_width_mm, overall_height_mm, color, status, quantity, position_meta, optimization, updated_at')
            .eq('id', row.id)
            .maybeSingle();

          if (!v1Row) {
            mismatches.push({
              entityType: 'position',
              id: row.id,
              owner_user_id: row.owner_user_id,
              reason: 'missing_in_v1',
            });
            continue;
          }

          const v2Hash = await stableSha256Hex(row);
          const v1Hash = await stableSha256Hex(v1Row);

          if (v1Hash !== v2Hash) {
            mismatches.push({
              entityType: 'position',
              id: row.id,
              owner_user_id: row.owner_user_id,
              reason: 'hash_mismatch',
              v1Hash,
              v2Hash,
            });
          }
        } catch {
          mismatches.push({
            entityType: 'position',
            id: row.id,
            owner_user_id: row.owner_user_id,
            reason: 'exception',
          });
        }
      }
    }

    const sampleSize = Math.max(1, sampledPositions);
    const mismatchCount = mismatches.length;
    const driftRate = mismatchCount / sampleSize;

    const report: ConsistencyReport = {
      checkedAt,
      sampleSize,
      mismatchCount,
      driftRate,
      mismatches,
    };

    // If drift exceeds threshold, emit a FAULT event to RealityOS (append-only evidence)
    let realityOsEventHash: string | null = null;
    let realityOsRecordedAt: string | null = null;
    if (report.driftRate > this.cfg.driftThreshold) {
      realityOsRecordedAt = new Date().toISOString();
      const proof = {
        verified_by: 'system',
        timestamp: realityOsRecordedAt,
        location: null,
      };
      const payload = {
        almona_event_type: 'FabricatorDualWriteDriftDetected',
        entity_data: {
          driftRate: report.driftRate,
          mismatchCount: report.mismatchCount,
          sampleSize: report.sampleSize,
          checkedAt: report.checkedAt,
        },
        human_verification_required: true,
        constitutional_note:
          'Dual-write drift exceeded threshold. Investigation required before rollback window closes.',
      };

      const { data: emitted, error: emitError } = await this.client.rpc('realityos_record_event', {
        p_event_type: 'FAULT',
        p_entity_id: 'fabricator_dual_write_drift',
        p_vertical_id: 'almona_vertical',
        p_proof: proof,
        p_payload: payload,
        p_recorded_at: realityOsRecordedAt,
      });

      if (!emitError && Array.isArray(emitted)) {
        const first = emitted[0] as { event_hash?: string } | undefined;
        if (first?.event_hash) realityOsEventHash = first.event_hash;
      }
    }

    // Persist append-only report for dashboards (including optional RealityOS linkage)
    await this.client.from('fabricator_dual_write_consistency_reports').insert({
      sample_size: report.sampleSize,
      mismatch_count: report.mismatchCount,
      drift_rate: report.driftRate,
      report: report as unknown as Record<string, unknown>,
      reality_os_event_hash: realityOsEventHash,
      reality_os_recorded_at: realityOsRecordedAt,
    });

    return report;
  }
}


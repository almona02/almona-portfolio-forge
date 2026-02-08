/**
 * MigrationModeService (Fabricator v1 -> v2)
 *
 * Principle VI (No Admin Override):
 * - Runtime read/write mode is derived from append-only RealityOS events.
 * - No silent flags; mode changes must be represented by new ledger events.
 *
 * RealityOS schema nuance:
 * - Some environments may have `reality_events_readonly` as a VIEW (041 migration),
 *   others may have it converted to a SECURITY INVOKER FUNCTION (049 migration).
 * - This service supports both by trying `supabase.rpc('reality_events_readonly')` first,
 *   then falling back to `.from('reality_events_readonly')`.
 */
import { supabase } from '@/lib/supabase';

export type FabricatorMigrationMode =
  | 'v1_legacy'
  | 'dual_write'
  | 'v2_canonical'
  | 'rollback_in_progress';

export type FabricatorReadSource = 'v1' | 'v2' | 'both';

export interface FabricatorMigrationModeContext {
  mode: FabricatorMigrationMode;
  readSource: FabricatorReadSource;
  allowsWritesToV1: boolean;
  allowsWritesToV2: boolean;
  effectiveAt: string; // ISO time (from ledger recorded_at)
  derivedFromEventHash: string;
  derivedFromChainPosition: number;
  derivedFromAlmonaEventType: string;
}

type LedgerRow = {
  event_hash: string;
  chain_position: number;
  payload: any;
  recorded_at: string;
};

const MIGRATION_ALMONA_EVENT_TYPES = new Set<string>([
  'FabricatorMigrationInitiated',
  'FabricatorMigrationCompleted',
  'FabricatorRollbackInitiated',
  'FabricatorRollbackCompleted',
]);

export class MigrationModeService {
  private static instance: MigrationModeService | null = null;

  static getInstance(): MigrationModeService {
    if (!this.instance) this.instance = new MigrationModeService();
    return this.instance;
  }

  private constructor() {}

  /**
   * Fetch recent ledger rows from reality_events_readonly (function or view).
   * We intentionally keep this narrow and filter client-side for robustness across
   * PostgREST JSON-filter quirks and view/function differences.
   */
  private async fetchRecentLedgerRows(limit: number = 200): Promise<LedgerRow[]> {
    // Prefer RPC if migration 049 was applied (reality_events_readonly() function).
    try {
      const { data, error } = await (supabase as any)
        .rpc('reality_events_readonly')
        // Many supabase-js versions do not support `.select()` on rpc builders reliably;
        // rely on server-side function return shape and just order/limit.
        .order('chain_position', { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data)) return data as LedgerRow[];
    } catch {
      // Fall back below.
    }

    // Fallback for environments where reality_events_readonly is still a view.
    try {
      const { data, error } = await (supabase as any)
        .from('reality_events_readonly')
        .select('event_hash,chain_position,payload,recorded_at')
        .order('chain_position', { ascending: false })
        .limit(limit);

      if (!error) return (data || []) as LedgerRow[];
    } catch {
      // Fall back below.
    }

    // Final fallback: query base table (requires SELECT permission / RLS alignment).
    const { data, error } = await (supabase as any)
      .from('reality_events')
      .select('event_hash,chain_position,payload,recorded_at')
      .order('chain_position', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as LedgerRow[];
  }

  private deriveContextFromLatestMigrationEvent(row: LedgerRow): FabricatorMigrationModeContext {
    const almonaEventType =
      row?.payload?.almona_event_type ||
      row?.payload?.almonaEvent ||
      row?.payload?.eventType ||
      'unknown';

    // Default safe behavior (v1 read/write only)
    const base: Omit<FabricatorMigrationModeContext, 'mode' | 'readSource' | 'allowsWritesToV1' | 'allowsWritesToV2'> =
      {
        effectiveAt: row.recorded_at,
        derivedFromEventHash: row.event_hash,
        derivedFromChainPosition: row.chain_position,
        derivedFromAlmonaEventType: String(almonaEventType),
      };

    switch (almonaEventType) {
      case 'FabricatorMigrationInitiated':
        return {
          ...base,
          mode: 'dual_write',
          readSource: 'both',
          allowsWritesToV1: true,
          allowsWritesToV2: true,
        };
      case 'FabricatorMigrationCompleted':
        return {
          ...base,
          mode: 'v2_canonical',
          readSource: 'v2',
          allowsWritesToV1: false,
          allowsWritesToV2: true,
        };
      case 'FabricatorRollbackInitiated':
        return {
          ...base,
          mode: 'rollback_in_progress',
          readSource: 'v1',
          allowsWritesToV1: true,
          allowsWritesToV2: false,
        };
      case 'FabricatorRollbackCompleted':
        return {
          ...base,
          mode: 'v1_legacy',
          readSource: 'v1',
          allowsWritesToV1: true,
          allowsWritesToV2: false,
        };
      default:
        return {
          ...base,
          mode: 'v1_legacy',
          readSource: 'v1',
          allowsWritesToV1: true,
          allowsWritesToV2: false,
        };
    }
  }

  /**
   * Public API: derive the current Fabricator migration mode from RealityOS ledger.
   */
  async getCurrentMode(): Promise<FabricatorMigrationModeContext> {
    const rows = await this.fetchRecentLedgerRows(250);

    const latest = rows.find((r) => {
      const t = r?.payload?.almona_event_type;
      return typeof t === 'string' && MIGRATION_ALMONA_EVENT_TYPES.has(t);
    });

    if (!latest) {
      // No migration events found: pre-migration default.
      return {
        mode: 'v1_legacy',
        readSource: 'v1',
        allowsWritesToV1: true,
        allowsWritesToV2: false,
        effectiveAt: new Date(0).toISOString(),
        derivedFromEventHash: 'no_migration_events',
        derivedFromChainPosition: 0,
        derivedFromAlmonaEventType: 'none',
      };
    }

    return this.deriveContextFromLatestMigrationEvent(latest);
  }
}


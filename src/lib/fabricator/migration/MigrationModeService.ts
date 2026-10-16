/**
 * MigrationModeService (Fabricator v1 -> v2)
 *
 * Principle VI (No Admin Override):
 * - Runtime read/write mode is derived from append-only RealityOS events.
 * - No silent flags; mode changes must be represented by new ledger events.
 *
 * Browser access uses a restricted state projection. Raw ledger storage is server-only.
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
  payload: Record<string, unknown>;
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
   * Fetch the latest migration transition without exposing unrelated ledger data.
   */
  private async fetchRecentLedgerRows(): Promise<LedgerRow[]> {
    const rpc = supabase as unknown as {
      rpc(name: 'get_fabricator_migration_mode_events'): PromiseLike<{
        data: LedgerRow[] | null; error: { message: string } | null;
      }>;
    };
    const { data, error } = await rpc.rpc('get_fabricator_migration_mode_events');
    if (error) throw error;
    return data || [];
  }

  private deriveContextFromLatestMigrationEvent(row: LedgerRow): FabricatorMigrationModeContext {
    const p = row?.payload as { almona_event_type?: string; almonaEvent?: string; eventType?: string } | undefined;
    const almonaEventType =
      p?.almona_event_type ||
      p?.almonaEvent ||
      p?.eventType ||
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
    const rows = await this.fetchRecentLedgerRows();

    const latest = rows.find((r) => {
      const t = (r?.payload as { almona_event_type?: string } | undefined)?.almona_event_type;
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


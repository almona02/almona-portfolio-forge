import { describe, expect, it } from 'vitest';
import type { Database } from '@/types/database';
import { mapPositionRowToWindowUnit } from './fabricatorClientV2';

type Row = Database['public']['Tables']['fabricator_positions_v2']['Row'];

describe('authoritative position mapping', () => {
  it('uses authoritative columns and preserves ROCK 60 sliding data over stale JSON', () => {
    const row = {
      id: 'position-1', project_id: 'project-1', owner_user_id: 'user-1', overall_width_mm: 1210, overall_height_mm: 1550,
      type: 'sliding', system_pack_id: 'rock60', qc_revision: 7, window_unit: { overallWidth: 1200, overallHeight: 1400, type: 'old' },
      grid: { rows: 1, cols: 2 }, selected_preset: 'sliding-2', components: [], hardware: {}, glazing: {}, optimization: null,
      order_number: 'ORD-1', pos_number: '1', color: 'white', status: 'design', quantity: 1, position_meta: {}, meta: {}, tier: 'standard',
      deterministic: true, constitutional_hash: null, audit_trail: null, last_validated_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
    } as Row;
    expect(mapPositionRowToWindowUnit(row)).toMatchObject({ overallWidth: 1210, overallHeight: 1550, type: 'sliding', systemPackId: 'rock60', presetId: 'sliding-2', grid: { rows: 1, cols: 2 } });
  });
});

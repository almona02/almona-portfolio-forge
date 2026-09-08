import { describe, expect, test } from 'vitest';
import { mapPositionRowToWindowUnit } from '@/lib/supabase/fabricatorClientV2';
import type { Database } from '@/types/database';

type PositionV2Row = Database['public']['Tables']['fabricator_positions_v2']['Row'];

function row(partial: Partial<PositionV2Row>): PositionV2Row {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    project_id: '22222222-2222-4222-8222-222222222222',
    owner_user_id: '33333333-3333-4333-8333-333333333333',
    order_number: 'FP-TEST',
    pos_number: '1',
    type: 'window',
    overall_width_mm: 900,
    overall_height_mm: 1200,
    color: '#FFFFFF',
    glazing: {},
    system_pack_id: 'caluminium-ps',
    status: 'draft',
    quantity: 1,
    position_meta: {},
    meta: {},
    optimization: null,
    grid: {},
    components: [],
    hardware: {},
    selected_preset: null,
    window_unit: null,
    tier: '3',
    deterministic: true,
    constitutional_hash: null,
    audit_trail: [],
    last_validated_at: null,
    created_at: '2026-09-08T00:00:00.000Z',
    updated_at: '2026-09-08T00:00:00.000Z',
    ...partial,
  } as PositionV2Row;
}

describe('mapPositionRowToWindowUnit (AICS-001 stored millimetres)', () => {
  test('maps overall_width_mm / overall_height_mm when window_unit is missing', () => {
    const wu = mapPositionRowToWindowUnit(row({ window_unit: null, overall_width_mm: 1800, overall_height_mm: 2100, pos_number: '4' }));
    expect(wu).not.toBeNull();
    expect(wu?.overallWidth).toBe(1800);
    expect(wu?.overallHeight).toBe(2100);
    expect(wu?.posNumber).toBe('4');
  });

  test('prefers stored millimetre columns over empty window_unit width', () => {
    const wu = mapPositionRowToWindowUnit(row({
      overall_width_mm: 1500,
      overall_height_mm: 1500,
      window_unit: { orderNumber: 'FP-TEST' },
    }));
    expect(wu?.overallWidth).toBe(1500);
    expect(wu?.overallHeight).toBe(1500);
  });
});

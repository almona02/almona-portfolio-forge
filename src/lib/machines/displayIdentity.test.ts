import { describe, expect, it } from 'vitest';
import {
  formatMachineOptionLabel,
  internalAlmLabel,
  manufacturerSerialLabel,
} from './displayIdentity';

describe('displayIdentity', () => {
  it('keeps manufacturer serial and ALM distinct', () => {
    expect(manufacturerSerialLabel({ serial_number: 'YM-5K-1', serial_number_raw: 'YM-5K-1' })).toBe('YM-5K-1');
    expect(manufacturerSerialLabel({ serial_number: null, serial_number_raw: null })).toBeNull();
    expect(manufacturerSerialLabel({ serial_number: 'ALM-abc', serial_number_raw: 'ALM-abc' })).toBeNull();
    expect(internalAlmLabel({ provisional_asset_ref: 'ALM-abc123' })).toBe('ALM-abc123');
    expect(internalAlmLabel({ provisional_asset_ref: null })).toBeNull();
  });

  it('labels provisional machines without implying a manufacturer serial', () => {
    const label = formatMachineOptionLabel({
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      name: 'Press',
      model: 'Press',
      serial_number: null,
      provisional_asset_ref: 'ALM-deadbeef0001',
      catalog_link_status: 'uncertain',
      owner_id: 'u1',
      created_at: '',
      updated_at: '',
    });
    expect(label).toContain('internal ALM-deadbeef0001');
    expect(label).not.toMatch(/serial ALM-/);
  });
});

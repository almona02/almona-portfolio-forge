import { afterEach, describe, expect, it } from 'vitest';
import {
  clearHardwareKitOverride,
  loadHardwareKitOverrides,
  mergeHardwareKitsWithOverrides,
  saveHardwareKitOverrides,
  setHardwareKitOverride,
} from './hardwareKitOverrides';

describe('hardwareKitOverrides', () => {
  afterEach(() => {
    localStorage.removeItem('almona_hardware_kit_overrides_v1');
  });

  it('merges unit_price override onto matching kit id', () => {
    const kits = [
      { id: 'ps_corner_key_frame', name: 'PS Frame Corner Key', unit_price: 8 },
      { id: 'ps_corner_key_sash', name: 'PS Sash Corner Key', unit_price: 5 },
    ];
    const merged = mergeHardwareKitsWithOverrides('caluminium-ps', kits, {
      'caluminium-ps': { ps_corner_key_frame: { unit_price: 12 } },
    });
    expect(merged[0].unit_price).toBe(12);
    expect(merged[1].unit_price).toBe(5);
  });

  it('persists and clears overrides in localStorage', () => {
    setHardwareKitOverride('caluminium-ps', 'ps_sliding_handle', { unit_price: 55 });
    expect(loadHardwareKitOverrides()['caluminium-ps']?.ps_sliding_handle?.unit_price).toBe(55);
    clearHardwareKitOverride('caluminium-ps', 'ps_sliding_handle');
    expect(loadHardwareKitOverrides()['caluminium-ps']).toBeUndefined();
  });

  it('saveHardwareKitOverrides round-trips', () => {
    saveHardwareKitOverrides({ 'panda-50': { kit_a: { unit_price: 1, name: 'A' } } });
    expect(loadHardwareKitOverrides()['panda-50']?.kit_a?.name).toBe('A');
  });
});

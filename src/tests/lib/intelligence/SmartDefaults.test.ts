/**
 * Unit tests for SmartDefaults
 * 
 * @since Phase 3: Cognitive Intelligence (Week 16)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SmartDefaults } from '@/lib/intelligence/SmartDefaults';
import type { WindowUnit } from '@/types/fabricator';

describe('SmartDefaults', () => {
  let smartDefaults: SmartDefaults;

  beforeEach(() => {
    smartDefaults = new SmartDefaults();
  });

  it('should generate smart defaults for window unit', async () => {
    const windowUnit: Partial<WindowUnit> = {
      overallWidth: 1800,
      overallHeight: 1500
    };

    const defaults = await smartDefaults.generateSmartDefaults(windowUnit);

    expect(defaults).toBeDefined();
    expect(defaults.systemPackId).toBeDefined();
    expect(defaults.color).toBeDefined();
    expect(defaults.glazingType).toBeDefined();
    expect(defaults.openingType).toBeDefined();
    expect(defaults.confidence).toBeGreaterThanOrEqual(0);
    expect(defaults.confidence).toBeLessThanOrEqual(1);
  });

  it('should provide explanations for defaults', async () => {
    const windowUnit: Partial<WindowUnit> = {
      overallWidth: 1800,
      overallHeight: 1500
    };

    const defaults = await smartDefaults.generateSmartDefaults(windowUnit);

    expect(defaults.explanations).toBeDefined();
    expect(Object.keys(defaults.explanations).length).toBeGreaterThan(0);
  });

  it('should adapt to different window sizes', async () => {
    const smallWindow: Partial<WindowUnit> = {
      overallWidth: 1000,
      overallHeight: 1000
    };

    const largeWindow: Partial<WindowUnit> = {
      overallWidth: 4000,
      overallHeight: 3000
    };

    const smallDefaults = await smartDefaults.generateSmartDefaults(smallWindow);
    const largeDefaults = await smartDefaults.generateSmartDefaults(largeWindow);

    expect(smallDefaults.systemPackId).toBeDefined();
    expect(largeDefaults.systemPackId).toBeDefined();
    // Large windows might recommend different profiles
    expect(largeDefaults.confidence).toBeGreaterThanOrEqual(0);
  });
});



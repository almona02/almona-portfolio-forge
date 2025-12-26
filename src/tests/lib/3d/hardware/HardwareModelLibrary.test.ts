/**
 * Unit tests for HardwareModelLibrary
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 21)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HardwareModelLibrary } from '@/lib/3d/hardware/HardwareModelLibrary';
import type { WindowUnit } from '@/types/fabricator';

describe('HardwareModelLibrary', () => {
  let library: HardwareModelLibrary;

  beforeEach(() => {
    library = new HardwareModelLibrary();
  });

  it('should generate hardware models for casement window', () => {
    const windowUnit: WindowUnit = {
      id: 'test-1',
      overallWidth: 1800,
      overallHeight: 1500,
      type: 'casement',
      components: [],
      color: 'Silver',
      glazing: { type: 'double', thickness: 24 },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      systemPackId: 'rock60',
      presetId: 'casement-1s'
    };

    const placement = library.generateHardwareModels(windowUnit, 'casement');

    expect(placement).toBeDefined();
    expect(placement.hardware.length).toBeGreaterThan(0);
    expect(placement.totalCount).toBeGreaterThan(0);
  });

  it('should generate hinges at 150mm from top/bottom', () => {
    const windowUnit: WindowUnit = {
      id: 'test-2',
      overallWidth: 1800,
      overallHeight: 1500,
      type: 'casement',
      components: [],
      color: 'Silver',
      glazing: { type: 'double', thickness: 24 },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      systemPackId: 'rock60',
      presetId: 'casement-1s'
    };

    const placement = library.generateHardwareModels(windowUnit, 'casement');
    const hinges = placement.hardware.filter(h => h.type === 'hinge');

    expect(hinges.length).toBeGreaterThanOrEqual(2);

    // Check positioning (150mm from top/bottom)
    const height = windowUnit.overallHeight / 1000; // to meters
    for (const hinge of hinges) {
      const y = hinge.position.y;
      const topDistance = Math.abs((height / 2) - y);
      const bottomDistance = Math.abs(y - (-height / 2));

      // Should be within 200mm of top or bottom (150mm standard + 50mm tolerance)
      expect(topDistance < 0.2 || bottomDistance < 0.2).toBe(true);
    }
  });

  it('should place handle at 1100mm height', () => {
    const windowUnit: WindowUnit = {
      id: 'test-3',
      overallWidth: 1800,
      overallHeight: 2000,
      type: 'casement',
      components: [],
      color: 'Silver',
      glazing: { type: 'double', thickness: 24 },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      systemPackId: 'rock60',
      presetId: 'casement-1s'
    };

    const placement = library.generateHardwareModels(windowUnit, 'casement');
    const handles = placement.hardware.filter(h => h.type === 'handle');

    expect(handles.length).toBe(1);

    const handleY = handles[0].position.y;
    const height = windowUnit.overallHeight / 1000;
    const handleHeight = handleY + height / 2;

    // Should be at 1100mm (1.1m) ± 50mm
    expect(Math.abs(handleHeight - 1.1)).toBeLessThan(0.05);
  });

  it('should add middle hinge for tall windows (>2.4m)', () => {
    const windowUnit: WindowUnit = {
      id: 'test-4',
      overallWidth: 1800,
      overallHeight: 3000, // 3m tall
      type: 'casement',
      components: [],
      color: 'Silver',
      glazing: { type: 'double', thickness: 24 },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      systemPackId: 'rock60',
      presetId: 'casement-1s'
    };

    const placement = library.generateHardwareModels(windowUnit, 'casement');
    const hinges = placement.hardware.filter(h => h.type === 'hinge');

    expect(hinges.length).toBeGreaterThanOrEqual(3); // Top, middle, bottom
  });

  it('should validate Egyptian Code 2020 compliance', () => {
    const windowUnit: WindowUnit = {
      id: 'test-5',
      overallWidth: 1800,
      overallHeight: 2000,
      type: 'casement',
      components: [],
      color: 'Silver',
      glazing: { type: 'double', thickness: 24 },
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      systemPackId: 'rock60',
      presetId: 'casement-1s'
    };

    const placement = library.generateHardwareModels(windowUnit, 'casement');

    expect(placement.validation.egyptianCode2020).toBe(true);
    expect(placement.validation.ergonomic).toBe(true);
    expect(placement.validation.structural).toBe(true);
  });
});


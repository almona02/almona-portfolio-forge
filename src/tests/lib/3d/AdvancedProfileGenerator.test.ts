/**
 * Unit tests for AdvancedProfileGenerator
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 19)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdvancedProfileGenerator } from '@/lib/3d/AdvancedProfileGenerator';
import type { Profile } from '@/types/fabricator';

describe('AdvancedProfileGenerator', () => {
  let generator: AdvancedProfileGenerator;

  beforeEach(() => {
    generator = new AdvancedProfileGenerator();
  });

  it('should generate 3-chamber profile', () => {
    const profile: Profile = {
      width: 60,
      height: 50,
      thickness: 1.5,
      material: 'aluminum',
      color: 'Silver'
    };

    const config = {
      count: 3 as const,
      hasDrainage: true,
      hasReinforcement: false,
      glassPocketDepth: 15,
      glassPocketWidth: 20
    };

    const result = generator.generateAdvancedProfile(profile, config);

    expect(result).toBeDefined();
    expect(result.width).toBe(0.06); // 60mm in meters
    expect(result.depth).toBe(0.05); // 50mm in meters
    expect(result.shape).toBeInstanceOf(Array);
    expect(result.shape.length).toBeGreaterThan(0);
  });

  it('should generate 5-chamber profile', () => {
    const profile: Profile = {
      width: 100,
      height: 60,
      thickness: 2.0,
      material: 'aluminum',
      color: 'Bronze'
    };

    const config = {
      count: 5 as const,
      hasDrainage: true,
      hasReinforcement: true,
      glassPocketDepth: 20,
      glassPocketWidth: 25
    };

    const result = generator.generateAdvancedProfile(profile, config);

    expect(result).toBeDefined();
    expect(result.material).toBe('aluminum');
    expect(result.color).toBe('Bronze');
  });

  it('should generate 7-chamber profile', () => {
    const profile: Profile = {
      width: 120,
      height: 70,
      thickness: 2.5,
      material: 'aluminum',
      color: 'White'
    };

    const config = {
      count: 7 as const,
      hasDrainage: true,
      hasReinforcement: true,
      glassPocketDepth: 25,
      glassPocketWidth: 30
    };

    const result = generator.generateAdvancedProfile(profile, config);

    expect(result).toBeDefined();
    expect(result.shape).toBeInstanceOf(Array);
  });

  it('should get chamber config for system pack', () => {
    const rock60Config = generator.getChamberConfigForSystem('rock60');
    expect(rock60Config.count).toBe(3);

    const jumbo100Config = generator.getChamberConfigForSystem('jumbo100');
    expect(jumbo100Config.count).toBe(5);

    const defaultConfig = generator.getChamberConfigForSystem('unknown');
    expect(defaultConfig.count).toBe(3);
  });
});



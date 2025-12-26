/**
 * Unit tests for EnhancedMaterials
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 20)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnhancedMaterials } from '@/lib/3d/materials/EnhancedMaterials';

describe('EnhancedMaterials', () => {
  let materials: EnhancedMaterials;

  beforeEach(() => {
    materials = new EnhancedMaterials();
  });

  it('should create aluminum material', () => {
    const material = materials.createAluminumMaterial('#C0C0C0');

    expect(material).toBeDefined();
    expect(material.roughness).toBe(0.2);
    expect(material.metalness).toBe(0.9);
  });

  it('should create UPVC material', () => {
    const material = materials.createUPVCMaterial('#FFFFFF');

    expect(material).toBeDefined();
    expect(material.roughness).toBe(0.6);
    expect(material.metalness).toBe(0.0);
  });

  it('should create glass material', () => {
    const material = materials.createGlassMaterial();

    expect(material).toBeDefined();
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBe(0.9);
    expect(material.roughness).toBe(0.0);
  });

  it('should create hardware material', () => {
    const material = materials.createHardwareMaterial();

    expect(material).toBeDefined();
    expect(material.roughness).toBe(0.3);
    expect(material.metalness).toBe(0.8);
  });

  it('should create custom material', () => {
    const material = materials.createMaterial({
      type: 'aluminum',
      color: '#FF0000',
      roughness: 0.3,
      metalness: 0.8
    });

    expect(material).toBeDefined();
    expect(material.roughness).toBe(0.3);
    expect(material.metalness).toBe(0.8);
  });
});



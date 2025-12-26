/**
 * ProceduralTextures - Generated Textures
 * 
 * Generates procedural textures for materials (normal maps, roughness, etc.)
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 20)
 */

import { DataTexture, RGBAFormat, FloatType } from 'three';

export type MaterialType = 'aluminum' | 'upvc' | 'wood' | 'glass' | 'hardware';

/**
 * ProceduralTextures - Generates procedural textures
 */
export class ProceduralTextures {
  /**
   * Generate normal map for material type
   */
  generateNormalMap(type: MaterialType, size: number = 256): DataTexture | null {
    const data = new Float32Array(size * size * 4);

    // Generate simple normal map based on material type
    for (let i = 0; i < size * size; i++) {
      const x = (i % size) / size;
      const y = Math.floor(i / size) / size;

      // Simple noise-based normal map
      const nx = (Math.sin(x * Math.PI * 10) * 0.5 + 0.5);
      const ny = (Math.sin(y * Math.PI * 10) * 0.5 + 0.5);
      const nz = 1.0;

      const idx = i * 4;
      data[idx] = nx;     // R
      data[idx + 1] = ny; // G
      data[idx + 2] = nz; // B
      data[idx + 3] = 1.0; // A
    }

    const texture = new DataTexture(data, size, size, RGBAFormat, FloatType);
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Generate roughness map for material type
   */
  generateRoughnessMap(type: MaterialType, size: number = 256): DataTexture | null {
    const data = new Float32Array(size * size * 4);

    // Base roughness values by material type
    const baseRoughness: Record<MaterialType, number> = {
      aluminum: 0.2,
      upvc: 0.6,
      wood: 0.8,
      glass: 0.0,
      hardware: 0.3
    };

    const roughness = baseRoughness[type] || 0.5;

    // Generate roughness map with slight variation
    for (let i = 0; i < size * size; i++) {
      const variation = (Math.random() - 0.5) * 0.1;
      const value = Math.max(0, Math.min(1, roughness + variation));

      const idx = i * 4;
      data[idx] = value;     // R
      data[idx + 1] = value; // G
      data[idx + 2] = value; // B
      data[idx + 3] = 1.0;   // A
    }

    const texture = new DataTexture(data, size, size, RGBAFormat, FloatType);
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * Generate metalness map for material type
   */
  generateMetalnessMap(type: MaterialType, size: number = 256): DataTexture | null {
    const data = new Float32Array(size * size * 4);

    // Base metalness values by material type
    const baseMetalness: Record<MaterialType, number> = {
      aluminum: 0.9,
      upvc: 0.0,
      wood: 0.0,
      glass: 0.0,
      hardware: 0.8
    };

    const metalness = baseMetalness[type] || 0.0;

    // Generate metalness map
    for (let i = 0; i < size * size; i++) {
      const value = metalness;

      const idx = i * 4;
      data[idx] = value;     // R
      data[idx + 1] = value; // G
      data[idx + 2] = value; // B
      data[idx + 3] = 1.0;   // A
    }

    const texture = new DataTexture(data, size, size, RGBAFormat, FloatType);
    texture.needsUpdate = true;

    return texture;
  }
}



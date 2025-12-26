/**
 * EnhancedMaterials - PBR Material System
 * 
 * Creates photorealistic PBR materials with:
 * - Realistic reflections
 * - Proper roughness
 * - Metalness
 * - Normal maps
 * - Ambient occlusion
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 20)
 */

import { MeshStandardMaterial, Color } from 'three';
import { ProceduralTextures } from './ProceduralTextures';

export interface MaterialConfig {
  type: 'aluminum' | 'upvc' | 'wood' | 'glass' | 'hardware';
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

/**
 * EnhancedMaterials - PBR material generator
 */
export class EnhancedMaterials {
  private proceduralTextures: ProceduralTextures;

  constructor() {
    this.proceduralTextures = new ProceduralTextures();
  }

  /**
   * Create PBR material
   */
  createMaterial(config: MaterialConfig): MeshStandardMaterial {
    const material = new MeshStandardMaterial();

    // Set base color
    material.color = new Color(config.color);

    // Set PBR properties based on material type
    switch (config.type) {
      case 'aluminum':
        material.roughness = config.roughness ?? 0.2;
        material.metalness = config.metalness ?? 0.9;
        material.emissive = new Color(0x000000);
        material.emissiveIntensity = 0;
        break;

      case 'upvc':
        material.roughness = config.roughness ?? 0.6;
        material.metalness = config.metalness ?? 0.0;
        material.emissive = new Color(0x000000);
        material.emissiveIntensity = 0;
        break;

      case 'wood':
        material.roughness = config.roughness ?? 0.8;
        material.metalness = config.metalness ?? 0.0;
        material.emissive = new Color(0x000000);
        material.emissiveIntensity = 0;
        break;

      case 'glass':
        material.roughness = config.roughness ?? 0.0;
        material.metalness = config.metalness ?? 0.0;
        material.transparent = true;
        material.opacity = 0.9;
        material.emissive = new Color(0x000000);
        material.emissiveIntensity = 0;
        break;

      case 'hardware':
        material.roughness = config.roughness ?? 0.3;
        material.metalness = config.metalness ?? 0.8;
        material.emissive = new Color(0x000000);
        material.emissiveIntensity = 0;
        break;
    }

    // Generate procedural textures
    const normalMap = this.proceduralTextures.generateNormalMap(config.type);
    const roughnessMap = this.proceduralTextures.generateRoughnessMap(config.type);

    if (normalMap) {
      material.normalMap = normalMap;
      material.normalScale.set(1, 1);
    }

    if (roughnessMap) {
      material.roughnessMap = roughnessMap;
    }

    return material;
  }

  /**
   * Create aluminum material with color
   */
  createAluminumMaterial(color: string = '#C0C0C0'): MeshStandardMaterial {
    return this.createMaterial({
      type: 'aluminum',
      color,
      roughness: 0.2,
      metalness: 0.9
    });
  }

  /**
   * Create UPVC material with color
   */
  createUPVCMaterial(color: string = '#FFFFFF'): MeshStandardMaterial {
    return this.createMaterial({
      type: 'upvc',
      color,
      roughness: 0.6,
      metalness: 0.0
    });
  }

  /**
   * Create glass material
   */
  createGlassMaterial(): MeshStandardMaterial {
    return this.createMaterial({
      type: 'glass',
      color: '#FFFFFF',
      roughness: 0.0,
      metalness: 0.0
    });
  }

  /**
   * Create hardware material (hinges, handles, etc.)
   */
  createHardwareMaterial(): MeshStandardMaterial {
    return this.createMaterial({
      type: 'hardware',
      color: '#808080',
      roughness: 0.3,
      metalness: 0.8
    });
  }
}



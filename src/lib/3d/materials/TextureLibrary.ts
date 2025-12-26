/**
 * TextureLibrary - Texture Loading System
 * 
 * Manages texture loading and caching for photorealistic materials
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 20)
 */

import { Texture, TextureLoader, RepeatWrapping } from 'three';

export type TextureType = 'aluminum' | 'upvc' | 'wood' | 'glass' | 'hardware';

export interface TextureConfig {
  type: TextureType;
  color: string;
  roughness?: number;
  metalness?: number;
  normal?: boolean;
  ao?: boolean; // Ambient occlusion
}

/**
 * TextureLibrary - Manages texture loading
 */
export class TextureLibrary {
  private loader: TextureLoader;
  private cache: Map<string, Texture> = new Map();

  constructor() {
    this.loader = new TextureLoader();
  }

  /**
   * Load texture (with caching)
   */
  async loadTexture(path: string): Promise<Texture> {
    if (this.cache.has(path)) {
      return this.cache.get(path)!;
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (texture) => {
          texture.wrapS = RepeatWrapping;
          texture.wrapT = RepeatWrapping;
          this.cache.set(path, texture);
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Get texture for material type
   */
  async getTextureForMaterial(config: TextureConfig): Promise<Texture | null> {
    // For now, return null (procedural textures will be used)
    // In production, this would load actual texture files
    return null;
  }

  /**
   * Clear texture cache
   */
  clearCache(): void {
    this.cache.forEach(texture => texture.dispose());
    this.cache.clear();
  }
}



/**
 * AdvancedProfileGenerator - Multi-Chamber Profile Generation
 * 
 * Generates realistic multi-chamber profiles (3, 5, 7, 9 chambers) with:
 * - Realistic cross-sections
 * - Glass pockets
 * - Drainage channels
 * - Reinforcement channels
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 19)
 */

import type { Profile } from '@/types/fabricator';
import { Vector2 } from 'three';
import type { ProfileCrossSection } from './windowGeometry';

export interface ChamberConfig {
  count: 3 | 5 | 7 | 9;
  hasDrainage: boolean;
  hasReinforcement: boolean;
  glassPocketDepth: number; // mm
  glassPocketWidth: number; // mm
}

/**
 * AdvancedProfileGenerator - Generates multi-chamber profiles
 */
export class AdvancedProfileGenerator {
  /**
   * Generate advanced profile cross-section with multiple chambers
   */
  generateAdvancedProfile(
    profile: Profile,
    config: ChamberConfig
  ): ProfileCrossSection {
    const width = (profile.width || 50) / 1000; // to meters
    const depth = (profile.height || 50) / 1000;
    const thickness = (profile.thickness || 1.5) / 1000;

    // Generate shape based on chamber count
    const shape = this.generateMultiChamberShape(
      width,
      depth,
      thickness,
      config
    );

    return {
      shape,
      width,
      depth,
      material: profile.material || 'aluminum',
      color: profile.color,
      glassPocket: {
        width: (config.glassPocketWidth || width * 0.1) / 1000,
        depth: (config.glassPocketDepth || depth * 0.5) / 1000,
        offsetZ: 0
      }
    };
  }

  /**
   * Generate multi-chamber shape
   */
  private generateMultiChamberShape(
    width: number,
    depth: number,
    wallThickness: number,
    config: ChamberConfig
  ): Vector2[] {
    const hw = width / 2;
    const hd = depth / 2;
    const t = wallThickness;

    // Outer rectangle
    const outer: Vector2[] = [
      new Vector2(-hw, -hd),
      new Vector2(hw, -hd),
      new Vector2(hw, hd),
      new Vector2(-hw, hd)
    ];

    // Generate chambers
    const chambers = this.calculateChamberLayout(
      width,
      depth,
      config.count,
      wallThickness
    );

    // Inner cavity (hollow center)
    const holeInset = Math.max(t * 1.2, Math.min(width, depth) * 0.15);
    const hiw = hw - holeInset;
    const hid = hd - holeInset;
    const inner: Vector2[] = [
      new Vector2(-hiw, -hid),
      new Vector2(hiw, -hid),
      new Vector2(hiw, hid),
      new Vector2(-hiw, hid)
    ];

    // Glass pocket (at bottom)
    const pocketD = (config.glassPocketDepth || 15) / 1000;
    const pocketW = (config.glassPocketWidth || width * 0.4) / 1000;
    const pocketHalf = pocketW / 2;
    const pocketInset = t * 1.1;
    const pocketY = -hd + pocketInset + pocketD;

    const pocket: Vector2[] = [
      new Vector2(-pocketHalf, -hd + pocketInset),
      new Vector2(pocketHalf, -hd + pocketInset),
      new Vector2(pocketHalf, pocketY),
      new Vector2(-pocketHalf, pocketY)
    ];

    // Drainage channels (if enabled)
    if (config.hasDrainage) {
      const drainageChannels = this.generateDrainageChannels(
        width,
        depth,
        wallThickness
      );
      (outer as any).drainage = drainageChannels;
    }

    // Reinforcement channels (if enabled)
    if (config.hasReinforcement) {
      const reinforcementChannels = this.generateReinforcementChannels(
        width,
        depth,
        wallThickness
      );
      (outer as any).reinforcement = reinforcementChannels;
    }

    (outer as any).hole = inner;
    (outer as any).pocket = pocket;
    (outer as any).chambers = chambers;

    return outer;
  }

  /**
   * Calculate chamber layout
   */
  private calculateChamberLayout(
    width: number,
    depth: number,
    chamberCount: number,
    wallThickness: number
  ): Vector2[][] {
    const chambers: Vector2[][] = [];
    const hw = width / 2;
    const hd = depth / 2;
    const t = wallThickness;

    // Vertical chambers (for multi-chamber profiles)
    if (chamberCount >= 3) {
      const chamberWidth = (width - t * (chamberCount + 1)) / chamberCount;
      const startX = -hw + t;

      for (let i = 0; i < chamberCount; i++) {
        const x1 = startX + i * (chamberWidth + t);
        const x2 = x1 + chamberWidth;

        chambers.push([
          new Vector2(x1, -hd + t),
          new Vector2(x2, -hd + t),
          new Vector2(x2, hd - t),
          new Vector2(x1, hd - t)
        ]);
      }
    }

    return chambers;
  }

  /**
   * Generate drainage channels
   */
  private generateDrainageChannels(
    width: number,
    depth: number,
    wallThickness: number
  ): Vector2[][] {
    const channels: Vector2[][] = [];
    const hw = width / 2;
    const hd = depth / 2;
    const t = wallThickness;
    const channelDepth = 0.002; // 2mm
    const channelWidth = 0.003; // 3mm

    // Bottom drainage channel
    const bottomChannel: Vector2[] = [
      new Vector2(-hw + t, -hd + t),
      new Vector2(-hw + t + channelWidth, -hd + t),
      new Vector2(-hw + t + channelWidth, -hd + t + channelDepth),
      new Vector2(-hw + t, -hd + t + channelDepth)
    ];

    channels.push(bottomChannel);

    return channels;
  }

  /**
   * Generate reinforcement channels
   */
  private generateReinforcementChannels(
    width: number,
    depth: number,
    wallThickness: number
  ): Vector2[][] {
    const channels: Vector2[][] = [];
    const hw = width / 2;
    const hd = depth / 2;
    const t = wallThickness;
    const _channelDepth = 0.005; // 5mm
    const channelWidth = 0.008; // 8mm

    // Vertical reinforcement channels (left and right)
    const leftChannel: Vector2[] = [
      new Vector2(-hw + t, -hd + t),
      new Vector2(-hw + t + channelWidth, -hd + t),
      new Vector2(-hw + t + channelWidth, hd - t),
      new Vector2(-hw + t, hd - t)
    ];

    const rightChannel: Vector2[] = [
      new Vector2(hw - t - channelWidth, -hd + t),
      new Vector2(hw - t, -hd + t),
      new Vector2(hw - t, hd - t),
      new Vector2(hw - t - channelWidth, hd - t)
    ];

    channels.push(leftChannel, rightChannel);

    return channels;
  }

  /**
   * Get default chamber config for system pack
   */
  getChamberConfigForSystem(systemPackId: string): ChamberConfig {
    // Map system packs to chamber configurations
    const systemChambers: Record<string, ChamberConfig> = {
      'rock60': { count: 3, hasDrainage: true, hasReinforcement: false, glassPocketDepth: 15, glassPocketWidth: 20 },
      'jumbo100': { count: 5, hasDrainage: true, hasReinforcement: true, glassPocketDepth: 20, glassPocketWidth: 25 },
      'premium120': { count: 7, hasDrainage: true, hasReinforcement: true, glassPocketDepth: 25, glassPocketWidth: 30 },
      'ultra150': { count: 9, hasDrainage: true, hasReinforcement: true, glassPocketDepth: 30, glassPocketWidth: 35 }
    };

    return systemChambers[systemPackId] || {
      count: 3,
      hasDrainage: true,
      hasReinforcement: false,
      glassPocketDepth: 15,
      glassPocketWidth: 20
    };
  }
}



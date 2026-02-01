/**
 * GOLD TIER: Drainage System
 * 
 * Egyptian Requirements:
 * - Drainage holes every 300mm minimum
 * - Weep holes at corners
 * - Sloped drainage channels
 * - Insect screens (optional)
 */

import { getPatternById } from '@/lib/fabricator/presetUtils';
import { BoxGeometry, CylinderGeometry, Euler, Mesh, MeshStandardMaterial, Vector3 } from 'three';

export enum EgyptianDrainageType {
    DRAIN_HOLE_ROUND = 'drain_hole_round',      // 8mm round hole
    DRAIN_HOLE_SLOT = 'drain_hole_slot',        // 5x20mm slot
    WEEP_HOLE = 'weep_hole',                    // Corner weep
    DRAIN_CHANNEL = 'drain_channel',            // Continuous channel
    INSECT_SCREEN = 'insect_screen'             // Mesh cover
}

export interface DrainagePlacement {
    type: EgyptianDrainageType;
    position: Vector3;
    rotation: Euler;
    size: number; // mm in meters
}

/**
 * Create round drainage hole (typical 8mm diameter)
 */
export function createDrainageHole(size: number = 0.008): Mesh {
    const geometry = new CylinderGeometry(size / 2, size / 2, 0.002, 12);
    const material = new MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const mesh = new Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2; // Horizontal orientation
    
    return mesh;
}

/**
 * Create slot drainage (5x20mm typical)
 */
export function createDrainageSlot(width: number = 0.005, length: number = 0.02): Mesh {
    const geometry = new BoxGeometry(width, length, 0.002);
    const material = new MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9,
        metalness: 0.1
    });
    
    return new Mesh(geometry, material);
}

/**
 * Generate drainage system for Egyptian window
 * Follows Egyptian Building Code drainage requirements
 */
export function generateDrainageForWindow(
    windowUnit: any,
    quality: 'standard' | 'premium' | 'ultra' = 'premium'
): DrainagePlacement[] {
    const placements: DrainagePlacement[] = [];
    const width = windowUnit.overallWidth / 1000;
    const height = windowUnit.overallHeight / 1000;
    const halfW = width / 2;
    const halfH = height / 2;
    
    // Egyptian Code: Minimum 2 drainage holes, maximum spacing 300mm
    const minDrains = 2;
    const maxSpacing = 0.3; // 300mm
    
    // Calculate number of drainage points
    const drainCount = Math.max(minDrains, Math.ceil(width / maxSpacing));
    const spacing = width / (drainCount + 1);
    
    // Bottom frame drainage holes
    for (let i = 1; i <= drainCount; i++) {
        const x = -halfW + (spacing * i);
        
        // Alternate between round holes and slots for better drainage
        const type = i % 2 === 0 ? 
            EgyptianDrainageType.DRAIN_HOLE_ROUND : 
            EgyptianDrainageType.DRAIN_HOLE_SLOT;
        
        placements.push({
            type,
            position: new Vector3(x, -halfH + 0.006, 0.002),
            rotation: new Euler(0, 0, 0),
            size: type === EgyptianDrainageType.DRAIN_HOLE_ROUND ? 0.008 : 0.005
        });
    }
    
    // Corner weep holes (essential for Egyptian humidity)
    placements.push({
        type: EgyptianDrainageType.WEEP_HOLE,
        position: new Vector3(-halfW + 0.01, -halfH + 0.008, 0.001),
        rotation: new Euler(0, 0, Math.PI / 4),
        size: 0.003
    });
    
    placements.push({
        type: EgyptianDrainageType.WEEP_HOLE,
        position: new Vector3(halfW - 0.01, -halfH + 0.008, 0.001),
        rotation: new Euler(0, 0, -Math.PI / 4),
        size: 0.003
    });
    
    // Continuous drainage channel for sliding systems
    const pattern = windowUnit.presetId ? getPatternById(windowUnit.presetId) : null;
    if (pattern?.type === 'sliding') {
        placements.push({
            type: EgyptianDrainageType.DRAIN_CHANNEL,
            position: new Vector3(0, -halfH + 0.004, 0.001),
            rotation: new Euler(0, 0, 0),
            size: width - 0.04 // Full width minus end caps
        });
    }
    
    // Insect screens for premium quality (Egyptian requirement for ground floor)
    if (quality === 'ultra' && windowUnit.floorLevel === 'ground') {
        placements.push({
            type: EgyptianDrainageType.INSECT_SCREEN,
            position: new Vector3(0, -halfH + 0.01, -0.001),
            rotation: new Euler(0, 0, 0),
            size: width - 0.02
        });
    }
    
    return placements;
}

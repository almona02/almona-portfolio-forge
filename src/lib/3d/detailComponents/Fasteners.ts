/**
 * GOLD TIER: Fasteners & Visible Hardware
 * 
 * Egyptian Market Standards:
 * - Stainless steel screws (A2/A4 grade)
 * - Corner reinforcement plates (steel)
 * - Hex bolts for structural connections
 * - Torx screws for premium hardware
 */

import { getPatternById } from '@/lib/fabricator/presetUtils';
import { BoxGeometry, CylinderGeometry, Euler, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';

export enum EgyptianFastenerType {
    SCREW_FLAT_HEAD = 'screw_flat_head',    // Frame assembly
    SCREW_PAN_HEAD = 'screw_pan_head',      // Hardware mounting
    SCREW_HEX_HEAD = 'screw_hex_head',      // Structural
    BOLT_HEX = 'bolt_hex',                  // Through-bolts
    CORNER_PLATE = 'corner_plate',          // Corner reinforcement
    CLIP_PLASTIC = 'clip_plastic',          // Glazing bead clips
    RIVET = 'rivet'                         // Blind rivets
}

export interface FastenerPlacement {
    type: EgyptianFastenerType;
    position: Vector3;
    rotation: Euler;
    size: number; // mm in meters (e.g., 0.004 = 4mm)
    materialVariant?: 'stainless' | 'zinc' | 'black_oxide';
}

/**
 * Create flat head screw (countersunk)
 */
export function createFlatHeadScrew(size: number = 0.004): Group {
    const group = new Group();
    
    // Head (countersunk cone)
    const headGeometry = new CylinderGeometry(0, size * 1.2, size * 0.3, 6);
    const head = new Mesh(headGeometry, createFastenerMaterial('stainless'));
    head.position.y = size * 0.15;
    head.rotation.x = Math.PI / 2;
    group.add(head);
    
    // Shank
    const shankGeometry = new CylinderGeometry(size * 0.3, size * 0.3, size * 1.5, 8);
    const shank = new Mesh(shankGeometry, createFastenerMaterial('stainless'));
    shank.position.y = -size * 0.75;
    shank.rotation.x = Math.PI / 2;
    group.add(shank);
    
    // Slot (simplified - cross slot for Phillips/Torx)
    if (size > 0.003) {
        const slotGeometry = new BoxGeometry(size * 0.6, size * 0.05, size * 0.05);
        const slot = new Mesh(slotGeometry, createFastenerMaterial('black_oxide'));
        slot.position.y = size * 0.15;
        group.add(slot);
    }
    
    return group;
}

/**
 * Create corner reinforcement plate
 */
export function createCornerPlate(size: number = 0.02): Group {
    const group = new Group();
    
    // Main plate (L-shaped)
    const plateGeometry = new BoxGeometry(size, size * 0.3, size * 0.002);
    const plate = new Mesh(plateGeometry, createFastenerMaterial('zinc'));
    group.add(plate);
    
    // Screw holes (4 holes typical)
    const holeGeometry = new CylinderGeometry(size * 0.002, size * 0.002, size * 0.003, 8);
    const holeMaterial = new MeshStandardMaterial({ color: 0x000000 });
    
    const holePositions = [
        new Vector3(size * 0.25, 0, size * 0.0015),
        new Vector3(-size * 0.25, 0, size * 0.0015),
        new Vector3(0, size * 0.1, size * 0.0015),
        new Vector3(0, -size * 0.1, size * 0.0015)
    ];
    
    holePositions.forEach(pos => {
        const hole = new Mesh(holeGeometry, holeMaterial);
        hole.position.copy(pos);
        hole.rotation.x = Math.PI / 2;
        group.add(hole);
    });
    
    return group;
}

/**
 * Create fastener material based on Egyptian standards
 */
export function createFastenerMaterial(
    variant: 'stainless' | 'zinc' | 'black_oxide' = 'stainless'
): MeshStandardMaterial {
    const config = {
        stainless: {
            color: 0xcccccc,
            metalness: 0.95,
            roughness: 0.2,
            envMapIntensity: 2.0
        },
        zinc: {
            color: 0xa0a0a0,
            metalness: 0.85,
            roughness: 0.3,
            envMapIntensity: 1.5
        },
        black_oxide: {
            color: 0x333333,
            metalness: 0.7,
            roughness: 0.6,
            envMapIntensity: 0.8
        }
    }[variant];
    
    return new MeshStandardMaterial(config);
}

/**
 * Generate fasteners for Egyptian window unit
 */
export function generateFastenersForWindow(
    windowUnit: import('@/types/fabricator').WindowUnit,
    _quality: 'standard' | 'premium' | 'ultra' = 'premium'
): FastenerPlacement[] {
    const placements: FastenerPlacement[] = [];
    const width = windowUnit.overallWidth / 1000;
    const height = windowUnit.overallHeight / 1000;
    const halfW = width / 2;
    const halfH = height / 2;
    
    // 1. Corner screws (every Egyptian window has these)
    const corners = [
        { x: -halfW + 0.015, y: halfH - 0.015, angle: Math.PI / 4 },
        { x: halfW - 0.015, y: halfH - 0.015, angle: -Math.PI / 4 },
        { x: -halfW + 0.015, y: -halfH + 0.015, angle: -Math.PI / 4 },
        { x: halfW - 0.015, y: -halfH + 0.015, angle: Math.PI / 4 }
    ];
    
    corners.forEach((corner, _i) => {
        placements.push({
            type: EgyptianFastenerType.SCREW_FLAT_HEAD,
            position: new Vector3(corner.x, corner.y, 0.008),
            rotation: new Euler(0, 0, corner.angle),
            size: 0.004, // 4mm screws
            materialVariant: 'stainless'
        });
    });
    
    // 2. Hinge mounting screws (if casement/tilt-turn)
    const pattern = windowUnit.presetId ? getPatternById(windowUnit.presetId) : null;
    if (pattern?.type === 'casement' || pattern?.type === 'tilt_turn') {
        // Left side hinges (top and bottom)
        placements.push({
            type: EgyptianFastenerType.SCREW_PAN_HEAD,
            position: new Vector3(-halfW + 0.01, halfH - 0.1, 0.006),
            rotation: new Euler(0, 0, 0),
            size: 0.0035,
            materialVariant: 'zinc'
        });
        
        placements.push({
            type: EgyptianFastenerType.SCREW_PAN_HEAD,
            position: new Vector3(-halfW + 0.01, -halfH + 0.1, 0.006),
            rotation: new Euler(0, 0, 0),
            size: 0.0035,
            materialVariant: 'zinc'
        });
    }
    
    // 3. Handle mounting screws (always present)
    placements.push({
        type: EgyptianFastenerType.SCREW_HEX_HEAD,
        position: new Vector3(halfW - 0.02, 0, 0.007),
        rotation: new Euler(0, 0, 0),
        size: 0.003,
        materialVariant: 'stainless'
    });
    
    // 4. Corner reinforcement plates for large windows
    if (width > 1.5 || height > 1.5) {
        placements.push({
            type: EgyptianFastenerType.CORNER_PLATE,
            position: new Vector3(-halfW + 0.01, halfH - 0.01, 0.009),
            rotation: new Euler(0, 0, Math.PI / 4),
            size: 0.025,
            materialVariant: 'zinc'
        });
        
        placements.push({
            type: EgyptianFastenerType.CORNER_PLATE,
            position: new Vector3(halfW - 0.01, halfH - 0.01, 0.009),
            rotation: new Euler(0, 0, -Math.PI / 4),
            size: 0.025,
            materialVariant: 'zinc'
        });
    }
    
    // 5. Glazing bead clips (every 300mm)
    const clipSpacing = 0.3; // 300mm
    const clipCount = Math.floor(width / clipSpacing);
    
    for (let i = 1; i < clipCount; i++) {
        const x = -halfW + (clipSpacing * i);
        placements.push({
            type: EgyptianFastenerType.CLIP_PLASTIC,
            position: new Vector3(x, halfH - 0.008, 0.003),
            rotation: new Euler(0, 0, 0),
            size: 0.002,
            materialVariant: 'black_oxide'
        });
    }
    
    return placements;
}

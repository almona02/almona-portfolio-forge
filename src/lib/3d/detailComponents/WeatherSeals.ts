/**
 * GOLD TIER: Weather Seals & Gasket System
 * 
 * Egyptian Market Standards:
 * - EPDM Black: Primary seal (frame-sash interface)
 * - Brush Seal Grey: Sliding systems (dust/insect barrier)
 * - Silicone Clear: Drainage channels
 * - Foam Tape: Hardware mounting
 */

import { getPatternById } from '@/lib/fabricator/presetUtils';
import { BoxGeometry, Euler, ExtrudeGeometry, MeshStandardMaterial, Shape, Vector3 } from 'three';

export enum EgyptianSealType {
    EPDM_BLACK = 'epdm_black',        // Primary weather seal (EPDM rubber)
    BRUSH_GREY = 'brush_grey',        // Brush seal for sliding
    SILICONE_CLEAR = 'silicone_clear', // Drainage/glazing gasket
    FOAM_TAPE = 'foam_tape',          // Mounting/vibration dampening
    CORNER_GASKET = 'corner_gasket'   // Corner reinforcement
}

export interface SealPlacement {
    type: EgyptianSealType;
    position: Vector3;
    rotation: Euler;
    length: number; // mm in meters
    thickness?: number; // Compression thickness
}

/**
 * Egyptian EPDM Seal (D-profile, 8x12mm typical)
 */
export function createEPDMSealShape(): Shape {
    const shape = new Shape();
    
    // D-profile: Flat base with rounded top
    shape.moveTo(-0.004, 0); // 4mm wide, start left
    shape.lineTo(0.004, 0);  // 4mm right
    shape.quadraticCurveTo(0.005, 0.006, 0, 0.012); // 12mm height, rounded top
    shape.quadraticCurveTo(-0.005, 0.006, -0.004, 0); // Back to start
    
    return shape;
}

/**
 * Egyptian Brush Seal (for sliding systems)
 */
export function createBrushSealShape(bristleCount: number = 20): Shape {
    const shape = new Shape();
    const baseWidth = 0.006; // 6mm base
    const baseHeight = 0.003; // 3mm base height
    const bristleLength = 0.008; // 8mm bristles
    
    // Base rectangle
    shape.moveTo(-baseWidth/2, 0);
    shape.lineTo(baseWidth/2, 0);
    shape.lineTo(baseWidth/2, baseHeight);
    shape.lineTo(-baseWidth/2, baseHeight);
    shape.lineTo(-baseWidth/2, 0);
    
    // Add bristles as decorative elements (simplified for performance)
    // In production, these would be instanced geometry
    for (let i = 0; i < bristleCount; i++) {
        const x = -baseWidth/2 + (baseWidth / bristleCount) * (i + 0.5);
        shape.moveTo(x, baseHeight);
        shape.lineTo(x, baseHeight + bristleLength);
    }
    
    return shape;
}

/**
 * Silicone Drainage Gasket (U-channel, 6x4mm typical)
 */
export function createDrainageGasketShape(): Shape {
    const shape = new Shape();
    
    // U-channel profile
    shape.moveTo(-0.003, 0); // 3mm left wall base
    shape.lineTo(-0.003, 0.004); // 4mm up
    shape.lineTo(0.003, 0.004); // 6mm across top
    shape.lineTo(0.003, 0); // 4mm down right wall
    
    return shape;
}

/**
 * Create seal geometry with proper material
 */
export function createSealGeometry(
    sealType: EgyptianSealType, 
    length: number, // meters
    quality: 'standard' | 'premium' | 'ultra' = 'premium'
): { geometry: ExtrudeGeometry | BoxGeometry; material: MeshStandardMaterial } {
    
    let shape: Shape;
    const segments = quality === 'ultra' ? 12 : quality === 'premium' ? 8 : 4;
    
    switch (sealType) {
        case EgyptianSealType.EPDM_BLACK:
            shape = createEPDMSealShape();
            break;
        case EgyptianSealType.BRUSH_GREY:
            shape = createBrushSealShape(quality === 'ultra' ? 30 : quality === 'premium' ? 20 : 10);
            break;
        case EgyptianSealType.SILICONE_CLEAR:
            shape = createDrainageGasketShape();
            break;
        default:
            shape = createEPDMSealShape();
    }
    
    const extrudeSettings = {
        steps: 1,
        depth: length,
        bevelEnabled: false,
        curveSegments: segments
    };
    
    const geometry = new ExtrudeGeometry(shape, extrudeSettings);
    
    // Egyptian material standards
    const material = new MeshStandardMaterial({
        color: sealType === EgyptianSealType.EPDM_BLACK ? 0x111111 :
               sealType === EgyptianSealType.BRUSH_GREY ? 0x666666 :
               sealType === EgyptianSealType.SILICONE_CLEAR ? 0xdddddd : 0x333333,
        roughness: 0.9, // Rubber/plastic is matte
        metalness: 0.05,
        transparent: sealType === EgyptianSealType.SILICONE_CLEAR,
        opacity: sealType === EgyptianSealType.SILICONE_CLEAR ? 0.7 : 1.0,
        envMapIntensity: 0.1 // Non-reflective
    });
    
    return { geometry, material };
}

/**
 * Generate weather seals for an Egyptian window unit
 */
export function generateWeatherSealsForWindow(
    windowUnit: any,
    _quality: 'standard' | 'premium' | 'ultra' = 'premium'
): SealPlacement[] {
    const placements: SealPlacement[] = [];
    const width = windowUnit.overallWidth / 1000;
    const height = windowUnit.overallHeight / 1000;
    const halfW = width / 2;
    const halfH = height / 2;
    
    // Determine window type from pattern or grid
    const pattern = windowUnit.presetId ? getPatternById(windowUnit.presetId) : null;
    const isSliding = pattern?.type === 'sliding' || 
                      windowUnit.type?.toLowerCase().includes('sliding');
    
    // 1. Frame perimeter seal (always present)
    // 1. Frame perimeter seal (always present)
    // NOTE: ExtrudeGeometry creates shape in XY plane and extrudes along Z.
    // To align with frame bars, we must rotate the Z-extrusion to X or Y axis.

    placements.push({
        type: EgyptianSealType.EPDM_BLACK,
        position: new Vector3(0, halfH - 0.008, 0.005), // Top
        rotation: new Euler(0, Math.PI / 2, 0), // Rotate Z-extrusion to X-axis
        length: width
    });
    
    placements.push({
        type: EgyptianSealType.EPDM_BLACK,
        position: new Vector3(0, -halfH + 0.008, 0.005), // Bottom
        rotation: new Euler(0, Math.PI / 2, 0), // Rotate Z-extrusion to X-axis
        length: width
    });
    
    placements.push({
        type: EgyptianSealType.EPDM_BLACK,
        position: new Vector3(-halfW + 0.008, 0, 0.005), // Left
        rotation: new Euler(-Math.PI / 2, 0, 0), // Rotate Z-extrusion to Y-axis
        length: height - 0.016
    });
    
    placements.push({
        type: EgyptianSealType.EPDM_BLACK,
        position: new Vector3(halfW - 0.008, 0, 0.005), // Right
        rotation: new Euler(-Math.PI / 2, 0, 0), // Rotate Z-extrusion to Y-axis
        length: height - 0.016
    });
    
    // 2. Sliding system brush seals
    if (isSliding) {
        placements.push({
            type: EgyptianSealType.BRUSH_GREY,
            position: new Vector3(0, -halfH + 0.012, 0.003), // Bottom track
            rotation: new Euler(0, Math.PI / 2, 0), // Rotate to X-axis
            length: width - 0.02
        });
        
        placements.push({
            type: EgyptianSealType.BRUSH_GREY,
            position: new Vector3(0, halfH - 0.012, 0.003), // Top track
            rotation: new Euler(0, Math.PI / 2, 0), // Rotate to X-axis
            length: width - 0.02
        });
    }
    
    // 3. Drainage gaskets (bottom frame corners)
    placements.push({
        type: EgyptianSealType.SILICONE_CLEAR,
        position: new Vector3(-halfW + 0.015, -halfH + 0.006, 0.002),
        rotation: new Euler(0, Math.PI / 2, 0), // Rotate to X-axis
        length: 0.03 // 30mm drainage channel
    });
    
    placements.push({
        type: EgyptianSealType.SILICONE_CLEAR,
        position: new Vector3(halfW - 0.015, -halfH + 0.006, 0.002),
        rotation: new Euler(0, Math.PI / 2, 0), // Rotate to X-axis
        length: 0.03
    });
    
    // 4. Corner gaskets (for large windows > 2m)
    if (width > 2 || height > 2) {
        const corners = [
            new Vector3(-halfW + 0.01, halfH - 0.01, 0.004),
            new Vector3(halfW - 0.01, halfH - 0.01, 0.004),
            new Vector3(-halfW + 0.01, -halfH + 0.01, 0.004),
            new Vector3(halfW - 0.01, -halfH + 0.01, 0.004)
        ];
        
        corners.forEach(pos => {
            placements.push({
                type: EgyptianSealType.CORNER_GASKET,
                position: pos,
                rotation: new Euler(0, 0, Math.PI / 4),
                length: 0.02 // 20mm corner reinforcement
            });
        });
    }
    
    return placements;
}

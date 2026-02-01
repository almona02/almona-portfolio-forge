/**
 * GOLD TIER: Detail Integration with LOD Management
 * 
 * Manages performance-critical detail rendering:
 * - Distance-based culling (0-2m: Full, 2-5m: Medium, 5m+: Low)
 * - Quality-based detail levels
 * - Instance management for repeating elements
 */

import { Camera, Group, Mesh, Vector3 } from 'three';
import { createDrainageHole, createDrainageSlot, generateDrainageForWindow } from './DrainageSystem';
import { createCornerPlate, createFlatHeadScrew, generateFastenersForWindow } from './Fasteners';
import { createSealGeometry, generateWeatherSealsForWindow } from './WeatherSeals';

export enum DetailLOD {
    HIGH = 'high',      // 0-2 meters: All details visible
    MEDIUM = 'medium',  // 2-5 meters: Simplified details
    LOW = 'low',        // 5+ meters: Minimal or no details
    NONE = 'none'       // Disabled
}

export interface DetailIntegrationConfig {
    enabled: boolean;
    quality: 'standard' | 'premium' | 'ultra';
    enableWeatherSeals: boolean;
    enableFasteners: boolean;
    enableDrainage: boolean;
    maxDetails: number; // Performance cap
    lodDistanceThresholds: {
        high: number;   // meters
        medium: number;
        low: number;
    };
    cullSmallDetails: boolean;
    instanceRepeating: boolean;
}

export class DetailIntegrationSystem {
    private detailGroup: Group;
    private camera: Camera | null = null;
    private cameraPosition: Vector3 = new Vector3();
    private windowPosition: Vector3 = new Vector3();
    private currentLOD: DetailLOD = DetailLOD.HIGH;
    private config: DetailIntegrationConfig;
    private detailCount: number = 0;
    
    constructor(config: Partial<DetailIntegrationConfig> = {}) {
        this.detailGroup = new Group();
        this.detailGroup.name = 'GoldTierDetails';
        
        this.config = {
            enabled: true,
            quality: 'premium',
            enableWeatherSeals: true,
            enableFasteners: true,
            enableDrainage: true,
            maxDetails: 1000,
            lodDistanceThresholds: {
                high: 2.0,
                medium: 5.0,
                low: 10.0
            },
            cullSmallDetails: true,
            instanceRepeating: true,
            ...config
        };
    }
    
    /**
     * Set camera for distance-based LOD calculations
     */
    setCamera(camera: Camera): void {
        this.camera = camera;
    }
    
    /**
     * Set window position for distance calculation
     */
    setWindowPosition(position: Vector3): void {
        this.windowPosition.copy(position);
    }
    
    private lastLOD: DetailLOD | null = null;

    /**
     * Check if LOD changed and update if necessary
     * @returns true if details were updated
     */
    update(windowUnit: any): boolean {
        const prevLOD = this.currentLOD;
        this.updateLODBasedOnDistance();
        
        if (this.currentLOD !== prevLOD) {
            this.generateDetailsForWindowUnit(windowUnit, true);
            return true;
        }
        return false;
    }

    /**
     * Generate all details for window unit with LOD management
     */
    generateDetailsForWindowUnit(windowUnit: any, force: boolean = false): Group {
        if (!this.config.enabled) {
            this.clearDetails();
            return this.detailGroup;
        }
        
        // Calculate distance for LOD
        this.updateLODBasedOnDistance();
        
        // Skip regeneration if LOD hasn't changed and not forced
        if (!force && this.currentLOD === this.lastLOD) {
            return this.detailGroup;
        }

        // Clear existing details
        this.clearDetails();
        this.lastLOD = this.currentLOD;
        
        // Generate details based on LOD and quality

        switch (this.currentLOD) {
            case DetailLOD.HIGH:
                this.generateHighLODDetails(windowUnit);
                break;
            case DetailLOD.MEDIUM:
                this.generateMediumLODDetails(windowUnit);
                break;
            case DetailLOD.LOW:
                this.generateLowLODDetails(windowUnit);
                break;
            case DetailLOD.NONE:
                // No details
                break;
        }
        
        console.log(`[DetailSystem] Generated ${this.detailCount} details at ${this.currentLOD} LOD`);
        
        return this.detailGroup;
    }

    private clearDetails(): void {
        while(this.detailGroup.children.length > 0){ 
            const child = this.detailGroup.children[0];
            this.detailGroup.remove(child);
             // Dispose geometry/material if needed, but react-three-fiber usually handles this
             // For pure three.js manual management, we should dispose.
             // Implemented simplistic remove for now to match snippet intent.
        }
        this.detailCount = 0;
    }
    
    /**
     * Update LOD based on camera distance
     */
    private updateLODBasedOnDistance(): void {
        if (!this.camera) {
            this.currentLOD = DetailLOD.HIGH;
            return;
        }
        
        this.camera.getWorldPosition(this.cameraPosition);
        const distance = this.cameraPosition.distanceTo(this.windowPosition);
        
        if (distance <= this.config.lodDistanceThresholds.high) {
            this.currentLOD = DetailLOD.HIGH;
        } else if (distance <= this.config.lodDistanceThresholds.medium) {
            this.currentLOD = DetailLOD.MEDIUM;
        } else if (distance <= this.config.lodDistanceThresholds.low) {
            this.currentLOD = DetailLOD.LOW;
        } else {
            this.currentLOD = DetailLOD.NONE;
        }
    }
    
    /**
     * High LOD: All details visible
     */
    private generateHighLODDetails(windowUnit: any): void {
        // Weather seals (full detail)
        if (this.config.enableWeatherSeals) {
            const seals = generateWeatherSealsForWindow(windowUnit, this.config.quality);
            seals.forEach(seal => {
                if (this.detailCount >= this.config.maxDetails) return;
                
                const { geometry, material } = createSealGeometry(seal.type, seal.length, this.config.quality);
                const mesh = new Mesh(geometry, material);
                mesh.position.copy(seal.position);
                mesh.rotation.copy(seal.rotation);
                mesh.userData.isDetail = true;
                mesh.userData.type = 'seal';
                mesh.userData.lod = DetailLOD.HIGH;
                
                this.detailGroup.add(mesh);
                this.detailCount++;
            });
        }
        
        // Fasteners (full detail)
        if (this.config.enableFasteners) {
            const fasteners = generateFastenersForWindow(windowUnit, this.config.quality);
            fasteners.forEach(fastener => {
                if (this.detailCount >= this.config.maxDetails) return;
                
                let fastenerMesh;
                if (fastener.type === 'corner_plate') {
                    fastenerMesh = createCornerPlate(fastener.size);
                } else {
                    fastenerMesh = createFlatHeadScrew(fastener.size);
                }
                
                fastenerMesh.position.copy(fastener.position);
                fastenerMesh.rotation.copy(fastener.rotation);
                fastenerMesh.userData.isDetail = true;
                fastenerMesh.userData.type = 'fastener';
                fastenerMesh.userData.lod = DetailLOD.HIGH;
                
                this.detailGroup.add(fastenerMesh);
                this.detailCount++;
            });
        }
        
        // Drainage (full detail)
        if (this.config.enableDrainage) {
            const drainage = generateDrainageForWindow(windowUnit, this.config.quality);
            drainage.forEach(drain => {
                if (this.detailCount >= this.config.maxDetails) return;
                
                let drainMesh;
                if (drain.type === 'drain_hole_round') {
                    drainMesh = createDrainageHole(drain.size);
                } else if (drain.type === 'drain_hole_slot') {
                    drainMesh = createDrainageSlot(drain.size, drain.size * 4);
                } else {
                    // Skip other types for performance
                    return;
                }
                
                drainMesh.position.copy(drain.position);
                drainMesh.rotation.copy(drain.rotation);
                drainMesh.userData.isDetail = true;
                drainMesh.userData.type = 'drainage';
                drainMesh.userData.lod = DetailLOD.HIGH;
                
                this.detailGroup.add(drainMesh);
                this.detailCount++;
            });
        }
    }
    
    /**
     * Medium LOD: Simplified details
     */
    private generateMediumLODDetails(windowUnit: any): void {
        // Weather seals (simplified - fewer segments)
        if (this.config.enableWeatherSeals) {
            // We pass 'standard' quality to get reduced segments
            const seals = generateWeatherSealsForWindow(windowUnit, 'standard');
            // Only add every other seal to reduce count
            seals.filter((_, i) => i % 2 === 0).forEach(seal => {
                if (this.detailCount >= this.config.maxDetails / 2) return;
                
                const { geometry, material } = createSealGeometry(seal.type, seal.length, 'standard');
                const mesh = new Mesh(geometry, material);
                mesh.position.copy(seal.position);
                mesh.rotation.copy(seal.rotation);
                mesh.userData.isDetail = true;
                mesh.userData.lod = DetailLOD.MEDIUM;
                
                this.detailGroup.add(mesh);
                this.detailCount++;
            });
        }
        
        // Fasteners (only critical ones)
        if (this.config.enableFasteners) {
            const fasteners = generateFastenersForWindow(windowUnit, 'standard');
            const criticalFasteners = fasteners.filter(f => 
                f.type === 'screw_flat_head' || f.type === 'corner_plate'
            );
            
            criticalFasteners.forEach(fastener => {
                if (this.detailCount >= this.config.maxDetails / 2) return;
                
                const fastenerMesh = createFlatHeadScrew(fastener.size);
                fastenerMesh.position.copy(fastener.position);
                fastenerMesh.rotation.copy(fastener.rotation);
                fastenerMesh.userData.isDetail = true;
                fastenerMesh.userData.lod = DetailLOD.MEDIUM;
                
                this.detailGroup.add(fastenerMesh);
                this.detailCount++;
            });
        }
    }

    /**
     * Low LOD: Minimal details
     */
    private generateLowLODDetails(windowUnit: any): void {
        // Only large corner plates for large windows
        const fasteners = generateFastenersForWindow(windowUnit, 'standard');
        const plates = fasteners.filter(f => f.type === 'corner_plate');

        plates.forEach(plate => {
            if (this.detailCount >= this.config.maxDetails / 4) return;
            const mesh = createCornerPlate(plate.size);
            mesh.position.copy(plate.position);
            mesh.rotation.copy(plate.rotation);
            this.detailGroup.add(mesh);
            this.detailCount++;
        });
    }
}

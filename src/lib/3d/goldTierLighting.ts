/**
 * GOLD TIER LIGHTING SYSTEM v3.0
 * 
 * Egyptian climate-optimized lighting:
 * - Cairo midday sun (warm, high angle)
 * - Alexandria coastal light (cooler, diffuse)
 * - New Cairo modern lighting (balanced)
 * - Golden hour (dramatic, for presentations)
 */

import { Color, DirectionalLight, HemisphereLight, PointLight } from 'three';

// Egyptian geographical lighting presets
const EGYPTIAN_LIGHTING_PRESETS = {
    // Cairo midday (30°N latitude, typical sunny day)
    cairoMidday: {
        sunColor: new Color(0xfff8e7), // Warm white-yellow
        sunIntensity: 1.8,
        sunPosition: { x: 5, y: 12, z: 7 }, // High angle (Egyptian latitude)
        shadowIntensity: 1.0,
        
        skyColor: new Color(0x87ceeb), // Egyptian sky blue
        groundColor: new Color(0x90a955), // Urban green/grey
        ambientIntensity: 0.4,
        
        fillLightColor: new Color(0x4a90e2), // Blue fill from sky
        fillIntensity: 0.3,
        fillPosition: { x: -3, y: 5, z: -2 },
        
        rimLightColor: new Color(0xffffff), // White rim for edge definition
        rimIntensity: 0.25,
        rimPosition: { x: 0, y: 2, z: -5 },
        
        bounceLights: [
            {
                color: new Color(0xf5e6d3), // Sand/building bounce
                intensity: 0.15,
                position: { x: 0, y: -1, z: 0 },
                distance: 5
            }
        ]
    },
    
    // Alexandria coastal (Mediterranean light)
    alexandriaCoastal: {
        sunColor: new Color(0xe6f2ff), // Cooler, more blue
        sunIntensity: 1.6,
        sunPosition: { x: 4, y: 10, z: 6 },
        shadowIntensity: 0.9,
        
        skyColor: new Color(0xa6d8ff), // Mediterranean sky
        groundColor: new Color(0x7bb3d1), // Sea reflection
        ambientIntensity: 0.5, // More ambient from sea reflection
        
        fillLightColor: new Color(0x7bb3d1), // Sea blue fill
        fillIntensity: 0.4,
        fillPosition: { x: -2, y: 4, z: -3 },
        
        rimLightColor: new Color(0xe6f2ff),
        rimIntensity: 0.3,
        rimPosition: { x: 1, y: 3, z: -4 },
        
        bounceLights: [
            {
                color: new Color(0xb3e0ff), // Water bounce
                intensity: 0.2,
                position: { x: 0, y: -0.5, z: 2 },
                distance: 6
            }
        ]
    },
    
    // Golden Hour (dramatic presentation)
    goldenHour: {
        sunColor: new Color(0xffb347), // Deep orange
        sunIntensity: 1.4,
        sunPosition: { x: 3, y: 5, z: 4 }, // Low angle
        shadowIntensity: 1.2, // Longer shadows
        
        skyColor: new Color(0xff8c42), // Sunset sky
        groundColor: new Color(0x8b4513), // Warm ground
        ambientIntensity: 0.3,
        
        fillLightColor: new Color(0xffcc99), // Warm fill
        fillIntensity: 0.35,
        fillPosition: { x: -2, y: 3, z: -2 },
        
        rimLightColor: new Color(0xffdd99), // Golden rim
        rimIntensity: 0.4,
        rimPosition: { x: -1, y: 4, z: -3 },
        
        bounceLights: [
            {
                color: new Color(0xffcc99),
                intensity: 0.25,
                position: { x: 0, y: -1, z: 0 },
                distance: 4
            }
        ]
    },
    
    // Showroom (product presentation)
    showroom: {
        sunColor: new Color(0xffffff), // Pure white
        sunIntensity: 1.2,
        sunPosition: { x: 4, y: 8, z: 5 },
        shadowIntensity: 0.8, // Softer shadows
        
        skyColor: new Color(0xf0f0f0), // Neutral grey
        groundColor: new Color(0xcccccc),
        ambientIntensity: 0.6, // High ambient for even lighting
        
        fillLightColor: new Color(0xf0f0f0),
        fillIntensity: 0.45,
        fillPosition: { x: -3, y: 4, z: -3 },
        
        rimLightColor: new Color(0xffffff),
        rimIntensity: 0.35,
        rimPosition: { x: 2, y: 6, z: -4 },
        
        bounceLights: [
            {
                color: new Color(0xffffff),
                intensity: 0.3,
                position: { x: 0, y: 3, z: 0 },
                distance: 5
            }
        ]
    }
};

/**
 * GOLD TIER LIGHTING FACTORY
 */
export class GoldTierLightingFactory {
    private static instance: GoldTierLightingFactory;
    private currentPreset: keyof typeof EGYPTIAN_LIGHTING_PRESETS = 'cairoMidday';
    private lights: {
        sun: DirectionalLight;
        ambient: HemisphereLight;
        fill: DirectionalLight;
        rim: DirectionalLight;
        bounceLights: PointLight[];
    } | null = null;
    
    private constructor() {}
    
    static getInstance(): GoldTierLightingFactory {
        if (!GoldTierLightingFactory.instance) {
            GoldTierLightingFactory.instance = new GoldTierLightingFactory();
        }
        return GoldTierLightingFactory.instance;
    }
    
    /**
     * Create complete Egyptian lighting setup
     */
    createLighting(
        preset: keyof typeof EGYPTIAN_LIGHTING_PRESETS = 'cairoMidday',
        enableShadows: boolean = true,
        shadowQuality: 'low' | 'medium' | 'high' = 'medium'
    ) {
        this.currentPreset = preset;
        const config = EGYPTIAN_LIGHTING_PRESETS[preset];
        
        // Clear existing lights
        this.dispose();
        
        // ===== MAIN SUN LIGHT =====
        const sunLight = new DirectionalLight(config.sunColor, config.sunIntensity);
        sunLight.position.set(config.sunPosition.x, config.sunPosition.y, config.sunPosition.z);
        
        if (enableShadows) {
            sunLight.castShadow = true;
            this.configureShadows(sunLight, shadowQuality);
        }
        
        // ===== AMBIENT/SKY LIGHT =====
        const ambientLight = new HemisphereLight(
            config.skyColor,
            config.groundColor,
            config.ambientIntensity
        );
        
        // ===== FILL LIGHT =====
        const fillLight = new DirectionalLight(config.fillLightColor, config.fillIntensity);
        fillLight.position.set(config.fillPosition.x, config.fillPosition.y, config.fillPosition.z);
        
        // ===== RIM LIGHT =====
        const rimLight = new DirectionalLight(config.rimLightColor, config.rimIntensity);
        rimLight.position.set(config.rimPosition.x, config.rimPosition.y, config.rimPosition.z);
        
        // ===== BOUNCE LIGHTS =====
        const bounceLights: PointLight[] = [];
        config.bounceLights.forEach((bounceConfig, _index) => {
            const bounceLight = new PointLight(
                bounceConfig.color,
                bounceConfig.intensity,
                bounceConfig.distance
            );
            bounceLight.position.set(
                bounceConfig.position.x,
                bounceConfig.position.y,
                bounceConfig.position.z
            );
            bounceLights.push(bounceLight);
        });
        
        this.lights = {
            sun: sunLight,
            ambient: ambientLight,
            fill: fillLight,
            rim: rimLight,
            bounceLights
        };
        
        return this.lights;
    }
    
    /**
     * Configure shadow quality
     */
    private configureShadows(light: DirectionalLight, quality: 'low' | 'medium' | 'high'): void {
        const config = {
            low: {
                mapSize: 1024,
                camera: { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 }
            },
            medium: {
                mapSize: 2048,
                camera: { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 30 }
            },
            high: {
                mapSize: 4096,
                camera: { left: -10, right: 10, top: 10, bottom: -10, near: 0.5, far: 50 }
            }
        }[quality];
        
        light.shadow.mapSize.width = config.mapSize;
        light.shadow.mapSize.height = config.mapSize;
        light.shadow.camera.left = config.camera.left;
        light.shadow.camera.right = config.camera.right;
        light.shadow.camera.top = config.camera.top;
        light.shadow.camera.bottom = config.camera.bottom;
        light.shadow.camera.near = config.camera.near;
        light.shadow.camera.far = config.camera.far;
        
        // Shadow quality settings
        light.shadow.bias = -0.0001;
        light.shadow.normalBias = 0.02;
        light.shadow.radius = quality === 'high' ? 2 : 1;
    }
    
    /**
     * Animate lighting (time of day, etc.)
     */
    animateToPreset(
        targetPreset: keyof typeof EGYPTIAN_LIGHTING_PRESETS,
        duration: number = 3000
    ): Promise<void> {
        return new Promise((resolve) => {
            // Implementation for smooth lighting transitions
            // This would interpolate between current and target preset values
            setTimeout(() => {
                this.createLighting(targetPreset);
                resolve();
            }, duration);
        });
    }
    
    /**
     * Dispose lights for cleanup
     */
    dispose(): void {
        if (this.lights) {
            this.lights.sun.dispose();
            this.lights.ambient.dispose();
            this.lights.fill.dispose();
            this.lights.rim.dispose();
            this.lights.bounceLights.forEach(light => light.dispose());
            this.lights = null;
        }
    }
    
    /**
     * Get current preset
     */
    getCurrentPreset(): string {
        return this.currentPreset;
    }
}

/**
 * GOLD TIER POST-PROCESSING v3.0
 * 
 * Cinematic rendering effects optimized for window visualization:
 * - Screen Space Ambient Occlusion (contact shadows)
 * - Adaptive bloom for glass/metal highlights
 * - Vignette & chromatic aberration for filmic look
 * - Tone mapping for Egyptian light conditions
 */

import {
    BlendFunction,
    BloomEffect,
    ChromaticAberrationEffect,
    EffectComposer,
    EffectPass,
    KernelSize,
    NormalPass,
    RenderPass,
    SMAAPreset,
    SSAOEffect,
    ToneMappingEffect,
    VignetteEffect
} from 'postprocessing';
import { Camera, Color, Scene, Vector2, WebGLRenderer } from 'three';

// Egyptian post-processing presets
const EGYPTIAN_POSTPROCESSING_PRESETS = {
    standard: {
        bloom: { enabled: true, intensity: 0.4, luminanceThreshold: 0.9 },
        ssao: { enabled: false, samples: 0, rings: 0, distanceThreshold: 0 },
        vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
        chromaticAberration: { enabled: false, offset: 0 },
        toneMapping: { enabled: true, exposure: 1.0 },
        antiAliasing: { enabled: true, preset: SMAAPreset.LOW }
    },
    premium: {
        bloom: { enabled: true, intensity: 0.5, luminanceThreshold: 0.85 },
        ssao: { enabled: true, samples: 16, rings: 3, distanceThreshold: 0.5 },
        vignette: { enabled: true, darkness: 0.5, offset: 0.3 },
        chromaticAberration: { enabled: true, offset: 0.001 },
        toneMapping: { enabled: true, exposure: 1.1 },
        antiAliasing: { enabled: true, preset: SMAAPreset.MEDIUM }
    },
    ultra: {
        bloom: { enabled: true, intensity: 0.6, luminanceThreshold: 0.8 },
        ssao: { enabled: true, samples: 31, rings: 4, distanceThreshold: 0.4 },
        vignette: { enabled: true, darkness: 0.6, offset: 0.35 },
        chromaticAberration: { enabled: true, offset: 0.0015 },
        toneMapping: { enabled: true, exposure: 1.2 },
        antiAliasing: { enabled: true, preset: SMAAPreset.HIGH }
    }
};

/**
 * GOLD TIER POST-PROCESSING COMPOSER
 */
export class GoldTierPostProcessing {
    private composer: EffectComposer;
    private effects: Map<string, any> = new Map();
    private currentPreset: keyof typeof EGYPTIAN_POSTPROCESSING_PRESETS = 'premium';
    private scene: Scene;
    private camera: Camera;
    
    constructor(
        renderer: WebGLRenderer,
        scene: Scene,
        camera: Camera,
        quality: 'standard' | 'premium' | 'ultra' = 'premium'
    ) {
        this.scene = scene;
        this.camera = camera;

        // Create effect composer
        this.composer = new EffectComposer(renderer);
        
        // Configure effects based on quality
        this.configureEffects(quality);
    }
    
    /**
     * Configure effects based on quality preset
     */
    configureEffects(quality: 'standard' | 'premium' | 'ultra'): void {
        this.currentPreset = quality;
        let preset = EGYPTIAN_POSTPROCESSING_PRESETS[quality];
        
        // Safety fallback
        if (!preset) {
            console.warn(`[GoldTierPostProcessing] Invalid quality '${quality}', defaulting to 'premium'`);
            preset = EGYPTIAN_POSTPROCESSING_PRESETS['premium'];
            this.currentPreset = 'premium';
        }
        
        // Clear existing passes (except we will rebuild them)
        this.composer.removeAllPasses();

        // 1. Render Pass (Essential)
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        const effects: any[] = [];

        // 2. Normal Pass (Required for SSAO)
        let normalPass: NormalPass | null = null;
        if (preset.ssao.enabled) {
            normalPass = new NormalPass(this.scene, this.camera);
            this.composer.addPass(normalPass);
            
            const ssaoEffect = new SSAOEffect(
                this.camera,
                normalPass.texture,
                {
                    blendFunction: BlendFunction.MULTIPLY,
					samples: preset.ssao.samples,
					rings: preset.ssao.rings,
					distanceThreshold: preset.ssao.distanceThreshold,
					distanceFalloff: 0.5,
					rangeThreshold: 0.5,
					rangeFalloff: 0.1,
					luminanceInfluence: 0.9,
					radius: 20,
					scale: 0.5,
					bias: 0.5,
                    intensity: 30,
                    color: new Color(0x000000)
                } as any // Cast to any to avoid strict type checking on version mismatch
            );
            
            effects.push(ssaoEffect);
            this.effects.set('ssao', ssaoEffect);
        }
        
        // ===== BLOOM =====
        if (preset.bloom.enabled) {
            const bloomEffect = new BloomEffect({
                blendFunction: BlendFunction.SCREEN,
                kernelSize: KernelSize.LARGE,
                luminanceThreshold: preset.bloom.luminanceThreshold,
                luminanceSmoothing: 0.9,
                intensity: preset.bloom.intensity,
                mipmapBlur: true
            });
            effects.push(bloomEffect);
            this.effects.set('bloom', bloomEffect);
        }
        
        // ===== VIGNETTE =====
        if (preset.vignette.enabled) {
            const vignetteEffect = new VignetteEffect({
                darkness: preset.vignette.darkness,
                offset: preset.vignette.offset,
                eskil: false
            });
            effects.push(vignetteEffect);
            this.effects.set('vignette', vignetteEffect);
        }
        
        // ===== CHROMATIC ABERRATION =====
        if (preset.chromaticAberration.enabled) {
            const chromaticEffect = new ChromaticAberrationEffect({
                offset: new Vector2(preset.chromaticAberration.offset, preset.chromaticAberration.offset), 
                radialModulation: false,
                modulationOffset: 0
            });
            effects.push(chromaticEffect);
            this.effects.set('chromatic', chromaticEffect);
        }
        
        // ===== TONE MAPPING =====
        if (preset.toneMapping.enabled) {
            const toneMappingEffect = new ToneMappingEffect({
                blendFunction: BlendFunction.NORMAL,
                adaptive: true,
                resolution: 256,
                middleGrey: 0.6,
                maxLuminance: 16.0,
                averageLuminance: 1.0,
                adaptationRate: 1.0
            });
            effects.push(toneMappingEffect);
            this.effects.set('toneMapping', toneMappingEffect);
        }

        // Batch all effects into a single EffectPass for performance
        if (effects.length > 0) {
            const effectPass = new EffectPass(this.camera, ...effects);
            this.composer.addPass(effectPass);
        }
    }
    
    /**
     * Render with post-processing
     */
    render(deltaTime: number): void {
        this.composer.render(deltaTime);
    }
    
    /**
     * Update effect parameters
     */
    updateEffect(effectName: string, parameters: any): void {
        const effect = this.effects.get(effectName);
        if (effect) {
            Object.assign(effect, parameters);
        }
    }
    
    /**
     * Get current preset
     */
    getCurrentPreset(): string {
        return this.currentPreset;
    }
    
    /**
     * Dispose resources
     */
    dispose(): void {
        this.composer.dispose();
        this.effects.clear();
    }
    
    /**
     * Resize composer
     */
    setSize(width: number, height: number): void {
        this.composer.setSize(width, height);
    }
}

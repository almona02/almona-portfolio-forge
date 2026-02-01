/**
 * Monitor lighting performance and auto-adjust
 */
export class LightingPerformanceMonitor {
    private frameTimes: number[] = [];
    private currentLightingPreset: string = 'cairoMidday';
    private currentShadowQuality: 'low' | 'medium' | 'high' = 'medium';
    private postProcessingEnabled: boolean = true;
    
    constructor(
        private onLightingChange?: (preset: string, shadowQuality: string) => void,
        private onPostProcessingChange?: (enabled: boolean) => void
    ) {}
    
    updatePerformanceMetrics(frameTime: number, fps: number): void {
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > 30) this.frameTimes.shift();
        
        // Adjust lighting based on performance
        if (fps < 25) {
            // Critical low performance
            this.downgradeLighting();
        } else if (fps < 40 && this.currentShadowQuality === 'high') {
            // Moderate performance - reduce shadow quality
            this.setShadowQuality('medium');
        } else if (fps > 55 && this.currentShadowQuality === 'low') {
            // Good performance - improve quality
            this.upgradeLighting();
        }
    }
    
    private downgradeLighting(): void {
        if (this.postProcessingEnabled) {
            this.postProcessingEnabled = false;
            this.onPostProcessingChange?.(false);
        }
        
        if (this.currentShadowQuality !== 'low') {
            this.setShadowQuality('low');
        }
        
        if (this.currentLightingPreset !== 'showroom') {
            this.currentLightingPreset = 'showroom';
            this.onLightingChange?.('showroom', this.currentShadowQuality);
        }
    }
    
    private upgradeLighting(): void {
        if (!this.postProcessingEnabled) {
            this.postProcessingEnabled = true;
            this.onPostProcessingChange?.(true);
        }
        
        if (this.currentShadowQuality === 'low') {
            this.setShadowQuality('medium');
        }
        
        if (this.currentLightingPreset === 'showroom') {
            this.currentLightingPreset = 'cairoMidday';
            this.onLightingChange?.('cairoMidday', this.currentShadowQuality);
        }
    }
    
    private setShadowQuality(quality: 'low' | 'medium' | 'high'): void {
        this.currentShadowQuality = quality;
        this.onLightingChange?.(this.currentLightingPreset, quality);
    }
}

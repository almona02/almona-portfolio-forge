/**
 * Monitor material performance and auto-adjust quality
 */
export class MaterialPerformanceMonitor {
    private frameTimes: number[] = [];
    private lastFrameTime: number = 0;
    private currentQuality: 'standard' | 'premium' | 'ultra' = 'premium';
    private onQualityChange?: (quality: string) => void;
    private animationFrameId: number | null = null;
    
    constructor(onQualityChange?: (quality: string) => void) {
        this.onQualityChange = onQualityChange;
    }
    
    startMonitoring(): void {
        this.frameTimes = [];
        this.lastFrameTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.monitorFrame.bind(this));
    }

    stopMonitoring(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    private monitorFrame(): void {
        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        this.lastFrameTime = now;
        
        // Keep last 60 frames (1 second at 60fps)
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > 60) {
            this.frameTimes.shift();
        }
        
        // Calculate average frame time
        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        const fps = 1000 / avgFrameTime;
        
        // Adjust quality based on performance
        this.adjustQualityBasedOnFPS(fps);
        
        this.animationFrameId = requestAnimationFrame(this.monitorFrame.bind(this));
    }
    
    private adjustQualityBasedOnFPS(fps: number): void {
        let newQuality = this.currentQuality;
        
        if (fps < 30) {
            // Below 30fps - downgrade to standard
            newQuality = 'standard';
        } else if (fps < 45 && this.currentQuality === 'ultra') {
            // 30-45fps with ultra - downgrade to premium
            newQuality = 'premium';
        } else if (fps > 55 && this.currentQuality === 'standard') {
            // Above 55fps with standard - upgrade to premium
            newQuality = 'premium';
        } else if (fps > 58 && this.currentQuality === 'premium') {
            // Consistently high FPS - consider ultra
            // Only auto-upgrade if we have high-end GPU detection
            if (this.detectHighEndGPU()) {
                newQuality = 'ultra';
            }
        }
        
        // Apply change if needed
        if (newQuality !== this.currentQuality) {
            this.currentQuality = newQuality;
            if (this.onQualityChange) {
                this.onQualityChange(newQuality);
            }
        }
    }
    
    private detectHighEndGPU(): boolean {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) return false;
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return false;
        
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        const highEndMarkers = ['NVIDIA', 'RTX', 'AMD Radeon', 'Apple M', 'Radeon Pro'];
        
        return highEndMarkers.some(marker => renderer.includes(marker));
    }
}

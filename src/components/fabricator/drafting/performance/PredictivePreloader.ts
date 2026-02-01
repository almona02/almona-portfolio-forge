import { OptimizedCanvasManager } from '../OptimizedCanvasManager';

/**
 * TIER 0 PREDICTIVE ENGINE
 * 
 * Anticipates user intent based on input velocity and direction.
 * Pre-fetches heavy Egyptian template geometry from Web Workers
 * to ensure 60fps when the user completes their action (e.g. Zoom In).
 */
export class PredictivePreloader {
    private manager: OptimizedCanvasManager;
    private lastZoomTime: number = 0;
    
    constructor(manager: OptimizedCanvasManager) {
        this.manager = manager;
    }

    /**
     * Called on mouse wheel events to predict next LOD needs.
     */
    public onZoomInteraction(deltaY: number, _currentZoom: number) {
        // Debounce: Only predict every 100ms to avoid spamming the worker cache
        const now = Date.now();
        if (now - this.lastZoomTime < 100) return;
        this.lastZoomTime = now;

        // Prediction Logic
        if (deltaY < 0) {
            // User is Zooming IN (requiring more detail)
            // If currently LOW, pre-fetch MEDIUM and HIGH
            // If currently MEDIUM, pre-fetch HIGH
            
            // Note: We don't check current LOD directly from manager in this simplified version
            // we just assume the direction implies the need for higher quality.
            
            this.manager.preloadTemplate('MEDIUM');
            this.manager.preloadTemplate('HIGH');
        } 
        // We generally don't need to preload LOW because it's fast anyway,
        // but we could if we wanted to handle "Zoom Out" to massive assembly views.
    }
}

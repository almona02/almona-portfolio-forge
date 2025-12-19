/**
 * Production3DRenderer - Production-Grade 3D Renderer
 * 
 * Provides progressive geometry loading, memory monitoring, fallback 2D renderer,
 * and Egyptian locale optimization for 3D visualization.
 * 
 * Week 4 Task 4.1: Production 3D Renderer
 */

import { MemoryMonitor, MemoryStats, MemoryEvent } from './MemoryMonitor';
import { SecurityGateway } from '@/lib/security/SecurityGateway';

export interface RendererConfig {
  progressiveLoading: boolean;
  memoryThreshold: number; // percentage (0-100)
  enableMemoryMonitoring: boolean;
  fallbackTo2D: boolean;
  locale: 'en' | 'ar';
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export interface GeometryLoadProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentItem?: string;
}

export interface RendererStatus {
  is3DMode: boolean;
  is2DFallback: boolean;
  memoryStats: MemoryStats | null;
  loadProgress: GeometryLoadProgress | null;
  error: string | null;
  errorAr: string | null;
}

export type RendererStatusListener = (status: RendererStatus) => void;

/**
 * Production3DRenderer - Main production renderer class
 */
export class Production3DRenderer {
  private static instance: Production3DRenderer;
  private memoryMonitor: MemoryMonitor;
  private securityGateway: SecurityGateway;
  private config: RendererConfig;
  private status: RendererStatus;
  private statusListeners: Set<RendererStatusListener> = new Set();
  private memoryEventListener: ((event: MemoryEvent) => void) | null = null;

  private constructor() {
    this.memoryMonitor = MemoryMonitor.getInstance();
    this.securityGateway = SecurityGateway.getInstance();
    this.config = {
      progressiveLoading: true,
      memoryThreshold: 85,
      enableMemoryMonitoring: true,
      fallbackTo2D: true,
      locale: 'en',
      quality: 'high',
    };
    this.status = {
      is3DMode: true,
      is2DFallback: false,
      memoryStats: null,
      loadProgress: null,
      error: null,
      errorAr: null,
    };
  }

  static getInstance(): Production3DRenderer {
    if (!Production3DRenderer.instance) {
      Production3DRenderer.instance = new Production3DRenderer();
    }
    return Production3DRenderer.instance;
  }

  /**
   * Configure the renderer
   */
  configure(config: Partial<RendererConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateStatus();
  }

  /**
   * Get current configuration
   */
  getConfig(): RendererConfig {
    return { ...this.config };
  }

  /**
   * Initialize the renderer
   */
  initialize(): void {
    if (this.config.enableMemoryMonitoring && this.memoryMonitor.isAvailable()) {
      this.memoryMonitor.startMonitoring();
      
      // Set up memory event listener
      this.memoryEventListener = (event: MemoryEvent) => {
        this.handleMemoryEvent(event);
      };
      this.memoryMonitor.addEventListener(this.memoryEventListener);
    }

    // Check initial memory state
    this.checkMemoryAndUpdateMode();
  }

  /**
   * Cleanup and dispose resources
   */
  dispose(): void {
    if (this.memoryEventListener) {
      this.memoryMonitor.removeEventListener(this.memoryEventListener);
      this.memoryEventListener = null;
    }
    this.memoryMonitor.stopMonitoring();
    this.statusListeners.clear();
  }

  /**
   * Handle memory events
   */
  private handleMemoryEvent(event: MemoryEvent): void {
    const stats = this.memoryMonitor.getMemoryStats();
    if (stats) {
      this.status.memoryStats = stats;
      
      // Switch to 2D fallback if memory is critical
      if (event.type === 'critical' && this.config.fallbackTo2D && !this.status.is2DFallback) {
        this.switchTo2DFallback(
          this.securityGateway.getLocalizedError('LOW_MEMORY_FALLBACK', this.config.locale).message_en,
          this.securityGateway.getLocalizedError('LOW_MEMORY_FALLBACK', this.config.locale).messageAr
        );
      }
      
      this.updateStatus();
    }
  }

  /**
   * Check memory and update render mode
   */
  private checkMemoryAndUpdateMode(): void {
    if (!this.memoryMonitor.isAvailable()) {
      return;
    }

    const stats = this.memoryMonitor.getMemoryStats();
    if (stats) {
      this.status.memoryStats = stats;
      
      // Check if we should switch to 2D fallback
      if (stats.usagePercent >= this.config.memoryThreshold && this.config.fallbackTo2D && !this.status.is2DFallback) {
        this.switchTo2DFallback(
          this.securityGateway.getLocalizedError('LOW_MEMORY_FALLBACK', this.config.locale).message_en,
          this.securityGateway.getLocalizedError('LOW_MEMORY_FALLBACK', this.config.locale).messageAr
        );
      } else if (stats.usagePercent < this.config.memoryThreshold && this.status.is2DFallback) {
        // Memory recovered, can switch back to 3D
        this.switchTo3D();
      }
      
      this.updateStatus();
    }
  }

  /**
   * Switch to 2D fallback mode
   */
  private switchTo2DFallback(error: string, errorAr: string): void {
    this.status.is3DMode = false;
    this.status.is2DFallback = true;
    this.status.error = error;
    this.status.errorAr = errorAr;
    this.updateStatus();
  }

  /**
   * Switch back to 3D mode
   */
  private switchTo3D(): void {
    this.status.is3DMode = true;
    this.status.is2DFallback = false;
    this.status.error = null;
    this.status.errorAr = null;
    this.updateStatus();
  }

  /**
   * Update renderer status and notify listeners
   */
  private updateStatus(): void {
    this.statusListeners.forEach((listener) => {
      try {
        listener({ ...this.status });
      } catch (error) {
        console.error('Error in renderer status listener:', error);
      }
    });
  }

  /**
   * Add status listener
   */
  addStatusListener(listener: RendererStatusListener): void {
    this.statusListeners.add(listener);
  }

  /**
   * Remove status listener
   */
  removeStatusListener(listener: RendererStatusListener): void {
    this.statusListeners.delete(listener);
  }

  /**
   * Get current status
   */
  getStatus(): RendererStatus {
    return { ...this.status };
  }

  /**
   * Update load progress
   */
  updateLoadProgress(progress: GeometryLoadProgress): void {
    this.status.loadProgress = progress;
    this.updateStatus();
  }

  /**
   * Clear load progress
   */
  clearLoadProgress(): void {
    this.status.loadProgress = null;
    this.updateStatus();
  }

  /**
   * Set error state
   */
  setError(error: string, errorAr: string): void {
    this.status.error = error;
    this.status.errorAr = errorAr;
    this.updateStatus();
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.status.error = null;
    this.status.errorAr = null;
    this.updateStatus();
  }

  /**
   * Check if 3D rendering is available
   */
  is3DAvailable(): boolean {
    return this.status.is3DMode && !this.status.is2DFallback;
  }

  /**
   * Check if 2D fallback is active
   */
  is2DFallbackActive(): boolean {
    return this.status.is2DFallback;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): MemoryStats | null {
    return this.status.memoryStats;
  }

  /**
   * Force cleanup of Three.js objects
   */
  cleanupObjects(objects: any[]): void {
    objects.forEach((obj) => {
      this.memoryMonitor.disposeObject(obj);
    });
    
    // Force garbage collection if available
    this.memoryMonitor.forceGarbageCollection();
    
    // Check memory after cleanup
    setTimeout(() => {
      this.checkMemoryAndUpdateMode();
    }, 1000);
  }

  /**
   * Get quality settings based on memory and config
   */
  getQualitySettings(): {
    shadows: boolean;
    antialiasing: boolean;
    postProcessing: boolean;
    textureQuality: 'low' | 'medium' | 'high';
  } {
    const stats = this.memoryMonitor.getMemoryStats();
    const isLowMemory = stats ? stats.isLowMemory : false;
    
    if (this.config.quality === 'ultra' && !isLowMemory) {
      return {
        shadows: true,
        antialiasing: true,
        postProcessing: true,
        textureQuality: 'high',
      };
    } else if (this.config.quality === 'high' && !isLowMemory) {
      return {
        shadows: true,
        antialiasing: true,
        postProcessing: false,
        textureQuality: 'high',
      };
    } else if (this.config.quality === 'medium' || isLowMemory) {
      return {
        shadows: false,
        antialiasing: true,
        postProcessing: false,
        textureQuality: 'medium',
      };
    } else {
      return {
        shadows: false,
        antialiasing: false,
        postProcessing: false,
        textureQuality: 'low',
      };
    }
  }
}

// Export singleton instance
export const production3DRenderer = Production3DRenderer.getInstance();


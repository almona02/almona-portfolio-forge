/**
 * Egyptian Workshop Loading Strategy
 * 
 * Optimizes loading behavior for Egyptian workshops with varying connection speeds:
 * - Delta/Upper Egypt: 3G with 0.5-2 Mbps
 * - Cairo/Alexandria: 4G with 2-8 Mbps
 * - Power outages common - offline capability critical
 * 
 * Strategy:
 * - Detect connection speed
 * - Load appropriate algorithms (Python for fast, TypeScript for slow)
 * - Defer heavy features until needed
 * - Prioritize core fabricator functionality
 */

export interface ConnectionInfo {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // Round-trip time in ms
  saveData: boolean;
}

export class EgyptianLoadingStrategy {
  private static connectionInfo: ConnectionInfo | null = null;
  private static readonly SLOW_CONNECTION_THRESHOLD = 1.5; // Mbps
  private static readonly FAST_CONNECTION_THRESHOLD = 5; // Mbps

  /**
   * Get current connection information
   */
  static getConnectionInfo(): ConnectionInfo {
    if (this.connectionInfo) {
      return this.connectionInfo;
    }

    // @ts-expect-error - NetworkInformation API not in TypeScript types
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (!connection) {
      // Fallback: assume moderate connection
      this.connectionInfo = {
        effectiveType: 'unknown',
        downlink: 2.5,
        rtt: 150,
        saveData: false
      };
      return this.connectionInfo;
    }

    this.connectionInfo = {
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 2.5,
      rtt: connection.rtt || 150,
      saveData: connection.saveData || false
    };

    return this.connectionInfo;
  }

  /**
   * Check if connection is slow (Delta/Upper Egypt typical)
   */
  static isSlowConnection(): boolean {
    const info = this.getConnectionInfo();
    return (
      info.effectiveType === '3g' ||
      info.effectiveType === '2g' ||
      info.effectiveType === 'slow-2g' ||
      info.downlink < this.SLOW_CONNECTION_THRESHOLD ||
      info.saveData // User explicitly requested data saving
    );
  }

  /**
   * Check if connection is fast (Cairo/Alexandria typical)
   */
  static isFastConnection(): boolean {
    const info = this.getConnectionInfo();
    return (
      info.effectiveType === '4g' &&
      info.downlink >= this.FAST_CONNECTION_THRESHOLD &&
      !info.saveData
    );
  }

  /**
   * Load cutting optimization algorithm based on connection speed
   */
  static async loadOptimizer(): Promise<any> {
    const isSlow = this.isSlowConnection();
    
    console.log(`[EgyptianStrategy] Loading optimizer for ${isSlow ? 'slow' : 'fast'} connection`);
    
    if (isSlow) {
      // For Delta workshops, use TypeScript-only optimizer (smaller, local)
      return import('@/algorithms/RemnantFirstGeneticOptimizer');
    } else {
      // For Cairo workshops with good connection, can use Python client
      return import('@/lib/api/pythonHeavyClient');
    }
  }

  /**
   * Lazy load TensorFlow.js based on connection
   */
  static async loadTensorFlow(): Promise<any> {
    const isSlow = this.isSlowConnection();
    
    if (isSlow) {
      // On slow connections, warn user before loading 2.9 MB
      const shouldLoad = await this.confirmHeavyLoad('TensorFlow ML features', '2.9 MB');
      if (!shouldLoad) {
        throw new Error('User cancelled TensorFlow load on slow connection');
      }
    }
    
    console.log('[EgyptianStrategy] Loading TensorFlow.js...');
    return import('@tensorflow/tfjs');
  }

  /**
   * Lazy load Three.js based on connection
   */
  static async loadThreeJS(): Promise<any> {
    const isSlow = this.isSlowConnection();
    
    if (isSlow) {
      // On slow connections, warn user before loading 2.1 MB
      const shouldLoad = await this.confirmHeavyLoad('3D visualization', '2.1 MB');
      if (!shouldLoad) {
        throw new Error('User cancelled Three.js load on slow connection');
      }
    }
    
    console.log('[EgyptianStrategy] Loading Three.js...');
    return import('three');
  }

  /**
   * Lazy load Excel export based on connection
   */
  static async loadExcelJS(): Promise<any> {
    const isSlow = this.isSlowConnection();
    
    if (isSlow) {
      // On slow connections, warn user before loading 916 KB
      const shouldLoad = await this.confirmHeavyLoad('Excel export', '916 KB');
      if (!shouldLoad) {
        throw new Error('User cancelled ExcelJS load on slow connection');
      }
    }
    
    console.log('[EgyptianStrategy] Loading ExcelJS...');
    return import('exceljs');
  }

  /**
   * Lazy load Maps based on connection
   */
  static async loadMapLibre(): Promise<any> {
    const isSlow = this.isSlowConnection();
    
    if (isSlow) {
      // On slow connections, warn user before loading 743 KB
      const shouldLoad = await this.confirmHeavyLoad('service coverage map', '743 KB');
      if (!shouldLoad) {
        throw new Error('User cancelled MapLibre load on slow connection');
      }
    }
    
    console.log('[EgyptianStrategy] Loading MapLibre...');
    return import('maplibre-gl');
  }

  /**
   * Confirm heavy load with user on slow connections
   */
  private static async confirmHeavyLoad(featureName: string, size: string): Promise<boolean> {
    // Check if user has previously dismissed warnings
    const dismissedKey = `egyptian-loading-dismissed-${featureName}`;
    if (localStorage.getItem(dismissedKey) === 'true') {
      return true;
    }

    // In production, this would show a proper dialog
    // For now, we'll just log and return true
    console.warn(
      `[EgyptianStrategy] Slow connection detected. Loading ${featureName} (${size}). ` +
      `This may take time on 3G connection.`
    );
    
    // Could implement a proper confirmation dialog here
    // For now, always proceed but log the warning
    return true;
  }

  /**
   * Preload critical assets for Egyptian workshops
   * Called after initial page load to prepare for offline use
   */
  static async preloadCriticalAssets(): Promise<void> {
    const isSlow = this.isSlowConnection();
    
    if (isSlow) {
      console.log('[EgyptianStrategy] Slow connection - deferring preload');
      return;
    }

    console.log('[EgyptianStrategy] Preloading critical assets for offline use...');
    
    // Preload optimizer (small, essential)
    try {
      await this.loadOptimizer();
    } catch (error) {
      console.error('[EgyptianStrategy] Failed to preload optimizer:', error);
    }
    
    // Don't preload heavy features (3D, ML) - load on demand only
  }

  /**
   * Get recommended chunk loading strategy
   */
  static getChunkLoadingStrategy(): {
    preload: string[];
    defer: string[];
    skip: string[];
  } {
    const isSlow = this.isSlowConnection();
    
    if (isSlow) {
      return {
        preload: ['react-core', 'react-router', 'fabricator-core'],
        defer: ['charts-vendor', 'fabricator-algorithms', 'fabricator-inventory'],
        skip: ['three-vendor', 'three-ecosystem-vendor', 'ml-vendor', 'maps-vendor']
      };
    }
    
    return {
      preload: ['react-core', 'react-router', 'fabricator-core', 'fabricator-algorithms'],
      defer: ['three-vendor', 'ml-vendor', 'maps-vendor'],
      skip: []
    };
  }

  /**
   * Log connection info for analytics
   */
  static logConnectionInfo(): void {
    const info = this.getConnectionInfo();
    console.log('[EgyptianStrategy] Connection Info:', {
      type: info.effectiveType,
      speed: `${info.downlink} Mbps`,
      latency: `${info.rtt} ms`,
      dataSaver: info.saveData,
      classification: this.isSlowConnection() ? 'Slow (Delta)' : 
                     this.isFastConnection() ? 'Fast (Cairo)' : 'Moderate'
    });
  }
}

// Initialize and log connection info on module load
if (typeof window !== 'undefined') {
  EgyptianLoadingStrategy.logConnectionInfo();
  
  // Listen for connection changes
  // @ts-expect-error - NetworkInformation API not in TypeScript types
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    connection.addEventListener('change', () => {
      console.log('[EgyptianStrategy] Connection changed');
      EgyptianLoadingStrategy.logConnectionInfo();
    });
  }
}


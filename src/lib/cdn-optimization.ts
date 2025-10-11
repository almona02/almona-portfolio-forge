// Advanced CDN and Global Performance Optimization
// Handles dynamic content delivery, image optimization, and regional caching

import React from 'react';
import { performanceMonitor } from './performance-monitoring';

// CDN Configuration for Global Delivery
export interface CDNConfig {
  regions: {
    [key: string]: {
      endpoint: string;
      priority: number;
      latencyThreshold: number;
    };
  };
  imageOptimization: {
    formats: ('webp' | 'avif' | 'jpeg' | 'png')[];
    qualities: { [key: string]: number };
    sizes: number[];
  };
  caching: {
    staticAssets: number;
    apiResponses: number;
    images: number;
    fonts: number;
  };
}

const DEFAULT_CDN_CONFIG: CDNConfig = {
  regions: {
    'middle-east': {
      endpoint: 'https://me-cdn.almona.com',
      priority: 1,
      latencyThreshold: 200
    },
    'europe': {
      endpoint: 'https://eu-cdn.almona.com',
      priority: 2,
      latencyThreshold: 150
    },
    'global': {
      endpoint: 'https://global-cdn.almona.com',
      priority: 3,
      latencyThreshold: 300
    }
  },
  imageOptimization: {
    formats: ['avif', 'webp', 'jpeg'],
    qualities: {
      'thumbnail': 60,
      'medium': 75,
      'high': 85,
      'original': 95
    },
    sizes: [320, 640, 1024, 1920, 2560]
  },
  caching: {
    staticAssets: 31536000, // 1 year
    apiResponses: 300,      // 5 minutes
    images: 2592000,        // 30 days
    fonts: 31536000         // 1 year
  }
};

// Global Performance Optimizer
export class GlobalPerformanceOptimizer {
  private config: CDNConfig;
  private userRegion: string = 'global';
  private connectionSpeed: string = '4g';
  private deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  
  constructor(config?: Partial<CDNConfig>) {
    this.config = { ...DEFAULT_CDN_CONFIG, ...config };
    this.detectUserContext();
  }

  // Detect user context for optimization
  private detectUserContext() {
    if (typeof window === 'undefined') return;

    // Detect region from timezone or IP (simplified)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.includes('Cairo') || timezone.includes('Istanbul')) {
      this.userRegion = 'middle-east';
    } else if (timezone.includes('Europe')) {
      this.userRegion = 'europe';
    }

    // Detect connection speed
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      this.connectionSpeed = connection.effectiveType || '4g';
    }

    // Detect device type
    const width = window.innerWidth;
    if (width < 768) {
      this.deviceType = 'mobile';
    } else if (width < 1024) {
      this.deviceType = 'tablet';
    } else {
      this.deviceType = 'desktop';
    }
  }

  // Get optimal CDN endpoint
  public getOptimalCDNEndpoint(): string {
    const regionConfig = this.config.regions[this.userRegion];
    return regionConfig?.endpoint || this.config.regions['global'].endpoint;
  }

  // Optimize image loading based on context
  public optimizeImage(src: string, options?: {
    width?: number;
    quality?: 'thumbnail' | 'medium' | 'high' | 'original';
    format?: 'auto' | 'webp' | 'avif' | 'jpeg';
    lazy?: boolean;
  }): {
    src: string;
    srcSet: string;
    loading: 'lazy' | 'eager';
    decoding: 'async' | 'sync';
  } {
    const {
      width,
      quality = 'medium',
      format = 'auto',
      lazy = true
    } = options || {};

    const cdnEndpoint = this.getOptimalCDNEndpoint();
    const imageQuality = this.config.imageOptimization.qualities[quality];
    
    // Determine optimal format based on browser support
    let optimalFormat = 'jpeg';
    if (format === 'auto') {
      if (this.supportsFormat('avif')) {
        optimalFormat = 'avif';
      } else if (this.supportsFormat('webp')) {
        optimalFormat = 'webp';
      }
    } else if (format !== 'auto') {
      optimalFormat = format;
    }

    // Determine optimal size based on device and connection
    let optimalWidth = width;
    if (!optimalWidth) {
      switch (this.deviceType) {
        case 'mobile':
          optimalWidth = this.connectionSpeed === 'slow-2g' || this.connectionSpeed === '2g' ? 320 : 640;
          break;
        case 'tablet':
          optimalWidth = 1024;
          break;
        case 'desktop':
          optimalWidth = this.connectionSpeed === 'slow-2g' || this.connectionSpeed === '2g' ? 1024 : 1920;
          break;
      }
    }

    // Generate optimized URLs
    const baseUrl = `${cdnEndpoint}/images/${src}`;
    const optimizedSrc = `${baseUrl}?format=${optimalFormat}&quality=${imageQuality}&width=${optimalWidth}`;
    
    // Generate srcSet for responsive images
    const srcSet = this.config.imageOptimization.sizes
      .filter(size => size <= (optimalWidth! * 2)) // Up to 2x for retina
      .map(size => `${baseUrl}?format=${optimalFormat}&quality=${imageQuality}&width=${size} ${size}w`)
      .join(', ');

    return {
      src: optimizedSrc,
      srcSet,
      loading: lazy ? 'lazy' : 'eager',
      decoding: 'async'
    };
  }

  // Preload critical resources
  public preloadCriticalResources(resources: Array<{
    href: string;
    as: 'style' | 'script' | 'font' | 'image';
    crossorigin?: boolean;
    type?: string;
  }>) {
    if (typeof document === 'undefined') return;

    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.crossorigin ? this.getOptimalCDNEndpoint() + resource.href : resource.href;
      link.as = resource.as;
      
      if (resource.crossorigin) {
        link.crossOrigin = 'anonymous';
      }
      
      if (resource.type) {
        link.type = resource.type;
      }

      document.head.appendChild(link);
    });
  }

  // Preconnect to external domains
  public preconnectToDomains(domains: string[]) {
    if (typeof document === 'undefined') return;

    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  // Optimize 3D model loading
  public optimize3DModel(modelUrl: string, options?: {
    quality: 'low' | 'medium' | 'high';
    compression: boolean;
    progressive: boolean;
  }): {
    url: string;
    preloadStrategy: 'eager' | 'lazy' | 'progressive';
  } {
    const { quality = 'medium', compression = true, progressive = true } = options || {};
    
    const cdnEndpoint = this.getOptimalCDNEndpoint();
    let optimizedUrl = `${cdnEndpoint}/models/${modelUrl}`;
    
    // Apply optimization parameters
    const params = new URLSearchParams();
    
    // Quality-based optimization
    switch (quality) {
      case 'low':
        params.append('simplify', '0.5');
        params.append('texture_size', '512');
        break;
      case 'medium':
        params.append('simplify', '0.8');
        params.append('texture_size', '1024');
        break;
      case 'high':
        params.append('texture_size', '2048');
        break;
    }

    // Compression
    if (compression) {
      params.append('compression', 'gzip');
    }

    // Progressive loading
    if (progressive) {
      params.append('progressive', 'true');
    }

    // Connection-based optimization
    if (this.connectionSpeed === 'slow-2g' || this.connectionSpeed === '2g') {
      params.append('lod', 'low'); // Level of Detail
      params.append('texture_compression', 'high');
    }

    optimizedUrl += `?${params.toString()}`;

    return {
      url: optimizedUrl,
      preloadStrategy: this.connectionSpeed === '4g' ? 'eager' : 'lazy'
    };
  }

  // Service Worker caching strategy
  public generateCacheStrategy(): {
    precache: string[];
    runtimeCache: Array<{
      pattern: RegExp;
      strategy: string;
      options: any;
    }>;
  } {
    return {
      precache: [
        '/index.html',
        '/manifest.json',
        '/fonts/inter.woff2',
        '/icons/pwa-192x192.png'
      ],
      runtimeCache: [
        {
          pattern: /^https:\/\/.*\.almona\.com\/images\/.*/,
          strategy: 'CacheFirst',
          options: {
            cacheName: 'images-cache',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: this.config.caching.images
            }
          }
        },
        {
          pattern: /^https:\/\/.*\.almona\.com\/api\/.*/,
          strategy: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: this.config.caching.apiResponses
            },
            networkTimeoutSeconds: 10
          }
        },
        {
          pattern: /^https:\/\/.*\.almona\.com\/models\/.*/,
          strategy: 'CacheFirst',
          options: {
            cacheName: '3d-models-cache',
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 2592000 // 30 days
            }
          }
        }
      ]
    };
  }

  // Monitor performance impact
  public measureOptimizationImpact<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return performanceMonitor.measureOperation(
      `cdn_optimization_${operationName}`,
      operation
    );
  }

  // Check browser format support
  private supportsFormat(format: string): boolean {
    if (typeof document === 'undefined') return false;

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      switch (format) {
        case 'webp':
          return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        case 'avif':
          return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
        default:
          return true;
      }
    } catch {
      return false;
    }
  }

  // Get performance recommendations
  public getPerformanceRecommendations(): Array<{
    type: 'critical' | 'high' | 'medium' | 'low';
    recommendation: string;
    impact: string;
    implementation: string;
  }> {
    const recommendations = [];

    // Connection-based recommendations
    if (this.connectionSpeed === 'slow-2g' || this.connectionSpeed === '2g') {
      recommendations.push({
        type: 'critical' as const,
        recommendation: 'Enable aggressive compression and reduce image quality',
        impact: 'Significant load time improvement for slow connections',
        implementation: 'Automatically applied based on connection detection'
      });
    }

    // Device-based recommendations
    if (this.deviceType === 'mobile') {
      recommendations.push({
        type: 'high' as const,
        recommendation: 'Prioritize above-the-fold content and defer non-critical resources',
        impact: 'Faster perceived loading on mobile devices',
        implementation: 'Implement progressive loading strategy'
      });
    }

    // Regional recommendations
    if (this.userRegion !== 'global') {
      recommendations.push({
        type: 'medium' as const,
        recommendation: `Use regional CDN endpoint for ${this.userRegion}`,
        impact: 'Reduced latency through geographic proximity',
        implementation: 'Route requests through nearest data center'
      });
    }

    return recommendations;
  }

  // Apply dynamic optimizations
  public applyDynamicOptimizations() {
    // Preconnect to optimal CDN
    this.preconnectToDomains([this.getOptimalCDNEndpoint()]);

    // Preload critical resources
    this.preloadCriticalResources([
      { href: '/fonts/inter-var.woff2', as: 'font', crossorigin: true, type: 'font/woff2' },
      { href: '/styles/critical.css', as: 'style' },
      { href: '/scripts/critical.js', as: 'script' }
    ]);

    // Apply connection-aware optimizations
    if (this.connectionSpeed === 'slow-2g' || this.connectionSpeed === '2g') {
      this.enableDataSaver();
    }

    // Log optimization application
    performanceMonitor.recordFeatureUsage(
      'cdn_optimization',
      'applied_optimizations',
      true,
      {
        region: this.userRegion,
        connection: this.connectionSpeed,
        device: this.deviceType
      }
    );
  }

  // Enable data saver mode for slow connections
  private enableDataSaver() {
    if (typeof document === 'undefined') return;

    // Add data saver class to document
    document.documentElement.classList.add('data-saver');

    // Disable auto-playing media
    const videos = document.querySelectorAll('video[autoplay]');
    videos.forEach(video => {
      (video as HTMLVideoElement).autoplay = false;
    });

    // Reduce animation quality
    document.documentElement.style.setProperty('--animation-duration', '0.1s');
  }

  // Generate cache headers for different resource types
  public generateCacheHeaders(resourceType: 'image' | 'font' | 'script' | 'style' | 'api'): Record<string, string> {
    const cacheSettings = {
      image: {
        'Cache-Control': `public, max-age=${this.config.caching.images}, immutable`,
        'Vary': 'Accept-Encoding',
        'Content-Type': 'image/*'
      },
      font: {
        'Cache-Control': `public, max-age=${this.config.caching.fonts}, immutable`,
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'font/*'
      },
      script: {
        'Cache-Control': `public, max-age=${this.config.caching.staticAssets}, immutable`,
        'Content-Type': 'application/javascript'
      },
      style: {
        'Cache-Control': `public, max-age=${this.config.caching.staticAssets}, immutable`,
        'Content-Type': 'text/css'
      },
      api: {
        'Cache-Control': `public, max-age=${this.config.caching.apiResponses}`,
        'Vary': 'Accept-Encoding, Accept-Language',
        'Content-Type': 'application/json'
      }
    };

    return cacheSettings[resourceType];
  }
}

// React hooks for performance optimization
export const useGlobalOptimization = () => {
  const [optimizer] = useState(() => new GlobalPerformanceOptimizer());
  const [isOptimized, setIsOptimized] = useState(false);

  useEffect(() => {
    if (!isOptimized) {
      optimizer.applyDynamicOptimizations();
      setIsOptimized(true);
    }
  }, [optimizer, isOptimized]);

  const optimizeImage = (src: string, options?: any) => 
    optimizer.optimizeImage(src, options);

  const optimize3DModel = (modelUrl: string, options?: any) =>
    optimizer.optimize3DModel(modelUrl, options);

  const getRecommendations = () =>
    optimizer.getPerformanceRecommendations();

  return {
    optimizeImage,
    optimize3DModel,
    getRecommendations,
    isOptimized
  };
};

// Performance-aware image component
export const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: 'thumbnail' | 'medium' | 'high' | 'original';
  priority?: boolean;
  className?: string;
  onClick?: () => void;
}> = ({ src, alt, width, height, quality = 'medium', priority = false, className, onClick }) => {
  const { optimizeImage } = useGlobalOptimization();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const optimizedProps = optimizeImage(src, {
    width,
    quality,
    lazy: !priority
  });

  useEffect(() => {
    // Track image loading performance
    const startTime = performance.now();
    
    return () => {
      if (isLoaded) {
        const loadTime = performance.now() - startTime;
        performanceMonitor.recordFeatureUsage(
          'image_optimization',
          'image_loaded',
          true,
          { loadTime, quality, width }
        );
      }
    };
  }, [isLoaded, quality, width]);

  return React.createElement('div', {
    className: `relative ${className || ''}`,
    onClick: onClick
  },
    React.createElement('img', {
      src: optimizedProps.src,
      srcSet: optimizedProps.srcSet,
      alt: alt,
      width: width,
      height: height,
      loading: optimizedProps.loading,
      decoding: optimizedProps.decoding,
      onLoad: () => setIsLoaded(true),
      onError: () => setHasError(true),
      className: `transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      } ${hasError ? 'bg-gray-200' : ''}`
    }),
    !isLoaded && !hasError && React.createElement('div', {
      className: "absolute inset-0 bg-almona-dark/40 animate-pulse rounded"
    }),
    hasError && React.createElement('div', {
      className: "absolute inset-0 bg-gray-200 flex items-center justify-center text-gray-500 text-sm"
    }, "Image unavailable")
  );
};

// Global performance singleton
export const globalOptimizer = new GlobalPerformanceOptimizer();

// Export utility functions
export const applyGlobalOptimizations = () => {
  globalOptimizer.applyDynamicOptimizations();
};

export const getOptimalCDN = () => {
  return globalOptimizer.getOptimalCDNEndpoint();
};

export default globalOptimizer;

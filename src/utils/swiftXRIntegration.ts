/**
 * SwiftXR Native App Integration
 * Handles deep linking to native SwiftXR iOS app with intelligent fallbacks
 */

export interface SwiftXRLaunchOptions {
  modelName?: string;
  modelUrl?: string;
  modelPath?: string;
  fallbackToWebXR?: boolean;
  onSuccess?: () => void;
  onFallback?: () => void;
  onError?: (error: Error) => void;
}

export interface SwiftXRDetectionResult {
  isInstalled: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  canLaunch: boolean;
}

/**
 * Detect if SwiftXR app is installed and can be launched
 */
export async function detectSwiftXR(): Promise<SwiftXRDetectionResult> {
  const platform = detectPlatform();
  
  if (platform !== 'ios') {
    return {
      isInstalled: false,
      platform,
      canLaunch: false
    };
  }

  // Try to detect app installation using iframe technique
  const isInstalled = await checkAppInstalled();
  
  return {
    isInstalled,
    platform,
    canLaunch: isInstalled
  };
}

/**
 * Launch SwiftXR native app with model
 */
export async function launchSwiftXR(options: SwiftXRLaunchOptions): Promise<boolean> {
  const {
    modelName,
    modelUrl,
    modelPath,
    fallbackToWebXR = true,
    onSuccess,
    onFallback,
    onError
  } = options;

  try {
    // Determine model identifier
    const modelIdentifier = modelName || extractModelName(modelPath || modelUrl || 'fr222');
    
    // Build deep link URL
    const deepLinkUrl = buildDeepLinkUrl(modelIdentifier, modelUrl || modelPath);
    
    // Attempt to launch app
    const launched = await attemptAppLaunch(deepLinkUrl);
    
    if (launched) {
      onSuccess?.();
      return true;
    }
    
    // Fallback if app not installed
    if (fallbackToWebXR) {
      console.log('SwiftXR app not detected, falling back to WebXR');
      onFallback?.();
      return false;
    }
    
    throw new Error('SwiftXR app not available');
    
  } catch (error) {
    console.error('SwiftXR launch failed:', error);
    onError?.(error as Error);
    
    if (fallbackToWebXR) {
      onFallback?.();
    }
    
    return false;
  }
}

/**
 * Build deep link URL for SwiftXR app
 * Format: swiftxr://model?name=MODEL_NAME&url=MODEL_URL
 */
function buildDeepLinkUrl(modelName: string, modelUrl?: string): string {
  const baseUrl = `swiftxr://model?name=${encodeURIComponent(modelName)}`;
  
  if (modelUrl) {
    const fullModelUrl = modelUrl.startsWith('http') 
      ? modelUrl 
      : `${window.location.origin}${modelUrl}`;
    return `${baseUrl}&url=${encodeURIComponent(fullModelUrl)}`;
  }
  
  return baseUrl;
}

/**
 * Attempt to launch the app using multiple techniques
 */
async function attemptAppLaunch(deepLinkUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = 2000; // 2 second timeout
    
    // Track if page becomes hidden (app likely opened)
    const handleVisibilityChange = () => {
      if (document.hidden && !resolved) {
        resolved = true;
        resolve(true);
        cleanup();
      }
    };
    
    // Track if page loses focus (app likely opened)
    const handleBlur = () => {
      if (!resolved) {
        resolved = true;
        resolve(true);
        cleanup();
      }
    };
    
    const cleanup = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
    
    // Set up listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    
    // Try multiple launch methods
    try {
      // Method 1: window.location (most reliable on iOS)
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLinkUrl;
      document.body.appendChild(iframe);
      
      // Method 2: window.open (fallback)
      setTimeout(() => {
        window.open(deepLinkUrl, '_blank');
      }, 100);
      
      // Method 3: window.location.href (last resort)
      setTimeout(() => {
        if (!resolved) {
          window.location.href = deepLinkUrl;
        }
      }, 200);
      
    } catch (error) {
      console.warn('SwiftXR launch method failed:', error);
    }
    
    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(false);
      }
    }, timeout);
  });
}

/**
 * Check if SwiftXR app is installed using iframe technique
 */
function checkAppInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    
    let resolved = false;
    const timeout = 1500;
    
    const cleanup = () => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    };
    
    // If iframe loads, app is likely not installed
    iframe.onload = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(false);
      }
    };
    
    // If page loses focus, app likely opened
    const handleBlur = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(true);
      }
      window.removeEventListener('blur', handleBlur);
    };
    
    window.addEventListener('blur', handleBlur);
    
    iframe.src = 'swiftxr://check';
    document.body.appendChild(iframe);
    
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        window.removeEventListener('blur', handleBlur);
        resolve(false);
      }
    }, timeout);
  });
}

/**
 * Extract model name from path or URL
 */
function extractModelName(pathOrUrl: string): string {
  // Extract filename without extension
  const match = pathOrUrl.match(/\/([^\/]+)\.(glb|gltf)$/i);
  if (match) {
    return match[1];
  }
  
  // Fallback to last segment
  const segments = pathOrUrl.split('/');
  const lastSegment = segments[segments.length - 1];
  return lastSegment.replace(/\.(glb|gltf)$/i, '') || 'fr222';
}

/**
 * Detect current platform
 */
function detectPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
    return 'ios';
  }
  
  if (/android/i.test(ua)) {
    return 'android';
  }
  
  return 'desktop';
}

/**
 * Check if device supports native AR
 */
export function supportsNativeAR(): boolean {
  const platform = detectPlatform();
  return platform === 'ios' || platform === 'android';
}

/**
 * Get recommended AR method for current device
 */
export function getRecommendedARMethod(): 'swiftxr' | 'webxr' | 'sceneviewer' | 'quicklook' | 'none' {
  const platform = detectPlatform();
  
  if (platform === 'ios') {
    return 'swiftxr'; // Prioritize native SwiftXR on iOS
  }
  
  if (platform === 'android') {
    return 'sceneviewer'; // Use Scene Viewer on Android
  }
  
  return 'webxr'; // Fallback to WebXR on desktop
}

/**
 * Launch with intelligent fallback chain
 */
export async function launchARWithFallback(
  modelPath: string,
  modelName?: string,
  options?: {
    preferNative?: boolean;
    onMethodChange?: (method: string) => void;
  }
): Promise<boolean> {
  const { preferNative = true, onMethodChange } = options || {};
  const platform = detectPlatform();
  
  // iOS: Try SwiftXR first, then Quick Look, then WebXR
  if (platform === 'ios' && preferNative) {
    onMethodChange?.('swiftxr');
    const swiftXRResult = await launchSwiftXR({
      modelName: modelName || extractModelName(modelPath),
      modelPath,
      fallbackToWebXR: true,
      onFallback: () => {
        // Try Quick Look as intermediate fallback
        onMethodChange?.('quicklook');
        launchQuickLook(modelPath);
      }
    });
    
    if (swiftXRResult) {
      return true;
    }
  }
  
  // Android: Try Scene Viewer first, then WebXR
  if (platform === 'android') {
    onMethodChange?.('sceneviewer');
    try {
      launchSceneViewer(modelPath, modelName);
      return true;
    } catch (error) {
      console.warn('Scene Viewer failed, trying WebXR:', error);
    }
  }
  
  // Final fallback: WebXR
  onMethodChange?.('webxr');
  return launchWebXR(modelPath);
}

/**
 * Launch Quick Look (iOS native AR)
 */
function launchQuickLook(modelPath: string): void {
  const usdzPath = modelPath.replace(/\.glb$/i, '.usdz');
  const link = document.createElement('a');
  link.href = usdzPath;
  link.rel = 'ar';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 100);
}

/**
 * Launch Scene Viewer (Android native AR)
 */
function launchSceneViewer(modelPath: string, modelName?: string): void {
  const url = new URL(modelPath, window.location.origin).toString();
  const sceneViewerUrl = `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(url)}&mode=ar_preferred&title=${encodeURIComponent(modelName || '3D Model')}`;
  window.location.href = sceneViewerUrl;
}

/**
 * Launch WebXR (browser-based AR)
 */
async function launchWebXR(modelPath: string): Promise<boolean> {
  if (!('xr' in navigator)) {
    throw new Error('WebXR not supported');
  }
  
  try {
    const xr = (navigator as any).xr;
    const supported = await xr.isSessionSupported('immersive-ar');
    
    if (!supported) {
      throw new Error('Immersive AR not supported');
    }
    
    // This would integrate with your existing WebXR renderer
    console.log('Launching WebXR for:', modelPath);
    return true;
  } catch (error) {
    throw new Error(`WebXR launch failed: ${error}`);
  }
}

// All functions are already exported above with 'export' keyword
// Default export for convenience (optional)
export default {
  detectSwiftXR,
  launchSwiftXR,
  launchARWithFallback,
  supportsNativeAR,
  getRecommendedARMethod
};


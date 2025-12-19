// CRITICAL: Import React FIRST to ensure it's available before any other code
import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
// Ensure React is fully loaded before importing anything else
if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
  throw new Error('React or ReactDOM failed to load');
}
// Service worker registration is handled by VitePWA plugin
import "./index.css";
import { initializePerformanceMonitoring } from "./lib/performance";
import { initializePolyfills } from "./lib/polyfills";
import "./styles/mobile-scaling.css";

// Initialize i18n BEFORE any component uses useTranslation
import "@/lib/i18n";

// Set initial dir/lang attributes early
try {
  const lng = (navigator.languages?.[0]) || navigator.language || 'en';
  const isRTL = ['ar', 'he', 'fa', 'ur'].some(code => lng.toLowerCase().startsWith(code));
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lng.split('-')[0];
} catch {
  // Safe fallback for dir/lang setup
}

// Simplified error boundary for better performance
class CriticalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Critical application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8 max-w-md">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              Application Error
            </h1>
            <p className="text-muted-foreground mb-6">
              Something went wrong. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
            {(import.meta as any).env?.DEV && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// PHASE 1.7: Main Thread Optimization - Deferred initialization
// Performance monitoring start time
const startTime = performance.now();

// Initialize polyfills and performance monitoring
// CRITICAL: Only initialize what's needed for initial render
try {
  // Critical: Initialize polyfills synchronously (needed for app to work)
  initializePolyfills();
  
  // Critical: Initialize performance monitoring (lightweight)
  initializePerformanceMonitoring();
  
  // PHASE 1.7: Deferred non-critical initialization
  const initializeNonCriticalFeatures = () => {
    const features = [
      initializeDeferredAnalytics,
      initializeBackgroundTasks,
      initializeCacheWarming,
      initializeWebWorkers
    ];
    
    features.forEach(fn => {
      try {
        fn();
      } catch (error) {
        const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
        if (isDev) {
          console.warn('Non-critical feature failed:', error);
        }
      }
    });
  };
  
  // Defer non-critical initialization using requestIdleCallback or setTimeout
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(initializeNonCriticalFeatures, { timeout: 5000 });
  } else {
    // Fallback: Wait 3 seconds then initialize
    setTimeout(initializeNonCriticalFeatures, 3000);
  }
  
  // NON-CRITICAL: Defer everything else to avoid blocking initial render
  const deferNonCritical = () => {
    // Initialize critical CSS (deferred)
    import('./lib/criticalCSS').then(({ initializeCriticalCSS }) => {
      initializeCriticalCSS();
    }).catch(() => {
      // Non-critical, fail silently
    });
    
    // Preload critical Fabricator chunks (deferred)
    import('./lib/quickPerformance').then(({ quickPerformanceWins }) => {
      quickPerformanceWins.preloadCriticalChunks();
    }).catch(() => {
      // Non-critical, fail silently
    });
    
    // Initialize Web Vitals monitoring (deferred)
    const isProdEnv = (import.meta as any).env?.PROD || process.env.NODE_ENV === 'production';
    if (isProdEnv) {
      import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }: any) => {
        onCLS(() => {});
        onINP(() => {});
        onFCP(() => {});
        onLCP(() => {}); // Removed console.log for production
        onTTFB(() => {});
      }).catch(() => {
        // Non-critical, fail silently
      });
    }
  };
  
  // Defer non-critical initialization using requestIdleCallback or setTimeout
  if ('requestIdleCallback' in window) {
    requestIdleCallback(deferNonCritical, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(deferNonCritical, 100);
  }
} catch (error) {
  console.error('Failed to initialize polyfills or performance monitoring:', error);
}

// PHASE 1.7: Deferred Analytics - Load after critical rendering
const initializeDeferredAnalytics = () => {
  const isProd = (import.meta as any).env?.PROD || process.env.NODE_ENV === 'production';
  if (!isProd) return;
  
  // Google Analytics is already deferred in index.html
  // This is for any additional analytics setup
  
  // Log Egyptian connection info for monitoring
  const connection = (navigator as any).connection;
  const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
  if (connection && isDev) {
    console.log('Egypt Connection Info:', {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    });
  }
};

// PHASE 1.7: Background tasks for Egypt workflow
const initializeBackgroundTasks = () => {
  // Pre-fetch next likely Egypt workflow data
  setTimeout(() => {
    const userId = localStorage.getItem('almona_user_id');
    if (userId) {
      // Pre-fetch user's recent projects (low priority)
      // Note: priority API not widely supported, using headers instead
      fetch(`/api/egypt/users/${userId}/recent-projects`, {
        headers: { 'X-Prefetch': 'true' }
      }).catch(() => {
        // Ignore prefetch errors
      });
      
      // Pre-fetch common materials for Egypt (low priority)
      fetch('/api/egypt/materials/common', {
        headers: { 'X-Prefetch': 'true' }
      }).catch(() => {
        // Ignore prefetch errors
      });
    }
  }, 10000); // Wait 10 seconds
};

// PHASE 1.7: Cache warming for Egypt-specific assets
const initializeCacheWarming = () => {
  // Warm cache for Egypt workflow images (lazy loading)
  const imagesToWarm = [
    '/images/egypt-workflow-step1.webp',
    '/images/egypt-workflow-step2.webp',
    '/images/katra-pro-red-logo.webp',
    '/images/foxywin-logo.webp',
    '/images/caluminium-ps-logo.webp'
  ];
  
  imagesToWarm.forEach(src => {
    const img = new Image();
    img.src = src;
    img.loading = 'lazy';
    img.decoding = 'async';
  });
  
  // Pre-connect to likely next origins
  const origins = [
    'https://storage.supabase.co',
    'https://fonts.gstatic.com'
  ];
  
  origins.forEach(origin => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// PHASE 1.7: Initialize Web Workers for heavy computation
const initializeWebWorkers = () => {
  // Check if Web Workers are supported
  if (!window.Worker) {
    const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log('Web Workers not supported, falling back to main thread');
    }
    return;
  }
  
  // Pre-load worker URLs (Vite will handle the actual worker files)
  // This is just for documentation - actual worker initialization happens on demand
  const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
  if (isDev) {
    console.log('[Almona Egypt] Web Workers ready for optimization algorithms');
  }
};

// Performance monitoring - Load web-vitals only in production (deferred)
// Note: This is already handled in deferNonCritical above, so we skip duplicate initialization here

// Report bundle loading issues
window.addEventListener('error', (event) => {
  if (event.error && event.error.message.includes('chunk')) {
    console.error('Chunk loading failed:', event.error);
    // Optionally reload the page if chunk error persists
    if (!window.location.href.includes('chunk-error')) {
      // Mark that we've tried to reload to prevent infinite loop
      const reloadKey = 'chunk-error-reload-attempted';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, 'true');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  }
}, true);

// Global error handler for unhandled Supabase auth errors and browser extension errors
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  const errorMessage = error?.message || String(error || '');
  
  // Handle chunk loading errors
  if (errorMessage.includes('chunk') || errorMessage.includes('Failed to fetch dynamically imported module')) {
    console.error('Chunk loading error:', errorMessage);
    // Try to reload once
    const reloadKey = 'chunk-error-reload-attempted';
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, 'true');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    event.preventDefault();
    return;
  }
  
  // Suppress Supabase auth errors
  if (errorMessage.includes('refresh_token') || 
      errorMessage.includes('Invalid Refresh Token') ||
      errorMessage.includes('Refresh Token Not Found')) {
    console.warn('[Global] Supabase auth error detected:', errorMessage);
    event.preventDefault();
    return;
  }
  
  // Suppress browser extension communication errors
  if (errorMessage.includes('Could not establish connection') ||
      errorMessage.includes('Receiving end does not exist') ||
      errorMessage.includes('Extension context invalidated') ||
      errorMessage.includes('content-script') ||
      errorMessage.includes('chrome-extension://') ||
      errorMessage.includes('moz-extension://')) {
    // These are harmless browser extension errors - suppress them
    const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
    if (isDev) {
      console.debug('[Suppressed] Browser extension error:', errorMessage);
    }
    event.preventDefault();
    return;
  }
});

// Global error handler to suppress external resource loading errors
// (e.g., from browser extensions, third-party scripts, or analytics services)
const externalDomains = [
  'reasonlabsapi.com',
  'ab.reasonlabsapi.com',
  'connect.facebook.net',
  'www.googletagmanager.com',
  'www.google-analytics.com',
];

window.addEventListener('error', (event) => {
  const target = event.target as HTMLElement;
  const isExternalResource = target && (
    (target.tagName === 'SCRIPT' && (target as HTMLScriptElement).src) ||
    (target.tagName === 'LINK' && (target as HTMLLinkElement).href) ||
    (target.tagName === 'IMG' && (target as HTMLImageElement).src)
  );
  
  if (isExternalResource) {
    let url = '';
    if (target.tagName === 'SCRIPT') {
      url = (target as HTMLScriptElement).src || '';
    } else if (target.tagName === 'LINK') {
      url = (target as HTMLLinkElement).href || '';
    } else if (target.tagName === 'IMG') {
      url = (target as HTMLImageElement).src || '';
    }
    
    const isExternalDomain = externalDomains.some(domain => url.includes(domain));
    
    if (isExternalDomain) {
      // Suppress the error - it's from an external service and not critical
      event.preventDefault();
      if (import.meta.env.DEV) {
        // Only log in development for debugging
        console.debug('[Suppressed] External resource error:', url, event.message);
      }
      return false;
    }
  }
  
  // Check for HTTP2 protocol errors from external resources
  if (event.message && (
    event.message.includes('ERR_HTTP2_PROTOCOL_ERROR') ||
    event.message.includes('Failed to load resource')
  )) {
    const errorSource = (event.filename || event.message || '').toLowerCase();
    const isExternalError = externalDomains.some(domain => errorSource.includes(domain));
    
    if (isExternalError) {
      event.preventDefault();
      const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
      if (isDev) {
        console.debug('[Suppressed] External HTTP2 error:', errorSource);
      }
      return false;
    }
  }
  
  // Suppress browser extension content script errors
  if (event.filename && (
    event.filename.includes('content-script') ||
    event.filename.includes('chrome-extension://') ||
    event.filename.includes('moz-extension://')
  )) {
    event.preventDefault();
    const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
    if (isDev) {
      console.debug('[Suppressed] Browser extension error:', event.filename, event.message);
    }
    return false;
  }

  // Log unexpected errors with stack/position to aid release debugging
  console.error('[GlobalError]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  });
}, true); // Use capture phase to catch errors early

// Environment validation
const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
if (isDev) {
  console.log("🔧 Development mode active");
  const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const env = (import.meta as any).env || {};
  const missingEnvVars = requiredEnvVars.filter(envVar => !env[envVar]);
  if (missingEnvVars.length > 0) {
    console.warn('⚠️ Missing environment variables:', missingEnvVars);
  }
} else {
  console.log("🚀 Production mode active");
}

// Get root element and create React root
// FIX: Ensure DOM is ready before rendering to prevent white page
const renderApp = () => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("Root element not found. Check your index.html file.");
    // Show error message to user
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #0d0f12; color: white; font-family: system-ui;">
        <div style="text-align: center; padding: 2rem;">
          <h1>Application Error</h1>
          <p>Root element not found. Please refresh the page.</p>
          <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #f97316; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
            Refresh Page
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Create React root (with HMR support)
  let root = (rootElement as HTMLElement & { _reactRootContainer?: ReactDOM.Root })._reactRootContainer;
  if (!root) {
    root = ReactDOM.createRoot(rootElement);
    (rootElement as HTMLElement & { _reactRootContainer?: ReactDOM.Root })._reactRootContainer = root;
  }

  // Render application
  try {
    root.render(
      <React.StrictMode>
        <CriticalErrorBoundary>
          {/* @ts-expect-error - HelmetProvider types may be incorrect, but it works at runtime */}
          <HelmetProvider>
            <App />
          </HelmetProvider>
        </CriticalErrorBoundary>
      </React.StrictMode>
    );

    // Trigger fade-in animation
    requestAnimationFrame(() => {
      rootElement.classList.add('app-fade-enter-active');
      setTimeout(() => rootElement.classList.remove('app-fade-enter'), 300);
    });
  } catch (error) {
    console.error('Failed to render application:', error);
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #0d0f12; color: white; font-family: system-ui;">
        <div style="text-align: center; padding: 2rem;">
          <h1>Rendering Error</h1>
          <p>Failed to render application. Please refresh the page.</p>
          <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #f97316; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
            Refresh Page
          </button>
        </div>
      </div>
    `;
  }
};

// Ensure DOM is ready before rendering
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  // DOM is already ready
  renderApp();
}

// PHASE 1.7: Log initial load time for Egyptian users
// LCP FIX: Add LCP timeout protection
const LCP_TIMEOUT = 4000; // 4 seconds max for LCP

window.addEventListener('load', () => {
  const loadTime = performance.now() - startTime;
  const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
  if (isDev) {
    console.log(`[Almona Egypt] Initial load completed in ${Math.round(loadTime)}ms`);
  }
  
  // LCP timeout protection - ensure LCP doesn't block too long
  setTimeout(() => {
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      const lastLCP = lcpEntries[lcpEntries.length - 1];
      if (lastLCP.startTime > LCP_TIMEOUT) {
        console.warn(`[LCP Fix] LCP timeout detected: ${Math.round(lastLCP.startTime)}ms`);
        // Force any blocking images to switch to lazy loading
        const blockingImages = document.querySelectorAll('img[loading="eager"]:not([data-lcp-protected])');
        blockingImages.forEach((imgElement) => {
          const img = imgElement as HTMLImageElement;
          if (!img.complete) {
            img.loading = 'lazy';
            img.setAttribute('data-lcp-protected', 'true');
            const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
            if (isDev) {
              console.log('[LCP Fix] Switched blocking image to lazy:', img.src);
            }
          }
        });
      }
    }
  }, LCP_TIMEOUT);
  
  // Measure Time to Interactive
  setTimeout(() => {
    const tti = performance.now() - startTime;
    const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log(`[Almona Egypt] Time to Interactive ~${Math.round(tti)}ms`);
    }
    
    // Report to analytics if available
    if ((window as any).analytics) {
      (window as any).analytics.track('app_loaded', {
        load_time: Math.round(loadTime),
        tti: Math.round(tti),
        country: 'Egypt'
      });
    }
  }, 1000);
});

// PWA Service Worker Registration
// VitePWA with injectRegister: "auto" handles registration automatically
// This code provides user feedback and handles updates
const isProdEnv = (import.meta as any).env?.PROD || process.env.NODE_ENV === 'production';
if ('serviceWorker' in navigator && isProdEnv) {
  // Dynamic import with error handling - virtual module only exists in production
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true, // Register immediately
      onNeedRefresh() {
        // This runs when a new version is deployed
        if (confirm('تحديث جديد متاح. هل تريد التحديث الآن؟\nNew update available. Reload?')) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log('✅ App is ready for offline use.');
      },
      onRegistered(registration) {
        console.log('✅ Service Worker registered:', registration);
      },
      onRegisterError(error) {
        console.error('❌ Service Worker registration error:', error);
      },
    });
  }).catch((error) => {
    // Virtual module doesn't exist in dev mode - this is expected
    const isDev = (import.meta as any).env?.DEV || process.env.NODE_ENV === 'development';
    if (isDev) {
      // Silently ignore in dev mode
    } else {
      console.warn('[PWA] Failed to load service worker registration:', error);
    }
  });
}

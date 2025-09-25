import React from "react";
import ReactDOM from "react-dom/client";
// Initialize i18n BEFORE any component uses useTranslation to avoid
// "react-i18next:: useTranslation: You will need to pass in an i18next instance" warning
// This is a side-effect import that sets up i18next globally.
import "@/lib/i18n";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { registerServiceWorker, unregisterServiceWorker } from "./lib/serviceWorkerRegistration";
import { initializePerformanceMonitoring } from "./lib/performance";
import { initializePolyfills } from "./lib/polyfills";
import "./index.css";

// Set initial dir/lang attributes early based on i18n detection
try {
  const lng = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  const isRTL = ['ar', 'he', 'fa', 'ur'].some(code => lng.toLowerCase().startsWith(code));
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lng.split('-')[0];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (_err) {
  // no-op: safe best-effort dir/lang setup
}

// Critical error boundary for early errors - optimized for performance
class CriticalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  private errorReportingQueue: Array<{
    error: string;
    stack?: string;
    errorInfo: React.ErrorInfo;
    url: string;
    userAgent: string;
    timestamp: string;
  }> = [];
  private reportingTimeout: NodeJS.Timeout | null = null;

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Critical application error:', error, errorInfo);
    
    // Batch error reporting to reduce network overhead
    this.queueErrorReport({
      error: error.message,
      stack: error.stack,
      errorInfo,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  }

  private queueErrorReport = (errorData: {
    error: string;
    stack?: string;
    errorInfo: React.ErrorInfo;
    url: string;
    userAgent: string;
    timestamp: string;
  }) => {
    if (!import.meta.env.VITE_ERROR_REPORTING_ENDPOINT) return;
    
    this.errorReportingQueue.push(errorData);
    
    // Debounce error reporting to avoid multiple rapid requests
    if (this.reportingTimeout) {
      clearTimeout(this.reportingTimeout);
    }
    
    this.reportingTimeout = setTimeout(() => {
      this.flushErrorReports();
    }, 1000); // Wait 1 second before sending
  };

  private flushErrorReports = async () => {
    if (this.errorReportingQueue.length === 0) return;
    
    try {
      await fetch(import.meta.env.VITE_ERROR_REPORTING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errors: this.errorReportingQueue,
          batchSize: this.errorReportingQueue.length,
        }),
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      // Silent fail - don't let error reporting break the app
    } finally {
      this.errorReportingQueue = [];
      this.reportingTimeout = null;
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8 max-w-md">
            <h1 className="text-2xl font-bold text-destructive mb-4">
              Application Error
            </h1>
            <p className="text-muted-foreground mb-6">
              Something went wrong. Please refresh the page or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
            <div className="mt-4">
              <a
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Go to Homepage
              </a>
            </div>
            {import.meta.env.DEV && this.state.error && (
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

// (Removed transient chunk auto-recovery logic to let original errors surface for debugging.)

// Initialize polyfills and performance monitoring as early as possible
try {
  initializePolyfills();
  initializePerformanceMonitoring();
} catch (error) {
  console.error('Failed to initialize polyfills or performance monitoring:', error);
}

// Global error handler for unhandled Supabase auth errors
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  if (error?.message?.includes('refresh_token') || 
      error?.message?.includes('Invalid Refresh Token') ||
      error?.message?.includes('Refresh Token Not Found')) {
    console.warn('[Global] Supabase auth error detected:', error.message);
    // Prevent the error from being logged as unhandled
    event.preventDefault();
  }
});

// Validate environment and show warnings
if (import.meta.env.DEV) {
  console.log("🔧 Development mode active");
  console.log("📊 Performance monitoring enabled");
  
  // Check for required environment variables
  const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_KEY'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !import.meta.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.warn('⚠️ Missing environment variables:', missingEnvVars);
    console.warn('Some features may not work correctly. Check your .env file.');
  }
} else {
  // Production mode - just log that we're ready
  console.log("🚀 Production mode active");
}

// Get root element with error handling
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found. Check your index.html file.");
}

// Check if root already exists to prevent multiple createRoot calls
let root = (rootElement as any)._reactRootContainer;
if (!root) {
  root = ReactDOM.createRoot(rootElement);
  // Store reference to prevent duplicate calls
  (rootElement as any)._reactRootContainer = root;
} else {
  // If root exists, use the existing one (for hot module replacement)
  console.log('[React] Using existing root container');
}

// Render application with critical error boundary
root.render(
  <React.StrictMode>
    <CriticalErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </CriticalErrorBoundary>
  </React.StrictMode>
);

// Post-hydration: trigger fade-in transition
requestAnimationFrame(() => {
  rootElement.classList.add('app-fade-enter-active');
  // remove the setup class after transition to keep DOM clean
  setTimeout(() => rootElement.classList.remove('app-fade-enter'), 300);
});

// Alternative approach: fully disable SW unless explicitly enabled with VITE_ENABLE_SW=true
// Run this async to not block app initialization
setTimeout(() => {
  try {
    const ENABLE_SW = import.meta.env.VITE_ENABLE_SW === 'true';
    if (import.meta.env.PROD && ENABLE_SW) {
      registerServiceWorker();
    } else if (import.meta.env.PROD && !ENABLE_SW) {
      // Proactively unregister any existing SW to avoid stale caches/errors on Vercel
      unregisterServiceWorker();
      console.info('[SW] Disabled by config (VITE_ENABLE_SW != true). Unregistered and cleared caches.');
    } else if (!ENABLE_SW) {
      console.info('[SW] Registration skipped (VITE_ENABLE_SW not set to true).');
    }
  } catch (error) {
    console.error('Service worker init error:', error);
    // Don't let SW errors break the app
  }
}, 100);

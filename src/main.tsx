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
    } catch (e) {
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

// Global recovery for transient chunk load errors (e.g. after deploy with new hashes)
// Tries one silent reload to fetch the new build, then suppresses further reload loops.
if (typeof window !== 'undefined') {
  const recover = (msg) => {
    if (!msg) return;
    if (/ChunkLoadError|Loading chunk [\d]+ failed|dynamic import failed/i.test(msg)) {
      const already = sessionStorage.getItem('chunk-reloaded');
      if (!already) {
        sessionStorage.setItem('chunk-reloaded', '1');
        // Small delay to allow service worker to activate if updating
        setTimeout(() => window.location.reload(), 50);
      }
    }
  };
  window.addEventListener('error', (e) => recover(e?.message || (e?.error && e.error.message) || ''));
  window.addEventListener('unhandledrejection', (e) => {
    try {
      const msg = (e?.reason && (e.reason.message || e.reason.toString())) || '';
      recover(msg);
    } catch { /* ignore */ }
  });
}

// Initialize polyfills and performance monitoring as early as possible
try {
  initializePolyfills();
  initializePerformanceMonitoring();
} catch (error) {
  console.error('Failed to initialize polyfills or performance monitoring:', error);
}

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
}

// Get root element with error handling
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found. Check your index.html file.");
}

// Render application with critical error boundary
ReactDOM.createRoot(rootElement).render(
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

// Service worker handling
try {
  if (import.meta.env.PROD) {
    registerServiceWorker();
  } else {
    // Ensure no stale production SW controls the dev server (can break Vite module URLs like /src/pages/Services.tsx)
    unregisterServiceWorker();
    // Extra safety: if any active controllers remain, prompt a one-time reload after unregister
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        if (regs.length === 0) return;
        const flagged = sessionStorage.getItem('sw-dev-cleaned');
        if (!flagged) {
          sessionStorage.setItem('sw-dev-cleaned', '1');
          setTimeout(() => window.location.reload(), 100);
        }
      });
    }
  }
} catch (error) {
  console.error('Service worker handling error:', error);
}

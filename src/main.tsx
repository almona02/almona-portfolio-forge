import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { registerServiceWorker } from "./lib/serviceWorkerRegistration";
import { initializePerformanceMonitoring } from "./lib/performance";
import { initializePolyfills } from "./lib/polyfills";
import "./index.css";

// Critical error boundary for early errors
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
    
    // Send error to monitoring service if available
    if (import.meta.env.VITE_ERROR_REPORTING_ENDPOINT) {
      fetch(import.meta.env.VITE_ERROR_REPORTING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          errorInfo,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {}); // Silent fail
    }
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

// Register service worker with error handling
try {
  if (import.meta.env.PROD) {
    registerServiceWorker();
  } else if (import.meta.env.DEV) {
    console.log("🔧 Service worker available for testing in development");
    // Uncomment to test service worker in development
    // registerServiceWorker();
  }
} catch (error) {
  console.error('Failed to register service worker:', error);
}

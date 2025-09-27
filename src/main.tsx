import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { registerServiceWorker, unregisterServiceWorker } from "./lib/serviceWorkerRegistration";
import { initializePerformanceMonitoring } from "./lib/performance";
import { initializePolyfills } from "./lib/polyfills";
import "./index.css";

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

// Initialize polyfills and performance monitoring
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
    event.preventDefault();
  }
});

// Environment validation
if (import.meta.env.DEV) {
  console.log("🔧 Development mode active");
  const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_KEY'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !import.meta.env[envVar]);
  if (missingEnvVars.length > 0) {
    console.warn('⚠️ Missing environment variables:', missingEnvVars);
  }
} else {
  console.log("🚀 Production mode active");
}

// Get root element and create React root
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found. Check your index.html file.");
}

// Create React root (with HMR support)
let root = (rootElement as HTMLElement & { _reactRootContainer?: ReactDOM.Root })._reactRootContainer;
if (!root) {
  root = ReactDOM.createRoot(rootElement);
  (rootElement as HTMLElement & { _reactRootContainer?: ReactDOM.Root })._reactRootContainer = root;
}

// Render application
root.render(
  <React.StrictMode>
    <CriticalErrorBoundary>
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

// Service worker initialization (async to not block app)
setTimeout(() => {
  try {
    const ENABLE_SW = import.meta.env.VITE_ENABLE_SW === 'true';
    if (import.meta.env.PROD && ENABLE_SW) {
      registerServiceWorker();
    } else if (import.meta.env.PROD && !ENABLE_SW) {
      unregisterServiceWorker();
      console.info('[SW] Disabled by config. Unregistered and cleared caches.');
    }
  } catch (error) {
    console.error('Service worker init error:', error);
  }
}, 100);

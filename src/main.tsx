import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import { registerServiceWorker } from "./lib/serviceWorkerRegistration";
import { initializePerformanceMonitoring } from "./lib/performance";
import "./index.css";

// Initialize performance monitoring as early as possible
initializePerformanceMonitoring();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

// Register service worker and enable performance monitoring
if (import.meta.env.PROD) {
  registerServiceWorker();
} else if (import.meta.env.DEV) {
  // Enable service worker in development for testing
  console.log("🔧 Development mode: Service worker available for testing");
  // Uncomment to test service worker in development
  // registerServiceWorker();
}

// Performance monitoring for development insights
if (import.meta.env.DEV) {
  console.log("📊 Performance monitoring active in development mode");
}

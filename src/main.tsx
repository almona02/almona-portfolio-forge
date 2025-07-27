import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { registerServiceWorker } from './lib/serviceWorkerRegistration';
import { reportWebVitals } from './lib/performance';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

// Temporarily disable service worker registration for debugging
// Register service worker in production
// if (import.meta.env.PROD) {
//   registerServiceWorker();
//   reportWebVitals(console.log);
// }

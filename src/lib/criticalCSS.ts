// Critical CSS extraction and optimization utilities

export const CRITICAL_CSS = `
/* Critical CSS for above-the-fold content */
* {
  box-sizing: border-box;
}

html {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
  -moz-tab-size: 4;
  tab-size: 4;
}

body {
  margin: 0;
  background-color: #0a0a0a;
  color: #ffffff;
  font-family: inherit;
  line-height: inherit;
}

/* Critical layout styles */
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .container {
    max-width: 640px;
  }
}

@media (min-width: 768px) {
  .container {
    max-width: 768px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
  }
}

@media (min-width: 1280px) {
  .container {
    max-width: 1280px;
  }
}

/* Critical navigation styles */
nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background-color: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* Critical button styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
  border: none;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, #f97316, #dc2626);
  color: white;
  padding: 0.5rem 1rem;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #ea580c, #b91c1c);
}

/* Critical loading states */
.loading {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #f97316;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Critical text styles */
.text-gradient-orange {
  background: linear-gradient(135deg, #f97316, #dc2626);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Critical spacing */
.pt-24 {
  padding-top: 6rem;
}

.py-12 {
  padding-top: 3rem;
  padding-bottom: 3rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mb-8 {
  margin-bottom: 2rem;
}

.mb-12 {
  margin-bottom: 3rem;
}

/* Critical grid */
.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md\\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .xl\\:grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.gap-8 {
  gap: 2rem;
}

/* Critical flexbox */
.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.justify-between {
  justify-content: space-between;
}

/* Critical typography */
.text-4xl {
  font-size: 2.25rem;
  line-height: 2.5rem;
}

.text-2xl {
  font-size: 1.5rem;
  line-height: 2rem;
}

.text-xl {
  font-size: 1.25rem;
  line-height: 1.75rem;
}

.font-bold {
  font-weight: 700;
}

.font-semibold {
  font-weight: 600;
}

.text-center {
  text-align: center;
}

/* Critical colors */
.text-white {
  color: #ffffff;
}

.text-gray-400 {
  color: #9ca3af;
}

.bg-black {
  background-color: #000000;
}

.bg-gray-800 {
  background-color: #1f2937;
}

/* Critical responsive utilities */
.hidden {
  display: none;
}

@media (min-width: 768px) {
  .md\\:block {
    display: block;
  }
}

/* Critical animations */
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Critical accessibility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Critical focus styles */
.focus\\:outline-none:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.focus\\:ring-2:focus {
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.5);
}
`;

/**
 * Inject critical CSS into the document head
 */
export function injectCriticalCSS(): void {
  if (typeof document === 'undefined') return;

  const styleId = 'critical-css';
  
  // Check if critical CSS is already injected
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = CRITICAL_CSS;
  
  // Insert at the beginning of head for highest priority
  document.head.insertBefore(style, document.head.firstChild);
}

/**
 * Preload non-critical CSS files
 */
export function preloadNonCriticalCSS(href: string): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'style';
  link.href = href;
  link.onload = () => {
    link.rel = 'stylesheet';
  };
  
  document.head.appendChild(link);
}

/**
 * Load non-critical CSS after page load
 */
export function loadNonCriticalCSS(href: string): void {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.media = 'print';
  link.onload = () => {
    link.media = 'all';
  };
  
  document.head.appendChild(link);
}

/**
 * Initialize critical CSS optimization
 */
export function initializeCriticalCSS(): void {
  // Inject critical CSS immediately
  injectCriticalCSS();
  
  // Load non-critical CSS after page load
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      // Load additional CSS files here
      // loadNonCriticalCSS('/styles/non-critical.css');
    });
  }
}

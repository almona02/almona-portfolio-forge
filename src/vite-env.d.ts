/// <reference types="vite/client" />

// Gold-tier: Extend globals for type-safe API usage (no any casts)
interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface Window {
  requestIdleCallback?(callback: IdleRequestCallback, options?: { timeout?: number }): number;
  analytics?: { track: (name: string, data?: Record<string, unknown>) => void };
}

interface Navigator {
  connection?: NetworkInformation;
}

// Extend ImportMeta to include env property
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Virtual module types for Vite plugins
declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration) => void;
    onRegisterError?: (error: Error) => void;
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}

// Web Vitals types (if not provided by package)
declare module 'web-vitals' {
  interface Metric {
    name: string;
    value: number;
    rating?: string;
    delta: number;
    id: string;
    navigationType?: string;
  }
  export function onCLS(onPerfEntry: (metric: Metric) => void): void;
  export function onFID(onPerfEntry: (metric: Metric) => void): void;
  export function onFCP(onPerfEntry: (metric: Metric) => void): void;
  export function onLCP(onPerfEntry: (metric: Metric) => void): void;
  export function onTTFB(onPerfEntry: (metric: Metric) => void): void;
  export function onINP(onPerfEntry: (metric: Metric) => void): void;
}

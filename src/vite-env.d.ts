/// <reference types="vite/client" />

// Extend ImportMeta to include env property
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  [key: string]: any;
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
  export function onCLS(onPerfEntry: (metric: any) => void): void;
  export function onFID(onPerfEntry: (metric: any) => void): void;
  export function onFCP(onPerfEntry: (metric: any) => void): void;
  export function onLCP(onPerfEntry: (metric: any) => void): void;
  export function onTTFB(onPerfEntry: (metric: any) => void): void;
  export function onINP(onPerfEntry: (metric: any) => void): void;
}

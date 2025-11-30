// Browser polyfills for Node.js modules used by Supabase realtime
// This fixes the externalization warnings in the build

// Polyfill for 'stream' module
const streamModule = {
  Readable: class MockReadable {
    constructor() {}
    pipe() { return this; }
    on() { return this; }
    emit() { return this; }
  },
  Writable: class MockWritable {
    constructor() {}
    write() { return true; }
    end() { return this; }
    on() { return this; }
  },
  Transform: class MockTransform {
    constructor() {}
    pipe() { return this; }
    on() { return this; }
  }
};

// Polyfill for 'http' and 'https' modules
const createHttpModule = () => ({
  request: () => {
    throw new Error('HTTP module not available in browser. Use fetch() instead.');
  },
  get: () => {
    throw new Error('HTTP module not available in browser. Use fetch() instead.');
  },
  createServer: () => {
    throw new Error('HTTP server not available in browser.');
  }
});

const httpModule = createHttpModule();
const httpsModule = createHttpModule();

// Polyfill for 'url' module
const urlModule = {
  parse: (urlString: string) => {
    try {
      const parsed = new URL(urlString);
      return {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
        host: parsed.host,
        href: parsed.href
      };
    } catch (e) {
      return null;
    }
  },
  format: (urlObject: Record<string, unknown>) => {
    if (typeof urlObject === 'string') return urlObject;
    
    const protocol = urlObject.protocol || 'http:';
    const hostname = urlObject.hostname || urlObject.host || 'localhost';
    const port = urlObject.port ? `:${urlObject.port}` : '';
    const pathname = urlObject.pathname || '/';
    const search = urlObject.search || '';
    const hash = urlObject.hash || '';
    
    return `${protocol}//${hostname}${port}${pathname}${search}${hash}`;
  },
  resolve: (from: string, to: string) => {
    try {
      return new URL(to, from).href;
    } catch (e) {
      return to;
    }
  }
};

// Polyfill for 'zlib' module
const zlibModule = {
  gzip: () => {
    throw new Error('zlib not available in browser. Use browser compression APIs.');
  },
  gunzip: () => {
    throw new Error('zlib not available in browser. Use browser decompression APIs.');
  },
  deflate: () => {
    throw new Error('zlib not available in browser.');
  },
  inflate: () => {
    throw new Error('zlib not available in browser.');
  }
};

// Export as default exports to match Node.js module imports
export { streamModule as stream };
export { httpModule as http };
export { httpsModule as https };
export { urlModule as url };
export { zlibModule as zlib };

// Default exports for each module
export default streamModule;

// Polyfill for 'module' and 'require' (CommonJS) - fixes "module is not defined" and "require is not defined" errors
// Used by packages like 'long' and 'seedrandom' that use CommonJS
const initializeModulePolyfill = () => {
  if (typeof window !== 'undefined') {
    // Create module object if it doesn't exist
    if (typeof (window as any).module === 'undefined') {
      (window as any).module = {
        exports: {},
      };
    }
    // Also ensure it's available globally (not just on window)
    if (typeof (globalThis as any).module === 'undefined') {
      (globalThis as any).module = (window as any).module;
    }
    // Create exports as an alias to module.exports for CommonJS compatibility
    if (typeof (window as any).exports === 'undefined') {
      (window as any).exports = (window as any).module.exports;
    }
    if (typeof (globalThis as any).exports === 'undefined') {
      (globalThis as any).exports = (globalThis as any).module.exports;
    }
    
    // Create require function if it doesn't exist
    if (typeof (window as any).require === 'undefined') {
      const requireCache: Record<string, any> = {};
      (window as any).require = function(id: string) {
        // If already cached, return it
        if (requireCache[id]) {
          return requireCache[id];
        }
        // For now, return an empty object - actual modules will be handled by Vite
        // This prevents "require is not defined" errors
        const mod = { exports: {} };
        requireCache[id] = mod.exports;
        return mod.exports;
      };
    }
    if (typeof (globalThis as any).require === 'undefined') {
      (globalThis as any).require = (window as any).require;
    }
  }
};

// Initialize polyfills globally if needed
export function initializePolyfills() {
  if (typeof window !== 'undefined') {
    // Initialize module polyfill first (needed for CommonJS packages)
    initializeModulePolyfill();
    // Pre-load long package for TensorFlow.js compatibility
    import('./polyfills/long').then((longModule) => {
      if (longModule.default && typeof (window as any).Long === 'undefined') {
        (window as any).Long = longModule.default;
      }
    }).catch(() => {
      // Long package might not be needed immediately, that's okay
    });
    // Only run in browser environment
    console.log('🔧 Browser polyfills initialized for Node.js modules');
  }
}

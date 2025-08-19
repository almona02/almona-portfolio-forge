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

// Initialize polyfills globally if needed
export function initializePolyfills() {
  if (typeof window !== 'undefined') {
    // Only run in browser environment
    console.log('🔧 Browser polyfills initialized for Node.js modules');
  }
}

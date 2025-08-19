// HTTPS polyfill for browser compatibility
const httpsModule = {
  request: () => {
    throw new Error('HTTPS module not available in browser. Use fetch() instead.');
  },
  get: () => {
    throw new Error('HTTPS module not available in browser. Use fetch() instead.');
  },
  createServer: () => {
    throw new Error('HTTPS server not available in browser.');
  }
};

export default httpsModule;
export const { request, get, createServer } = httpsModule;

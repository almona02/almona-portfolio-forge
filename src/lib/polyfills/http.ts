// HTTP polyfill for browser compatibility
const httpModule = {
  request: () => {
    throw new Error('HTTP module not available in browser. Use fetch() instead.');
  },
  get: () => {
    throw new Error('HTTP module not available in browser. Use fetch() instead.');
  },
  createServer: () => {
    throw new Error('HTTP server not available in browser.');
  }
};

export default httpModule;
export const { request, get, createServer } = httpModule;

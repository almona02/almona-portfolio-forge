// Zlib polyfill for browser compatibility
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

export default zlibModule;
export const { gzip, gunzip, deflate, inflate } = zlibModule;

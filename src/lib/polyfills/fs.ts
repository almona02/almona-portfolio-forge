/**
 * Browser polyfill for Node.js 'fs' module
 * Used by ammo.js and other libraries that expect Node.js fs API
 */

// Empty polyfill - fs operations are not available in browser
// Libraries using this should handle browser environment gracefully
export const readFileSync = () => {
  throw new Error('fs.readFileSync is not available in browser environment');
};

export const writeFileSync = () => {
  throw new Error('fs.writeFileSync is not available in browser environment');
};

export const existsSync = () => {
  throw new Error('fs.existsSync is not available in browser environment');
};

export const statSync = () => {
  throw new Error('fs.statSync is not available in browser environment');
};

export const readdirSync = () => {
  throw new Error('fs.readdirSync is not available in browser environment');
};

export const mkdirSync = () => {
  throw new Error('fs.mkdirSync is not available in browser environment');
};

export const unlinkSync = () => {
  throw new Error('fs.unlinkSync is not available in browser environment');
};

// Default export for CommonJS compatibility
export default {
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  readdirSync,
  mkdirSync,
  unlinkSync,
};


/**
 * Browser polyfill for Node.js 'path' module
 * Used by ammo.js and other libraries that expect Node.js path API
 */

// Minimal path polyfill - most operations are not needed in browser
export const join = (...paths: string[]): string => {
  return paths
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '') || '/';
};

export const resolve = (...paths: string[]): string => {
  return join(...paths);
};

export const dirname = (path: string): string => {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return '/' + parts.join('/');
};

export const basename = (path: string, ext?: string): string => {
  const parts = path.split('/').filter(Boolean);
  const name = parts[parts.length - 1] || '';
  if (ext && name.endsWith(ext)) {
    return name.slice(0, -ext.length);
  }
  return name;
};

export const extname = (path: string): string => {
  const parts = path.split('/').filter(Boolean);
  const name = parts[parts.length - 1] || '';
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.slice(lastDot) : '';
};

export const sep = '/';
export const delimiter = ':';

// Default export for CommonJS compatibility
export default {
  join,
  resolve,
  dirname,
  basename,
  extname,
  sep,
  delimiter,
};


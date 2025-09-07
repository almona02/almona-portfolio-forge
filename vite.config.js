// JS shim: delegate to the TypeScript config so Vite gets a valid object
import config from './vite.config.ts';
export default config;
// Force Vercel to use vite build settings

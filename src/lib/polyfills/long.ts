/**
 * Long package polyfill/shim for TensorFlow.js compatibility
 * Ensures Long.fromString and other methods are available
 */

import Long from 'long';

// Export Long class for use by TensorFlow.js
export default Long;

// Also make it available globally if needed
if (typeof window !== 'undefined') {
  (window as any).Long = Long;
}


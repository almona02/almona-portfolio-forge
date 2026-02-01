
/**
 * Web Worker for Constitutional Hash Computation
 * 
 * @tier Tier 3 Protected (Execution Path)
 * @constitutional_compliance AICS-001 §9.3
 * @deterministic true
 * 
 * Offloads CPU-intensive SHA-256 hashing to background thread
 * to prevent blocking the UI/Main thread.
 */

self.onmessage = async (e: MessageEvent) => {
  const { data, action, id } = e.data;
  
  if (action === 'computeHash') {
    try {
      // Use Web Crypto API (available in Worker scope)
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await self.crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      self.postMessage({ id, hash, success: true });
    } catch (error) {
      self.postMessage({ 
        id, 
        error: error instanceof Error ? error.message : String(error), 
        success: false 
      });
    }
  } else {
    self.postMessage({
        id,
        error: `Unknown action: ${action}`,
        success: false
    });
  }
};

// Typescript needs this to treat it as a module
export { };


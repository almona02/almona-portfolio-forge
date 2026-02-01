/**
 * CONSTITUTIONAL HARDENING: Rate Limiting
 * 
 * Prevents abuse and excessive resource usage (DoS protection) for state synchronization.
 * Implements a sliding window algorithm per entity.
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  // Default: 60 seconds window
  private readonly WINDOW_MS: number = 60000; 
  // Default: 50 requests per minute per entity
  private readonly MAX_REQUESTS: number = 50; 

  constructor(windowMs?: number, maxRequests?: number) {
    if (windowMs) this.WINDOW_MS = windowMs;
    if (maxRequests) this.MAX_REQUESTS = maxRequests;
  }

  /**
   * Check if a request is allowed for the given entity
   * @param entityId Unique identifier for the entity (e.g., poseId)
   * @returns true if allowed, false if limit exceeded
   */
  checkLimit(entityId: string): boolean {
    const now = Date.now();
    const history = this.requests.get(entityId) || [];
    
    // Filter out requests older than the window
    const validHistory = history.filter(time => now - time < this.WINDOW_MS);
    
    if (validHistory.length >= this.MAX_REQUESTS) {
      return false;
    }
    
    // Record new request
    validHistory.push(now);
    this.requests.set(entityId, validHistory);
    
    return true;
  }

  /**
   * Get current usage stats for an entity
   */
  getUsage(entityId: string): { count: number; remaining: number; resetInMs: number } {
    const now = Date.now();
    const history = this.requests.get(entityId) || [];
    const validHistory = history.filter(time => now - time < this.WINDOW_MS);
    
    // Find when the oldest request expires (for reset time)
    const oldestTimestamp = validHistory.length > 0 ? validHistory[0] : now;
    const resetInMs = Math.max(0, this.WINDOW_MS - (now - oldestTimestamp));

    return {
      count: validHistory.length,
      remaining: Math.max(0, this.MAX_REQUESTS - validHistory.length),
      resetInMs: validHistory.length > 0 ? resetInMs : 0
    };
  }
}
